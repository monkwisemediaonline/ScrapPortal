-- Ludhiana Scrap Exchange — initial schema
-- Run in Supabase SQL editor (or `supabase db push`).

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

create or replace function public.ist_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────

create sequence if not exists public.profile_code_seq start 1001;

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text,
  email         text,
  full_name     text,
  business_name text,
  gstin         text,
  role          text not null default 'seller' check (role in ('seller','buyer','both','admin')),
  status        text not null default 'incomplete'
                check (status in ('incomplete','pending','approved','rejected','suspended')),
  area          text,
  address       text,
  public_code   text unique,
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.my_status() returns text
language sql stable security definer set search_path = public as $$
  select status from profiles where id = auth.uid()
$$;

create or replace function public.can_buy() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()
                 and status = 'approved' and role in ('buyer','both','admin'))
$$;

create or replace function public.can_sell() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()
                 and status = 'approved' and role in ('seller','both','admin'))
$$;

-- New auth user → profile row
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone, email, public_code)
  values (new.id, new.phone, new.email, 'LSX-' || nextval('profile_code_seq'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Members cannot make themselves admin or approve themselves.
-- auth.uid() is null for the SQL editor / service role, which may do anything.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;
  if new.role = 'admin' then
    raise exception 'Not allowed to set admin role';
  end if;
  new.public_code := old.public_code;
  new.admin_note  := old.admin_note;
  new.phone       := old.phone;
  -- Only allowed self transition: incomplete -> pending (finishing onboarding)
  if new.status is distinct from old.status
     and not (old.status = 'incomplete' and new.status = 'pending') then
    new.status := old.status;
  end if;
  -- Role/GSTIN are locked once approved; admin changes them.
  if old.status = 'approved' then
    new.role  := old.role;
    new.gstin := old.gstin;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
create policy "profiles: read own"   on public.profiles for select using (id = auth.uid() or is_admin());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid() or is_admin());

-- Pseudonymous identity shown to other members (bids, ratings). No phone/name.
create view public.public_profiles as
  select id, public_code, role, area, status = 'approved' as verified, created_at
  from public.profiles;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Catalog: categories → grades
-- ─────────────────────────────────────────────────────────────

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name_en    text not null,
  name_hi    text,
  name_pa    text,
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.grades (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug        text unique not null,
  name_en     text not null,
  name_hi     text,
  name_pa     text,
  description text,
  unit        text not null default 'kg' check (unit in ('kg','tonne','piece')),
  sort        int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.grades (category_id);

alter table public.categories enable row level security;
alter table public.grades     enable row level security;
create policy "categories: public read" on public.categories for select using (active or is_admin());
create policy "categories: admin write" on public.categories for all using (is_admin()) with check (is_admin());
create policy "grades: public read"     on public.grades for select using (active or is_admin());
create policy "grades: admin write"     on public.grades for all using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────
-- Rate sources & daily rates (buyer rate card)
-- ─────────────────────────────────────────────────────────────

-- A buyer whose rates appear on the board. Admin enters rates on its behalf
-- until the buyer is onboarded (buyer_id set) and posts rates directly.
create table public.rate_sources (
  id           uuid primary key default gen_random_uuid(),
  public_label text not null,               -- shown publicly, e.g. "Induction furnace, Mandi Gobindgarh"
  location     text,
  buyer_id     uuid references public.profiles(id) on delete set null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Who the source really is — admin only.
create table public.rate_source_private (
  source_id    uuid primary key references public.rate_sources(id) on delete cascade,
  contact_name text,
  phone        text,
  notes        text
);

create table public.rates (
  id         uuid primary key default gen_random_uuid(),
  grade_id   uuid not null references public.grades(id) on delete cascade,
  source_id  uuid not null references public.rate_sources(id) on delete cascade,
  price      numeric(12,2) not null check (price > 0),
  unit       text not null default 'kg' check (unit in ('kg','tonne','piece')),
  rate_date  date not null default public.ist_today(),
  note       text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (grade_id, source_id, rate_date)
);
create index on public.rates (grade_id, rate_date desc);

alter table public.rate_sources        enable row level security;
alter table public.rate_source_private enable row level security;
alter table public.rates               enable row level security;

create policy "sources: public read" on public.rate_sources for select using (active or is_admin());
create policy "sources: admin write" on public.rate_sources for all using (is_admin()) with check (is_admin());
create policy "source private: admin" on public.rate_source_private for all using (is_admin()) with check (is_admin());

create policy "rates: public read" on public.rates for select using (true);
create policy "rates: admin or own source write" on public.rates for all
  using (is_admin() or exists (select 1 from rate_sources s where s.id = source_id and s.buyer_id = auth.uid()))
  with check (is_admin() or exists (select 1 from rate_sources s where s.id = source_id and s.buyer_id = auth.uid()));

-- Board: per grade, best rate on the latest date and best rate on the date before.
create or replace function public.rate_board()
returns table (grade_id uuid, latest_date date, best_price numeric, prev_price numeric, source_count int)
language sql stable as $$
  with daily as (
    select r.grade_id, r.rate_date, max(r.price) as best, count(*)::int as n
    from rates r
    join rate_sources s on s.id = r.source_id and s.active
    where r.rate_date > ist_today() - 60
    group by r.grade_id, r.rate_date
  ), ranked as (
    select d.*, row_number() over (partition by d.grade_id order by d.rate_date desc) as rn
    from daily d
  )
  select a.grade_id, a.rate_date, a.best, b.best, a.n
  from ranked a
  left join ranked b on b.grade_id = a.grade_id and b.rn = 2
  where a.rn = 1
$$;
grant execute on function public.rate_board() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Sell requests (seller accepts a rate from the board)
-- ─────────────────────────────────────────────────────────────

create table public.sell_requests (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  grade_id      uuid not null references public.grades(id),
  source_id     uuid references public.rate_sources(id),
  rate_id       uuid references public.rates(id) on delete set null,
  quoted_price  numeric(12,2),
  unit          text not null default 'kg',
  quantity      numeric(12,2) not null check (quantity > 0),
  quantity_unit text not null default 'kg' check (quantity_unit in ('kg','tonne','piece')),
  area          text,
  pickup_address text,
  photos        text[] not null default '{}',
  notes         text,
  status        text not null default 'new'
                check (status in ('new','contacted','converted','rejected','cancelled')),
  admin_note    text,
  deal_id       uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.sell_requests (seller_id);
create index on public.sell_requests (status);
create trigger sell_requests_touch before update on public.sell_requests
  for each row execute function public.touch_updated_at();

alter table public.sell_requests enable row level security;
create policy "sell req: read own" on public.sell_requests for select
  using (seller_id = auth.uid() or is_admin());
create policy "sell req: create own" on public.sell_requests for insert
  with check (seller_id = auth.uid() and my_status() in ('pending','approved') and status = 'new');
create policy "sell req: cancel own" on public.sell_requests for update
  using ((seller_id = auth.uid() and status = 'new') or is_admin())
  with check ((seller_id = auth.uid() and status in ('new','cancelled')) or is_admin());

-- ─────────────────────────────────────────────────────────────
-- Lots & bids (auction)
-- ─────────────────────────────────────────────────────────────

create table public.lots (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references public.profiles(id) on delete cascade,
  grade_id       uuid not null references public.grades(id),
  title          text not null,
  description    text,
  quantity       numeric(12,2) not null check (quantity > 0),
  quantity_unit  text not null default 'kg' check (quantity_unit in ('kg','tonne','piece')),
  price_unit     text not null default 'kg' check (price_unit in ('kg','tonne','piece')),
  min_rate       numeric(12,2) check (min_rate is null or min_rate > 0), -- public starting rate
  area           text,
  inspection_note text,
  photos         text[] not null default '{}',
  closes_at      timestamptz not null,
  status         text not null default 'open'
                 check (status in ('open','awarded','cancelled')),
  awarded_bid_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.lots (status, closes_at);
create index on public.lots (seller_id);

create table public.bids (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null references public.lots(id) on delete cascade,
  buyer_id   uuid not null references public.profiles(id) on delete cascade,
  rate       numeric(12,2) not null check (rate > 0),
  note       text,                          -- payment terms, pickup timing
  status     text not null default 'active'
             check (status in ('active','withdrawn','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lot_id, buyer_id)
);
create index on public.bids (lot_id);
create index on public.bids (buyer_id);

alter table public.lots add constraint lots_awarded_bid_fk
  foreign key (awarded_bid_id) references public.bids(id) on delete set null;

create or replace function public.lots_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- accept_bid() sets lsx.accepting for the duration of its own update
  if auth.uid() is null or is_admin() or current_setting('lsx.accepting', true) = 'on' then
    return new;
  end if;
  -- Seller may edit details / extend closing, or cancel; awarding happens via accept_bid().
  if new.status is distinct from old.status and new.status <> 'cancelled' then
    raise exception 'Use accept_bid() to award a lot';
  end if;
  if old.status <> 'open' then
    raise exception 'Lot is no longer open';
  end if;
  new.seller_id      := old.seller_id;
  new.awarded_bid_id := old.awarded_bid_id;
  return new;
end $$;
create trigger lots_guard before update on public.lots
  for each row execute function public.lots_guard();
create trigger lots_touch before update on public.lots
  for each row execute function public.touch_updated_at();

create or replace function public.bids_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare l lots;
begin
  select * into l from lots where id = new.lot_id;
  if tg_op = 'UPDATE' then
    new.lot_id   := old.lot_id;
    new.buyer_id := old.buyer_id;
  end if;
  -- Bidder actions: placing, raising/lowering, withdrawing, re-activating
  if auth.uid() = new.buyer_id then
    if new.status not in ('active','withdrawn') then
      raise exception 'Not allowed';
    end if;
    if tg_op = 'UPDATE' and old.status not in ('active','withdrawn') then
      raise exception 'Bid already decided';
    end if;
    if l.status <> 'open' or l.closes_at <= now() then
      raise exception 'Bidding is closed for this lot';
    end if;
    if l.seller_id = new.buyer_id then
      raise exception 'You cannot bid on your own lot';
    end if;
    if new.status = 'active' and l.min_rate is not null and new.rate < l.min_rate then
      raise exception 'Bid is below the starting rate';
    end if;
  end if;
  return new;
end $$;
create trigger bids_guard before insert or update on public.bids
  for each row execute function public.bids_guard();
create trigger bids_touch before update on public.bids
  for each row execute function public.touch_updated_at();

alter table public.lots enable row level security;
alter table public.bids enable row level security;

create policy "lots: members read" on public.lots for select
  using (auth.uid() is not null and (status <> 'cancelled' or seller_id = auth.uid() or is_admin()));
create policy "lots: approved sellers create" on public.lots for insert
  with check (seller_id = auth.uid() and can_sell() and status = 'open');
create policy "lots: owner update" on public.lots for update
  using (seller_id = auth.uid() or is_admin());

create policy "bids: read own, lot owner, admin" on public.bids for select
  using (buyer_id = auth.uid() or is_admin()
         or exists (select 1 from lots l where l.id = lot_id and l.seller_id = auth.uid()));
create policy "bids: approved buyers create" on public.bids for insert
  with check (buyer_id = auth.uid() and can_buy() and status = 'active');
create policy "bids: own update" on public.bids for update
  using (buyer_id = auth.uid() or is_admin());

-- What every member may see about competition: top rate + count, never who.
create or replace function public.lot_bid_summary(p_lot_id uuid)
returns table (top_rate numeric, bid_count int)
language sql stable security definer set search_path = public as $$
  select max(rate), count(*)::int from bids
  where lot_id = p_lot_id and status in ('active','accepted')
$$;
grant execute on function public.lot_bid_summary(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Deals (both flows end here)
-- ─────────────────────────────────────────────────────────────

create table public.deals (
  id               uuid primary key default gen_random_uuid(),
  origin           text not null check (origin in ('rate_card','auction')),
  sell_request_id  uuid references public.sell_requests(id) on delete set null,
  lot_id           uuid references public.lots(id) on delete set null,
  bid_id           uuid references public.bids(id) on delete set null,
  seller_id        uuid not null references public.profiles(id),
  buyer_id         uuid references public.profiles(id),          -- null = off-platform buyer brokered by admin
  source_id        uuid references public.rate_sources(id),
  grade_id         uuid not null references public.grades(id),
  agreed_rate      numeric(12,2) not null check (agreed_rate > 0),
  unit             text not null default 'kg' check (unit in ('kg','tonne','piece')),
  est_quantity     numeric(12,2),
  quantity_unit    text not null default 'kg',
  pickup_address   text,
  pickup_date      date,
  final_weight_kg  numeric(12,2),
  deduction_amount numeric(12,2) not null default 0,
  deduction_note   text,
  final_amount     numeric(14,2),
  weighbridge_slip text,
  status           text not null default 'confirmed'
                   check (status in ('confirmed','pickup_scheduled','weighed','payment_pending','completed','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.deals (seller_id);
create index on public.deals (buyer_id);
create index on public.deals (status);

alter table public.sell_requests add constraint sell_requests_deal_fk
  foreign key (deal_id) references public.deals(id) on delete set null;

create table public.deal_events (
  id         bigint generated always as identity primary key,
  deal_id    uuid not null references public.deals(id) on delete cascade,
  status     text not null,
  note       text,
  actor_id   uuid,
  created_at timestamptz not null default now()
);
create index on public.deal_events (deal_id);

create or replace function public.deals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;
  -- Buyer may record pickup / weighing / payment; commercial terms are fixed.
  new.seller_id   := old.seller_id;
  new.buyer_id    := old.buyer_id;
  new.agreed_rate := old.agreed_rate;
  new.unit        := old.unit;
  new.grade_id    := old.grade_id;
  new.origin      := old.origin;
  if old.status in ('completed','cancelled') then
    raise exception 'Deal is closed';
  end if;
  return new;
end $$;
create trigger deals_guard before update on public.deals
  for each row execute function public.deals_guard();
create trigger deals_touch before update on public.deals
  for each row execute function public.touch_updated_at();

create or replace function public.deals_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into deal_events (deal_id, status, actor_id) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger deals_log after insert or update on public.deals
  for each row execute function public.deals_log();

alter table public.deals       enable row level security;
alter table public.deal_events enable row level security;

create policy "deals: parties read" on public.deals for select
  using (seller_id = auth.uid() or buyer_id = auth.uid() or is_admin());
create policy "deals: buyer or admin update" on public.deals for update
  using (buyer_id = auth.uid() or is_admin());
create policy "deals: admin insert" on public.deals for insert with check (is_admin());

create policy "deal events: parties read" on public.deal_events for select
  using (is_admin() or exists (select 1 from deals d where d.id = deal_id
         and (d.seller_id = auth.uid() or d.buyer_id = auth.uid())));

-- Contacts are revealed only to the two parties of a live deal.
create or replace function public.deal_contacts(p_deal_id uuid)
returns table (party text, name text, business_name text, phone text, address text)
language plpgsql stable security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal_id;
  if not found or d.status = 'cancelled' then return; end if;
  if not (auth.uid() in (d.seller_id, d.buyer_id) or is_admin()) then return; end if;
  return query
    select 'seller', p.full_name, p.business_name, p.phone, coalesce(d.pickup_address, p.address)
      from profiles p where p.id = d.seller_id
    union all
    select 'buyer', p.full_name, p.business_name, p.phone, p.address
      from profiles p where p.id = d.buyer_id;
end $$;
grant execute on function public.deal_contacts(uuid) to authenticated;

-- Seller accepts one bid: bid → accepted, others → rejected, lot → awarded, deal created.
create or replace function public.accept_bid(p_bid_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b bids;
  l lots;
  s profiles;
  new_deal uuid;
begin
  select * into b from bids where id = p_bid_id for update;
  if not found then raise exception 'Bid not found'; end if;
  select * into l from lots where id = b.lot_id for update;
  if l.seller_id <> auth.uid() and not is_admin() then raise exception 'Not allowed'; end if;
  if l.status <> 'open' then raise exception 'Lot is no longer open'; end if;
  if b.status <> 'active' then raise exception 'Bid is not active'; end if;

  update bids set status = case when id = b.id then 'accepted' else 'rejected' end
    where lot_id = l.id and status = 'active';

  select * into s from profiles where id = l.seller_id;
  insert into deals (origin, lot_id, bid_id, seller_id, buyer_id, grade_id, agreed_rate, unit,
                     est_quantity, quantity_unit, pickup_address)
  values ('auction', l.id, b.id, l.seller_id, b.buyer_id, l.grade_id, b.rate, l.price_unit,
          l.quantity, l.quantity_unit, coalesce(s.address, l.area))
  returning id into new_deal;

  perform set_config('lsx.accepting', 'on', true);
  update lots set status = 'awarded', awarded_bid_id = b.id where id = l.id;
  perform set_config('lsx.accepting', 'off', true);
  return new_deal;
end $$;
grant execute on function public.accept_bid(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Storage: photos & weighbridge slips (path must start with uploader's uid)
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "uploads: public read" on storage.objects for select
  using (bucket_id = 'uploads');
create policy "uploads: own folder write" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
