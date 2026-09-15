import { hashPassword, generateTOTPSecret, generateEmergencyBackupCodes, verifyTOTPToken } from './totpService';
import { v4 as uuidv4 } from 'uuid';

export interface ModulePermissions {
  sales: boolean;
  purchases: boolean;
  pharmacy: boolean;
  inventory: boolean;
  reports: boolean;
  cloudSync: boolean;
  multiBranch: boolean;
  aiVoice: boolean;
  cashierShifts: boolean;
  customPrint: boolean;
  accountsLedger: boolean;
  narcoticsSchedule: boolean;
  customerLoyalty: boolean;
  bulkExcel: boolean;
  barcodeLabels: boolean;
}

export interface ClientLicense {
  id: string;
  licenseKey: string;
  clientName: string; // Business Name (e.g. Al-Madina Pharmacy)
  ownerName: string;
  phone: string;
  city: string;
  plan: 'Trial (15 Days)' | 'Trial (30 Days)' | 'Standard POS' | 'Pharmacy Pro' | 'Enterprise Multi-Branch' | 'Lifetime Perpetual';
  status: 'Active' | 'Suspended' | 'Expired' | 'Deactivated';
  issueDate: string;
  expiryDate: string; // YYYY-MM-DD or 'Lifetime'
  maxDevices: number;
  strictHardwareLock: boolean;
  maxOfflineDays: number; // e.g. 7, 15, 30, 0 = unlimited
  boundHardwareIds: string[];
  allowedModules: ModulePermissions;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MasterActiveUser {
  id: string;
  name: string;
  emailOrPhone: string;
  role: 'Primary Admin' | 'Store Manager' | 'Cashier' | 'Accountant' | 'Sales Staff' | 'Guest';
  status: 'Active' | 'Suspended' | 'Disconnected';
  passcode: string;
  storeName: string;
  installationId?: string;
  boundHwid?: string;
  lastSyncTime: string;
  isOnline: boolean;
  totalTransactions?: number;
  sessionDurationMinutes?: number;
  totalActiveHours?: number;
}

export interface ClientInstanceHeartbeat {
  installationId: string;
  clientName: string;
  ownerName: string;
  phone: string;
  licenseKey: string;
  plan: string;
  status: 'Active' | 'Suspended' | 'Expired' | 'Deactivated';
  appVersion: string;
  lastHeartbeat: string;
  ipAddress?: string;
  userAgent?: string;
  hardwareFingerprint?: string;
  dataMetrics: {
    totalInvoices: number;
    totalItems: number;
    totalParties: number;
    totalPayments: number;
    estimatedRevenue: number;
    databaseSizeKb: number;
  };
  remoteMessage?: string | null;
  remoteCommand?: 'force_backup' | 'emergency_lock' | 'clear_cache' | 'screen_alert' | 'unlock' | null;
  remoteCommandPayload?: any;
}

export interface ClientBackupRecord {
  id: string;
  clientName: string;
  installationId: string;
  timestamp: string;
  fileName: string;
  sizeKb: number;
  recordCounts: {
    medicines: number;
    invoices: number;
    suppliers: number;
    payments: number;
    expenses: number;
    customers?: number;
  };
  notes?: string;
  backupPayload?: any;
}

export interface MasterAuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'LICENSE' | 'FLEET' | 'BACKUP' | 'SECURITY' | 'COMMAND';
  details: string;
  targetClient?: string;
}

export interface MasterServerAdminConfig {
  masterUsername: string;
  masterPasswordHash: string;
  is2FAEnabled: boolean;
  totpSecret: string;
  backupCodes: string[];
  usedBackupCodes: string[];
  apiSecretKey: string;
  lastLogin?: string;
  serverName: string;
  broadcastNotice?: string;
  autoBackupIntervalHours?: number;
}

const MASTER_CONFIG_KEY = 'mbi_master_admin_config_v3';
const MASTER_LICENSES_KEY = 'mbi_master_client_licenses_v3';
const MASTER_INSTANCES_KEY = 'mbi_master_client_instances_v3';
const MASTER_BACKUPS_KEY = 'mbi_master_client_backups_v3';
const MASTER_SESSION_KEY = 'mbi_master_active_session_v3';
const MASTER_AUDIT_KEY = 'mbi_master_audit_logs_v3';

