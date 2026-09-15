import { UserRole } from '../types';

export interface RolePermissions {
  name: UserRole;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  allowedModules: {
    dashboard: boolean;
    parties: boolean;
    items: boolean;
    sale: boolean;
    purchase: boolean;
    expenses: boolean;
    bank: boolean;
    reports: boolean;
    syncShare: boolean;
    backup: boolean;
    utilities: boolean;
    settings: boolean;
  };
  features: {
    canViewCostsAndProfit: boolean;
    canAddEditItems: boolean;
    canCreateSale: boolean;
    canCreatePurchase: boolean;
    canCollectPayments: boolean;
    canMakePayments: boolean;
    canViewFinancialReports: boolean;
    canManageBankAccounts: boolean;
    canManageUsersAndRoles: boolean;
    canDeleteTransactions: boolean;
    // Controlled Items & Regulatory Features
    canViewControlledItems: boolean;
    canSellControlledItems: boolean;
    canApproveControlledSale: boolean;
    canPrintControlledInvoice: boolean;
    canReprintControlledInvoice: boolean;
    canEditControlledItem: boolean;
    canAdjustControlledStock: boolean;
    canReturnControlledItem: boolean;
    canExportControlledReport: boolean;
  };
}

export const ROLE_DEFINITIONS: Record<UserRole, RolePermissions> = {
  'Primary Admin': {
    name: 'Primary Admin',
    title: 'Primary Admin (Owner)',
    description: 'Full unrestricted access to all modules, financial data, users, and system configurations.',
    badgeBg: 'bg-red-100 text-red-700 border-red-200',
    badgeText: 'PRIMARY ADMIN',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: true,
      expenses: true,
      bank: true,
      reports: true,
      syncShare: true,
      backup: true,
      utilities: true,
      settings: true,
    },
    features: {
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canCreatePurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canManageBankAccounts: true,
      canManageUsersAndRoles: true,
      canDeleteTransactions: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    },
  },
  'Secondary Admin': {
    name: 'Secondary Admin',
    title: 'Secondary Admin',
    description: 'Can manage all business day-to-day operations, sales, purchases, stock, expenses, and staff except company deletion.',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'SECONDARY ADMIN',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: true,
      expenses: true,
      bank: true,
      reports: true,
      syncShare: true,
      backup: true,
      utilities: true,
      settings: true,
    },
    features: {
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canCreatePurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canManageBankAccounts: true,
      canManageUsersAndRoles: true,
      canDeleteTransactions: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    },
  },
  'Salesman': {
    name: 'Salesman',
    title: 'Salesman',
    description: 'Can only create Sale Orders, Quotations, Estimates, and view Customer lists. Cannot see purchase costs, margins, bank accounts, or financial reports.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'SALESMAN',
    allowedModules: {
      dashboard: true,
      parties: true, // Customers only
      items: true, // Read-only selling price
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: {
      canViewCostsAndProfit: false,
      canAddEditItems: false,
      canCreateSale: true,
      canCreatePurchase: false,
      canCollectPayments: true,
      canMakePayments: false,
      canViewFinancialReports: false,
      canManageBankAccounts: false,
      canManageUsersAndRoles: false,
      canDeleteTransactions: false,
      canViewControlledItems: false,
      canSellControlledItems: false,
      canApproveControlledSale: false,
      canPrintControlledInvoice: false,
      canReprintControlledInvoice: false,
      canEditControlledItem: false,
      canAdjustControlledStock: false,
      canReturnControlledItem: false,
      canExportControlledReport: false,
    },
  },
  'Biller': {
    name: 'Biller',
    title: 'Biller / Cashier',
    description: 'Can generate Sale Invoices, collect cash payments, and print bills. Hidden from purchase invoices, bank accounts, and profit/loss reports.',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'BILLER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true, // Read-only selling price
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: {
      canViewCostsAndProfit: false,
      canAddEditItems: false,
      canCreateSale: true,
      canCreatePurchase: false,
      canCollectPayments: true,
      canMakePayments: false,
      canViewFinancialReports: false,
      canManageBankAccounts: false,
      canManageUsersAndRoles: false,
      canDeleteTransactions: false,
      canViewControlledItems: false,
      canSellControlledItems: false,
      canApproveControlledSale: false,
      canPrintControlledInvoice: false,
      canReprintControlledInvoice: false,
      canEditControlledItem: false,
      canAdjustControlledStock: false,
      canReturnControlledItem: false,
      canExportControlledReport: false,
    },
  },
  'Biller and Salesman': {
    name: 'Biller and Salesman',
    title: 'Biller and Salesman',
    description: 'Combines full billing and sales desk features. Can create all sales vouchers, view products & prices, and receive customer payments.',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'BILLER AND SALESMAN',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: {
      canViewCostsAndProfit: false,
      canAddEditItems: false,
      canCreateSale: true,
      canCreatePurchase: false,
      canCollectPayments: true,
      canMakePayments: false,
      canViewFinancialReports: false,
      canManageBankAccounts: false,
      canManageUsersAndRoles: false,
      canDeleteTransactions: false,
      canViewControlledItems: false,
      canSellControlledItems: false,
      canApproveControlledSale: false,
      canPrintControlledInvoice: false,
      canReprintControlledInvoice: false,
      canEditControlledItem: false,
      canAdjustControlledStock: false,
      canReturnControlledItem: false,
      canExportControlledReport: false,
    },
  },
  'CA/Accountant': {
    name: 'CA/Accountant',
    title: 'CA / Accountant',
    description: 'Full access to Financial Reports, Profit & Loss, Balance Sheet, Day Book, Cash & Bank, Expenses, and Taxes. Restricted from inventory modifications.',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'CA/ACCOUNTANT',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: false,
      sale: true, // Audit/view
      purchase: true, // Audit/view
      expenses: true,
      bank: true,
      reports: true,
      syncShare: false,
      backup: true,
      utilities: true,
      settings: false,
    },
    features: {
      canViewCostsAndProfit: true,
      canAddEditItems: false,
      canCreateSale: false,
      canCreatePurchase: false,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canManageBankAccounts: true,
      canManageUsersAndRoles: false,
      canDeleteTransactions: false,
      canViewControlledItems: true,
      canSellControlledItems: false,
      canApproveControlledSale: false,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: false,
      canAdjustControlledStock: false,
      canReturnControlledItem: false,
      canExportControlledReport: true,
    },
  },
  'Stock Keeper': {
    name: 'Stock Keeper',
    title: 'Stock Keeper / Store Manager',
    description: 'Can manage Inventory items, stock batches, low-stock alerts, purchase bills, and supplier receipts. Hidden from customer receivables, bank books, and profit reports.',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'STOCK KEEPER',
    allowedModules: {
      dashboard: true,
      parties: true, // Suppliers only
      items: true,
      sale: false,
      purchase: true,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: true,
      settings: false,
    },
    features: {
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: false,
      canCreatePurchase: true,
      canCollectPayments: false,
      canMakePayments: false,
      canViewFinancialReports: false,
      canManageBankAccounts: false,
      canManageUsersAndRoles: false,
      canDeleteTransactions: false,
      canViewControlledItems: true,
      canSellControlledItems: false,
      canApproveControlledSale: false,
      canPrintControlledInvoice: false,
      canReprintControlledInvoice: false,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: false,
    },
  },
};

