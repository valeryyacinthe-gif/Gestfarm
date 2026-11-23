create or replace function public.gestfarm_transfer_offspring_batch(
  p_batch_id uuid,
  p_destination_group_id uuid,
  p_quantity integer,
  p_destination_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_batch record;
  v_destination record;
  v_available integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité transférée doit être un entier positif.';
  end if;

  -- Verrouille la portée pour empêcher deux transferts simultanés de dépasser le disponible.
  select b.id, b.farm_id, b.species, b.source_group_id,
         b.weaned_count, b.transferred_count, b.sold_count
    into v_batch
    from public.gestfarm_offspring_batches b
   where b.id = p_batch_id
   for update;

  if not found then
    raise exception 'Portée introuvable.';
  end if;

  if not private.gestfarm_has_permission(v_batch.farm_id, 'suivi', 'update')
     or not private.gestfarm_has_permission(v_batch.farm_id, 'elevages', 'update') then
    raise exception 'Permission insuffisante pour transférer les jeunes vers un lot d’engraissement.';
  end if;

  -- Verrouille également le lot destinataire : son effectif est incrémenté sans écrasement concurrent.
  select g.id, g.current_count, g.deleted_at, c.species
    into v_destination
    from public.animal_groups g
    join public.production_cycles c on c.id = g.cycle_id
   where g.id = p_destination_group_id
     and g.farm_id = v_batch.farm_id
     and g.deleted_at is null
     and c.deleted_at is null
   for update of g;

  if not found then
    raise exception 'Lot destinataire introuvable ou archivé.';
  end if;

  if v_destination.species <> v_batch.species then
    raise exception 'Le lot destinataire doit être de la même espèce que la portée.';
  end if;

  if p_destination_group_id = v_batch.source_group_id then
    raise exception 'Le lot destinataire doit être différent du lot des reproducteurs.';
  end if;

  v_available := greatest(0, coalesce(v_batch.weaned_count, 0)
    - coalesce(v_batch.transferred_count, 0)
    - coalesce(v_batch.sold_count, 0));

  if p_quantity > v_available then
    raise exception 'Jeunes sevrés insuffisants. Quantité encore disponible : %.', v_available;
  end if;

  update public.animal_groups
     set current_count = current_count + p_quantity
   where id = p_destination_group_id
     and farm_id = v_batch.farm_id;

  update public.gestfarm_offspring_batches
     set transferred_count = transferred_count + p_quantity,
         destination_type = 'fattening',
         destination_group_id = p_destination_group_id,
         destination_notes = nullif(trim(p_destination_notes), ''),
         updated_at = now()
   where id = p_batch_id
     and farm_id = v_batch.farm_id;
end;
$function$;

revoke all on function public.gestfarm_transfer_offspring_batch(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.gestfarm_transfer_offspring_batch(uuid, uuid, integer, text) to authenticated;
