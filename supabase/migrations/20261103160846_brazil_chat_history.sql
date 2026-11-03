begin;
create table public.life_brazil_chat_history (
 id text primary key check (id ~ '^[0-9a-f]{64}$'),
 thread_id text not null check (thread_id ~ '^[-a-zA-Z0-9_]{1,160}$'),
 created_at timestamptz not null,
 updated_at timestamptz not null,
 turns jsonb not null check (jsonb_typeof(turns)='array' and jsonb_array_length(turns) between 1 and 5000 and octet_length(turns::text)<=4000000),
 saved_at timestamptz not null default now()
);
create index life_brazil_chat_versions on public.life_brazil_chat_history(thread_id,(jsonb_array_length(turns)) desc);
alter table public.life_brazil_chat_history enable row level security;
revoke all on public.life_brazil_chat_history from public,anon,authenticated,service_role;
grant select,insert on public.life_brazil_chat_history to service_role;
create function public.life_brazil_chat_heads()
returns setof public.life_brazil_chat_history
language sql stable security invoker set search_path=public,pg_temp as $$
 select s.* from public.life_brazil_chat_history s
 where not exists (
  select 1 from public.life_brazil_chat_history t
  where t.thread_id=s.thread_id and jsonb_array_length(t.turns)>jsonb_array_length(s.turns)
  and s.turns=(select jsonb_agg(v order by n) from jsonb_array_elements(t.turns) with ordinality as a(v,n) where n<=jsonb_array_length(s.turns))
 ) order by s.updated_at desc,s.id;
$$;
revoke all on function public.life_brazil_chat_heads() from public,anon,authenticated;
grant execute on function public.life_brazil_chat_heads() to service_role;
commit;
