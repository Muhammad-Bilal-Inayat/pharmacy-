import { initDB } from './db';
import { 
  Medicine, Invoice, Supplier, PurchaseOrder, AuditLog, 
  Expense, PartyPayment, BankAccount, BankTransaction, ChequeRecord, 
  LoanAccount, AppUserRecord, UserActivityLog 
} from '../types';

export interface BackupSnapshot {
  version: string;
  timestamp: string;
  formattedDate: string;
  appName: string;
  firmName?: string;
  system: {
    environment: string;
    engine: string;
    indexedDbVersion: number;
  };
  stats: {
    medicinesCount: number;
    invoicesCount: number;
    partiesCount: number;
    purchaseOrdersCount: number;
    expensesCount: number;
    paymentsCount: number;
    bankAccountsCount: number;
    usersCount: number;
    auditLogsCount: number;
    totalRecords: number;
  };
  data: {
    medicines: Medicine[];
    invoices: Invoice[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    expenses: Expense[];
    partyPayments: PartyPayment[];
    bankAccounts: BankAccount[];
    bankTransactions: BankTransaction[];
    cheques: ChequeRecord[];
    loanAccounts: LoanAccount[];
    appUsers: AppUserRecord[];
    userActivities: UserActivityLog[];
    auditLogs: AuditLog[];
  };
  settingsSnapshot?: {
    appSettings?: any;
    rolePermissions?: any;
    activeTheme?: string;
  };
}

/**
 * Generate a complete JSON snapshot of all IndexedDB stores and system state
 */
export async function generateFullDatabaseSnapshot(): Promise<BackupSnapshot> {
  const db = await initDB();

  const [
    medicines,
    invoices,
    suppliers,
    purchaseOrders,
    expenses,
    partyPayments,
    bankAccounts,
    bankTransactions,
    cheques,
    loanAccounts,
    appUsers,
    userActivities,
    auditLogs
  ] = await Promise.all([
    db.getAll('medicines').catch(() => []),
    db.getAll('invoices').catch(() => []),
    db.getAll('suppliers').catch(() => []),
    db.getAll('purchaseOrders').catch(() => []),
    db.getAll('expenses').catch(() => []),
    db.getAll('partyPayments').catch(() => []),
    db.getAll('bankAccounts').catch(() => []),
    db.getAll('bankTransactions').catch(() => []),
    db.getAll('cheques').catch(() => []),
    db.getAll('loanAccounts').catch(() => []),
    db.getAll('appUsers').catch(() => []),
    db.getAll('userActivities').catch(() => []),
    db.getAll('auditLogs').catch(() => []),
  ]);

  // Read local storage settings
  let appSettings = null;
  let rolePermissions = null;
  try {
    const rawSettings = localStorage.getItem('pharma_settings');
    if (rawSettings) appSettings = JSON.parse(rawSettings);
    const rawRbac = localStorage.getItem('mbi_rbac_permissions');
    if (rawRbac) rolePermissions = JSON.parse(rawRbac);
  } catch (e) {}

  const now = new Date();
  const totalRecords = 
    medicines.length + invoices.length + suppliers.length + 
    purchaseOrders.length + expenses.length + partyPayments.length + 
    bankAccounts.length + bankTransactions.length + cheques.length + 
    loanAccounts.length + appUsers.length + userActivities.length + auditLogs.length;

  const snapshot: BackupSnapshot = {
    version: '4.2.0',
    timestamp: now.toISOString(),
    formattedDate: now.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }),
    appName: 'MBI INVENTRA PHARMACY & INVENTORY',
    firmName: appSettings?.company?.name || 'MBI INVENTRA',
    system: {
      environment: 'IndexedDB Offline-First & Sync Engine',
      engine: 'IDB / Browser Storage API',
      indexedDbVersion: 4,
    },
    stats: {
      medicinesCount: medicines.length,
      invoicesCount: invoices.length,
      partiesCount: suppliers.length,
      purchaseOrdersCount: purchaseOrders.length,
      expensesCount: expenses.length,
      paymentsCount: partyPayments.length,
      bankAccountsCount: bankAccounts.length,
      usersCount: appUsers.length,
      auditLogsCount: auditLogs.length,
      totalRecords,
    },
    data: {
      medicines,
      invoices,
      suppliers,
      purchaseOrders,
      expenses,
      partyPayments,
      bankAccounts,
      bankTransactions,
      cheques,
      loanAccounts,
      appUsers,
      userActivities,
      auditLogs,
    },
    settingsSnapshot: {
      appSettings,
      rolePermissions,
    }
  };

  return snapshot;
}

/**
 * Downloads the generated snapshot as a secure, timestamped .json file
 */
export function downloadBackupSnapshot(snapshot: BackupSnapshot) {
  const dateStr = new Date(snapshot.timestamp)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-');

  const filename = `mbi-inventra-backup-${dateStr}.json`;
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Record last backup timestamp in localStorage
  localStorage.setItem('mbi_last_backup_timestamp', snapshot.timestamp);
  localStorage.setItem('mbi_last_backup_records', snapshot.stats.totalRecords.toString());
}

/**
 * Validates and restores a database snapshot from JSON into IndexedDB
 */
export async function restoreDatabaseFromBackup(jsonString: string): Promise<{ success: boolean; message: string; recordCount: number }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      throw new Error('Invalid backup file format: Missing "data" payload.');
    }

    const db = await initDB();
    const { data, settingsSnapshot } = parsed;
    let restoredCount = 0;

    // Helper to bulk insert
    const insertStore = async (storeName: any, records: any[]) => {
      if (!Array.isArray(records) || records.length === 0) return;
      const tx = db.transaction(storeName, 'readwrite');
      for (const item of records) {
        if (item && item.id) {
          await tx.store.put(item);
          restoredCount++;
        }
      }
      await tx.done;
    };

    if (data.medicines) await insertStore('medicines', data.medicines);
    if (data.invoices) await insertStore('invoices', data.invoices);
    if (data.suppliers) await insertStore('suppliers', data.suppliers);
    if (data.purchaseOrders) await insertStore('purchaseOrders', data.purchaseOrders);
    if (data.expenses) await insertStore('expenses', data.expenses);
    if (data.partyPayments) await insertStore('partyPayments', data.partyPayments);
    if (data.bankAccounts) await insertStore('bankAccounts', data.bankAccounts);
    if (data.bankTransactions) await insertStore('bankTransactions', data.bankTransactions);
    if (data.cheques) await insertStore('cheques', data.cheques);
    if (data.loanAccounts) await insertStore('loanAccounts', data.loanAccounts);
    if (data.appUsers) await insertStore('appUsers', data.appUsers);
    if (data.userActivities) await insertStore('userActivities', data.userActivities);
    if (data.auditLogs) await insertStore('auditLogs', data.auditLogs);

    if (settingsSnapshot?.appSettings) {
      localStorage.setItem('pharma_settings', JSON.stringify(settingsSnapshot.appSettings));
    }
    if (settingsSnapshot?.rolePermissions) {
      localStorage.setItem('mbi_rbac_permissions', JSON.stringify(settingsSnapshot.rolePermissions));
    }

    return {
      success: true,
      message: `Successfully restored ${restoredCount} records from backup snapshot.`,
      recordCount: restoredCount
    };
  } catch (err: any) {
    console.error('Failed to restore backup snapshot:', err);
    return {
      success: false,
      message: err?.message || 'Failed to parse and restore backup file.',
      recordCount: 0
    };
  }
}
