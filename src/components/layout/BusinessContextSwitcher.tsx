import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, ChevronDown, Check, Plus, LogIn, LogOut, 
  ShieldCheck, ShieldAlert, Key, User, Sparkles, RefreshCw, 
  Settings, Layers, Store, ArrowRightLeft, Lock, FileText, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Business, UserRole, AppUserRecord } from '../../types';
import { useNavigate } from 'react-router-dom';
import { logAuditEvent } from '../../lib/auditLogger';

interface BusinessContextSwitcherProps {
  onOpenAuditLogs?: () => void;
}

export const BusinessContextSwitcher: React.FC<BusinessContextSwitcherProps> = ({ onOpenAuditLogs }) => {
  const { 
    business, 
    currentUser, 
    userProfile, 
    activeRole, 
    activeUser, 
    logout, 
    setActiveUser, 
    setActiveRole,
    appUsers,
    updateBusiness
  } = useAuth();
  
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] = useState(false);
  const [isPinSwitchModalOpen, setIsPinSwitchModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<AppUserRecord | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // New business form state
  const [newBizName, setNewBizName] = useState('');
  const [newBizCity, setNewBizCity] = useState('Lahore');
  const [newBizPhone, setNewBizPhone] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // List of businesses associated with current user
  const [userBusinesses, setUserBusinesses] = useState<Business[]>(() => {
    try {
      const stored = localStorage.getItem('mbi_user_businesses');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    
    // Default initial business list with the current business
    return [
      business || {
        id: 'local-business-id',
        name: 'MBI INVENTRA',
        ownerUid: 'u1',
        members: ['u1'],
        phone: '03364585863',
        mobile: '03281302636',
        email: 'support@mbinventra.com',
        city: 'Lahore',
        address: 'MBI Corporate Plaza, Commercial Center',
        currency: 'PKR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'biz_lahore_central',
        name: 'MBI Pharma - Central Branch',
        ownerUid: 'u1',
        members: ['u1'],
        phone: '03281302636',
        mobile: '03364585863',
        email: 'lahore@mbinventra.com',
        city: 'Lahore Main',
        address: 'Mall Road, Commercial Hub',
        currency: 'PKR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'biz_islamabad_retail',
        name: 'Inventra Medicos - Blue Area',
        ownerUid: 'u1',
        members: ['u1'],
        phone: '0518899221',
        mobile: '03281302636',
        email: 'islamabad@mbinventra.com',
        city: 'Islamabad',
        address: 'Blue Area Sector F-7',
        currency: 'PKR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  });

  const handleSelectBusiness = async (targetBiz: Business) => {
    if (targetBiz.id === business?.id) {
      setIsOpen(false);
      return;
    }
    
    setIsSwitching(true);
    try {
      // Log business context switch audit event
      await logAuditEvent({
        category: 'BUSINESS_SWITCH',
        action: `Switched Pharmacy Context to ${targetBiz.name}`,
        entity: 'Business',
        entityId: targetBiz.id,
        details: `Operator changed business workspace from ${business?.name || 'Previous'} (ID: ${business?.id}) to ${targetBiz.name} (ID: ${targetBiz.id})`,
        previousValue: { id: business?.id, name: business?.name },
        newValue: { id: targetBiz.id, name: targetBiz.name }
      });

      // Update active business in localStorage and Context
      localStorage.setItem('mbi_active_business_id', targetBiz.id);
      localStorage.setItem('mock_business', JSON.stringify(targetBiz));
      
      // Update AuthContext
      await updateBusiness(targetBiz);

      // Re-trigger global sync / page reload to refresh all data caches
      setIsOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e) {
      console.error('Error switching business:', e);
      setIsSwitching(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    const newId = 'biz_' + newBizName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
    const newBiz: Business = {
      id: newId,
      name: newBizName.trim(),
      ownerUid: currentUser?.uid || 'u1',
      members: [currentUser?.uid || 'u1'],
      phone: newBizPhone || '03364585863',
      city: newBizCity || 'Lahore',
      address: `${newBizName} Medical Store, ${newBizCity}`,
      email: currentUser?.email || 'admin@mbinventra.com',
      currency: 'PKR',
      vatPercentage: 0,
      businessType: 'Retail & Wholesale Pharmacy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...userBusinesses, newBiz];
    setUserBusinesses(updatedList);
    localStorage.setItem('mbi_user_businesses', JSON.stringify(updatedList));

    setIsCreateBusinessModalOpen(false);
    setNewBizName('');
    setNewBizPhone('');
    
    // Automatically switch to the newly created business
    await handleSelectBusiness(newBiz);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPin) return;

    const expectedPin = selectedStaffForPin.passcode || '0000';
    if (pinInput === expectedPin || pinInput === '0000' || pinInput === '1234') {
      setActiveUser(selectedStaffForPin);
      setActiveRole(selectedStaffForPin.role);
      
      await logAuditEvent({
        category: 'AUTH_LOGIN',
        action: `Staff Switch via PIN: ${selectedStaffForPin.name} (${selectedStaffForPin.role})`,
        entity: 'User',
        entityId: selectedStaffForPin.id,
        details: `Active terminal operator switched to ${selectedStaffForPin.name} with role ${selectedStaffForPin.role}`,
      });

      setIsPinSwitchModalOpen(false);
      setPinInput('');
      setSelectedStaffForPin(null);
      setPinError(null);
      setIsOpen(false);
    } else {
      setPinError('Invalid 4-digit Passcode. Please try again or use default (0000).');
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logAuditEvent({
      category: 'AUTH_LOGIN',
      action: `User Logged Out (${currentUser?.email || 'Admin'})`,
      entity: 'Session',
      details: `Operator logged out of workspace ${business?.name || 'MBI INVENTRA'}`,
    });
    await logout();
  };

  const isPrimaryAdmin = activeRole === 'Primary Admin';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
          isOpen
            ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
        }`}
        title={`Current Pharmacy Context: ${business?.name || 'MBI INVENTRA'} (Click to switch business or user)`}
      >
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
          <Store className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-slate-900 truncate max-w-[110px] sm:max-w-[160px]">
              {business?.name || 'MBI INVENTRA'}
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-bold border border-slate-200">
              {business?.city || 'HQ'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="font-semibold text-blue-600 truncate max-w-[80px]">
              {activeUser ? activeUser.name : activeRole}
            </span>
            <span>•</span>
            <span className="font-mono text-[9px] text-slate-400 truncate max-w-[60px]">
              {business?.id ? business.id.substring(0, 8) : 'local'}
            </span>
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header with Active Context */}
          <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                Active Business Context
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Tenant
              </span>
            </div>

            <h3 className="font-black text-sm sm:text-base text-white truncate">
              {business?.name || 'MBI INVENTRA'}
            </h3>
            <p className="text-xs text-slate-300 truncate mt-0.5">
              {business?.address || 'Lahore Corporate Plaza'}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold">
                  {(activeUser?.name || currentUser?.email || 'A')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-xs truncate max-w-[150px]">
                    {activeUser?.name || currentUser?.displayName || 'Primary Admin'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                    {currentUser?.email || 'm.bilalinayat786@gmail.com'}
                  </p>
                </div>
              </div>

              <span className="px-2 py-1 rounded-lg bg-indigo-900/80 border border-indigo-700 text-indigo-200 text-[10px] font-bold">
                {activeRole}
              </span>
            </div>
          </div>

          {/* Business Switcher List */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Linked Pharmacy Accounts ({userBusinesses.length})
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateBusinessModalOpen(true);
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {userBusinesses.map((biz) => {
                const isActive = biz.id === business?.id;
                return (
                  <div
                    key={biz.id}
                    onClick={() => handleSelectBusiness(biz)}
                    className={`p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-semibold'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {biz.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{biz.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {biz.city || 'HQ'} • ID: {biz.id.substring(0, 10)}
                        </p>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600">
                        Switch
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Context & Role Actions */}
          <div className="p-2 space-y-1">
            {/* Quick Switch Staff / PIN */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsPinSwitchModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <span>Fast Cashier / PIN Switch</span>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                4-Digit PIN
              </span>
            </button>

            {/* Primary Admin Audit Trail Viewer Trigger */}
            {isPrimaryAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenAuditLogs) {
                    onOpenAuditLogs();
                  } else {
                    window.dispatchEvent(new CustomEvent('open-audit-log-modal'));
                  }
                }}
                className="w-full flex items-center justify-between p-2 hover:bg-red-50 rounded-xl text-xs font-semibold text-red-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <span>Audit Logs & Security Radar</span>
                </div>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                  Admin Only
                </span>
              </button>
            )}

            {/* Primary Admin Settings */}
            {isPrimaryAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings?tab=ADMIN%20SETTINGS');
                }}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <span>Admin Settings & Feature Flags</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">
                  Config
                </span>
              </button>
            )}
          </div>

          {/* Dropdown Footer: Logout / Re-login */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateBusinessModalOpen(true);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Register Branch
            </button>

            <button
              onClick={handleLogout}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out / Re-login
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create / Add New Pharmacy Account */}
      {isCreateBusinessModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Pharmacy Account</h3>
                  <p className="text-xs text-slate-500">Multi-tenant business instance under your email</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateBusinessModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pharmacy / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inventra Medicos - Model Town"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Branch
                  </label>
                  <input
                    type="text"
                    placeholder="Lahore / Karachi"
                    value={newBizCity}
                    onChange={(e) => setNewBizCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / Helpline
                  </label>
                  <input
                    type="text"
                    placeholder="03364585863"
                    value={newBizPhone}
                    onChange={(e) => setNewBizPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Complete Multi-Tenant Segregation
                </p>
                <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                  All inventory, sales bills, ledger records and audit logs for this branch will be isolated by a unique business ID in Firestore.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateBusinessModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Create & Switch Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fast PIN / Cashier Switch */}
      {isPinSwitchModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Switch Operator / Cashier</h3>
                  <p className="text-xs text-slate-500">Fast authentication with 4-digit security PIN</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPinSwitchModalOpen(false);
                  setSelectedStaffForPin(null);
                  setPinInput('');
                  setPinError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select User / Cashier *
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {appUsers.map((u) => {
                    const isSel = selectedStaffForPin?.id === u.id;
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setSelectedStaffForPin(u);
                          setPinError(null);
                        }}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                          isSel
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                          {u.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedStaffForPin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enter 4-Digit Passcode for <span className="text-indigo-600">{selectedStaffForPin.name}</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    autoFocus
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full px-3 py-2.5 text-center tracking-[0.5em] text-lg font-mono font-black border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-1">Default Demo PIN: <code>0000</code> or <code>1234</code></p>
                </div>
              )}

              {pinError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                  {pinError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPinSwitchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStaffForPin || pinInput.length < 4}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Authorize & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
