-- Finance: adjustable platform fee rate, and tracking whether each deal's fee was collected.
-- Run after 20261014000000_fees_invoices_chat.sql.

-- ─────────────────────────────────────────────────────────────
-- Platform settings (admin only)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.platform_settings (
  key        text primary key,
  value      numeric not null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (key, value) values ('commission_percent', 0.25)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists "settings: admin" on public.platform_settings;
create policy "settings: admin" on public.platform_settings for all using (is_admin()) with check (is_admin());

-- New deals take the fee rate in force on the day they are made; later rate changes
-- do not alter existing deals.
create or replace function public.deals_fee_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.commission_percent := coalesce(
    (select value from platform_settings where key = 'commission_percent'), new.commission_percent, 0.25);
  return new;
end $$;

drop trigger if exists deals_fee_rate on public.deals;
create trigger deals_fee_rate before insert on public.deals
  for each row execute function public.deals_fee_rate();

-- ─────────────────────────────────────────────────────────────
-- Fee collection per deal
-- ─────────────────────────────────────────────────────────────

alter table public.deals add column if not exists fee_received_at timestamptz;
alter table public.deals add column if not exists fee_ref text;

-- Same guard as before, plus: members cannot touch the fee collection fields.
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
  new.fee_received_at      := old.fee_received_at;
  new.fee_ref              := old.fee_ref;
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
