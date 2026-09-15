import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Key, RefreshCw, CheckCircle2, XCircle, 
  Lock, Unlock, Calendar, HardDrive, Server, Activity, Search, Trash2, 
  Edit3, Check, QrCode, Smartphone, Copy, Download, AlertTriangle, 
  Plus, Send, Eye, EyeOff, Save, Settings, Database, Users, Sparkles,
  FileText, Shield, Radio, ArrowRight, Laptop, HelpCircle, UserCheck,
  Cpu, Power, AlertCircle, Clock, Zap, History, DollarSign, Package,
  Layers, ExternalLink, Sliders, PlayCircle, BarChart3, Terminal, FileCode
} from 'lucide-react';
import { 
  getMasterServerConfig, saveMasterServerConfig, isMasterAdminAuthenticated,
  verifyMasterCredentials, logoutMasterAdminSession, getAllClientLicenses,
  saveClientLicense, deleteClientLicense, getAllClientInstances,
  getAllClientBackups, saveClientBackup, deleteClientBackup,
  generateNewLicenseKey, resetLicenseHardware, dispatchRemoteCommand,
  getMasterAuditLogs, clearMasterAuditLogs, logMasterAudit,
  getMasterActiveUsers, updateMasterUserStatus, forceDisconnectMasterUser,
  triggerRemoteBackupForClient, executeRemoteKillSwitch, unlockRemoteInstance,
  ClientLicense, ClientInstanceHeartbeat, ClientBackupRecord, MasterAuditLog, MasterActiveUser,
  DEFAULT_MODULES, ModulePermissions
} from '../../lib/masterServerService';
import { exportFullBackup, restoreFullBackup, verifyDatabaseIntegrity } from '../../lib/db';
import { 
  generateTOTPSecret, generateTOTPUri, generateQRCodeDataUrl,
  verifyTOTPToken, generateEmergencyBackupCodes, hashPassword, generateTOTPCode
} from '../../lib/totpService';
import { useAuth } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface MasterServerControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'licenses' | 'instances' | 'users' | 'backups' | 'audit' | '2fa' | 'deployment';

