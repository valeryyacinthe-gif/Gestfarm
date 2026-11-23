drop policy if exists gestfarm_farms_read on public.farms;
create policy gestfarm_farms_read
on public.farms
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.gestfarm_has_permission(id, 'elevages', 'read')
  or private.gestfarm_has_permission(id, 'suivi', 'read')
  or private.gestfarm_has_permission(id, 'sales', 'read')
  or private.gestfarm_has_permission(id, 'finances', 'read')
  or private.gestfarm_has_permission(id, 'stocks', 'read')
  or private.gestfarm_has_permission(id, 'equipe', 'read')
  or private.gestfarm_has_permission(id, 'historique', 'read')
);
