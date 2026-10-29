begin;

create table public.assessor_telegram_notifications (
  game_id text primary key references public.assessor_games(id),
  title text not null,
  reason text,
  created_at timestamptz not null default now(),
  owner uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  message_id bigint,
  sent_at timestamptz,
  error text
);
alter table public.assessor_telegram_notifications enable row level security;
revoke all on public.assessor_telegram_notifications from public, anon, authenticated;
grant select on public.assessor_telegram_notifications to service_role;

create function public.assessor_queue_telegram() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'flagged' then
    insert into public.assessor_telegram_notifications(game_id, title, reason)
    values (new.id, new.title, new.reason) on conflict (game_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.assessor_queue_telegram() from public, anon, authenticated;
create trigger assessor_queue_telegram
  after insert or update of status on public.assessor_games
  for each row execute function public.assessor_queue_telegram();

-- Include existing prohibited games; one lifetime notification per game.
insert into public.assessor_telegram_notifications(game_id, title, reason)
select id, title, reason from public.assessor_games where status = 'flagged'
on conflict (game_id) do nothing;

create function public.assessor_telegram_claim(p_owner uuid)
returns setof public.assessor_telegram_notifications
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with candidates as (
    select n.game_id from public.assessor_telegram_notifications n
    join public.assessor_games g on g.id = n.game_id
    where n.sent_at is null and n.attempts < 5 and g.status = 'flagged'
      and (n.lease_until is null or n.lease_until < now())
    order by n.created_at, n.game_id
    limit 8 for update of n skip locked
  )
  update public.assessor_telegram_notifications n
  set owner = p_owner, lease_until = now() + interval '5 minutes',
      attempts = n.attempts + 1, error = null
  from candidates c where n.game_id = c.game_id returning n.*;
end $$;

create function public.assessor_telegram_checkpoint(p_game_id text, p_owner uuid,
  p_message_id bigint default null, p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.assessor_telegram_notifications
  set message_id = coalesce(p_message_id, message_id),
      sent_at = case when p_message_id is not null then now() else sent_at end,
      error = left(p_error, 180), lease_until = null
  where game_id = p_game_id and owner = p_owner and lease_until > now() and sent_at is null;
  return found;
end $$;
revoke all on function public.assessor_telegram_claim(uuid) from public, anon, authenticated;
revoke all on function public.assessor_telegram_checkpoint(text,uuid,bigint,text) from public, anon, authenticated;
grant execute on function public.assessor_telegram_claim(uuid) to service_role;
grant execute on function public.assessor_telegram_checkpoint(text,uuid,bigint,text) to service_role;

commit;