/**
 * Retrieves the active role permissions matrix, applying any custom overrides stored in localStorage
 */
export function getActiveRolePermissions(): Record<UserRole, RolePermissions> {
  try {
    const stored = localStorage.getItem('mbi_rbac_permissions');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...ROLE_DEFINITIONS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse custom RBAC permissions from localStorage:', e);
  }
  return { ...ROLE_DEFINITIONS };
}

/**
 * Saves custom role permissions to localStorage
 */
export function saveCustomRolePermissions(updatedPermissions: Record<UserRole, RolePermissions>): void {
  try {
    localStorage.setItem('mbi_rbac_permissions', JSON.stringify(updatedPermissions));
  } catch (e) {
    console.error('Failed to save custom RBAC permissions:', e);
  }
}

/**
 * Resets custom role permissions back to system defaults
 */
export function resetRolePermissionsToDefault(): Record<UserRole, RolePermissions> {
  try {
    localStorage.removeItem('mbi_rbac_permissions');
  } catch (e) {}
  return { ...ROLE_DEFINITIONS };
}

/**
 * Normalizes any legacy or custom role string to valid UserRole
 */
export function normalizeUserRole(role?: string): UserRole {
  if (!role) return 'Primary Admin';
  const match = Object.keys(ROLE_DEFINITIONS).find(
    r => r.toLowerCase() === role.toLowerCase()
  );
  if (match) return match as UserRole;
  if (role.toLowerCase().includes('primary')) return 'Primary Admin';
  if (role.toLowerCase().includes('secondary')) return 'Secondary Admin';
  if (role.toLowerCase().includes('admin')) return 'Primary Admin';
  if (role.toLowerCase().includes('sales')) return 'Salesman';
  if (role.toLowerCase().includes('biller')) return 'Biller';
  if (role.toLowerCase().includes('account') || role.toLowerCase().includes('ca')) return 'CA/Accountant';
  if (role.toLowerCase().includes('stock')) return 'Stock Keeper';
  return 'Primary Admin';
}

/**
 * Checks if current user role has permission to access a specific route
 */
export function hasRouteAccess(role: UserRole, pathname: string): boolean {
  const allPerms = getActiveRolePermissions();
  const perms = allPerms[role] || allPerms['Primary Admin'] || ROLE_DEFINITIONS['Primary Admin'];
  
  if (pathname === '/' || pathname === '') return perms.allowedModules.dashboard;
  if (pathname.startsWith('/parties')) return perms.allowedModules.parties;
  if (pathname.startsWith('/items')) return perms.allowedModules.items;
  if (pathname.startsWith('/top-products')) return perms.allowedModules.items || perms.allowedModules.dashboard;
  if (pathname.startsWith('/sale')) return perms.allowedModules.sale;
  if (pathname.startsWith('/purchase')) return perms.allowedModules.purchase;
  if (pathname.startsWith('/expenses')) return perms.allowedModules.expenses;
  if (pathname.startsWith('/bank') || pathname.startsWith('/cash-in-hand') || pathname.startsWith('/shift-management')) return perms.allowedModules.bank || perms.allowedModules.sale;
  if (pathname.startsWith('/reports')) return perms.allowedModules.reports;
  if (pathname.startsWith('/sync-share')) return perms.allowedModules.syncShare;
  if (pathname.startsWith('/utilities')) return perms.allowedModules.utilities;
  if (pathname.startsWith('/settings')) return perms.allowedModules.settings;
  
  return true;
}
