-- Lectura Accesible: cuentas de usuario con registro moderado.
-- Corré este archivo completo en Supabase > SQL Editor (proyecto nuevo) una sola vez.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Función auxiliar: evita la recursión infinita que causaría una policy de
-- "admins" que vuelve a consultar la propia tabla profiles directamente.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- Crea automáticamente la fila de perfil (en estado 'pending') cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Después de correr esto y de registrar tu propia cuenta desde la app, promovete
-- a administrador y aprobate a vos mismo con (reemplazá el email):
--
-- update public.profiles set is_admin = true, status = 'approved' where email = 'tu-email@ejemplo.com';
