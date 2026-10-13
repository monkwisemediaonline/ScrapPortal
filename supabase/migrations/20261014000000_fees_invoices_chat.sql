-- Platform fee, invoices, payment tracking and deal messages.
-- Run after the earlier migrations.

-- ─────────────────────────────────────────────────────────────
-- Tax details per grade (used on invoices). Have a CA confirm HSN codes and GST rates.
-- ─────────────────────────────────────────────────────────────

alter table public.grades add column if not exists hsn_code text;
alter table public.grades add column if not exists gst_percent numeric(5,2) not null default 18;

update public.grades g set gst_percent = 5
  from public.categories c
  where c.id = g.category_id and c.slug in ('cloth', 'paper', 'plastic', 'other');

update public.grades set hsn_code = v.hsn
from (values
  ('hms-1','7204'), ('hms-2','7204'), ('crc-cutting','7204'), ('turning-boring','7204'), ('cast-iron','7204'), ('melting-mix','7204'), ('ss-304','7204'),
  ('copper','7404'), ('brass','7404'), ('aluminium','7602'),
  ('cotton-white','5202'), ('cotton-colour','5202'), ('polyester','5505'), ('woollen','5103'), ('mixed-cloth','6310'),
  ('occ','4707'), ('mixed-paper','4707'),
  ('hdpe','3915'), ('ldpe-film','3915'), ('pp','3915'), ('pet','3915'),
  ('rubber','4004'), ('wood-pallet','4401')
) as v(slug, hsn)
where grades.slug = v.slug and grades.hsn_code is null;

-- ─────────────────────────────────────────────────────────────
-- Deals: fee, invoice, payment
-- ─────────────────────────────────────────────────────────────

alter table public.deals add column if not exists commission_percent numeric(5,3) not null default 0.25;
alter table public.deals add column if not exists commission_amount numeric(14,2)
  generated always as (round(coalesce(final_amount, 0) * commission_percent / 100, 2)) stored;

alter table public.deals add column if not exists gst_percent numeric(5,2);     -- copied from the grade when weighed
alter table public.deals add column if not exists hsn_code text;
alter table public.deals add column if not exists invoice_no text unique;
alter table public.deals add column if not exists invoice_date date;
alter table public.deals add column if not exists buyer_billing text;           -- admin types this for off-portal buyers

alter table public.deals add column if not exists payment_ref text;             -- UTR / cheque no.
alter table public.deals add column if not exists payment_proof text;
alter table public.deals add column if not exists paid_at timestamptz;          -- buyer says paid
alter table public.deals add column if not exists payment_confirmed_at timestamptz; -- seller says received

create sequence if not exists public.invoice_seq start 1;

-- Give the deal an invoice number and freeze its tax details the first time a final amount exists.
create or replace function public.deals_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
declare g grades;
begin
  if new.final_amount is not null and new.invoice_no is null then
    select * into g from grades where id = new.grade_id;
    new.invoice_no   := 'LSX/' || to_char(ist_today(), 'YYMM') || '/' || lpad(nextval('invoice_seq')::text, 4, '0');
    new.invoice_date := ist_today();
    new.gst_percent  := coalesce(new.gst_percent, g.gst_percent);
    new.hsn_code     := coalesce(new.hsn_code, g.hsn_code);
  end if;
  return new;
end $$;

drop trigger if exists deals_invoice on public.deals;
create trigger deals_invoice before insert or update on public.deals
  for each row execute function public.deals_invoice();

-- Buyers may record pickup, weight and that they paid; everything commercial stays fixed.
create or replace function public.deals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() or current_setting('lsx.confirming', true) = 'on' then
    return new;
  end if;
  new.seller_id   := old.seller_id;
  new.buyer_id    := old.buyer_id;
  new.agreed_rate := old.agreed_rate;
  new.unit        := old.unit;
  new.grade_id    := old.grade_id;
  new.origin      := old.origin;
  new.commission_percent   := old.commission_percent;
  new.buyer_billing        := old.buyer_billing;
  new.payment_confirmed_at := old.payment_confirmed_at;
  -- Invoice number and tax details are set by deals_invoice(), never by the member
  new.invoice_no   := old.invoice_no;
  new.invoice_date := old.invoice_date;
  new.gst_percent  := old.gst_percent;
  new.hsn_code     := old.hsn_code;
  if old.status in ('completed','cancelled') then
    raise exception 'Deal is closed';
  end if;
  -- Only the seller (confirm_payment) or admin can finish a deal
  if new.status = 'completed' then
    raise exception 'The seller confirms payment to complete the deal';
  end if;
  return new;
end $$;

-- Seller (or admin) confirms the money arrived: deal becomes completed.
create or replace function public.confirm_payment(p_deal_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal_id for update;
  if not found then raise exception 'Deal not found'; end if;
  if d.seller_id <> auth.uid() and not is_admin() then raise exception 'Not allowed'; end if;
  if d.status in ('completed','cancelled') then raise exception 'Deal is closed'; end if;
  if d.final_amount is null then raise exception 'Final weight is not recorded yet'; end if;
  perform set_config('lsx.confirming', 'on', true);
  update deals set status = 'completed', payment_confirmed_at = now(), paid_at = coalesce(paid_at, now()) where id = p_deal_id;
  perform set_config('lsx.confirming', 'off', true);
end $$;
grant execute on function public.confirm_payment(uuid) to authenticated;

-- Billing details of both sides, for the invoice. Parties and admin only.
create or replace function public.deal_invoice_parties(p_deal_id uuid)
returns table (party text, business_name text, name text, gstin text, address text, phone text)
language plpgsql stable security definer set search_path = public as $$
declare d deals;
begin
  select * into d from deals where id = p_deal_id;
  if not found then return; end if;
  if not (auth.uid() in (d.seller_id, d.buyer_id) or is_admin()) then return; end if;
  return query
    select 'seller', p.business_name, p.full_name, p.gstin, coalesce(p.address, d.pickup_address), p.phone
      from profiles p where p.id = d.seller_id
    union all
    select 'buyer', p.business_name, p.full_name, p.gstin, p.address, p.phone
      from profiles p where p.id = d.buyer_id;
end $$;
grant execute on function public.deal_invoice_parties(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Messages between the two sides of a deal (admin can read all)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.deal_messages (
  id         bigint generated always as identity primary key,
  deal_id    uuid not null references public.deals(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists deal_messages_deal_idx on public.deal_messages (deal_id, created_at);

alter table public.deal_messages enable row level security;

create policy "deal messages: parties and admin read" on public.deal_messages for select
  using (is_admin() or exists (select 1 from deals d where d.id = deal_id
         and (d.seller_id = auth.uid() or d.buyer_id = auth.uid())));

create policy "deal messages: parties and admin write" on public.deal_messages for insert
  with check (sender_id = auth.uid() and (is_admin() or exists (select 1 from deals d where d.id = deal_id
         and d.status <> 'cancelled' and (d.seller_id = auth.uid() or d.buyer_id = auth.uid()))));

-- Deals weighed before this migration get their invoice number now
update public.deals set updated_at = now() where final_amount is not null and invoice_no is null;
