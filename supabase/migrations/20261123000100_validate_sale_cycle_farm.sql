-- GESTFARM: prevent a SECURITY DEFINER sale RPC from attaching
-- a financial transaction to a production cycle belonging to another farm.
-- Safe to re-run: if the guard is already present, this migration is a no-op.

do $$
declare
  v_oid oid;
  v_def text;
  v_old text := $needle$  if p_location_type not in ('farm','depot','other') then raise exception 'Lieu de vente invalide.'; end if;
  v_total := round(p_quantity*p_unit_price,2);$needle$;
  v_new text := $replacement$  if p_location_type not in ('farm','depot','other') then raise exception 'Lieu de vente invalide.'; end if;

  if p_cycle_id is not null and not exists (
    select 1 from public.production_cycles
    where id = p_cycle_id and farm_id = p_farm_id
  ) then
    raise exception 'Le cycle sélectionné n’appartient pas à cette exploitation.';
  end if;

  v_total := round(p_quantity*p_unit_price,2);$replacement$;
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='gestfarm_register_sale'
    and pg_get_function_identity_arguments(p.oid) like 'p_farm_id uuid%';

  if v_oid is null then
    raise exception 'Fonction gestfarm_register_sale introuvable.';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if position('Le cycle sélectionné n’appartient pas à cette exploitation.' in v_def) > 0 then
    raise notice 'La validation de cohérence du cycle est déjà présente.';
    return;
  end if;

  if position(v_old in v_def) = 0 then
    raise exception 'Point d’insertion introuvable : aucune modification appliquée.';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end $$;
