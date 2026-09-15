import React, { useState, useEffect } from 'react';
import { 
  Shield, ShieldCheck, ShieldAlert, Lock, CheckCircle2, 
  RotateCcw, Save, Key, AlertTriangle, Eye, EyeOff, 
  DollarSign, FileText, Package, Users, Database, HelpCircle
} from 'lucide-react';
import { UserRole } from '../../types';
import { 
  RolePermissions, 
  ROLE_DEFINITIONS, 
  getActiveRolePermissions, 
  saveCustomRolePermissions, 
  resetRolePermissionsToDefault 
} from '../../lib/permissions';

const ROLES_LIST: UserRole[] = [
  'Primary Admin',
  'Secondary Admin',
  'Salesman',
  'Biller',
  'Stock Keeper',
  'CA/Accountant'
];

export const RbacManagementTab: React.FC = () => {
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<UserRole, RolePermissions>>(() => getActiveRolePermissions());
  const [selectedRole, setSelectedRole] = useState<UserRole>('Salesman');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setPermissionsMatrix(getActiveRolePermissions());
  }, []);

  const currentRolePerms = permissionsMatrix[selectedRole] || ROLE_DEFINITIONS[selectedRole];
  const isPrimaryAdmin = selectedRole === 'Primary Admin';

  const handleModuleToggle = (moduleKey: keyof RolePermissions['allowedModules']) => {
    if (isPrimaryAdmin) return; // Primary Admin cannot lose root modules
    setPermissionsMatrix(prev => {
      const updatedRole = {
        ...prev[selectedRole],
        allowedModules: {
          ...prev[selectedRole].allowedModules,
          [moduleKey]: !prev[selectedRole].allowedModules[moduleKey]
        }
      };
      return {
        ...prev,
        [selectedRole]: updatedRole
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleFeatureToggle = (featureKey: keyof RolePermissions['features']) => {
    if (isPrimaryAdmin) return;
    setPermissionsMatrix(prev => {
      const updatedRole = {
        ...prev[selectedRole],
        features: {
          ...prev[selectedRole].features,
          [featureKey]: !prev[selectedRole].features[featureKey]
        }
      };
      return {
        ...prev,
        [selectedRole]: updatedRole
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = () => {
    saveCustomRolePermissions(permissionsMatrix);
    setHasUnsavedChanges(false);
    setSaveSuccessMsg(`Security permissions updated successfully for ${selectedRole} and active staff roles!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all roles and permission levels back to default factory security policies?')) {
      const defaults = resetRolePermissionsToDefault();
      setPermissionsMatrix(defaults);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg('Permissions successfully reset to factory defaults.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Role-Based Access Control (RBAC)</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Active Security
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Define granular module access and sensitive financial restrictions across staff roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Role Selection Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {ROLES_LIST.map((role) => {
            const isSelected = selectedRole === role;
            const def = permissionsMatrix[role] || ROLE_DEFINITIONS[role];
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-xl text-left transition-all relative border flex flex-col justify-between min-h-[76px] cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-50/90 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20' 
                    : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${def.badgeBg}`}>
                    {role}
                  </span>
                  {role === 'Primary Admin' && (
                    <Lock className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 mt-2 truncate">
                  {def.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Role Configuration Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Role Overview Sub-Header */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-black text-slate-900">{currentRolePerms.title}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentRolePerms.badgeBg}`}>
                {currentRolePerms.badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">{currentRolePerms.description}</p>
          </div>

          {isPrimaryAdmin && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2 self-start">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Primary Admin has absolute immutable super-user rights.</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">

          {/* Section 1: Sensitive Data & Security Privileges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Sensitive Financial & Operational Privileges
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* canViewFinancialReports */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canViewFinancialReports 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View Financial Reports & P&L</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Access to Profit & Loss, Balance Sheet, Day Book, and Audit Trails.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPrimaryAdmin}
                  checked={currentRolePerms.features.canViewFinancialReports}
                  onChange={() => handleFeatureToggle('canViewFinancialReports')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canViewCostsAndProfit */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canViewCostsAndProfit 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Purchase Costs & Profit Margins</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hides wholesale purchase cost prices and net margins from POS billers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPrimaryAdmin}
                  checked={currentRolePerms.features.canViewCostsAndProfit}
                  onChange={() => handleFeatureToggle('canViewCostsAndProfit')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canManageBankAccounts */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canManageBankAccounts 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span>Manage Bank & Cash Accounts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Access to Bank Ledger, Cheques, Loans, and Cash-in-Hand balances.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPrimaryAdmin}
                  checked={currentRolePerms.features.canManageBankAccounts}
                  onChange={() => handleFeatureToggle('canManageBankAccounts')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canDeleteTransactions */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canDeleteTransactions 
                  ? 'bg-rose-50/60 border-rose-200 text-rose-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Invoices & Records (Strict)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Authority to permanently void or delete saved sales and transactions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPrimaryAdmin}
                  checked={currentRolePerms.features.canDeleteTransactions}
                  onChange={() => handleFeatureToggle('canDeleteTransactions')}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canAddEditItems */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canAddEditItems 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <Package className="w-3.5 h-3.5 text-teal-600" />
                    <span>Add & Edit Inventory Products</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modify product prices, barcodes, batch numbers, and stock levels.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPrimaryAdmin}
                  checked={currentRolePerms.features.canAddEditItems}
                  onChange={() => handleFeatureToggle('canAddEditItems')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canManageUsersAndRoles */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canManageUsersAndRoles 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Manage Staff Users & Passwords</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Create new staff logins and assign role access permissions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isPrimaryAdmin}
                  checked={currentRolePerms.features.canManageUsersAndRoles}
                  onChange={() => handleFeatureToggle('canManageUsersAndRoles')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

            </div>
          </div>

          {/* Section 2: Module Navigation Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Key className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Module Navigation & Screen Access
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { key: 'dashboard', label: 'Dashboard & Analytics' },
                { key: 'parties', label: 'Customers & Parties' },
                { key: 'items', label: 'Inventory / Medicines' },
                { key: 'sale', label: 'Sales & Invoices' },
                { key: 'purchase', label: 'Purchases & Orders' },
                { key: 'expenses', label: 'Expenses Tracking' },
                { key: 'bank', label: 'Bank & Cash Management' },
                { key: 'reports', label: 'Reports & P&L Analysis' },
                { key: 'syncShare', label: 'Cloud Sync & Share' },
                { key: 'backup', label: 'Disaster Recovery Backup' },
                { key: 'utilities', label: 'Barcode & Utility Tools' },
                { key: 'settings', label: 'System Settings' },
              ].map(({ key, label }) => {
                const isAllowed = currentRolePerms.allowedModules[key as keyof RolePermissions['allowedModules']];
                return (
                  <label
                    key={key}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                      isAllowed 
                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 font-bold' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-xs">{label}</span>
                    <input
                      type="checkbox"
                      disabled={isPrimaryAdmin}
                      checked={isAllowed}
                      onChange={() => handleModuleToggle(key as any)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Changes will take effect instantly across all logged-in user sessions.
          </span>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            Save Role Permissions
          </button>
        </div>

      </div>

    </div>
  );
};
