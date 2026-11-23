create or replace function private.validate_farm_scope_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_table_name = 'daily_records' then
    if not exists (
      select 1 from public.production_cycles c
      where c.id = new.cycle_id and c.farm_id = new.farm_id
    ) then
      raise exception 'Le cycle sélectionné n’appartient pas à cette exploitation.';
    end if;

    if new.group_id is not null and not exists (
      select 1 from public.animal_groups g
      where g.id = new.group_id
        and g.farm_id = new.farm_id
        and g.cycle_id = new.cycle_id
    ) then
      raise exception 'La bande sélectionnée ne correspond pas à cette exploitation et à ce cycle.';
    end if;

  elsif tg_table_name = 'financial_transactions' then
    if new.cycle_id is not null and not exists (
      select 1 from public.production_cycles c
      where c.id = new.cycle_id and c.farm_id = new.farm_id
    ) then
      raise exception 'Le cycle sélectionné n’appartient pas à cette exploitation.';
    end if;

  elsif tg_table_name = 'feed_movements' then
    if not exists (
      select 1 from public.feed_items i
      where i.id = new.feed_item_id and i.farm_id = new.farm_id
    ) then
      raise exception 'L’article de stock n’appartient pas à cette exploitation.';
    end if;

  elsif tg_table_name = 'gestfarm_stock_transfers' then
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