export const DEFAULT_MODULES: ModulePermissions = {
  sales: true,
  purchases: true,
  pharmacy: true,
  inventory: true,
  reports: true,
  cloudSync: true,
  multiBranch: true,
  aiVoice: true,
  cashierShifts: true,
  customPrint: true,
  accountsLedger: true,
  narcoticsSchedule: true,
  customerLoyalty: true,
  bulkExcel: true,
  barcodeLabels: true,
};

/**
 * Log an audit action into Master Server history
 */
export function logMasterAudit(action: string, category: MasterAuditLog['category'], details: string, targetClient?: string) {
  try {
    const existing: MasterAuditLog[] = JSON.parse(localStorage.getItem(MASTER_AUDIT_KEY) || '[]');
    const newLog: MasterAuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      category,
      details,
      targetClient,
    };
    existing.unshift(newLog);
    // Keep last 300 logs
    localStorage.setItem(MASTER_AUDIT_KEY, JSON.stringify(existing.slice(0, 300)));
  } catch (e) {}
}

/**
 * Get all Master Audit Logs
 */
export function getMasterAuditLogs(): MasterAuditLog[] {
  try {
    return JSON.parse(localStorage.getItem(MASTER_AUDIT_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Clear Master Audit Logs
 */
export function clearMasterAuditLogs() {
  localStorage.setItem(MASTER_AUDIT_KEY, JSON.stringify([]));
}

/**
 * Get Master Admin Server Configuration
 */
export function getMasterServerConfig(): MasterServerAdminConfig {
  const stored = localStorage.getItem(MASTER_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse master server config:', e);
    }
  }

  // Initial Config
  const initialSecret = generateTOTPSecret(20);
  const initialBackupCodes = generateEmergencyBackupCodes(6);
  const initialConfig: MasterServerAdminConfig = {
    masterUsername: 'mbi786',
    masterPasswordHash: hashPassword('mbi786'),
    is2FAEnabled: false,
    totpSecret: initialSecret,
    backupCodes: initialBackupCodes,
    usedBackupCodes: [],
    apiSecretKey: 'MBI-SEC-' + uuidv4().replace(/-/g, '').substring(0, 24).toUpperCase(),
    serverName: 'MBI Inventra Master Control Hub',
    broadcastNotice: '',
    autoBackupIntervalHours: 24,
  };

  localStorage.setItem(MASTER_CONFIG_KEY, JSON.stringify(initialConfig));
  return initialConfig;
}

/**
 * Save Master Admin Server Configuration
 */
export function saveMasterServerConfig(config: Partial<MasterServerAdminConfig>): MasterServerAdminConfig {
  const current = getMasterServerConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(MASTER_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Check if Master Admin is currently logged in (Valid Session)
 */
export function isMasterAdminAuthenticated(): boolean {
  const session = sessionStorage.getItem(MASTER_SESSION_KEY);
  if (!session) return false;
  try {
    const data = JSON.parse(session);
    // Session valid for 4 hours
    if (Date.now() - data.loginTime < 4 * 60 * 60 * 1000) {
      return true;
    }
  } catch (e) {}
  sessionStorage.removeItem(MASTER_SESSION_KEY);
  return false;
}

/**
 * Set Master Admin Login Session
 */
export function setMasterAdminSession(username: string) {
  const sessionData = {
    username,
    loginTime: Date.now(),
    token: uuidv4(),
  };
  sessionStorage.setItem(MASTER_SESSION_KEY, JSON.stringify(sessionData));
  saveMasterServerConfig({ lastLogin: new Date().toISOString() });
  logMasterAudit('Master Admin Logged In', 'SECURITY', `Authenticated session established for user ${username}`);
}

/**
 * Log out from Master Admin Panel
 */
export function logoutMasterAdminSession() {
  logMasterAudit('Master Admin Logged Out', 'SECURITY', 'Session explicitly locked by user');
  sessionStorage.removeItem(MASTER_SESSION_KEY);
}

/**
 * Verify Master Admin Credentials & 2FA
 */
export function verifyMasterCredentials(
  usernameInput: string,
  passwordInput: string,
  totpCodeInput?: string
): { success: boolean; requires2FA?: boolean; message: string } {
  const config = getMasterServerConfig();
  const inputHash = hashPassword(passwordInput);

  if (usernameInput.trim().toLowerCase() !== config.masterUsername.toLowerCase() || inputHash !== config.masterPasswordHash) {
    logMasterAudit('Master Login Attempt Failed', 'SECURITY', `Invalid credentials attempt for username "${usernameInput}"`);
    return { success: false, message: 'Invalid Master Username or Password!' };
  }

  // If 2FA is active
  if (config.is2FAEnabled) {
    if (!totpCodeInput || totpCodeInput.trim() === '') {
      return { success: false, requires2FA: true, message: '2FA TOTP Authenticator code required!' };
    }

    const cleanCode = totpCodeInput.trim();

    // Check emergency backup code first
    const backupCodeIndex = config.backupCodes.indexOf(cleanCode);
    if (backupCodeIndex !== -1 && !config.usedBackupCodes.includes(cleanCode)) {
      const updatedUsed = [...config.usedBackupCodes, cleanCode];
      saveMasterServerConfig({ usedBackupCodes: updatedUsed });
      setMasterAdminSession(config.masterUsername);
      logMasterAudit('2FA Emergency Code Used', 'SECURITY', `Logged in using 1-time emergency backup code`);
      return { success: true, message: 'Authenticated successfully using Emergency Backup Code!' };
    }

    // Check TOTP code
    const isTotpValid = verifyTOTPToken(config.totpSecret, cleanCode, 2);
    if (!isTotpValid) {
      logMasterAudit('2FA Code Invalid Attempt', 'SECURITY', `Invalid TOTP code attempted for user ${config.masterUsername}`);
      return { success: false, requires2FA: true, message: 'Invalid 6-digit 2FA code! Please check your Google Authenticator app.' };
    }
  }

  setMasterAdminSession(config.masterUsername);
  return { success: true, message: 'Master Access Granted!' };
}

/**
 * Generate a new unique License Key
 */
export function generateNewLicenseKey(plan: string = 'Standard POS'): string {
  const prefix = plan.includes('Lifetime') 
    ? 'MBI-LIFE' 
    : plan.includes('Pharmacy') 
    ? 'MBI-PHARM' 
    : plan.includes('Enterprise') 
    ? 'MBI-ENT' 
    : plan.includes('Trial')
    ? 'MBI-TRL'
    : 'MBI-PRO';
  
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part3 = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${part1}-${part2}-${part3}`;
}

/**
 * Get all client licenses in server registry
 */
export function getAllClientLicenses(): ClientLicense[] {
  const stored = localStorage.getItem(MASTER_LICENSES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }

  // Initial default seed license
  const seed: ClientLicense[] = [
    {
      id: uuidv4(),
      licenseKey: 'MBI-PRO-2026-8812',
      clientName: 'Main Store / Primary Business',
      ownerName: 'Admin',
      phone: '03364585863',
      city: 'Headquarters',
      plan: 'Lifetime Perpetual',
      status: 'Active',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: 'Lifetime',
      maxDevices: 5,
      strictHardwareLock: false,
      maxOfflineDays: 0,
      boundHardwareIds: [],
      allowedModules: { ...DEFAULT_MODULES },
      notes: 'Master default primary installation license.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
  localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(seed));
  return seed;
}

/**
 * Save or update a client license
 */
export function saveClientLicense(license: ClientLicense): ClientLicense[] {
  const list = getAllClientLicenses();
  const idx = list.findIndex(l => l.id === license.id || l.licenseKey === license.licenseKey);
  license.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...license };
    logMasterAudit('License Updated', 'LICENSE', `Updated license ${license.licenseKey} for ${license.clientName} (Status: ${license.status}, Plan: ${license.plan})`, license.clientName);
  } else {
    list.unshift(license);
    logMasterAudit('License Created', 'LICENSE', `Issued new license ${license.licenseKey} for ${license.clientName} (Plan: ${license.plan})`, license.clientName);
  }

  localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(list));
  return list;
}

/**
 * Reset Bound Hardware IDs for a License (Allows client to move software to new PC)
 */
export function resetLicenseHardware(licenseId: string): ClientLicense[] {
  const list = getAllClientLicenses();
  const idx = list.findIndex(l => l.id === licenseId);
  if (idx >= 0) {
    list[idx].boundHardwareIds = [];
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('Hardware Lock Reset', 'LICENSE', `Cleared all bound machine fingerprints for ${list[idx].clientName}`, list[idx].clientName);
    localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(list));
  }
  return list;
}

/**
 * Delete a client license
 */
export function deleteClientLicense(id: string): ClientLicense[] {
  const list = getAllClientLicenses();
  const target = list.find(l => l.id === id);
  const filtered = list.filter(l => l.id !== id);
  if (target) {
    logMasterAudit('License Deleted', 'LICENSE', `Deleted license ${target.licenseKey} belonging to ${target.clientName}`, target.clientName);
  }
  localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Get all live client instances tracking
 */
export function getAllClientInstances(): ClientInstanceHeartbeat[] {
  const stored = localStorage.getItem(MASTER_INSTANCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [];
}

/**
 * Record or update a client instance heartbeat
 */
export function recordClientHeartbeat(heartbeat: ClientInstanceHeartbeat): ClientInstanceHeartbeat[] {
  const list = getAllClientInstances();
  const idx = list.findIndex(i => i.installationId === heartbeat.installationId);

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...heartbeat };
  } else {
    list.unshift(heartbeat);
    logMasterAudit('New Device Connected', 'FLEET', `Installation ${heartbeat.installationId.slice(0, 8)} reported for ${heartbeat.clientName}`, heartbeat.clientName);
  }

  localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(list));
  return list;
}

/**
 * Queue a remote command to a client instance
 */
export function dispatchRemoteCommand(
  installationId: string,
  command: ClientInstanceHeartbeat['remoteCommand'],
  payload?: any
): ClientInstanceHeartbeat[] {
  const list = getAllClientInstances();
  const idx = list.findIndex(i => i.installationId === installationId);
  if (idx >= 0) {
    list[idx].remoteCommand = command;
    list[idx].remoteCommandPayload = payload;
    logMasterAudit('Remote Command Queued', 'COMMAND', `Dispatched command "${command}" to ${list[idx].clientName}`, list[idx].clientName);
    localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(list));
  }
  return list;
}

/**
 * Get all client backups stored on master server
 */
export function getAllClientBackups(): ClientBackupRecord[] {
  const stored = localStorage.getItem(MASTER_BACKUPS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [];
}

/**
 * Save a new client backup record
 */
export function saveClientBackup(backup: ClientBackupRecord): ClientBackupRecord[] {
  const list = getAllClientBackups();
  list.unshift(backup);
  logMasterAudit('Client Backup Received', 'BACKUP', `Received partitioned snapshot for ${backup.clientName} (${backup.sizeKb} KB)`, backup.clientName);
  localStorage.setItem(MASTER_BACKUPS_KEY, JSON.stringify(list));
  return list;
}

/**
 * Delete a client backup
 */
export function deleteClientBackup(id: string): ClientBackupRecord[] {
  const list = getAllClientBackups();
  const target = list.find(b => b.id === id);
  const filtered = list.filter(b => b.id !== id);
  if (target) {
    logMasterAudit('Backup Purged', 'BACKUP', `Deleted backup file ${target.fileName} for ${target.clientName}`, target.clientName);
  }
  localStorage.setItem(MASTER_BACKUPS_KEY, JSON.stringify(filtered));
  return filtered;
}

const MASTER_USERS_KEY = 'mbi_master_active_users_v3';

/**
 * Get all active users across instances and local deployments
 */
export function getMasterActiveUsers(): MasterActiveUser[] {
  const stored = localStorage.getItem(MASTER_USERS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {}
  }

  // Initial seed of active operators
  const seedUsers: MasterActiveUser[] = [
    {
      id: 'usr_mbi_admin',
      name: 'M Bilal Inayat',
      emailOrPhone: '03364585863',
      role: 'Primary Admin',
      status: 'Active',
      passcode: '0000',
      storeName: 'Al-Madina Pharmacy & Health Care (Main Branch)',
      installationId: 'MBI-INST-HQ-PRIMARY',
      boundHwid: 'HWID-E3B0-C442-98FC',
      lastSyncTime: new Date().toISOString(),
      isOnline: true,
      totalTransactions: 142,
      sessionDurationMinutes: 195,
      totalActiveHours: 142.5
    },
    {
      id: 'usr_bilal_store_mgr',
      name: 'Dr. Tariq Mahmood',
      emailOrPhone: '03009876543',
      role: 'Store Manager',
      status: 'Active',
      passcode: '1234',
      storeName: 'Shaheen Chemist & Surgical',
      installationId: 'MBI-INST-SHAHEEN-01',
      boundHwid: 'HWID-94AF-1B2C-77D1',
      lastSyncTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      isOnline: true,
      totalTransactions: 89,
      sessionDurationMinutes: 75,
      totalActiveHours: 89.2
    },
    {
      id: 'usr_zohaib_cashier',
      name: 'Zohaib Hassan (Counter 1)',
      emailOrPhone: '03214567890',
      role: 'Cashier',
      status: 'Active',
      passcode: '5566',
      storeName: 'Al-Madina Pharmacy & Health Care',
      installationId: 'MBI-INST-POS-T1',
      boundHwid: 'HWID-A4B7-9912-EE55',
      lastSyncTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      isOnline: true,
      totalTransactions: 310,
      sessionDurationMinutes: 320,
      totalActiveHours: 245.0
    },
    {
      id: 'usr_hamza_acc',
      name: 'Hamza Sheikh',
      emailOrPhone: '03451122334',
      role: 'Accountant',
      status: 'Active',
      passcode: '7890',
      storeName: 'Fazal Din Pharma Care',
      installationId: 'MBI-INST-FAZAL-02',
      boundHwid: 'HWID-CC88-3310-FF41',
      lastSyncTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isOnline: false,
      totalTransactions: 64,
      sessionDurationMinutes: 0,
      totalActiveHours: 54.8
    },
    {
      id: 'usr_asif_sales',
      name: 'Muhammad Asif',
      emailOrPhone: '03125566778',
      role: 'Sales Staff',
      status: 'Active',
      passcode: '1122',
      storeName: 'Khyber Medicos & General Store',
      installationId: 'MBI-INST-KHYBER-03',
      boundHwid: 'HWID-72CA-8190-44AA',
      lastSyncTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isOnline: true,
      totalTransactions: 215,
      sessionDurationMinutes: 140,
      totalActiveHours: 118.4
    }
  ];

  localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(seedUsers));
  return seedUsers;
}

/**
 * Update user account status (Active / Suspended / Disconnected)
 */
export function updateMasterUserStatus(userId: string, newStatus: MasterActiveUser['status']): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    const prevStatus = list[idx].status;
    list[idx].status = newStatus;
    list[idx].isOnline = newStatus === 'Active';
    list[idx].lastSyncTime = new Date().toISOString();
    
    logMasterAudit(
      newStatus === 'Suspended' ? 'User Account Suspended' : newStatus === 'Disconnected' ? 'User Force Disconnected' : 'User Account Re-activated',
      'SECURITY',
      `Changed user ${list[idx].name} (${list[idx].role}) status from ${prevStatus} to ${newStatus}`,
      list[idx].storeName
    );

    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

    // If local user corresponds to active session and is suspended/disconnected, fire event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-user-status-changed', { 
        detail: { userId, status: newStatus, userName: list[idx].name } 
      }));
    }
  }
  return list;
}

/**
 * Force disconnect user account immediately
 */
export function forceDisconnectMasterUser(userId: string): { success: boolean; message: string; users: MasterActiveUser[] } {
  const updated = updateMasterUserStatus(userId, 'Disconnected');
  const user = updated.find(u => u.id === userId);
  return {
    success: true,
    message: `User ${user?.name || userId} has been forcefully disconnected from active terminal.`,
    users: updated
  };
}

/**
 * Trigger Instant Remote Backup for a specific client / user instance
 */
export async function triggerRemoteBackupForClient(
  clientName: string, 
  installationId: string = 'MBI-INST-AUTOGEN',
  recordCounts?: any
): Promise<ClientBackupRecord> {
  const timestamp = new Date().toISOString();
  const fileName = `Snapshot_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp.slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
  
  // Create full snapshot structure
  let currentBusiness = {};
  let currentProfile = {};
  try { currentBusiness = JSON.parse(localStorage.getItem('mock_business') || '{}'); } catch (e) {}
  try { currentProfile = JSON.parse(localStorage.getItem('mock_user_profile') || '{}'); } catch (e) {}

  const payload = {
    version: 7,
    app: 'MBI Inventra POS & ERP',
    timestamp,
    clientName,
    installationId,
    business: currentBusiness,
    userProfile: currentProfile,
    data: {}
  };

  const backupRecord: ClientBackupRecord = {
    id: uuidv4(),
    clientName,
    installationId,
    timestamp,
    fileName,
    sizeKb: Math.floor(Math.random() * 300) + 180,
    recordCounts: recordCounts || {
      medicines: Math.floor(Math.random() * 400) + 120,
      invoices: Math.floor(Math.random() * 800) + 250,
      suppliers: Math.floor(Math.random() * 30) + 15,
      payments: Math.floor(Math.random() * 200) + 40,
      expenses: Math.floor(Math.random() * 80) + 20,
      customers: Math.floor(Math.random() * 150) + 50
    },
    notes: `Triggered remotely via Master Server Control Center at ${new Date().toLocaleTimeString()}`,
    backupPayload: payload
  };

  saveClientBackup(backupRecord);
  logMasterAudit('Remote Backup Triggered', 'BACKUP', `Generated remote database snapshot for ${clientName}`, clientName);
  return backupRecord;
}

/**
 * Execute Emergency Remote Kill-Switch on specific client instance
 */
export function executeRemoteKillSwitch(
  installationId: string,
  mode: 'emergency_lock' | 'clear_cache' | 'force_backup_and_lock',
  reason: string = 'License Expired / Unauthorized Access Detected'
): ClientInstanceHeartbeat[] {
  const instances = getAllClientInstances();
  const idx = instances.findIndex(i => i.installationId === installationId);

  if (idx >= 0) {
    instances[idx].status = 'Suspended';
    instances[idx].remoteCommand = mode === 'force_backup_and_lock' ? 'emergency_lock' : mode;
    instances[idx].remoteCommandPayload = {
      action: 'kill_switch',
      mode,
      reason,
      timestamp: new Date().toISOString(),
      lockedBy: 'Master Server Administration',
      contactSupport: '03364585863'
    };

    logMasterAudit(
      'KILL-SWITCH EXECUTED',
      'SECURITY',
      `EMERGENCY LOCKOUT triggered for "${instances[idx].clientName}" (Mode: ${mode}, Reason: ${reason})`,
      instances[idx].clientName
    );

    localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(instances));
  }

  // Also update corresponding client license to Suspended
  const licenses = getAllClientLicenses();
  const targetLic = licenses.find(l => l.clientName === instances[idx]?.clientName || l.boundHardwareIds.includes(installationId));
  if (targetLic) {
    targetLic.status = 'Suspended';
    saveClientLicense(targetLic);
  }

  // Broadcast immediate lock event if currently simulating or connected
  if (typeof window !== 'undefined') {
    localStorage.setItem('mbi_emergency_lock_active', JSON.stringify({
      isLocked: true,
      reason,
      timestamp: new Date().toISOString(),
      installationId
    }));
    window.dispatchEvent(new CustomEvent('mbi-emergency-lock-triggered', { detail: { installationId, reason, mode } }));
  }

  return instances;
}

/**
 * Unlock and restore an emergency locked instance
 */
export function unlockRemoteInstance(installationId: string): ClientInstanceHeartbeat[] {
  const instances = getAllClientInstances();
  const idx = instances.findIndex(i => i.installationId === installationId);

  if (idx >= 0) {
    instances[idx].status = 'Active';
    instances[idx].remoteCommand = 'unlock';
    instances[idx].remoteCommandPayload = {
      action: 'unlock',
      timestamp: new Date().toISOString()
    };

    logMasterAudit(
      'Instance Unlocked',
      'SECURITY',
      `Removed emergency lockout for "${instances[idx].clientName}" and restored normal operational state.`,
      instances[idx].clientName
    );

    localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(instances));
  }

  // Restore license if found
  const licenses = getAllClientLicenses();
  const targetLic = licenses.find(l => l.clientName === instances[idx]?.clientName);
  if (targetLic && targetLic.status === 'Suspended') {
    targetLic.status = 'Active';
    saveClientLicense(targetLic);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('mbi_emergency_lock_active');
    window.dispatchEvent(new CustomEvent('mbi-emergency-lock-removed', { detail: { installationId } }));
  }

  return instances;
}
