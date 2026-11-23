create or replace function private.validate_farm_scope_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_species text;
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

  elsif tg_table_name = 'farm_tasks' then
    if new.assigned_to is not null and not exists (
      select 1 from public.farm_members m where m.id = new.assigned_to and m.farm_id = new.farm_id
    ) then
      raise exception 'Le membre assigné à la tâche ne fait pas partie de cette exploitation.';
    end if;
    if new.replacement_id is not null and not exists (
      select 1 from public.farm_members m where m.id = new.replacement_id and m.farm_id = new.farm_id
    ) then
      raise exception 'Le remplaçant ne fait pas partie de cette exploitation.';
    end if;

  elsif tg_table_name = 'farm_absences' then
    if new.member_id is not null and not exists (
      select 1 from public.farm_members m where m.id = new.member_id and m.farm_id = new.farm_id
    ) then
      raise exception 'Le membre déclaré absent ne fait pas partie de cette exploitation.';
    end if;

  elsif tg_table_name = 'animal_group_assignments' then
    if not exists (
      select 1 from public.animal_groups g where g.id = new.group_id and g.farm_id = new.farm_id
    ) then
      raise exception 'La bande assignée ne fait pas partie de cette exploitation.';
    end if;
    if not exists (
      select 1 from public.farm_members m where m.id = new.member_id and m.farm_id = new.farm_id
    ) then
      raise exception 'Le membre assigné ne fait pas partie de cette exploitation.';
    end if;

  elsif tg_table_name = 'gestfarm_offspring_batches' then
    select c.species into v_species
    from public.animal_groups g
    join public.production_cycles c on c.id = g.cycle_id
    where g.id = new.source_group_id and g.farm_id = new.farm_id;

    if v_species is distinct from new.species then
      raise exception 'La portée doit être rattachée à une bande de la même exploitation et de la même espèce.';
    end if;

    if new.destination_group_id is not null then
      select c.species into v_species
      from public.animal_groups g
      join public.production_cycles c on c.id = g.cycle_id
      where g.id = new.destination_group_id and g.farm_id = new.farm_id;

      if v_species is distinct from new.species then
        raise exception 'La destination de la portée doit appartenir à la même exploitation et à la même espèce.';
      end if;
    end if;

    if new.species = 'rabbits' and not exists (
      select 1 from public.rabbit_reproduction_events e
      where e.id = new.birth_event_id and e.farm_id = new.farm_id and e.group_id = new.source_group_id
    ) then
      raise exception 'L’événement de mise bas de la portée ne correspond pas à cette exploitation.';
    elsif new.species = 'pigs' and not exists (
      select 1 from public.pig_reproduction_events e
      where e.id = new.birth_event_id and e.farm_id = new.farm_id and e.group_id = new.source_group_id
    ) then
      raise exception 'L’événement de mise bas de la portée ne correspond pas à cette exploitation.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_farm_task_scope on public.farm_tasks;
create trigger validate_farm_task_scope
before insert or update of farm_id, assigned_to, replacement_id on public.farm_tasks
for each row execute function private.validate_farm_scope_references();

drop trigger if exists validate_farm_absence_scope on public.farm_absences;
create trigger validate_farm_absence_scope
before insert or update of farm_id, member_id on public.farm_absences
for each row execute function private.validate_farm_scope_references();

drop trigger if exists validate_group_assignment_scope on public.animal_group_assignments;
create trigger validate_group_assignment_scope
before insert or update of farm_id, group_id, member_id on public.animal_group_assignments
for each row execute function private.validate_farm_scope_references();

drop trigger if exists validate_offspring_batch_scope on public.gestfarm_offspring_batches;
create trigger validate_offspring_batch_scope
before insert or update of farm_id, species, source_group_id, birth_event_id, destination_group_id on public.gestfarm_offspring_batches
for each row execute function private.validate_farm_scope_references();
