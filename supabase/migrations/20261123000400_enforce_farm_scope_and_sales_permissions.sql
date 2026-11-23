create or replace function private.validate_farm_scope_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_table_name in ('daily_records','financial_transactions') and new.cycle_id is not null then
    if not exists (
      select 1 from public.production_cycles c
      where c.id = new.cycle_id and c.farm_id = new.farm_id
    ) then
      raise exception 'Le cycle sélectionné n’appartient pas à cette exploitation.';
    end if;
  end if;

  if tg_table_name = 'daily_records' and new.group_id is not null then
    if not exists (
      select 1 from public.animal_groups g
      where g.id = new.group_id
        and g.farm_id = new.farm_id
        and g.cycle_id = new.cycle_id
    ) then
      raise exception 'La bande sélectionnée ne correspond pas à cette exploitation et à ce cycle.';
    end if;
  end if;

  if tg_table_name = 'feed_movements' then
    if not exists (
      select 1 from public.feed_items i
      where i.id = new.feed_item_id and i.farm_id = new.farm_id
    ) then
      raise exception 'L’article de stock n’appartient pas à cette exploitation.';
    end if;
  end if;

  if tg_table_name = 'gestfarm_stock_transfers' then
    if not exists (
      select 1 from public.feed_items i
      where i.id = new.source_feed_item_id and i.farm_id = new.farm_id
    ) or not exists (
      select 1 from public.feed_items i
      where i.id = new.destination_feed_item_id and i.farm_id = new.farm_id
    ) then
      raise exception 'Les articles source et destination doivent appartenir à la même exploitation.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_daily_record_scope on public.daily_records;
create trigger validate_daily_record_scope
before insert or update of farm_id, cycle_id, group_id on public.daily_records
for each row execute function private.validate_farm_scope_references();

drop trigger if exists validate_financial_transaction_scope on public.financial_transactions;
create trigger validate_financial_transaction_scope
before insert or update of farm_id, cycle_id on public.financial_transactions
for each row execute function private.validate_farm_scope_references();

drop trigger if exists validate_feed_movement_scope on public.feed_movements;
create trigger validate_feed_movement_scope
before insert or update of farm_id, feed_item_id on public.feed_movements
for each row execute function private.validate_farm_scope_references();

drop trigger if exists validate_stock_transfer_scope on public.gestfarm_stock_transfers;
create trigger validate_stock_transfer_scope
before insert or update of farm_id, source_feed_item_id, destination_feed_item_id on public.gestfarm_stock_transfers
for each row execute function private.validate_farm_scope_references();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.daily_records'::regclass
      and conname = 'daily_records_integer_counts_check'
  ) then
    alter table public.daily_records
      add constraint daily_records_integer_counts_check
      check (record_type not in ('mortality','eggs') or quantity is null or quantity = trunc(quantity));
  end if;
end
$$;

drop policy if exists gestfarm_sales_insert on public.gestfarm_sales;
drop policy if exists gestfarm_sales_update on public.gestfarm_sales;
drop policy if exists gestfarm_sales_delete on public.gestfarm_sales;
drop policy if exists gestfarm_sales_read on public.gestfarm_sales;
create policy gestfarm_sales_read
on public.gestfarm_sales
for select
to authenticated
using (
  private.gestfarm_has_permission(farm_id, 'sales', 'read')
  or private.gestfarm_has_permission(farm_id, 'finances', 'read')
);
