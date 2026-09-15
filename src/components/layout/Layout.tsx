import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { OfflineIndicator } from '../pwa/PWAComponents';
import { 
  Menu, Search, Plus, PlusCircle, Settings, 
  Bell, RefreshCw, Phone, MessageSquare, ShieldCheck, 
  Command, Headphones, Server, Key, Home, Users, Package, 
  ArrowDownLeft, ArrowUpRight, Receipt, ShoppingCart, X, AlertTriangle, Clock,
  LayoutGrid, Sparkles, Zap, Sun, Moon, Lock
} from 'lucide-react';
import { CompanyProfileModal } from '../company/CompanyProfileModal';
import { ShortcutsModal } from './ShortcutsModal';
import { HelpSupportModal } from '../help/HelpSupportModal';
import { TransactionSearch } from './TransactionSearch';
import { useAuth } from '../../contexts/AuthContext';
import { MasterAdminModal } from '../admin/MasterAdminModal';
import { LicenseActivationModal } from '../admin/LicenseActivationModal';
import { PricingModal } from '../pricing/PricingModal';
import { FeedbackModal } from '../feedback/FeedbackModal';
import { FirebaseAuthModal } from '../admin/FirebaseAuthModal';
import { ExceptionCenterModal } from '../common/ExceptionCenterModal';
import { DataImportWizardModal } from '../common/DataImportWizardModal';
import { Product360Modal } from '../common/Product360Modal';
import { Customer360Modal } from '../common/Customer360Modal';
import { CashierShiftModal } from '../pos/CashierShiftModal';
import { MobileSubMenuModal } from './MobileSubMenuModal';
import { StealthReturnBar } from '../common/StealthReturnBar';
import { EmergencyLockScreen } from '../common/EmergencyLockScreen';
import { getLicenseInfo, getLastLocalBackupTime, verifyLicenseWithHardware, incrementActiveMinutes } from '../../lib/licenseManager';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { PWAInstallBanner } from '../pwa/PWAInstallBanner';
import { useSettings } from '../../contexts/SettingsContext';
import { Medicine, Supplier, CashierShift } from '../../types';
import { dbCashierShifts } from '../../lib/db';
import { calculateLiveShiftMetrics } from '../../lib/cashierShiftManager';
import { 
  getStoredShortcuts, 
  matchesKeyboardEvent, 
  executeShortcutAction 
} from '../../lib/shortcutsManager';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('mbi_sidebar_collapsed') === 'true');

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('mbi_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMasterAdminOpen, setIsMasterAdminOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isFirebaseAuthOpen, setIsFirebaseAuthOpen] = useState(false);
  const [isExceptionCenterOpen, setIsExceptionCenterOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isCashierShiftOpen, setIsCashierShiftOpen] = useState(false);
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [selected360Product, setSelected360Product] = useState<Medicine | null>(null);
  const [selected360Party, setSelected360Party] = useState<Supplier | null>(null);
  const [isMobileQuickMenuOpen, setIsMobileQuickMenuOpen] = useState(false);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [licenseInfo, setLicenseInfo] = useState(() => getLicenseInfo());
  const [lastBackup, setLastBackup] = useState(() => getLastLocalBackupTime());

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState([
    {
      id: '1',
      title: 'Payment Due Alert',
      description: 'IMRAN PRESIDENT has Rs 20,800.00 outstanding balance on Purchase Bill #1',
      time: 'Today, 11:30 AM',
      type: 'due',
      unread: true,
      link: '/reports?report=purchase'
    },
    {
      id: '2',
      title: 'Stock Alert',
      description: 'Paracetamol 500mg and 2 other items are below safety reorder level',
      time: 'Yesterday',
      type: 'stock',
      unread: true,
      link: '/inventory'
    },
    {
      id: '3',
      title: 'System Backup Success',
      description: 'Automated database backup created and encrypted successfully',
      time: '2 days ago',
      type: 'backup',
      unread: false,
      link: '/sync-share'
    }
  ]);

  // Load active cashier shift
  const loadActiveShift = async () => {
    try {
      const active = await dbCashierShifts.getActiveShift();
      if (active) {
        const live = await calculateLiveShiftMetrics(active);
        setActiveCashierShift(live);
      } else {
        setActiveCashierShift(null);
      }
    } catch (e) {
      console.error('Failed to load active cashier shift:', e);
    }
  };

  useEffect(() => {
    loadActiveShift();
    const interval = setInterval(loadActiveShift, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notificationsList.filter(n => n.unread).length;

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const { currentUser, activeRole, activeUser, canPerform, canAccess } = useAuth();
  const { settings, isDarkMode, toggleTheme } = useSettings();
  const navigate = useNavigate();

  const canSale = canAccess('sale') && settings.modules?.sales !== false;
  const canPurchase = canAccess('purchase') && settings.modules?.purchases !== false;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hardware binding verification & live session time tracking
  useEffect(() => {
    // Run hardware binding check on startup
    verifyLicenseWithHardware().then(res => {
      if (!res.isValid && res.status === 'Hardware_Locked') {
        localStorage.setItem('mbi_emergency_lock_active', JSON.stringify({
          isLocked: true,
          reason: res.message || 'Hardware binding mismatch. Device not authorized.',
          timestamp: new Date().toISOString(),
          installationId: 'HW-MISMATCH'
        }));
        window.dispatchEvent(new CustomEvent('mbi-emergency-lock-triggered', {
          detail: { installationId: 'HW-MISMATCH', reason: res.message, mode: 'emergency_lock' }
        }));
      }
    });

    // Track 1-minute live active pulse and session duration
    const interval = setInterval(() => {
      incrementActiveMinutes(1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Listen for custom open modal events across the entire application
  useEffect(() => {
    const handleOpenPricing = () => setIsPricingModalOpen(true);
    const handleOpenFeedback = () => setIsFeedbackModalOpen(true);
    const handleOpenCashierShift = () => setIsCashierShiftOpen(true);
    const handleOpenExceptionCenter = () => setIsExceptionCenterOpen(true);
    const handleOpenImportWizard = () => setIsImportWizardOpen(true);
    const handleOpenCompanyProfile = () => setIsCompanyModalOpen(true);
    const handleOpenShortcuts = () => setIsShortcutsModalOpen(true);
    const handleOpenHelp = () => setIsHelpModalOpen(true);
    const handleOpenFirebaseAuth = () => setIsFirebaseAuthOpen(true);
    const handleOpenLicense = () => setIsLicenseModalOpen(true);
    const handleOpenMasterAdmin = () => setIsMasterAdminOpen(true);
    const handleToggleSidebar = () => toggleSidebarCollapsed();
    const handleTriggerSync = () => {
      window.location.reload();
    };

    window.addEventListener('open-pricing-modal', handleOpenPricing);
    window.addEventListener('open-feedback-modal', handleOpenFeedback);
    window.addEventListener('open-cashier-shift', handleOpenCashierShift);
    window.addEventListener('open-exception-center', handleOpenExceptionCenter);
    window.addEventListener('open-import-wizard', handleOpenImportWizard);
    window.addEventListener('open-company-profile', handleOpenCompanyProfile);
    window.addEventListener('open-shortcuts-modal', handleOpenShortcuts);
    window.addEventListener('open-help-modal', handleOpenHelp);
    window.addEventListener('open-firebase-auth', handleOpenFirebaseAuth);
    window.addEventListener('open-license-modal', handleOpenLicense);
    window.addEventListener('open-master-admin', handleOpenMasterAdmin);
    window.addEventListener('toggle-sidebar-collapse', handleToggleSidebar);
    window.addEventListener('trigger-cloud-sync', handleTriggerSync);

    return () => {
      window.removeEventListener('open-pricing-modal', handleOpenPricing);
      window.removeEventListener('open-feedback-modal', handleOpenFeedback);
      window.removeEventListener('open-cashier-shift', handleOpenCashierShift);
      window.removeEventListener('open-exception-center', handleOpenExceptionCenter);
      window.removeEventListener('open-import-wizard', handleOpenImportWizard);
      window.removeEventListener('open-company-profile', handleOpenCompanyProfile);
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcuts);
      window.removeEventListener('open-help-modal', handleOpenHelp);
      window.removeEventListener('open-firebase-auth', handleOpenFirebaseAuth);
      window.removeEventListener('open-license-modal', handleOpenLicense);
      window.removeEventListener('open-master-admin', handleOpenMasterAdmin);
      window.removeEventListener('toggle-sidebar-collapse', handleToggleSidebar);
      window.removeEventListener('trigger-cloud-sync', handleTriggerSync);
    };
  }, []);

  // Global Dynamic Keyboard Shortcuts Engine (Editable & Live)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close open modals on Escape
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsShortcutsModalOpen(false);
        setIsCompanyModalOpen(false);
        setIsHelpModalOpen(false);
        return;
      }

      // If user is actively typing inside an input or textarea, only allow global control keys
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // F1 or Ctrl+Enter to toggle Shortcuts Hub anytime
      if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // Alt+M or Ctrl+Shift+M to toggle Master Server Control Hub anytime
      if ((e.altKey && (e.key === 'm' || e.key === 'M')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm'))) {
        e.preventDefault();
        setIsMasterAdminOpen(prev => !prev);
        return;
      }

      // If in input field, don't trigger single letter shortcuts unless combined with Alt/Ctrl
      if (isInputFocused && !e.altKey && !e.ctrlKey && !e.metaKey && !e.key.startsWith('F')) {
        return;
      }

      // Check against user's active/customized shortcuts
      const currentShortcuts = getStoredShortcuts();
      const matched = currentShortcuts.find(item => matchesKeyboardEvent(e, item.currentKey));

      if (matched) {
        e.preventDefault();
        executeShortcutAction(matched, navigate);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans relative">
      {/* Master Server Stealth Remote Switch Ghost Bar */}
      <StealthReturnBar />

      {/* Master Server Emergency Remote Lock Screen */}
      <EmergencyLockScreen />

      {/* PWA Smart Install Banner */}
      <PWAInstallBanner />
      
      {/* Top Application Bar (Vyapar / MBI Inventra style - Desktop) */}
      <div className="hidden md:flex h-7 bg-white border-b border-slate-200 items-center justify-between px-2 sm:px-3 text-[11px] text-slate-600 select-none z-30 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button 
            onClick={() => setIsCompanyModalOpen(true)}
            className="hover:text-blue-600 font-semibold flex items-center gap-1 transition-colors px-1 py-0.5 rounded cursor-pointer"
          >
            Company
          </button>
          
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="hover:text-blue-600 font-semibold flex items-center gap-1 text-blue-600 cursor-pointer transition-colors px-1 py-0.5 rounded"
          >
            <Headphones className="w-3 h-3 text-blue-600" />
            <span>Help</span>
          </button>
          <button 
            onClick={() => setIsShortcutsModalOpen(true)} 
            className="flex hover:text-blue-600 font-semibold items-center gap-1.5 cursor-pointer transition-colors px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:border-blue-300 text-slate-700"
            title="Open Keyboard Shortcuts Hub (Ctrl + Enter or F1)"
          >
            <Command className="w-3 h-3 text-blue-600" />
            <span>Shortcuts</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-200 text-slate-700 font-mono text-[9px] font-bold rounded">Ctrl+Enter</kbd>
          </button>
          <button onClick={() => window.location.reload()} className="hover:text-blue-600 p-1 cursor-pointer" title="Refresh">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Real-time Firebase Sync Status Indicator */}
          <SyncStatusIndicator />

          {/* Google Auth / Firebase Cloud Status Button */}
          <button
            onClick={() => setIsFirebaseAuthOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer transition-colors"
            title="Google Login & Firebase Cloud Database"
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="font-bold text-[10px] max-w-[65px] sm:max-w-none truncate">
              {currentUser?.email ? currentUser.email.split('@')[0] : 'Login'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </button>

          {/* Active Role Indicator in top bar */}
          <div 
            onClick={() => navigate('/sync-share')}
            className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 cursor-pointer transition-colors"
            title="Click to manage Users & Roles in Sync & Share"
          >
            <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="font-bold text-[10px] truncate max-w-[90px]">
              {activeUser ? `${activeUser.name} (${activeRole})` : `Role: ${activeRole}`}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <span className="font-semibold text-slate-500">MBI Support:</span>
            <a href="tel:03364585863" className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" /> 03364585863
            </a>
            <span className="text-slate-300">|</span>
            <a href="https://wa.me/923281302636" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-semibold flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5" /> 03281302636
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        
        <div className="flex flex-col flex-1 min-w-0 bg-[#f8fafc]">
          {/* Top App Header */}
          <header className="flex items-center justify-between h-[52px] sm:h-[56px] px-2 sm:px-3 lg:px-4 border-b border-slate-200 bg-white shadow-2xs z-20 gap-2">
            <div className="flex items-center flex-1 min-w-0 max-w-2xl mr-1 sm:mr-2 lg:mr-4">
              <button 
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(prev => !prev);
                  } else {
                    toggleSidebarCollapsed();
                  }
                }}
                className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 mr-1 sm:mr-2 text-slate-600 hover:text-slate-900 focus:outline-none rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
                aria-label="Toggle Sidebar"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              {/* Live Dynamic Transaction Search */}
              <div className="flex-1 min-w-0">
                <TransactionSearch />
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2.5 shrink-0">
              {/* Action buttons (Only visible on tablet/desktop md: and up) */}
              <div className="hidden md:flex items-center gap-1.5 lg:gap-2 mr-0.5 sm:mr-1">
                {canSale && (
                  <button 
                    onClick={() => navigate('/sale/invoices?action=add')} 
                    className="flex items-center gap-1.5 bg-[#dc2626] hover:bg-red-700 text-white px-3 lg:px-4 py-1.5 rounded-full text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                    title="Add Sale Invoice (Alt+S)"
                  >
                    <PlusCircle className="w-3.5 h-3.5 fill-white text-[#dc2626] shrink-0" />
                    <span>Add Sale</span>
                  </button>
                )}
                {canPurchase && (
                  <button 
                    onClick={() => navigate('/purchase?action=add')} 
                    className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white px-3 lg:px-4 py-1.5 rounded-full text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                    title="Add Purchase Bill (Alt+P)"
                  >
                    <PlusCircle className="w-3.5 h-3.5 fill-white text-[#2563eb] shrink-0" />
                    <span>Add Purchase</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-0.5 sm:gap-1.5 lg:gap-2 text-slate-500">
                {/* Cashier Shift Management Button (Feature #11) */}
                {settings.featureFlags?.cashierShiftClosing !== false && (
                  <button
                    onClick={() => setIsCashierShiftOpen(true)}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                      activeCashierShift
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                    title={activeCashierShift ? `Active Shift: ${activeCashierShift.shiftNumber} (Expected: Rs ${activeCashierShift.expectedCash.toLocaleString()})` : 'Start or Reconcile Cashier Shift'}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden xl:inline">
                      {activeCashierShift ? `Shift: Rs ${activeCashierShift.expectedCash.toLocaleString()}` : 'Shift Closed'}
                    </span>
                    <span className="xl:hidden text-[10px] font-bold">
                      {activeCashierShift ? 'Shift Active' : 'Shift'}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeCashierShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  </button>
                )}

                {/* Exception Center Radar (Feature #13) */}
                {settings.featureFlags?.exceptionCenter !== false && (
                  <button
                    title="Exception Center (Operational Radar)"
                    onClick={() => setIsExceptionCenterOpen(true)}
                    className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors relative cursor-pointer"
                  >
                    <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />
                  </button>
                )}

                {/* Data Import Wizard (Feature #4) */}
                {settings.featureFlags?.dataImportWizard !== false && (
                  <button
                    title="Universal Data Import Wizard (Excel / CSV)"
                    onClick={() => setIsImportWizardOpen(true)}
                    className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer hidden xl:flex"
                  >
                    <Package className="w-[18px] h-[18px] text-slate-600" />
                  </button>
                )}

                <button 
                  title="Help & Support (03364585863 / 03281302636)" 
                  onClick={() => setIsHelpModalOpen(true)} 
                  className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer hidden lg:flex"
                >
                  <Headphones className="w-[18px] h-[18px] text-blue-600" />
                </button>
                
                {/* Interactive Notification Popover */}
                <div className="relative">
                  <button 
                    title="Notifications" 
                    onClick={() => setIsNotificationsOpen(prev => !prev)} 
                    className={`p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors relative cursor-pointer ${
                      isNotificationsOpen ? 'bg-slate-100 text-blue-600' : ''
                    }`}
                  >
                    <Bell className="w-[18px] h-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold uppercase tracking-wider">Notifications & Alerts</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-500/80 text-white text-[10px] font-bold rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] text-blue-300 hover:text-white font-semibold cursor-pointer underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notificationsList.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400">
                            No notifications at this time
                          </div>
                        ) : (
                          notificationsList.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                navigate(notif.link);
                              }}
                              className={`p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                                notif.unread ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                {notif.type === 'due' ? (
                                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                    !
                                  </div>
                                ) : notif.type === 'stock' ? (
                                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                                    ★
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className={`font-bold truncate ${notif.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {notif.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.time}</span>
                                </div>
                                <p className="text-slate-600 text-[11.5px] leading-snug">{notif.description}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button 
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            navigate('/reports?report=day_book');
                          }}
                          className="text-blue-600 font-bold hover:underline cursor-pointer text-[11px]"
                        >
                          View All Activity
                        </button>
                        <button 
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-slate-500 font-semibold hover:text-slate-800 cursor-pointer text-[11px]"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Global Theme Toggle (Night Shift) */}
                <button
                  type="button"
                  title={isDarkMode ? "Switch to Light Day Mode" : "Switch to Dark Night Shift"}
                  onClick={toggleTheme}
                  className="p-1.5 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  aria-label="Toggle Night Shift Mode"
                >
                  {isDarkMode ? (
                    <Sun className="w-[18px] h-[18px] text-amber-400 animate-in fade-in" />
                  ) : (
                    <Moon className="w-[18px] h-[18px] text-indigo-500 animate-in fade-in" />
                  )}
                </button>

                {canAccess('settings') && (
                  <button title="Settings" onClick={() => navigate('/settings')} className="hidden sm:flex p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                    <Settings className="w-[18px] h-[18px]" />
                  </button>
                )}

                {/* Mobile Sub-Menu / Tools Trigger */}
                <button 
                  title="Sub-Menu & System Tools" 
                  onClick={() => setIsMobileSubMenuOpen(true)}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <span>Menu</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-[#f8fafc] pb-20 md:pb-6">
            <div className="mx-auto max-w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar & Center FAB */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl px-3 py-2 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex flex-col items-center text-slate-600 hover:text-blue-600 text-[10px] font-semibold cursor-pointer min-w-[54px]"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button 
          onClick={() => navigate('/billing')}
          className="flex flex-col items-center text-slate-600 hover:text-amber-600 text-[10px] font-semibold cursor-pointer min-w-[54px]"
        >
          <Zap className="w-5 h-5 mb-0.5 text-amber-500 fill-amber-500" />
          <span>POS Fast</span>
        </button>

        {/* Center Prominent Plus FAB */}
        <div className="relative -top-5">
          <button 
            onClick={() => setIsMobileQuickMenuOpen(prev => !prev)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center border-4 border-white transition-transform active:scale-95 cursor-pointer"
            title="Quick Add Actions"
          >
            <Plus className={`w-6 h-6 transition-transform ${isMobileQuickMenuOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <button 
          onClick={() => navigate('/items')}
          className="flex flex-col items-center text-slate-600 hover:text-emerald-600 text-[10px] font-semibold cursor-pointer min-w-[54px]"
        >
          <Package className="w-5 h-5 mb-0.5 text-emerald-600" />
          <span>Items</span>
        </button>

        <button 
          onClick={() => setIsMobileSubMenuOpen(true)}
          className="flex flex-col items-center text-slate-600 hover:text-blue-600 text-[10px] font-semibold cursor-pointer min-w-[54px]"
        >
          <LayoutGrid className="w-5 h-5 mb-0.5 text-blue-600" />
          <span>Sub-Menu</span>
        </button>
      </div>

      {/* Mobile Quick Action Center Menu Modal (Parties, Items, Payment In, Payment Out) */}
      {isMobileQuickMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-fadeIn">
          <div className="bg-white w-full rounded-t-2xl p-5 shadow-2xl border-t border-slate-200 animate-slideUp">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Quick Actions & Master Data</h3>
              <button 
                onClick={() => setIsMobileQuickMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setIsMobileQuickMenuOpen(false);
                  navigate('/parties');
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Parties</div>
                  <div className="text-[10px] text-blue-700 font-normal">Customers & Suppliers</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileQuickMenuOpen(false);
                  navigate('/items');
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Items</div>
                  <div className="text-[10px] text-emerald-700 font-normal">Inventory & Stock</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileQuickMenuOpen(false);
                  navigate('/bank');
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Payment In</div>
                  <div className="text-[10px] text-indigo-700 font-normal">Receive cash / bank</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileQuickMenuOpen(false);
                  navigate('/expenses');
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Payment Out</div>
                  <div className="text-[10px] text-amber-700 font-normal">Expenses & Payouts</div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setIsMobileQuickMenuOpen(false);
                  navigate('/sale/invoices?action=add');
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs text-center cursor-pointer"
              >
                + Add Sale
              </button>
              <button
                onClick={() => {
                  setIsMobileQuickMenuOpen(false);
                  navigate('/purchase?action=add');
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs text-center cursor-pointer"
              >
                + Add Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      <CompanyProfileModal 
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
      />

      <ShortcutsModal 
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <HelpSupportModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <MasterAdminModal
        isOpen={isMasterAdminOpen}
        onClose={() => setIsMasterAdminOpen(false)}
      />

      <LicenseActivationModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onStatusChange={() => setLicenseInfo(getLicenseInfo())}
      />

      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />

      <FeedbackModal 
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      <FirebaseAuthModal 
        isOpen={isFirebaseAuthOpen}
        onClose={() => setIsFirebaseAuthOpen(false)}
      />

      <ExceptionCenterModal
        isOpen={isExceptionCenterOpen}
        onClose={() => setIsExceptionCenterOpen(false)}
        onOpenProduct360={(prod) => setSelected360Product(prod)}
        onOpenCustomer360={(party) => setSelected360Party(party)}
      />

      <DataImportWizardModal
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
      />

      <Product360Modal
        product={selected360Product}
        isOpen={!!selected360Product}
        onClose={() => setSelected360Product(null)}
      />

      <Customer360Modal
        party={selected360Party}
        isOpen={!!selected360Party}
        onClose={() => setSelected360Party(null)}
      />

      <CashierShiftModal
        isOpen={isCashierShiftOpen}
        onClose={() => setIsCashierShiftOpen(false)}
        onShiftStatusChange={(s) => setActiveCashierShift(s)}
      />

      {/* Mobile Sub-Menu & Quick Tools Sheet */}
      <MobileSubMenuModal 
        isOpen={isMobileSubMenuOpen}
        onClose={() => setIsMobileSubMenuOpen(false)}
        currentUser={currentUser}
        activeUser={activeUser}
        activeRole={activeRole}
        activeCashierShift={activeCashierShift}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenFirebaseAuth={() => setIsFirebaseAuthOpen(true)}
        onOpenCashierShift={() => setIsCashierShiftOpen(true)}
        onOpenExceptionCenter={() => setIsExceptionCenterOpen(true)}
        onOpenImportWizard={() => setIsImportWizardOpen(true)}
        onOpenPricingModal={() => setIsPricingModalOpen(true)}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenMasterAdmin={() => setIsMasterAdminOpen(true)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      <OfflineIndicator />
    </div>
  );
};