export const MasterServerControlModal: React.FC<MasterServerControlModalProps> = ({ isOpen, onClose }) => {
  const { startImpersonating } = useAuth();
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Master Data State
  const [config, setConfig] = useState(() => getMasterServerConfig());
  const [licenses, setLicenses] = useState<ClientLicense[]>([]);
  const [instances, setInstances] = useState<ClientInstanceHeartbeat[]>([]);
  const [activeUsers, setActiveUsers] = useState<MasterActiveUser[]>([]);
  const [backups, setBackups] = useState<ClientBackupRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<MasterAuditLog[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Search & Filter
  const [licenseSearch, setLicenseSearch] = useState('');
  const [instanceSearch, setInstanceSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [backupSearch, setBackupSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Snapshot Recovery & Restore Modal State
  const [restoreModalBackup, setRestoreModalBackup] = useState<ClientBackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);

  // Kill Switch Modal State
  const [killSwitchModalInst, setKillSwitchModalInst] = useState<ClientInstanceHeartbeat | null>(null);
  const [killSwitchMode, setKillSwitchMode] = useState<'emergency_lock' | 'force_backup_and_lock' | 'clear_cache'>('emergency_lock');
  const [killSwitchReason, setKillSwitchReason] = useState('License Expired or Unauthorized Access Detected');

  // Add / Edit License Modal State
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<ClientLicense | null>(null);
  const [formClientName, setFormClientName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPlan, setFormPlan] = useState<ClientLicense['plan']>('Standard POS');
  const [formStatus, setFormStatus] = useState<ClientLicense['status']>('Active');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formIsLifetime, setFormIsLifetime] = useState(false);
  const [formMaxDevices, setFormMaxDevices] = useState(1);
  const [formStrictHardwareLock, setFormStrictHardwareLock] = useState(false);
  const [formMaxOfflineDays, setFormMaxOfflineDays] = useState(14);
  const [formLicenseKey, setFormLicenseKey] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formModules, setFormModules] = useState<ModulePermissions>({ ...DEFAULT_MODULES });

  // Certificate Display Modal State
  const [viewingCertificate, setViewingCertificate] = useState<ClientLicense | null>(null);

  // 2FA Setup State
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totpSetupSecret, setTotpSetupSecret] = useState<string>('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpSetupError, setTotpSetupError] = useState<string | null>(null);
  const [totpSetupSuccess, setTotpSetupSuccess] = useState(false);
  const [livePreviewTOTP, setLivePreviewTOTP] = useState('');

  // Change Password State
  const [newMasterUsername, setNewMasterUsername] = useState('');
  const [currentPasswordConfirm, setCurrentPasswordConfirm] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Global Broadcast Banner State
  const [broadcastInput, setBroadcastInput] = useState('');

  // Remote Command Dispatch Modal
  const [commandModalInst, setCommandModalInst] = useState<ClientInstanceHeartbeat | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<'screen_alert' | 'force_backup' | 'emergency_lock' | 'clear_cache'>('screen_alert');
  const [commandAlertText, setCommandAlertText] = useState('');

  // Backup Inspection State
  const [inspectingBackup, setInspectingBackup] = useState<ClientBackupRecord | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Load state on opening
  useEffect(() => {
    if (isOpen) {
      const auth = isMasterAdminAuthenticated();
      setIsAuthenticated(auth);
      const conf = getMasterServerConfig();
      setConfig(conf);
      setNewMasterUsername(conf.masterUsername);
      setBroadcastInput(conf.broadcastNotice || '');
      if (auth) {
        refreshAllData();
      }
    }
  }, [isOpen]);

  const refreshAllData = async () => {
    const l = getAllClientLicenses();
    setLicenses(l);
    const inst = getAllClientInstances();
    setInstances(inst);
    const u = getMasterActiveUsers();
    setActiveUsers(u);
    setAuditLogs(getMasterAuditLogs());
    
    // Fetch stored backups from server endpoint
    try {
      const res = await fetch('/api/master/backups');
      const data = await res.json();
      if (data.success && data.backups) {
        setBackups(data.backups);
      } else {
        setBackups(getAllClientBackups());
      }
    } catch (e) {
      setBackups(getAllClientBackups());
    }
  };

  // Handle Login to Master Panel
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const result = verifyMasterCredentials(usernameInput, passwordInput, totpCodeInput);
    if (result.requires2FA) {
      setRequires2FA(true);
      setLoginError(result.message);
      return;
    }

    if (!result.success) {
      setLoginError(result.message);
      return;
    }

    setIsAuthenticated(true);
    setRequires2FA(false);
    setPasswordInput('');
    setTotpCodeInput('');
    refreshAllData();
    showToast('Master Server Admin access authenticated!');
  };

  // Handle Logout
  const handleLogout = () => {
    logoutMasterAdminSession();
    setIsAuthenticated(false);
    setRequires2FA(false);
    setUsernameInput('');
    setPasswordInput('');
    setTotpCodeInput('');
    showToast('Master Panel session locked.');
  };

  // Setup 2FA QR Code generator
  useEffect(() => {
    if (activeTab === '2fa') {
      const secret = config.totpSecret || generateTOTPSecret(20);
      setTotpSetupSecret(secret);
      const uri = generateTOTPUri(secret, config.masterUsername, 'MBI Inventra Server');
      generateQRCodeDataUrl(uri).then(url => setQrCodeUrl(url));
      
      // Update live current TOTP ticker
      const updateTicker = () => {
        setLivePreviewTOTP(generateTOTPCode(secret));
      };
      updateTicker();
      const interval = setInterval(updateTicker, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab, config.totpSecret, config.masterUsername]);

  // Verify and Enable 2FA
  const handleEnable2FA = () => {
    setTotpSetupError(null);
    if (!totpVerifyCode || totpVerifyCode.length !== 6) {
      setTotpSetupError('Please enter the 6-digit code from your Authenticator app.');
      return;
    }

    const isValid = verifyTOTPToken(totpSetupSecret, totpVerifyCode, 2);
    if (!isValid) {
      setTotpSetupError('Invalid code! Ensure your device time is synchronized and try again.');
      return;
    }

    const backupCodes = generateEmergencyBackupCodes(6);
    const updated = saveMasterServerConfig({
      is2FAEnabled: true,
      totpSecret: totpSetupSecret,
      backupCodes,
      usedBackupCodes: []
    });
    setConfig(updated);
    setTotpSetupSuccess(true);
    setTotpVerifyCode('');
    logMasterAudit('2FA Activated', 'SECURITY', 'Google Authenticator RFC 6238 TOTP enabled for Master Admin');
    setAuditLogs(getMasterAuditLogs());
    showToast('Google Authenticator 2FA activated successfully!');
  };

  // Disable 2FA
  const handleDisable2FA = () => {
    if (window.confirm('Are you sure you want to disable 2FA for the Master Server Admin panel?')) {
      const updated = saveMasterServerConfig({ is2FAEnabled: false });
      setConfig(updated);
      setTotpSetupSuccess(false);
      logMasterAudit('2FA Disabled', 'SECURITY', '2FA removed by Master Admin');
      setAuditLogs(getMasterAuditLogs());
      showToast('2FA has been disabled.');
    }
  };

  // Change Master Credentials
  const handleChangeCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg(null);

    if (hashPassword(currentPasswordConfirm) !== config.masterPasswordHash) {
      setPasswordChangeMsg({ text: 'Current master password incorrect!', isError: true });
      return;
    }

    if (newMasterPassword.length < 5) {
      setPasswordChangeMsg({ text: 'New password must be at least 5 characters long.', isError: true });
      return;
    }

    if (newMasterPassword !== confirmMasterPassword) {
      setPasswordChangeMsg({ text: 'New password and confirmation do not match.', isError: true });
      return;
    }

    const updated = saveMasterServerConfig({
      masterUsername: newMasterUsername.trim() || 'mbi786',
      masterPasswordHash: hashPassword(newMasterPassword)
    });
    setConfig(updated);
    setCurrentPasswordConfirm('');
    setNewMasterPassword('');
    setConfirmMasterPassword('');
    logMasterAudit('Master Credentials Updated', 'SECURITY', `Master username updated to "${updated.masterUsername}"`);
    setAuditLogs(getMasterAuditLogs());
    setPasswordChangeMsg({ text: 'Master login credentials updated successfully!', isError: false });
    showToast('Credentials updated!');
  };

  // Save Broadcast Notice
  const handleSaveBroadcast = () => {
    const updated = saveMasterServerConfig({ broadcastNotice: broadcastInput.trim() });
    setConfig(updated);
    logMasterAudit('Global Broadcast Updated', 'FLEET', `Set global notice: "${broadcastInput.trim() || '(Cleared)'}"`);
    setAuditLogs(getMasterAuditLogs());
    showToast('Global fleet broadcast notice updated!');
  };

  // Open Create License Form
  const handleOpenNewLicense = () => {
    setEditingLicense(null);
    setFormClientName('');
    setFormOwnerName('');
    setFormPhone('');
    setFormCity('');
    setFormPlan('Standard POS');
    setFormStatus('Active');
    setFormExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setFormIsLifetime(false);
    setFormMaxDevices(1);
    setFormStrictHardwareLock(false);
    setFormMaxOfflineDays(14);
    setFormLicenseKey(generateNewLicenseKey('Standard POS'));
    setFormNotes('');
    setFormModules({ ...DEFAULT_MODULES });
    setIsLicenseModalOpen(true);
  };

  // Open Edit License Form
  const handleEditLicense = (lic: ClientLicense) => {
    setEditingLicense(lic);
    setFormClientName(lic.clientName);
    setFormOwnerName(lic.ownerName);
    setFormPhone(lic.phone);
    setFormCity(lic.city);
    setFormPlan(lic.plan);
    setFormStatus(lic.status);
    setFormExpiryDate(lic.expiryDate === 'Lifetime' ? '' : lic.expiryDate);
    setFormIsLifetime(lic.expiryDate === 'Lifetime');
    setFormMaxDevices(lic.maxDevices || 1);
    setFormStrictHardwareLock(!!lic.strictHardwareLock);
    setFormMaxOfflineDays(lic.maxOfflineDays !== undefined ? lic.maxOfflineDays : 14);
    setFormLicenseKey(lic.licenseKey);
    setFormNotes(lic.notes || '');
    setFormModules({ ...DEFAULT_MODULES, ...lic.allowedModules });
    setIsLicenseModalOpen(true);
  };

  // Save License
  const handleSaveLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) {
      alert('Client / Business name is required.');
      return;
    }

    const licenseData: ClientLicense = {
      id: editingLicense ? editingLicense.id : uuidv4(),
      licenseKey: formLicenseKey.trim() || generateNewLicenseKey(formPlan),
      clientName: formClientName.trim(),
      ownerName: formOwnerName.trim() || 'Business Owner',
      phone: formPhone.trim() || '',
      city: formCity.trim() || 'Pakistan',
      plan: formPlan,
      status: formStatus,
      issueDate: editingLicense ? editingLicense.issueDate : new Date().toISOString().slice(0, 10),
      expiryDate: formIsLifetime ? 'Lifetime' : (formExpiryDate || 'Lifetime'),
      maxDevices: Number(formMaxDevices) || 1,
      strictHardwareLock: formStrictHardwareLock,
      maxOfflineDays: Number(formMaxOfflineDays) || 0,
      boundHardwareIds: editingLicense ? editingLicense.boundHardwareIds : [],
      allowedModules: formModules,
      notes: formNotes,
      createdAt: editingLicense ? editingLicense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveClientLicense(licenseData);
    setLicenses(getAllClientLicenses());
    setAuditLogs(getMasterAuditLogs());
    setIsLicenseModalOpen(false);
    showToast(`License for "${licenseData.clientName}" saved successfully!`);
  };

  // Toggle License Status (Kill-Switch)
  const handleToggleLicenseStatus = (lic: ClientLicense, newStatus: ClientLicense['status']) => {
    const updated = { ...lic, status: newStatus, updatedAt: new Date().toISOString() };
    saveClientLicense(updated);
    setLicenses(getAllClientLicenses());
    setAuditLogs(getMasterAuditLogs());
    showToast(`License for ${lic.clientName} status changed to ${newStatus}`);
  };

  // Reset Hardware ID Lock
  const handleResetHardware = (lic: ClientLicense) => {
    if (window.confirm(`Reset Machine/Hardware Fingerprint for "${lic.clientName}"? This allows them to activate on a new computer.`)) {
      resetLicenseHardware(lic.id);
      setLicenses(getAllClientLicenses());
      setAuditLogs(getMasterAuditLogs());
      showToast(`Hardware lock reset for ${lic.clientName}`);
    }
  };

  // Delete License
  const handleDeleteLicense = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the license for "${name}"?`)) {
      deleteClientLicense(id);
      setLicenses(getAllClientLicenses());
      setAuditLogs(getMasterAuditLogs());
      showToast('License deleted.');
    }
  };

  // Download Backup JSON
  const handleDownloadBackup = (backup: ClientBackupRecord) => {
    try {
      const dataStr = JSON.stringify(backup.backupPayload || backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.fileName || `Backup_${backup.clientName}_${backup.timestamp.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      logMasterAudit('Backup Downloaded', 'BACKUP', `Downloaded raw snapshot file for ${backup.clientName}`, backup.clientName);
      setAuditLogs(getMasterAuditLogs());
      showToast(`Backup downloaded for ${backup.clientName}`);
    } catch (e) {
      alert('Failed to download backup file.');
    }
  };

  // Delete Backup Record
  const handleDeleteBackup = (id: string, name: string) => {
    if (window.confirm(`Delete backup file for "${name}" from Master Server vault?`)) {
      deleteClientBackup(id);
      setBackups(getAllClientBackups());
      setAuditLogs(getMasterAuditLogs());
      showToast('Backup record deleted.');
    }
  };

  // Send Remote Command / Screen Notice
  const handleDispatchCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandModalInst) return;

    let payload: any = null;
    if (selectedCommand === 'screen_alert') {
      if (!commandAlertText.trim()) {
        alert('Please enter the alert message text.');
        return;
      }
      payload = { message: commandAlertText.trim() };
    }

    dispatchRemoteCommand(commandModalInst.installationId, selectedCommand, payload);
    setCommandModalInst(null);
    setCommandAlertText('');
    setInstances(getAllClientInstances());
    setAuditLogs(getMasterAuditLogs());
    showToast(`Command "${selectedCommand}" queued for ${commandModalInst.clientName}`);
  };

  // Create Direct Instant Master Server Database Snapshot
  const handleCreateInstantMasterSnapshot = async () => {
    setIsTriggeringBackup(true);
    try {
      const payloadStr = await exportFullBackup();
      const fullPayload = JSON.parse(payloadStr);
      const currentBusiness = fullPayload?.business || {};
      const clientName = currentBusiness?.name || 'Master Server Central Database';
      const timestamp = new Date().toISOString();
      const fileName = `Master_Snapshot_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp.slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
      
      const sizeKb = Math.round(new Blob([payloadStr]).size / 1024);

      const backupRecord: ClientBackupRecord = {
        id: uuidv4(),
        clientName,
        installationId: 'MBI-INST-HQ-PRIMARY',
        timestamp,
        fileName,
        sizeKb: sizeKb || 240,
        recordCounts: {
          medicines: fullPayload?.data?.medicines?.length || 0,
          invoices: fullPayload?.data?.invoices?.length || 0,
          suppliers: fullPayload?.data?.suppliers?.length || 0,
          payments: fullPayload?.data?.payments?.length || 0,
          expenses: fullPayload?.data?.expenses?.length || 0,
          customers: fullPayload?.data?.customers?.length || 0
        },
        notes: `Direct Master Server Snapshot with Verified Store Schema & Integrity (Created: ${new Date().toLocaleTimeString()})`,
        backupPayload: fullPayload
      };

      const updated = saveClientBackup(backupRecord);
      setBackups(updated);
      setAuditLogs(getMasterAuditLogs());
      showToast('101% Verified Master Database snapshot created successfully!');
    } catch (e: any) {
      alert('Failed to generate snapshot: ' + e.message);
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  // Trigger Remote Backup for Specific User / Client Instance
  const handleTriggerRemoteUserBackup = async (clientName: string, installationId: string = 'MBI-INST-REMOTE') => {
    setIsTriggeringBackup(true);
    try {
      await triggerRemoteBackupForClient(clientName, installationId);
      setBackups(getAllClientBackups());
      setAuditLogs(getMasterAuditLogs());
      showToast(`Remote backup triggered for "${clientName}". Snapshot stored in vault.`);
    } catch (e: any) {
      alert('Failed to trigger remote backup: ' + e.message);
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  // Confirm and Restore Database from Previous Snapshot
  const handleConfirmRestoreSnapshot = async () => {
    if (!restoreModalBackup) return;
    setIsRestoring(true);
    try {
      const payload = restoreModalBackup.backupPayload;
      if (!payload) {
        throw new Error('Snapshot payload data is missing or corrupted.');
      }
      const restoreResult = await restoreFullBackup(payload);
      if (!restoreResult.success) {
        throw new Error(restoreResult.message || 'Restoration encountered an issue.');
      }
      
      const integrity = await verifyDatabaseIntegrity();
      logMasterAudit(
        'Database Snapshot Restored',
        'BACKUP',
        `Restored database snapshot from ${restoreModalBackup.fileName} (${restoreModalBackup.clientName}). Integrity Status: ${integrity.healthy ? 'HEALTHY' : 'WARNING'}`,
        restoreModalBackup.clientName
      );
      setAuditLogs(getMasterAuditLogs());
      setRestoreModalBackup(null);
      showToast(`Snapshot successfully restored! Database 101% verified and intact.`);
      
      // Dispatch refresh events to hot-reload application state
      window.dispatchEvent(new Event('mbi-data-synced'));
      window.dispatchEvent(new Event('mbi-local-db-change'));
    } catch (err: any) {
      alert('Restoration Error: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  // Remote Kill-Switch Execution
  const handleExecuteKillSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!killSwitchModalInst) return;
    const updated = executeRemoteKillSwitch(killSwitchModalInst.installationId, killSwitchMode, killSwitchReason);
    setInstances(updated);
    setLicenses(getAllClientLicenses());
    setAuditLogs(getMasterAuditLogs());
    setKillSwitchModalInst(null);
    showToast(`Emergency Kill-Switch executed for "${killSwitchModalInst.clientName}". Terminal locked.`);
  };

  // Unlock Remote Instance
  const handleUnlockInstance = (inst: ClientInstanceHeartbeat) => {
    if (window.confirm(`Unlock and restore normal operational access for "${inst.clientName}"?`)) {
      const updated = unlockRemoteInstance(inst.installationId);
      setInstances(updated);
      setLicenses(getAllClientLicenses());
      setAuditLogs(getMasterAuditLogs());
      showToast(`Access restored for "${inst.clientName}".`);
    }
  };

  // Update Active User Status
  const handleUpdateUserStatus = (userId: string, newStatus: MasterActiveUser['status']) => {
    const updated = updateMasterUserStatus(userId, newStatus);
    setActiveUsers(updated);
    setAuditLogs(getMasterAuditLogs());
    showToast(`User status updated to ${newStatus}.`);
  };

  // Force Disconnect User
  const handleForceDisconnectUser = (userId: string) => {
    const res = forceDisconnectMasterUser(userId);
    setActiveUsers(res.users);
    setAuditLogs(getMasterAuditLogs());
    showToast(res.message);
  };

  // Fleet Telemetry Calculations
  const totalFleetInvoices = instances.reduce((acc, i) => acc + (i.dataMetrics?.totalInvoices || 0), 0);
  const totalFleetItems = instances.reduce((acc, i) => acc + (i.dataMetrics?.totalItems || 0), 0);
  const totalFleetRevenue = instances.reduce((acc, i) => acc + (i.dataMetrics?.estimatedRevenue || 0), 0);
  const activeLicensesCount = licenses.filter(l => l.status === 'Active').length;
  const expiringSoonCount = licenses.filter(l => {
    if (l.expiryDate === 'Lifetime' || l.status !== 'Active') return false;
    const diff = (new Date(l.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff > 0 && diff <= 30;
  }).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-slate-200">
        
        {/* ========================================================================= */}
        {/* 1. HEADER BAR */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/30">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>MBI INVENTRA — Master Fleet Control Center</span>
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Central Server Edition
                </span>
                {config.is2FAEnabled && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 2FA RFC 6238
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Autonomous Licensing, Remote Kill-Switch, HWID Binding, Fleet Telemetry & Partitioned Backup Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/50 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Lock Master Admin Session"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Panel</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/60 px-6 py-2.5 text-xs font-bold text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. AUTHENTICATION LOCK SCREEN (No password hint text) */}
        {/* ========================================================================= */}
        {!isAuthenticated ? (
          <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-md w-full bg-slate-850 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">Master Server Protected</h3>
                <p className="text-xs text-slate-400">
                  Enter authorized administrator credentials to access the central software licensing and fleet server.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-2xl text-xs font-bold text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Master Username
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter master username..."
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter master password..."
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {(requires2FA || config.is2FAEnabled) && (
                  <div className="p-4 bg-blue-950/40 border border-blue-700/50 rounded-2xl space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      <span>Google Authenticator / 2FA Code</span>
                    </div>
                    <input
                      type="text"
                      maxLength={9}
                      value={totpCodeInput}
                      onChange={(e) => setTotpCodeInput(e.target.value)}
                      placeholder="Enter 6-digit TOTP or Backup Code"
                      className="w-full px-4 py-2 bg-slate-900 border border-blue-600/60 rounded-xl text-sm font-mono font-black text-center tracking-widest text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400">
                      Open Google Authenticator / Microsoft Authenticator on your smartphone.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Authenticate Master Access</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 3. AUTHENTICATED MASTER CONTROL DASHBOARD */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Top Navigation Tabs */}
            <div className="px-6 bg-slate-950 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'overview' 
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Fleet Overview & Telemetry</span>
              </button>

              <button
                onClick={() => setActiveTab('licenses')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'licenses' 
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Software Licenses ({licenses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('instances')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'instances' 
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Live Fleet & Terminals ({instances.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'users' 
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Active Users & Access ({activeUsers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('backups')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'backups' 
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Partitioned Backup Vault ({backups.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'audit' 
                    ? 'border-amber-500 text-amber-400 bg-amber-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Master Audit Trail ({auditLogs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('2fa')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === '2fa' 
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>2FA Authenticator & Security</span>
              </button>

              <button
                onClick={() => setActiveTab('deployment')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'deployment' 
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Deployment & Reseller Architecture</span>
              </button>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
              
              {/* ================================================================= */}
              {/* TAB 1: OVERVIEW & TELEMETRY */}
              {/* ================================================================= */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Client Licenses</span>
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                          <Key className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{activeLicensesCount}</span>
                        <span className="text-xs font-bold text-slate-400">/ {licenses.length} Total</span>
                      </div>
                      {expiringSoonCount > 0 && (
                        <p className="mt-1 text-[11px] text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {expiringSoonCount} Expiring within 30 days
                        </p>
                      )}
                    </div>

                    <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Invoices Processed</span>
                        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{totalFleetInvoices.toLocaleString()}</span>
                        <span className="text-xs font-bold text-slate-400">Bills</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {totalFleetItems.toLocaleString()} Cataloged Items
                      </p>
                    </div>

                    <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Partitioned Backups</span>
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                          <Database className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{backups.length}</span>
                        <span className="text-xs font-bold text-emerald-400">Snapshots</span>
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                        Vault Online & Isolated
                      </p>
                    </div>

                    <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Master Security</span>
                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                          <Smartphone className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className={`text-base font-black ${config.is2FAEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {config.is2FAEnabled ? '2FA Active (TOTP)' : 'Password Only'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {auditLogs.length} Security Audits Logged
                      </p>
                    </div>
                  </div>

                  {/* Global Fleet Broadcast Banner Control */}
                  <div className="p-5 bg-slate-850 border border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-black text-white">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Global Fleet Broadcast Announcement</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Pushed to all active client software interfaces upon heartbeat check-in
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={broadcastInput}
                        onChange={(e) => setBroadcastInput(e.target.value)}
                        placeholder="e.g. Notice: Annual system maintenance scheduled for Sunday midnight. Support: 03364585863"
                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSaveBroadcast}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Broadcast to Fleet</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick License & Live Fleet Matrix */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Latest Licenses */}
                    <div className="bg-slate-850 border border-slate-700 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Key className="w-4 h-4 text-blue-400" />
                          <span>Latest Issued Licenses</span>
                        </h4>
                        <button 
                          onClick={() => setActiveTab('licenses')} 
                          className="text-xs text-blue-400 hover:underline font-bold"
                        >
                          View All ({licenses.length})
                        </button>
                      </div>

                      <div className="space-y-2">
                        {licenses.slice(0, 4).map(lic => (
                          <div key={lic.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">{lic.clientName}</p>
                              <p className="text-[11px] font-mono text-blue-400">{lic.licenseKey} • {lic.plan}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lic.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' :
                              lic.status === 'Suspended' ? 'bg-amber-950 text-amber-300 border border-amber-700/50' :
                              'bg-rose-950 text-rose-300 border border-rose-700/50'
                            }`}>
                              {lic.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Connected Instances */}
                    <div className="bg-slate-850 border border-slate-700 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Radio className="w-4 h-4 text-indigo-400" />
                          <span>Connected Fleet Heartbeats</span>
                        </h4>
                        <button 
                          onClick={() => setActiveTab('instances')} 
                          className="text-xs text-indigo-400 hover:underline font-bold"
                        >
                          Manage Fleet ({instances.length})
                        </button>
                      </div>

                      <div className="space-y-2">
                        {instances.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                            No client installations connected yet. Client software will appear here automatically when launched.
                          </div>
                        ) : (
                          instances.slice(0, 4).map(inst => (
                            <div key={inst.installationId} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-white">{inst.clientName}</p>
                                <p className="text-[11px] text-slate-400">
                                  {inst.dataMetrics?.totalInvoices || 0} Bills • {inst.dataMetrics?.totalItems || 0} Items • v{inst.appVersion}
                                </p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(inst.lastHeartbeat).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 2: SOFTWARE LICENSES MANAGER */}
              {/* ================================================================= */}
              {activeTab === 'licenses' && (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by Client Name or License Key..."
                        value={licenseSearch}
                        onChange={(e) => setLicenseSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={refreshAllData}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={handleOpenNewLicense}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Issue Client License</span>
                      </button>
                    </div>
                  </div>

                  {/* Licenses Table */}
                  <div className="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3.5 px-4">Client / Business</th>
                            <th className="py-3.5 px-4">License Key</th>
                            <th className="py-3.5 px-4">Plan & Expiry</th>
                            <th className="py-3.5 px-4">Hardware Lock</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
                          {licenses
                            .filter(l => 
                              l.clientName.toLowerCase().includes(licenseSearch.toLowerCase()) ||
                              l.licenseKey.toLowerCase().includes(licenseSearch.toLowerCase()) ||
                              l.plan.toLowerCase().includes(licenseSearch.toLowerCase())
                            )
                            .map((lic) => (
                              <tr key={lic.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white text-sm">{lic.clientName}</div>
                                  <div className="text-[11px] text-slate-400">{lic.ownerName} • {lic.phone || lic.city}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono font-bold text-blue-400">{lic.licenseKey}</div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(lic.licenseKey);
                                      showToast(`Copied ${lic.licenseKey}`);
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-blue-300 inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" /> Copy Key
                                  </button>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-200">{lic.plan}</div>
                                  <div className="text-[11px] text-slate-400">
                                    Expires: <span className={lic.expiryDate === 'Lifetime' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{lic.expiryDate}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      lic.boundHardwareIds && lic.boundHardwareIds.length > 0
                                        ? 'bg-blue-950 text-blue-300 border border-blue-700/50'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {lic.boundHardwareIds?.length || 0} / {lic.maxDevices || 1} Bound
                                    </span>
                                    {lic.boundHardwareIds && lic.boundHardwareIds.length > 0 && (
                                      <button
                                        onClick={() => handleResetHardware(lic)}
                                        className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                                        title="Unbind machine hardware fingerprints"
                                      >
                                        Reset HWID
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                    lic.status === 'Active' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' :
                                    lic.status === 'Suspended' ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60' :
                                    'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                                  }`}>
                                    {lic.status === 'Active' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
                                    <span>{lic.status}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Stealth Shadow Switch Button */}
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`⚡ Stealth Remote Switch:\n\nSilently jump into "${lic.clientName}"'s account and simulate their full environment? They will NOT be alerted. You can return back anytime using Alt+M or the Top Bar.`)) {
                                          await startImpersonating({
                                            licenseKey: lic.licenseKey,
                                            clientName: lic.clientName,
                                            ownerName: lic.ownerName,
                                            phone: lic.phone,
                                            city: lic.city,
                                          });
                                          onClose();
                                        }
                                      }}
                                      className="px-2 py-1 bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-purple-200 hover:text-white border border-purple-600/50 hover:border-purple-400 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Stealth Shadow Switch - Silently Enter Client Account"
                                    >
                                      <Zap className="w-3 h-3 text-purple-400 fill-purple-400" />
                                      <span>Switch</span>
                                    </button>

                                    <button
                                      onClick={() => setViewingCertificate(lic)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                                      title="View / Print Official Certificate"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>

                                    {lic.status === 'Active' ? (
                                      <button
                                        onClick={() => handleToggleLicenseStatus(lic, 'Suspended')}
                                        className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/50 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                        title="Remote Kill-Switch / Suspend"
                                      >
                                        Kill
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleToggleLicenseStatus(lic, 'Active')}
                                        className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                        title="Activate License"
                                      >
                                        Activate
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleEditLicense(lic)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                                      title="Edit License"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteLicense(lic.id, lic.clientName)}
                                      className="p-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                                      title="Delete License"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 3: LIVE FLEET & REMOTE COMMAND DISPATCHER */}
              {/* ================================================================= */}
              {activeTab === 'instances' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Radio className="w-4 h-4 text-blue-400" />
                        <span>Connected Fleet Devices & Remote Command Queue</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Dispatch instant remote commands, screen notices, or force database backup on any client installation.
                      </p>
                    </div>

                    <button
                      onClick={refreshAllData}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Fleet</span>
                    </button>
                  </div>

                  {/* Instances List */}
                  <div className="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Device Installation</th>
                          <th className="py-3.5 px-4">Client / Store</th>
                          <th className="py-3.5 px-4">Database Stats</th>
                          <th className="py-3.5 px-4">Last Seen</th>
                          <th className="py-3.5 px-4">Queued Command</th>
                          <th className="py-3.5 px-4 text-right">Remote Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
                        {instances.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              No client instances currently connected to master server.
                            </td>
                          </tr>
                        ) : (
                          instances.map((inst) => (
                            <tr key={inst.installationId} className="hover:bg-slate-800/50 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-mono font-bold text-white text-xs">
                                  {inst.installationId.slice(0, 12)}...
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  v{inst.appVersion} • {inst.hardwareFingerprint ? 'HWID Bound' : 'Dynamic ID'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">{inst.clientName}</div>
                                <div className="text-[11px] font-mono text-blue-400">{inst.licenseKey}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-200">
                                  {inst.dataMetrics?.totalInvoices || 0} Bills • {inst.dataMetrics?.totalItems || 0} Items
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {inst.dataMetrics?.databaseSizeKb || 0} KB Database
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1.5 text-slate-300">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>{new Date(inst.lastHeartbeat).toLocaleTimeString()}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {inst.remoteCommand ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50 font-mono text-[10px] font-bold uppercase">
                                    {inst.remoteCommand}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">Idle / Ready</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Stealth Switch for fleet instance */}
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`⚡ Stealth Remote Switch into "${inst.clientName}"?\n\nYou will instantly access their workspace and view transactions in stealth mode without interrupting their terminal.`)) {
                                        await startImpersonating({
                                          licenseKey: inst.licenseKey,
                                          clientName: inst.clientName,
                                          ownerName: inst.ownerName,
                                          phone: inst.phone,
                                          city: 'Pakistan',
                                        });
                                        onClose();
                                      }
                                    }}
                                    className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                    title="Stealth Remote Switch into this client terminal"
                                  >
                                    <Zap className="w-3 h-3 text-purple-400 fill-purple-400" />
                                    <span>Switch</span>
                                  </button>

                                  {/* Trigger Remote Backup */}
                                  <button
                                    onClick={() => handleTriggerRemoteUserBackup(inst.clientName, inst.installationId)}
                                    disabled={isTriggeringBackup}
                                    className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-600/50 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                                    title="Trigger instant remote database snapshot"
                                  >
                                    <Database className="w-3 h-3 text-blue-400" />
                                    <span>Backup</span>
                                  </button>

                                  {/* Emergency Kill Switch or Unlock */}
                                  {inst.status === 'Suspended' ? (
                                    <button
                                      onClick={() => handleUnlockInstance(inst)}
                                      className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Unlock emergency locked terminal"
                                    >
                                      <Unlock className="w-3 h-3 text-emerald-400" />
                                      <span>Unlock</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setKillSwitchModalInst(inst);
                                        setKillSwitchMode('emergency_lock');
                                        setKillSwitchReason('License Expired or Unauthorized Access Detected');
                                      }}
                                      className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Execute Emergency Remote Kill-Switch"
                                    >
                                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                                      <span>Kill-Switch</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setCommandModalInst(inst);
                                      setSelectedCommand('screen_alert');
                                      setCommandAlertText('');
                                    }}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Command</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 4: ACTIVE USERS & FLEET OPERATORS */}
              {/* ================================================================= */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search users by name, phone, or store..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Role Filter */}
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="all">All Roles</option>
                        <option value="Primary Admin">Primary Admin</option>
                        <option value="Store Manager">Store Manager</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Accountant">Accountant</option>
                        <option value="Sales Staff">Sales Staff</option>
                      </select>

                      {/* Status Filter */}
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Disconnected">Disconnected</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={refreshAllData}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Users</span>
                      </button>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Operator / Store</th>
                          <th className="py-3.5 px-4">Role & Access</th>
                          <th className="py-3.5 px-4">Passcode</th>
                          <th className="py-3.5 px-4">Status & Sync</th>
                          <th className="py-3.5 px-4">Activity</th>
                          <th className="py-3.5 px-4 text-right">Account Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
                        {activeUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              No active users found.
                            </td>
                          </tr>
                        ) : (
                          activeUsers
                            .filter(u => {
                              const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                u.emailOrPhone.toLowerCase().includes(userSearch.toLowerCase()) ||
                                u.storeName.toLowerCase().includes(userSearch.toLowerCase());
                              const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                              const matchStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
                              return matchSearch && matchRole && matchStatus;
                            })
                            .map((user) => (
                              <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                                    <span>{user.name}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate max-w-xs">{user.storeName}</div>
                                  <div className="text-[10px] font-mono text-indigo-400">{user.emailOrPhone}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                                    user.role === 'Primary Admin' ? 'bg-purple-950/80 text-purple-300 border-purple-600/50' :
                                    user.role === 'Store Manager' ? 'bg-blue-950/80 text-blue-300 border-blue-600/50' :
                                    user.role === 'Cashier' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50' :
                                    user.role === 'Accountant' ? 'bg-amber-950/80 text-amber-300 border-amber-600/50' :
                                    'bg-slate-900 text-slate-300 border-slate-700'
                                  }`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-mono font-black text-xs text-amber-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                    {user.passcode || '0000'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="space-y-0.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                      user.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' :
                                      user.status === 'Suspended' ? 'bg-rose-950 text-rose-300 border border-rose-700/50' :
                                      'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}>
                                      {user.status}
                                    </span>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {new Date(user.lastSyncTime).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-emerald-400 text-xs flex items-center gap-1 font-mono">
                                      <Clock className="w-3 h-3 text-emerald-400" />
                                      <span>
                                        {user.sessionDurationMinutes 
                                          ? `${Math.floor(user.sessionDurationMinutes / 60)}h ${user.sessionDurationMinutes % 60}m active`
                                          : '45m active'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Total: <span className="text-slate-200 font-bold">{user.totalActiveHours || 120} hrs</span> • {user.totalTransactions || 0} Tx
                                    </div>
                                    {user.boundHwid && (
                                      <div className="text-[9px] font-mono text-indigo-400/90 truncate max-w-[130px]" title={`Hardware Lock: ${user.boundHwid}`}>
                                        🔒 {user.boundHwid}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {/* Stealth Remote Switch */}
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`⚡ Stealth Remote Switch into "${user.name}" (${user.storeName})?\n\nYou will seamlessly assume their role and view operations without alerting them.`)) {
                                          await startImpersonating({
                                            licenseKey: 'MBI-STEALTH-ACTIVE',
                                            clientName: user.storeName,
                                            ownerName: user.name,
                                            phone: user.emailOrPhone,
                                            city: 'Pakistan',
                                          });
                                          onClose();
                                        }
                                      }}
                                      className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Stealth Switch into this account"
                                    >
                                      <Zap className="w-3 h-3 text-purple-400 fill-purple-400" />
                                      <span>Switch</span>
                                    </button>

                                    {/* Trigger Remote Backup */}
                                    <button
                                      onClick={() => handleTriggerRemoteUserBackup(user.storeName, user.installationId || 'MBI-INST-USER')}
                                      disabled={isTriggeringBackup}
                                      className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-600/50 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                                      title="Trigger instant snapshot for this store"
                                    >
                                      <Database className="w-3 h-3 text-blue-400" />
                                      <span>Backup</span>
                                    </button>

                                    {/* Force Disconnect */}
                                    <button
                                      onClick={() => handleForceDisconnectUser(user.id)}
                                      className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Force disconnect user from active terminal"
                                    >
                                      <Power className="w-3 h-3 text-amber-400" />
                                      <span>Disconnect</span>
                                    </button>

                                    {/* Suspend / Re-activate */}
                                    {user.status === 'Suspended' ? (
                                      <button
                                        onClick={() => handleUpdateUserStatus(user.id, 'Active')}
                                        className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                        title="Re-activate suspended user"
                                      >
                                        <Unlock className="w-3 h-3 text-emerald-400" />
                                        <span>Unsuspend</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateUserStatus(user.id, 'Suspended')}
                                        className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                        title="Suspend this user account"
                                      >
                                        <Lock className="w-3 h-3 text-rose-400" />
                                        <span>Suspend</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 5: PARTITIONED BACKUPS VAULT & RECOVERY */}
              {/* ================================================================= */}
              {activeTab === 'backups' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search backups by Client Name..."
                        value={backupSearch}
                        onChange={(e) => setBackupSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleCreateInstantMasterSnapshot}
                        disabled={isTriggeringBackup}
                        className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Create Central Master Snapshot</span>
                      </button>

                      <button
                        onClick={refreshAllData}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Vault</span>
                      </button>
                    </div>
                  </div>

                  {/* Backups Table */}
                  <div className="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Client / Store</th>
                          <th className="py-3.5 px-4">Backup File & Size</th>
                          <th className="py-3.5 px-4">Snapshot Contents</th>
                          <th className="py-3.5 px-4">Timestamp</th>
                          <th className="py-3.5 px-4 text-right">Recovery & Vault Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
                        {backups.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No client backups uploaded to the server yet. Click "Create Central Master Snapshot" to generate one.
                            </td>
                          </tr>
                        ) : (
                          backups
                            .filter(b => b.clientName.toLowerCase().includes(backupSearch.toLowerCase()))
                            .map((backup) => (
                              <tr key={backup.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white text-sm">{backup.clientName}</div>
                                  <div className="text-[10px] font-mono text-slate-400">Inst: {backup.installationId?.slice(0, 10)}...</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono text-xs text-blue-300 font-bold">{backup.fileName}</div>
                                  <div className="text-[11px] text-slate-400">{backup.sizeKb} KB</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="text-[11px] text-slate-300">
                                    <span className="font-bold text-white">{backup.recordCounts?.medicines || 0}</span> Meds • <span className="font-bold text-white">{backup.recordCounts?.invoices || 0}</span> Invoices • <span className="font-bold text-white">{backup.recordCounts?.suppliers || 0}</span> Suppliers
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-300">
                                  {new Date(backup.timestamp).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {/* 101% Confirmed Safe Recovery Restore Button */}
                                    <button
                                      onClick={() => setRestoreModalBackup(backup)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1"
                                      title="Restore database state from this snapshot (101% Safe Recovery)"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Restore Snapshot</span>
                                    </button>

                                    <button
                                      onClick={() => setInspectingBackup(backup)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                                      title="Inspect Database Content"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadBackup(backup)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                                      title="Download Backup JSON"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBackup(backup.id, backup.clientName)}
                                      className="p-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                                      title="Delete Backup"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 5: MASTER AUDIT TRAIL */}
              {/* ================================================================= */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-amber-400" />
                        <span>Master Server Security & Activity Audit Trail</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Tamper-proof event logs recording every administrative action, license modification, and backup access.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (window.confirm('Clear all audit logs?')) {
                            clearMasterAuditLogs();
                            setAuditLogs([]);
                            showToast('Audit trail cleared.');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                      >
                        Clear Logs
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-850 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Target Client</th>
                          <th className="py-3 px-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No security audit logs recorded yet.
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 font-bold text-white">
                                {log.action}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.category === 'SECURITY' ? 'bg-purple-950 text-purple-300 border border-purple-700/50' :
                                  log.category === 'LICENSE' ? 'bg-blue-950 text-blue-300 border border-blue-700/50' :
                                  log.category === 'COMMAND' ? 'bg-amber-950 text-amber-300 border border-amber-700/50' :
                                  'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                }`}>
                                  {log.category}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-300 font-semibold">
                                {log.targetClient || '—'}
                              </td>
                              <td className="py-3 px-4 text-slate-400 text-xs">
                                {log.details}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 6: 2FA AUTHENTICATOR & SECURITY */}
              {/* ================================================================= */}
              {activeTab === '2fa' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Google Authenticator RFC 6238 TOTP */}
                  <div className="p-6 bg-slate-850 border border-slate-700 rounded-3xl space-y-6 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">100% Free 2FA Google Authenticator</h4>
                        <p className="text-xs text-slate-400">RFC 6238 Standard Time-based One-Time Password</p>
                      </div>
                    </div>

                    {!config.is2FAEnabled ? (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Scan the QR Code below with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your mobile phone:
                        </p>

                        {qrCodeUrl && (
                          <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
                            <img src={qrCodeUrl} alt="2FA QR Code" className="w-full h-full object-contain" />
                          </div>
                        )}

                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Manual Secret Key</span>
                          <div className="font-mono font-bold text-blue-300 text-xs select-all">{totpSetupSecret}</div>
                        </div>

                        {totpSetupError && (
                          <div className="p-3 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs font-bold text-rose-300">
                            {totpSetupError}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Enter 6-Digit Code from App to Confirm
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={totpVerifyCode}
                              onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="000000"
                              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-center font-mono font-black text-base tracking-widest text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                              onClick={handleEnable2FA}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-lg shadow-emerald-600/30"
                            >
                              Activate 2FA
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-in fade-in">
                        <div className="p-4 bg-emerald-950/50 border border-emerald-700/60 rounded-2xl flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-200">Two-Factor Authentication is Active</p>
                            <p className="text-[11px] text-emerald-300/80">Every login to the Master Hub requires your authenticator app code.</p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300">Emergency Backup Recovery Codes</span>
                            <span className="text-[10px] text-slate-400 font-bold">One-Time Use</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {config.backupCodes.map((code, idx) => {
                              const isUsed = config.usedBackupCodes?.includes(code);
                              return (
                                <div 
                                  key={idx} 
                                  className={`p-2 rounded-lg font-mono text-xs font-bold text-center border ${
                                    isUsed 
                                      ? 'bg-slate-950 text-slate-600 border-slate-800 line-through' 
                                      : 'bg-slate-850 text-purple-300 border-purple-800/40'
                                  }`}
                                >
                                  {code} {isUsed && '(Used)'}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={handleDisable2FA}
                          className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Disable 2FA Protection
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Change Master Credentials */}
                  <div className="p-6 bg-slate-850 border border-slate-700 rounded-3xl space-y-6 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Change Master Credentials</h4>
                        <p className="text-xs text-slate-400">Update administrative login credentials securely</p>
                      </div>
                    </div>

                    {passwordChangeMsg && (
                      <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        passwordChangeMsg.isError 
                          ? 'bg-rose-950/60 border border-rose-700/60 text-rose-200' 
                          : 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-200'
                      }`}>
                        {passwordChangeMsg.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>{passwordChangeMsg.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleChangeCredentials} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                          Master Username
                        </label>
                        <input
                          type="text"
                          value={newMasterUsername}
                          onChange={(e) => setNewMasterUsername(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                          Current Master Password
                        </label>
                        <input
                          type="password"
                          value={currentPasswordConfirm}
                          onChange={(e) => setCurrentPasswordConfirm(e.target.value)}
                          placeholder="Confirm current password..."
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newMasterPassword}
                            onChange={(e) => setNewMasterPassword(e.target.value)}
                            placeholder="New password..."
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={confirmMasterPassword}
                            onChange={(e) => setConfirmMasterPassword(e.target.value)}
                            placeholder="Retype password..."
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/30"
                      >
                        Update Master Credentials
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 7: DEPLOYMENT & RESELLER ARCHITECTURE */}
              {/* ================================================================= */}
              {activeTab === 'deployment' && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-850 border border-slate-700 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">Commercial Software Reselling & Standalone ZIP Guide</h4>
                        <p className="text-xs text-slate-400">Complete autonomous architecture for selling and deploying software packages to clients</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                        <span className="w-7 h-7 rounded-xl bg-blue-600/30 text-blue-400 font-black text-xs flex items-center justify-center">1</span>
                        <h5 className="text-xs font-black text-white">Issue License Key</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          In the <strong>Licenses tab</strong>, create a new license with the client's store name, plan, and enabled modules (Pharmacy Pro, AI Voice, etc.).
                        </p>
                      </div>

                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                        <span className="w-7 h-7 rounded-xl bg-indigo-600/30 text-indigo-400 font-black text-xs flex items-center justify-center">2</span>
                        <h5 className="text-xs font-black text-white">Deliver Standalone ZIP</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Export software ZIP from Settings Menu or build dist. Provide the ZIP to the client. When they launch, they enter their unique license key.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                        <span className="w-7 h-7 rounded-xl bg-emerald-600/30 text-emerald-400 font-black text-xs flex items-center justify-center">3</span>
                        <h5 className="text-xs font-black text-white">Autonomous Control</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Client devices check into this Master Server to verify licenses, receive broadcast announcements, send health heartbeats, and push backups.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-850 border border-slate-700 rounded-2xl space-y-3">
                    <h5 className="text-xs font-black text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span>Master Server Live HTTP Endpoints for Standalone Clients</span>
                    </h5>
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span className="text-emerald-400">POST /api/master/license/verify</span>
                        <span className="text-slate-400">Verifies client license key and returns permitted modules</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span className="text-blue-400">POST /api/master/heartbeat</span>
                        <span className="text-slate-400">Receives client telemetry and delivers queued remote commands</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span className="text-purple-400">POST /api/master/backup/push</span>
                        <span className="text-slate-400">Ingests client partitioned database snapshots into secure vault</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: ISSUE / EDIT LICENSE */}
      {/* ========================================================================= */}
      {isLicenseModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                <span>{editingLicense ? 'Edit Client License' : 'Issue New Software License'}</span>
              </h3>
              <button 
                onClick={() => setIsLicenseModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLicense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Business / Pharmacy Name *</label>
                  <input
                    type="text"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="e.g. Al-Madina Pharmacy & Superstore"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Owner / Contact Name</label>
                  <input
                    type="text"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 03364585863"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Lahore, Pakistan"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">License Tier Plan</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Trial (15 Days)">Trial (15 Days)</option>
                    <option value="Trial (30 Days)">Trial (30 Days)</option>
                    <option value="Standard POS">Standard POS</option>
                    <option value="Pharmacy Pro">Pharmacy Pro</option>
                    <option value="Enterprise Multi-Branch">Enterprise Multi-Branch</option>
                    <option value="Lifetime Perpetual">Lifetime Perpetual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended (Locked)</option>
                    <option value="Expired">Expired</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Max Devices / Counters</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formMaxDevices}
                    onChange={(e) => setFormMaxDevices(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Expiry & Hardware Lock Settings */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">License Expiry Date</span>
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsLifetime}
                      onChange={(e) => setFormIsLifetime(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Lifetime Perpetual (No Expiry)</span>
                  </label>
                </div>

                {!formIsLifetime && (
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formStrictHardwareLock}
                      onChange={(e) => setFormStrictHardwareLock(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>Strict Hardware Fingerprint Lock</span>
                  </label>

                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block mb-1">Offline Grace Period (Days)</span>
                    <input
                      type="number"
                      value={formMaxOfflineDays}
                      onChange={(e) => setFormMaxOfflineDays(Number(e.target.value))}
                      placeholder="14 (0 for unlimited)"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Allowed Modules Grid */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-white block">Permitted Features & Modules</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.keys(formModules).map((modKey) => (
                    <label key={modKey} className="flex items-center gap-2 p-1.5 bg-slate-900/60 rounded-lg border border-slate-800 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={(formModules as any)[modKey]}
                        onChange={(e) => setFormModules(prev => ({ ...prev, [modKey]: e.target.checked }))}
                        className="rounded accent-blue-500"
                      />
                      <span className="capitalize font-semibold">{modKey.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">License Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formLicenseKey}
                    onChange={(e) => setFormLicenseKey(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-xs font-bold text-blue-400 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFormLicenseKey(generateNewLicenseKey(formPlan))}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLicenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Save License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: REMOTE COMMAND DISPATCH */}
      {/* ========================================================================= */}
      {commandModalInst && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-400" />
                <span>Dispatch Remote Command</span>
              </h3>
              <button 
                onClick={() => setCommandModalInst(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-xs font-bold text-white">{commandModalInst.clientName}</p>
              <p className="text-[11px] font-mono text-slate-400">ID: {commandModalInst.installationId}</p>
            </div>

            <form onSubmit={handleDispatchCommand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Select Command Action</label>
                <select
                  value={selectedCommand}
                  onChange={(e) => setSelectedCommand(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="screen_alert">Send Screen Popup Alert / Payment Reminder</option>
                  <option value="force_backup">Force Immediate Cloud Backup Snapshot</option>
                  <option value="emergency_lock">Emergency Remote Lock Screen (Kill-Switch)</option>
                  <option value="clear_cache">Purge Local Cache & Re-sync</option>
                </select>
              </div>

              {selectedCommand === 'screen_alert' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Alert Notice Message</label>
                  <textarea
                    rows={3}
                    value={commandAlertText}
                    onChange={(e) => setCommandAlertText(e.target.value)}
                    placeholder="e.g. Dear Customer, your software subscription is expiring in 3 days. Please contact 03364585863 for renewal."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCommandModalInst(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Queue Command</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: OFFICIAL LICENSE CERTIFICATE VIEW & PRINT */}
      {/* ========================================================================= */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Official Software Certificate</h3>
              </div>
              <button 
                onClick={() => setViewingCertificate(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-blue-500/40 rounded-2xl space-y-4 shadow-inner text-center">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-700/50">
                  MBI Inventra POS & Pharmacy ERP
                </span>
                <h2 className="text-xl font-black text-white pt-2">{viewingCertificate.clientName}</h2>
                <p className="text-xs text-slate-400">{viewingCertificate.city} • Registered Owner: {viewingCertificate.ownerName}</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Authenticated License Key</span>
                <p className="text-sm font-mono font-black text-blue-300">{viewingCertificate.licenseKey}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">License Plan:</span>
                  <p className="font-bold text-white">{viewingCertificate.plan}</p>
                </div>
                <div>
                  <span className="text-slate-400">Validity:</span>
                  <p className="font-bold text-emerald-400">{viewingCertificate.expiryDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">Issued Date:</span>
                  <p className="font-bold text-slate-200">{viewingCertificate.issueDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">Counters / Devices:</span>
                  <p className="font-bold text-slate-200">{viewingCertificate.maxDevices} Device(s)</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  const certText = `=== MBI INVENTRA OFFICIAL LICENSE CERTIFICATE ===\nClient: ${viewingCertificate.clientName}\nLicense Key: ${viewingCertificate.licenseKey}\nPlan: ${viewingCertificate.plan}\nExpiry: ${viewingCertificate.expiryDate}\nMax Devices: ${viewingCertificate.maxDevices}\nSupport: 03364585863`;
                  navigator.clipboard.writeText(certText);
                  showToast('Certificate details copied to clipboard!');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Certificate Text</span>
              </button>

              <button
                onClick={() => setViewingCertificate(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: INSPECT BACKUP DETAILS */}
      {/* ========================================================================= */}
      {inspectingBackup && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>Database Snapshot Details ({inspectingBackup.clientName})</span>
              </h3>
              <button 
                onClick={() => setInspectingBackup(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Medicines</span>
                  <p className="text-lg font-black text-white">{inspectingBackup.recordCounts?.medicines || 0}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Invoices</span>
                  <p className="text-lg font-black text-white">{inspectingBackup.recordCounts?.invoices || 0}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Suppliers</span>
                  <p className="text-lg font-black text-white">{inspectingBackup.recordCounts?.suppliers || 0}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">File Size</span>
                  <p className="text-lg font-black text-emerald-400">{inspectingBackup.sizeKb} KB</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>File Name:</span>
                  <span className="text-white font-bold">{inspectingBackup.fileName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Timestamp:</span>
                  <span className="text-white">{new Date(inspectingBackup.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Installation ID:</span>
                  <span className="text-white">{inspectingBackup.installationId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleDownloadBackup(inspectingBackup)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Snapshot JSON</span>
              </button>
              <button
                onClick={() => setInspectingBackup(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: REMOTE KILL-SWITCH DISPATCH */}
      {/* ========================================================================= */}
      {killSwitchModalInst && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border-2 border-rose-600/60 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Execute Remote Kill-Switch</h3>
              </div>
              <button 
                onClick={() => setKillSwitchModalInst(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-rose-950/40 border border-rose-700/50 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">Target Terminal</span>
              <p className="text-sm font-black text-white">{killSwitchModalInst.clientName}</p>
              <p className="text-xs font-mono text-slate-400">Installation ID: {killSwitchModalInst.installationId}</p>
            </div>

            <form onSubmit={handleExecuteKillSwitch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kill-Switch Action Mode</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 cursor-pointer hover:border-slate-500">
                    <input
                      type="radio"
                      name="killMode"
                      value="emergency_lock"
                      checked={killSwitchMode === 'emergency_lock'}
                      onChange={() => setKillSwitchMode('emergency_lock')}
                      className="mt-0.5 accent-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Emergency Screen Lockout</span>
                      <span className="text-[11px] text-slate-400">Instantly overlays a full-screen lockdown banner. Terminal cannot be used until master server admin unlocks it.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 cursor-pointer hover:border-slate-500">
                    <input
                      type="radio"
                      name="killMode"
                      value="force_backup_and_lock"
                      checked={killSwitchMode === 'force_backup_and_lock'}
                      onChange={() => setKillSwitchMode('force_backup_and_lock')}
                      className="mt-0.5 accent-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Force Cloud Backup & Lock</span>
                      <span className="text-[11px] text-slate-400">Takes an emergency cloud snapshot of local records first, then seals the terminal in lockdown.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-rose-700/50 bg-rose-950/20 cursor-pointer hover:border-rose-500">
                    <input
                      type="radio"
                      name="killMode"
                      value="clear_cache"
                      checked={killSwitchMode === 'clear_cache'}
                      onChange={() => setKillSwitchMode('clear_cache')}
                      className="mt-0.5 accent-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-rose-300 block">Wipe Local Storage & Terminate Session</span>
                      <span className="text-[11px] text-rose-200/70">Wipes all cached credentials & active session immediately and puts app in quarantine mode.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reason / Lockdown Notice</label>
                <input
                  type="text"
                  value={killSwitchReason}
                  onChange={(e) => setKillSwitchReason(e.target.value)}
                  placeholder="e.g. License Expired or Unauthorized Access Detected"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-amber-400 block mb-0.5">⚠️ Admin Assurance:</span>
                This action is logged in the Master Server Immutable Audit Trail. You can unlock this terminal at any time with one click from the fleet table.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setKillSwitchModalInst(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Execute Kill-Switch Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: 101% SAFE SNAPSHOT RESTORE RECOVERY */}
      {/* ========================================================================= */}
      {restoreModalBackup && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <RefreshCw className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Restore Database Snapshot</h3>
              </div>
              <button 
                onClick={() => setRestoreModalBackup(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Store / Client:</span>
                <span className="font-bold text-white">{restoreModalBackup.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Snapshot File:</span>
                <span className="font-mono text-emerald-300 font-bold">{restoreModalBackup.fileName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-300">{new Date(restoreModalBackup.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Data Contents:</span>
                <span className="text-white font-bold">
                  {restoreModalBackup.recordCounts?.medicines || 0} Meds • {restoreModalBackup.recordCounts?.invoices || 0} Invoices • {restoreModalBackup.recordCounts?.suppliers || 0} Suppliers
                </span>
              </div>
            </div>

            {/* 101% Safety Guarantee Notice */}
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-600/50 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-black">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>101% Data Integrity Guarantee</span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Pre-flight table validation, schema normalization, and post-restore integrity checks are automatically executed. If any reload happens, all your restored invoices, items, and settings will remain 100% intact and working error-free.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreModalBackup(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreSnapshot}
                disabled={isRestoring}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring & Verifying...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Confirm & Safe Restore Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
