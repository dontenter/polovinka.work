begin;
create extension if not exists vector with schema extensions;

create table if not exists public.brazil_messages (
 chat text not null check(chat in ('Brazil_ChatForum','brfloripa')),
 id bigint not null, date timestamptz not null, text text not null default '',
 reply_to bigint, topic_id bigint, edited_at timestamptz, media_type text,
 processed boolean not null default false,
 primary key(chat,id)
);
create index if not exists brazil_messages_queue on public.brazil_messages(date) where not processed and text<>'';
create index if not exists brazil_messages_date on public.brazil_messages(date desc);
create table if not exists public.brazil_notes (
 id text primary key, topic text not null, title text not null, body text not null,
 city text not null, kind text not null default 'experience', date timestamptz not null,
 sources jsonb not null check(jsonb_typeof(sources)='array'), evidence_quote text,
 embedding extensions.vector(512),
 search tsvector generated always as (to_tsvector('russian',title||' '||body||' '||city)) stored
);
create index if not exists brazil_notes_search on public.brazil_notes using gin(search);
create table if not exists public.brazil_daily (
 day date primary key, questions jsonb not null default '[]',
 message_count integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.brazil_state (
 id integer primary key check(id=1), cursors jsonb not null default '{}',
 collected_at timestamptz, analyzed_at timestamptz, bootstrap_at timestamptz,
 owner uuid, lease_until timestamptz, last_error text
);
insert into public.brazil_state(id) values(1) on conflict do nothing;
create table if not exists public.brazil_ai_usage (
 id uuid primary key, purpose text not null,
 reserved_usd numeric not null check(reserved_usd>0 and reserved_usd<=0.25),
 charged_usd numeric, input_tokens integer, output_tokens integer,
 created_at timestamptz not null default now(), settled_at timestamptz
);
create index if not exists brazil_ai_usage_date on public.brazil_ai_usage(created_at);
alter table public.brazil_messages enable row level security;
alter table public.brazil_notes enable row level security;
alter table public.brazil_daily enable row level security;
alter table public.brazil_state enable row level security;
alter table public.brazil_ai_usage enable row level security;
revoke all on public.brazil_messages,public.brazil_notes,public.brazil_daily,public.brazil_state,public.brazil_ai_usage from public,anon,authenticated;
grant select,insert,update on public.brazil_messages,public.brazil_notes,public.brazil_daily,public.brazil_state to service_role;
grant select on public.brazil_ai_usage to service_role;

create or replace function public.brazil_reserve(p_id uuid,p_purpose text,p_max_usd numeric)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare spent numeric;
begin
 perform pg_advisory_xact_lock(2026102401);
 if p_max_usd<=0 or p_max_usd>0.25 then raise exception 'Invalid reservation'; end if;
 if exists(select 1 from brazil_ai_usage where id=p_id) then return false; end if;
 select coalesce(sum(coalesce(charged_usd,reserved_usd)),0) into spent
 from brazil_ai_usage where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 if spent+p_max_usd>3.00 then return false; end if;
 if p_purpose='chat' and (select count(*) from brazil_ai_usage where purpose='chat' and created_at>now()-interval '1 minute')>=6 then return false; end if;
 insert into brazil_ai_usage(id,purpose,reserved_usd) values(p_id,p_purpose,p_max_usd);
 return true;
end $$;

create or replace function public.brazil_settle(p_id uuid,p_input integer,p_output integer,p_cached integer default 0)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare cost numeric; purpose_value text;
begin
 if p_input<0 or p_output<0 or p_cached<0 or p_cached>p_input then raise exception 'Invalid usage'; end if;
 select purpose into purpose_value from brazil_ai_usage where id=p_id for update;
 if not found then raise exception 'Reservation missing'; end if;
 cost:=case when purpose_value='embedding' then p_input*0.02/1000000
 else (p_input-p_cached)*0.25/1000000+p_cached*0.025/1000000+p_output*2.00/1000000 end;
 update brazil_ai_usage set charged_usd=cost,input_tokens=p_input,output_tokens=p_output,settled_at=now()
 where id=p_id and settled_at is null;
end $$;

create or replace function public.brazil_budget()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('limit',3.00,'used',coalesce(sum(coalesce(charged_usd,reserved_usd)),0),
 'month',to_char(now() at time zone 'UTC','YYYY-MM')) from brazil_ai_usage
 where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
$$;

create or replace function public.brazil_claim(p_owner uuid)
returns setof public.brazil_state language sql security definer set search_path=public,pg_temp as $$
 update brazil_state set owner=p_owner,lease_until=now()+interval '6 minutes',last_error=null
 where id=1 and bootstrap_at is not null and (lease_until is null or lease_until<now()) returning *;
$$;
create or replace function public.brazil_checkpoint(p_owner uuid,p_values jsonb,p_release boolean default false)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update brazil_state set cursors=coalesce(p_values->'cursors',cursors),
 collected_at=coalesce((p_values->>'collected_at')::timestamptz,collected_at),
 analyzed_at=coalesce((p_values->>'analyzed_at')::timestamptz,analyzed_at),
 last_error=p_values->>'last_error',
 lease_until=case when p_release then null else lease_until end
 where id=1 and owner=p_owner and lease_until>now();
 return found;
end $$;

create or replace function public.brazil_search(p_query text,p_embedding extensions.vector(512) default null,p_limit integer default 12)
returns table(id text,title text,body text,city text,date timestamptz,sources jsonb,score double precision)
language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select n.id,n.title,n.body,n.city,n.date,n.sources,
 (case when p_embedding is not null and n.embedding is not null then (1-(n.embedding<=>p_embedding))*0.8 else 0 end
 +ts_rank_cd(n.search,websearch_to_tsquery('russian',p_query))*0.2)::double precision score
 from brazil_notes n
 where (p_embedding is not null and n.embedding is not null and 1-(n.embedding<=>p_embedding)>0.25)
 or n.search@@websearch_to_tsquery('russian',p_query)
 order by score desc,n.date desc limit least(greatest(p_limit,1),20);
$$;
create or replace function public.brazil_sources(p_keys jsonb)
returns setof public.brazil_messages language sql stable security definer set search_path=public,pg_temp as $$
 select m.* from brazil_messages m join jsonb_to_recordset(p_keys) as k(chat text,id bigint)
 on m.chat=k.chat and m.id=k.id limit 60;
$$;

revoke all on function public.brazil_reserve(uuid,text,numeric),public.brazil_settle(uuid,integer,integer,integer),public.brazil_budget(),public.brazil_claim(uuid),public.brazil_checkpoint(uuid,jsonb,boolean),public.brazil_search(text,extensions.vector,integer),public.brazil_sources(jsonb) from public,anon,authenticated;
grant execute on function public.brazil_reserve(uuid,text,numeric),public.brazil_settle(uuid,integer,integer,integer),public.brazil_budget(),public.brazil_claim(uuid),public.brazil_checkpoint(uuid,jsonb,boolean),public.brazil_search(text,extensions.vector,integer),public.brazil_sources(jsonb) to service_role;
create or replace function public.brazil_commit_batch(p_keys jsonb,p_notes jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into brazil_notes(id,topic,title,body,city,kind,date,sources,evidence_quote)
 select n.id,n.topic,n.title,n.body,n.city,n.kind,n.date,n.sources,n.evidence_quote
 from jsonb_to_recordset(p_notes) as n(id text,topic text,title text,body text,city text,kind text,date timestamptz,sources jsonb,evidence_quote text)
 on conflict(id) do nothing;
 update brazil_messages m set processed=true from jsonb_to_recordset(p_keys) as k(chat text,id bigint)
 where m.chat=k.chat and m.id=k.id;
end $$;
create or replace function public.brazil_stats()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('notes',(select count(*) from brazil_notes),
 'messages',(select count(*) from brazil_messages),
 'pending',(select count(*) from brazil_messages where not processed and text<>''));
$$;
revoke all on function public.brazil_commit_batch(jsonb,jsonb),public.brazil_stats() from public,anon,authenticated;
grant execute on function public.brazil_commit_batch(jsonb,jsonb),public.brazil_stats() to service_role;
notify pgrst,'reload schema';
commit;
