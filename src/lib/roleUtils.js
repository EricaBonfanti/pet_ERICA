export const ROLES = {
  CLIENTE: 'cliente',
  FUNCIONARIO: 'funcionario',
  DONO: 'dono',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  cliente: 'Cliente',
  funcionario: 'Funcionário',
  dono: 'Dono',
  admin: 'Administrador',
};

export function canAccessFinanceiro(role) {
  return role === ROLES.DONO || role === ROLES.ADMIN;
}

export function canManageAgenda(role) {
  return role === ROLES.FUNCIONARIO || role === ROLES.DONO || role === ROLES.ADMIN;
}

export function canManageUsers(role) {
  return role === ROLES.DONO || role === ROLES.ADMIN;
}

export function isStaff(role) {
  return role !== ROLES.CLIENTE;
}