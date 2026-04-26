export const PERMISSIONS = {
  pos: {
    label: "Point of Sale",
    actions: {
      view: "View POS terminal",
      process_sale: "Process sales",
      apply_discount: "Apply discounts",
      void: "Void transactions",
      process_return: "Initiate returns",
      approve_return: "Approve & process refunds",
    },
  },
  inventory: {
    label: "Inventory",
    actions: {
      view: "View items",
      create: "Add items",
      edit: "Edit items",
      delete: "Delete items",
    },
  },
  appointments: {
    label: "Appointments",
    actions: {
      view: "View appointments",
      create: "Create appointments",
      status: "Update status",
      cancel: "Cancel appointments",
    },
  },
  crm: {
    label: "CRM",
    actions: {
      view: "View contacts",
      create: "Add contacts",
      edit: "Edit contacts",
      delete: "Delete contacts",
    },
  },
  assets: {
    label: "Assets",
    actions: {
      view: "View assets",
      create: "Add assets",
      edit: "Edit assets",
      delete: "Delete assets",
    },
  },
  billing: {
    label: "Billing",
    actions: {
      view: "View invoices",
      create: "Create invoices",
      edit: "Edit invoices",
      mark_paid: "Mark as paid",
    },
  },
  "job-orders": {
    label: "Job Orders",
    actions: {
      view: "View job orders",
      create: "Create job orders",
      edit: "Edit job orders",
      status: "Update status",
    },
  },
  hr: {
    label: "HR",
    actions: {
      view: "View HR",
      attendance: "Manage attendance",
      leave: "Manage leave",
      payroll: "Manage payroll",
    },
  },
  reports: {
    label: "Reports",
    actions: {
      view: "View reports",
    },
  },
  users: {
    label: "Users",
    actions: {
      view: "View users",
      create: "Create users",
      edit: "Edit users",
      delete: "Delete users",
    },
  },
  promotions: {
    label: "Promotions",
    actions: {
      view: "View promotions",
      create: "Create promotions",
      edit: "Edit promotions",
      delete: "Delete promotions",
    },
  },
  services: {
    label: "Services",
    actions: {
      view: "View services",
      create: "Create services",
      edit: "Edit services",
      delete: "Delete services",
    },
  },
  loyalty: {
    label: "Loyalty",
    actions: {
      view: "View loyalty cards",
      create: "Create / delete cards",
      stamp: "Add stamps",
      redeem: "Redeem rewards",
      settings: "Manage loyalty settings",
    },
  },
} as const;

export type PermissionModule = keyof typeof PERMISSIONS;
export type UserPermissions = Record<string, boolean>;

export function mergePermissions(
  ...permissionSets: Array<UserPermissions | null | undefined>
): UserPermissions {
  return permissionSets.reduce<UserPermissions>((merged, current) => {
    if (!current) return merged;
    return { ...merged, ...current };
  }, {});
}

export function getPermissionLabel(key: string): string {
  const [moduleSlug, actionKey] = key.split(".");
  const moduleDef = PERMISSIONS[moduleSlug as PermissionModule];

  if (!moduleDef || !actionKey) return key;

  const actionLabel = moduleDef.actions[actionKey as keyof typeof moduleDef.actions];
  return typeof actionLabel === "string" ? actionLabel : key;
}

/** Check if a user has a specific permission key (e.g. "pos.void") */
export function hasPermission(permissions: UserPermissions, key: string): boolean {
  return permissions[key] === true;
}

/** Check if a user can access a module at all (has the .view permission) */
export function canViewModule(permissions: UserPermissions, moduleSlug: string): boolean {
  return hasPermission(permissions, `${moduleSlug}.view`);
}

/** Returns true if the role bypasses permission checks entirely */
export function isPrivilegedRole(role: string): boolean {
  return role === "owner" || role === "admin";
}
