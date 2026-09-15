import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, RefreshCw, Info, MoreVertical, Edit2, Trash2, 
  CheckCircle2, Clock, Shield, ShieldCheck, UserCheck, ChevronDown, 
  Search, X, Eye, Lock, ArrowRightLeft, Sparkles, Filter, Download,
  Check, AlertCircle, Phone, Mail, Building, Key, History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppUserRecord, UserRole, UserActivityLog } from '../types';
import { dbAppUsers, dbUserActivities } from '../lib/db';
import { ROLE_DEFINITIONS } from '../lib/permissions';
import { unifiedSyncService } from '../lib/syncService';
import { firebaseSyncManager } from '../lib/firebaseSync';
import { FirebaseAuthModal } from '../components/admin/FirebaseAuthModal';

export const SyncAndShare: React.FC = () => {
  const { 
    currentUser, 
    firebaseUser,
    activeRole, 
    setActiveRole, 
    activeUser, 
    setActiveUser 
  } = useAuth();

  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('All data synchronized with cloud');

  // Modals & Popups
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isKnowMoreOpen, setIsKnowMoreOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isFirebaseAuthOpen, setIsFirebaseAuthOpen] = useState(false);
  const [activeRoleDropdownUserId, setActiveRoleDropdownUserId] = useState<string | null>(null);

  // Selected User for Edit / Delete
  const [selectedUser, setSelectedUser] = useState<AppUserRecord | null>(null);

  // Add/Edit Form State
  const [formData, setFormData] = useState<{
    name: string;
    emailOrPhone: string;
    role: UserRole;
    status: 'Joined' | 'Pending' | 'Inactive';
    passcode: string;
    notes: string;
  }>({
    name: '',
    emailOrPhone: '',
    role: 'Salesman',
    status: 'Joined',
    passcode: '',
    notes: '',
  });

  // Activity Filter State
  const [activitySearch, setActivitySearch] = useState('');
  const [activityUserFilter, setActivityUserFilter] = useState('ALL');

  // Success Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const userList = await dbAppUsers.getAll();
      const activityList = await dbUserActivities.getAll();
      setUsers(userList || []);
      setActivities((activityList || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('mbi-data-synced', handleSync);
    window.addEventListener('mbi-local-db-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('mbi-data-synced', handleSync);
      window.removeEventListener('mbi-local-db-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    setSyncStatusText('Connecting to Firebase Cloud and syncing all records...');
    try {
      // 1. Flush pending changes to Firestore and pull latest cloud records
      await firebaseSyncManager.flushQueue();
      await firebaseSyncManager.pullAllFromFirestore();

      const report = await unifiedSyncService.detectDiscrepancies();
      let statusMsg = 'Cloud & Local sync complete. All records up to date.';
      if (report.hasDiscrepancies) {
        setSyncStatusText(`Detected ${report.totalDiscrepancies} discrepancies. Resolving with timestamp priority...`);
        const result = await unifiedSyncService.reconcileDiscrepancies(report);
        statusMsg = result.message;
      } else {
        await unifiedSyncService.reconcileDiscrepancies(report);
      }
      await loadData();
      setSyncStatusText(statusMsg);
      showToast(statusMsg);
      setTimeout(() => {
        setSyncStatusText('All data synchronized with cloud & connected instances');
      }, 4500);
    } catch (e: any) {
      setSyncStatusText('Synchronization encountered an issue. Local records intact.');
      showToast('Sync notice: Working in offline mode');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      emailOrPhone: '',
      role: 'Salesman',
      status: 'Joined',
      passcode: Math.floor(1000 + Math.random() * 9000).toString(),
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.emailOrPhone.trim()) {
      alert('Please fill in user name and email/phone');
      return;
    }

    const newUser: AppUserRecord = {
      id: `user-${Date.now()}`,
      name: formData.name.trim(),
      emailOrPhone: formData.emailOrPhone.trim(),
      role: formData.role,
      status: formData.status,
      passcode: formData.passcode,
      notes: formData.notes,
      lastActive: 'Just invited',
      createdAt: new Date().toISOString(),
    };

    await dbAppUsers.save(newUser);

    // Log Activity
    const newLog: UserActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser?.uid || 'admin',
      userName: currentUser?.displayName || 'M Bilal Inayat (Admin)',
      userRole: activeRole,
      action: 'Added New User',
      module: 'Users',
      details: `Invited user "${newUser.name}" with role "${newUser.role}" (${newUser.emailOrPhone})`,
      timestamp: new Date().toISOString(),
    };
    await dbUserActivities.save(newLog);

    setIsAddModalOpen(false);
    await loadData();
    showToast(`User ${newUser.name} added successfully as ${newUser.role}`);
  };

  const handleOpenEdit = (user: AppUserRecord) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      emailOrPhone: user.emailOrPhone,
      role: user.role,
      status: user.status,
      passcode: user.passcode || '',
      notes: user.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const updatedUser: AppUserRecord = {
      ...selectedUser,
      name: formData.name.trim(),
      emailOrPhone: formData.emailOrPhone.trim(),
      role: formData.role,
      status: formData.status,
      passcode: formData.passcode,
      notes: formData.notes,
      updatedAt: new Date().toISOString(),
    };

    await dbAppUsers.save(updatedUser);

    // If active simulated user was updated, update auth state too
    if (activeUser?.id === selectedUser.id) {
      setActiveUser(updatedUser);
    }

    // Log Activity
    const newLog: UserActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser?.uid || 'admin',
      userName: currentUser?.displayName || 'M Bilal Inayat (Admin)',
      userRole: activeRole,
      action: 'Updated User Details',
      module: 'Users',
      details: `Modified profile and role for "${updatedUser.name}" to "${updatedUser.role}"`,
      timestamp: new Date().toISOString(),
    };
    await dbUserActivities.save(newLog);

    setIsEditModalOpen(false);
    setSelectedUser(null);
    await loadData();
    showToast(`User ${updatedUser.name} profile updated successfully`);
  };

  const handleQuickRoleChange = async (user: AppUserRecord, newRole: UserRole) => {
    setActiveRoleDropdownUserId(null);
    const updatedUser: AppUserRecord = {
      ...user,
      role: newRole,
      updatedAt: new Date().toISOString(),
    };

    await dbAppUsers.save(updatedUser);

    // If active simulated user was changed, update active role too
    if (activeUser?.id === user.id) {
      setActiveUser(updatedUser);
    }

    // Log Activity
    const newLog: UserActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser?.uid || 'admin',
      userName: currentUser?.displayName || 'M Bilal Inayat (Admin)',
      userRole: activeRole,
      action: 'Role Changed',
      module: 'Users',
      details: `Changed role of "${user.name}" from "${user.role}" to "${newRole}"`,
      timestamp: new Date().toISOString(),
    };
    await dbUserActivities.save(newLog);

    await loadData();
    showToast(`Role for ${user.name} changed to ${newRole}`);
  };

  const handleOpenDelete = (user: AppUserRecord) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    await dbAppUsers.delete(selectedUser.id);

    // If active simulated user was deleted, reset to primary admin
    if (activeUser?.id === selectedUser.id) {
      setActiveUser(null);
      setActiveRole('Primary Admin');
    }

    // Log Activity
    const newLog: UserActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser?.uid || 'admin',
      userName: currentUser?.displayName || 'M Bilal Inayat (Admin)',
      userRole: activeRole,
      action: 'Deleted User',
      module: 'Users',
      details: `Removed user "${selectedUser.name}" (${selectedUser.emailOrPhone}) from organization`,
      timestamp: new Date().toISOString(),
    };
    await dbUserActivities.save(newLog);

    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    await loadData();
    showToast('User removed successfully');
  };

  const handleSwitchSimulatedUser = (user: AppUserRecord | null) => {
    if (user) {
      setActiveUser(user);
      showToast(`Switched active view to ${user.name} (${user.role}). Unauthorized menus are now hidden!`);
    } else {
      setActiveUser(null);
      setActiveRole('Primary Admin');
      showToast('Switched back to Primary Admin view. Full access restored.');
    }
  };

  const availableRolesList: UserRole[] = [
    'Secondary Admin',
    'Salesman',
    'Biller',
    'Biller and Salesman',
    'CA/Accountant',
    'Stock Keeper'
  ];

  const filteredActivities = activities.filter(act => {
    const matchUser = activityUserFilter === 'ALL' || act.userName === activityUserFilter || act.userId === activityUserFilter;
    const matchSearch = activitySearch === '' || 
      act.details.toLowerCase().includes(activitySearch.toLowerCase()) || 
      act.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
      act.userName.toLowerCase().includes(activitySearch.toLowerCase());
    return matchUser && matchSearch;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            Sync & Share
            <span className="text-amber-500 text-lg select-none" title="Premium Feature">👑</span>
          </h1>
          
          {/* Refresh Sync Button */}
          <button
            onClick={handleManualSync}
            title="Force Synchronize with Cloud"
            className="w-8 h-8 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center transition-colors shadow-2xs border border-sky-200"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Know More Button */}
          <button
            onClick={() => setIsKnowMoreOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Know More</span>
          </button>

          {/* + Add Users Red/Coral Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#ef4444] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Users</span>
          </button>
        </div>
      </div>

      {/* Server Software & Lifetime Validity Badge Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-md border border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm tracking-wide">Enterprise Server Software</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-2xs">
                LICENSE ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 border border-blue-400/40 text-blue-200">
                LIFETIME VALIDITY (NO EXPIRY)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Fully hosted local & cloud server deployment. Permanent lifetime access with zero expiration across multi-user roles and synchronization.
            </p>
          </div>
        </div>
      </div>

      {/* Logged in User Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[12px] text-slate-500 font-medium">
            Currently logged in with the following number:
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-slate-800 font-mono tracking-tight">
              {currentUser?.email || 'mbilalhassan00111@gmail.com'}
            </span>
            <button 
              onClick={handleManualSync}
              title="Sync Status Active"
              className="text-emerald-500 hover:text-emerald-600 p-0.5 rounded-full hover:bg-emerald-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Online & Synced
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{syncStatusText}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsFirebaseAuthOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google & Cloud Database</span>
          </button>

          {/* 3-dots Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-700 z-50 animate-in fade-in slide-in-from-top-1">
                <button 
                  onClick={() => { setIsAccountMenuOpen(false); setIsFirebaseAuthOpen(true); }} 
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Key className="w-3.5 h-3.5 text-blue-500" />
                  <span>Google / Firebase Auth</span>
                </button>
                <button 
                  onClick={() => { setIsAccountMenuOpen(false); handleManualSync(); }} 
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  <span>Force Full Data Sync</span>
                </button>
                <button 
                  onClick={() => { setIsAccountMenuOpen(false); setIsKnowMoreOpen(true); }} 
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Sync Diagnostics & Settings</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button 
                  onClick={() => { setIsAccountMenuOpen(false); handleSwitchSimulatedUser(null); }} 
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-600 font-medium"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
                  <span>Reset to Primary Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Role Switcher / RBAC Simulator Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Simulated Role:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white shadow-xs">
                {activeUser ? `${activeUser.name} (${activeRole})` : activeRole}
              </span>
            </div>
            <p className="text-[12px] text-slate-300 mt-0.5">
              {ROLE_DEFINITIONS[activeRole]?.description || 'Testing live access control restrictions.'}
            </p>
          </div>
        </div>

        {/* Quick Switch Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1 hidden lg:inline">Test Role:</span>
          {(['Primary Admin', 'Secondary Admin', 'Salesman', 'Biller', 'Stock Keeper', 'CA/Accountant'] as UserRole[]).map((r) => {
            const isActive = activeRole === r && !activeUser;
            return (
              <button
                key={r}
                onClick={() => {
                  setActiveUser(null);
                  setActiveRole(r);
                  showToast(`Role switched to ${r}. Sidebar and access updated.`);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {r === 'Primary Admin' ? 'Admin (Full)' : r}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Roles Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">User Roles</h2>
            <p className="text-xs text-slate-500">
              Manage staff permissions, assign access levels, and track audit activities.
            </p>
          </div>

          {/* See User Activity Button */}
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>See User Activity</span>
          </button>
        </div>

        {/* User Roles Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11.5px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">FULL NAME</th>
                <th className="py-3 px-4">PHONE/E-MAIL</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">ROLE</th>
                <th className="py-3 px-4 sm:px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700 font-medium">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No users added yet. Click "+ Add Users" above to invite team members.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleDef = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS['Salesman'];
                  const isCurrentSimulated = activeUser?.id === u.id;

                  return (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentSimulated ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* FULL NAME */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{u.name}</span>
                            {isCurrentSimulated && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                Active Simulator
                              </span>
                            )}
                            {u.notes && (
                              <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{u.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PHONE / E-MAIL */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          {u.emailOrPhone.includes('@') ? (
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs">{u.emailOrPhone}</span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[12px] font-bold ${
                          u.status === 'Joined' 
                            ? 'text-emerald-600' 
                            : u.status === 'Pending' 
                            ? 'text-amber-600' 
                            : 'text-slate-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      {/* ROLE & Change Role Dropdown */}
                      <td className="py-3.5 px-4 relative">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Role Badge */}
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${roleDef.badgeBg}`}>
                            {roleDef.badgeText}
                          </span>

                          {/* Change Role Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRoleDropdownUserId(activeRoleDropdownUserId === u.id ? null : u.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-0.5 hover:underline"
                          >
                            <span>Change Role</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dropdown Menu (Matches Screenshot 2) */}
                        {activeRoleDropdownUserId === u.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActiveRoleDropdownUserId(null)} 
                            />
                            <div className="absolute left-4 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-700 animate-in fade-in slide-in-from-top-1 overflow-hidden">
                              {availableRolesList.map((roleOpt) => {
                                const isSelected = u.role === roleOpt;
                                return (
                                  <button
                                    key={roleOpt}
                                    type="button"
                                    onClick={() => handleQuickRoleChange(u, roleOpt)}
                                    className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between ${
                                      isSelected 
                                        ? 'bg-sky-50 text-sky-900 font-bold' 
                                        : 'hover:bg-slate-100/80 text-slate-700'
                                    }`}
                                  >
                                    <span>{roleOpt}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Switch To Simulator User */}
                          <button
                            onClick={() => handleSwitchSimulatedUser(isCurrentSimulated ? null : u)}
                            title={isCurrentSimulated ? 'Switch back to Admin' : `Simulate view as ${u.name}`}
                            className={`p-1.5 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 ${
                              isCurrentSimulated 
                                ? 'bg-blue-600 text-white' 
                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                            }`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleOpenDelete(u)}
                            title="Delete User"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Reference Matrix (Collapsible Guide) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Role Permissions Matrix & Feature Access</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Automatic UI Filtering Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {availableRolesList.map((rName) => {
            const rDef = ROLE_DEFINITIONS[rName];
            return (
              <div key={rName} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wide border ${rDef.badgeBg}`}>
                    {rDef.badgeText}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed font-normal">
                  {rDef.description}
                </p>
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-1 text-[11px]">
                  <span className={rDef.allowedModules.sale ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>
                    ✓ Sale Vouchers
                  </span>
                  <span className={rDef.allowedModules.purchase ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>
                    ✓ Purchase Bills
                  </span>
                  <span className={rDef.allowedModules.items ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>
                    ✓ Inventory & Stock
                  </span>
                  <span className={rDef.allowedModules.reports ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>
                    ✓ P&L / Balance Sheet
                  </span>
                  <span className={rDef.allowedModules.bank ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>
                    ✓ Cash & Bank
                  </span>
                  <span className={rDef.allowedModules.syncShare ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>
                    ✓ Staff User Manage
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          MODAL: ADD NEW USER
      ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Add New Team User</h3>
                  <p className="text-xs text-slate-500">Invite staff and configure role-based access</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARIF / Kashif Ali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Phone or Email *</label>
                  <input
                    type="text"
                    required
                    placeholder="alhammedmedical@gmail.com / 0300..."
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">POS Passcode / PIN</label>
                  <input
                    type="text"
                    placeholder="4-digit PIN (e.g. 1234)"
                    maxLength={6}
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assign Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRolesList.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[11.5px] text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100 leading-normal">
                  <strong>Permissions:</strong> {ROLE_DEFINITIONS[formData.role]?.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Notes / Staff Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Branch operations manager"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ef4444] hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDIT USER
      ========================================================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Edit User Details</h3>
                  <p className="text-xs text-slate-500">Update {selectedUser.name}'s profile & role</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Phone or Email *</label>
                  <input
                    type="text"
                    required
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Joined">Joined (Active)</option>
                    <option value="Pending">Pending Invite</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assign Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRolesList.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[11.5px] text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100 leading-normal">
                  <strong>Permissions:</strong> {ROLE_DEFINITIONS[formData.role]?.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: DELETE USER CONFIRMATION
      ========================================================= */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete User</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{selectedUser.name}</strong> ({selectedUser.emailOrPhone})? They will lose access immediately.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL / DRAWER: SEE USER ACTIVITY
      ========================================================= */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">User Activity Audit Log</h3>
                  <p className="text-xs text-slate-500">Track real-time actions performed across the organization</p>
                </div>
              </div>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search activity description, user or invoice..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={activityUserFilter}
                onChange={(e) => setActivityUserFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
              >
                <option value="ALL">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No activity logs matching your filter.
                </div>
              ) : (
                filteredActivities.map((act) => (
                  <div key={act.id} className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{act.userName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {act.userRole}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          {act.module}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-slate-700 font-medium">
                        {act.details}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {new Date(act.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <span>Showing {filteredActivities.length} logs</span>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: KNOW MORE (SYNC & SHARE GUIDE)
      ========================================================= */}
      {isKnowMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">About Sync & Share</h3>
                  <p className="text-xs text-slate-500">Multi-Device Synchronization & Role Security</p>
                </div>
              </div>
              <button onClick={() => setIsKnowMoreOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-blue-600">
                  <RefreshCw className="w-4 h-4" /> Real-time Multi-Device Sync
                </h4>
                <p>
                  Work seamlessly across PCs, POS counters, and mobile tablets. Changes to sale invoices, stock inventory, and customer payments synchronize automatically with offline fallback support.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" /> Role-Based Access Control (RBAC)
                </h4>
                <p>
                  Prevent unauthorized staff from seeing confidential business margins or financial reports. For example, a <strong>Salesman</strong> can only book orders, a <strong>Biller</strong> can only invoice, and a <strong>Stock Keeper</strong> only manages inventory batches.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-indigo-600">
                  <History className="w-4 h-4" /> Audit Logs & Action Trails
                </h4>
                <p>
                  Every bill creation, stock quantity edit, and payment receipt is timestamped with the staff member's credentials for total transparency.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setIsKnowMoreOpen(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Firebase & Google Auth Modal */}
      <FirebaseAuthModal 
        isOpen={isFirebaseAuthOpen}
        onClose={() => setIsFirebaseAuthOpen(false)}
      />
    </div>
  );
};
