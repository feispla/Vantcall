-- Dueño reconocido por su identidad de Discord (feistv) además de por su cuenta de correo.
-- Así entra como owner con Discord, Google (mismo correo) o Steam (vinculado a su cuenta).
create table if not exists public.web_admin_identities (
  provider text not null check (provider in ('discord', 'google', 'steam')),
  provider_id text not null,
  role text not null default 'admin' check (role in ('owner', 'admin', 'moderator')),
  label text,
  created_at timestamptz not null default now(),
  primary key (provider, provider_id)
);
alter table public.web_admin_identities enable row level security;
revoke all on public.web_admin_identities from anon, authenticated;

insert into public.web_admin_identities (provider, provider_id, role, label)
values ('discord', '1532612429295521930', 'owner', 'feistv')
on conflict (provider, provider_id) do update set role = excluded.role, label = excluded.label;

create or replace function public.web_admin_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select role from public.web_admins where user_id = auth.uid()),
    (select wi.role from public.web_admin_identities wi
       join auth.identities i on i.provider = wi.provider and i.provider_id = wi.provider_id
      where i.user_id = auth.uid()
      order by case wi.role when 'owner' then 0 when 'admin' then 1 else 2 end limit 1),
    (select wi.role from public.web_admin_identities wi
       join public.user_game_accounts g on wi.provider = 'steam' and g.game = 'steam' and g.handle = wi.provider_id and g.verified
      where g.user_id = auth.uid() limit 1),
    (select wi.role from public.web_admin_identities wi
       join public.player_discord_accounts d on wi.provider = 'discord' and d.discord_id = wi.provider_id
       join public.players p on p.id = d.player_id
      where p.auth_user_id = auth.uid() limit 1)
  )
$$;

create or replace function public.is_web_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$ select public.web_admin_role() is not null $$;

grant execute on function public.web_admin_role() to authenticated;
grant execute on function public.is_web_admin() to authenticated;

-- Plan ELITE permanente para la cuenta del dueño
insert into public.entitlements (player_id, entitlement_type, tier, source, is_active)
select p.id, 'plan', 'elite', 'admin', true
from public.players p
where p.auth_user_id = '1a20aeef-78ef-4218-a0e5-931e48d1ddc2'
  and not exists (select 1 from public.entitlements e where e.player_id = p.id and e.is_active and e.tier = 'elite');
