export const rolePresets = {
  promoter: { elevages:{read:true,create:true,update:true,delete:true}, suivi:{read:true,create:true,update:true,delete:true}, sales:{read:true,create:true,update:true,delete:true}, finances:{read:true,create:true,update:true,delete:true}, stocks:{read:true,create:true,update:true,delete:true}, equipe:{read:true,create:true,update:true,delete:true}, historique:{read:true} },
  manager: { elevages:{read:true,create:true,update:true,delete:false}, suivi:{read:true,create:true,update:true,delete:false}, sales:{read:true,create:true,update:true,delete:false}, finances:{read:true,create:true,update:true,delete:false}, stocks:{read:true,create:true,update:true,delete:false}, equipe:{read:true,create:false,update:false,delete:false}, historique:{read:true} },
  technician: { elevages:{read:true,create:false,update:false,delete:false}, suivi:{read:true,create:true,update:true,delete:false}, sales:{read:false,create:false,update:false,delete:false}, finances:{read:false,create:false,update:false,delete:false}, stocks:{read:true,create:false,update:false,delete:false}, equipe:{read:false,create:false,update:false,delete:false}, historique:{read:false} },
  employee: { elevages:{read:true,create:false,update:false,delete:false}, suivi:{read:true,create:true,update:false,delete:false}, sales:{read:false,create:false,update:false,delete:false}, finances:{read:false,create:false,update:false,delete:false}, stocks:{read:true,create:false,update:false,delete:false}, equipe:{read:false,create:false,update:false,delete:false}, historique:{read:false} },
  viewer: { elevages:{read:true}, suivi:{read:true}, sales:{read:true}, finances:{read:true}, stocks:{read:true}, equipe:{read:true}, historique:{read:true} },
  consultant: { elevages:{read:true}, suivi:{read:true}, sales:{read:false}, finances:{read:false}, stocks:{read:false}, equipe:{read:false}, historique:{read:true} }
};

export function permissionsForRole(role) {
  return JSON.parse(JSON.stringify(rolePresets[role] || rolePresets.employee));
}

export function resolveMemberStatus({ isActive = true, currentStatus = "pending", userId = null } = {}) {
  if (isActive === false) return "inactive";
  if (currentStatus === "inactive") return userId ? "active" : "pending";
  return currentStatus || "pending";
}
