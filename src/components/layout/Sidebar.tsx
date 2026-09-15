import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Package, FileText, ShoppingCart, Wallet, Landmark, 
  BarChart2, Plus, ChevronDown, ChevronUp, RefreshCw, X, ChevronRight,
  Building2, Settings, Database, Wrench, Award, MessageSquare, RotateCcw,
  CheckCircle2, Download, TrendingUp, Flame, PanelLeftClose, PanelLeftOpen,
  DollarSign, ShoppingBag, Store, Server, Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { CompanyProfileModal } from '../company/CompanyProfileModal';
import { ROLE_DEFINITIONS } from '../../lib/permissions';
import { BackupModals } from '../backup/BackupModals';
import { exportFullBackup } from '../../lib/db';
import { REPORT_LIST, ReportItemDef } from '../../pages/Reports';
import { SETTINGS_TABS, resolveTabKey } from '../../pages/Settings';
import { syncEngine, SyncStatus } from '../../lib/syncEngine';

const REPORT_CATEGORIES = [
  {
    categoryLabel: 'Transaction report',
    items: REPORT_LIST.filter(r => r.category === 'TRANSACTION')
  },
  {
    categoryLabel: 'Party report',
    items: REPORT_LIST.filter(r => r.category === 'PARTY')
  },
  {
    categoryLabel: 'Item/ Stock report',
    items: REPORT_LIST.filter(r => r.category === 'ITEM_STOCK')
  },
  {
    categoryLabel: 'Business Status',
    items: REPORT_LIST.filter(r => r.category === 'BUSINESS_STATUS')
  },
  {
    categoryLabel: 'Taxes',
    items: REPORT_LIST.filter(r => r.category === 'TAXES')
  },
  {
    categoryLabel: 'Expense report',
    items: REPORT_LIST.filter(r => r.category === 'EXPENSE')
  },
  {
    categoryLabel: 'Sale/ Purchase Order report',
    items: REPORT_LIST.filter(r => r.category === 'ORDERS')
  },
  {
    categoryLabel: 'Loan Accounts',
    items: REPORT_LIST.filter(r => r.category === 'LOANS')
  },
];

interface NavSubItem {
  label: string;
  path: string;
  addPath?: string;
  hasAdd?: boolean;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  moduleKey: keyof typeof ROLE_DEFINITIONS['Primary Admin']['allowedModules'];
  addPath?: string;
  hasDropdown?: boolean;
  hasAdd?: boolean;
  subItems?: NavSubItem[];
}

const mainNavItems: NavItem[] = [
  { 
    icon: Home, 
    label: 'Home', 
    path: '/', 
    moduleKey: 'dashboard',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    icon: Users, 
    label: 'Parties', 
    path: '/parties', 
    moduleKey: 'parties',
    addPath: '/parties?action=add',
    hasDropdown: false, 
    hasAdd: true 
  },
  { 
    icon: Package, 
    label: 'Items', 
    path: '/items', 
    moduleKey: 'items',
    addPath: '/items?action=add',
    hasDropdown: false, 
    hasAdd: true 
  },
  { 
    icon: Flame, 
    label: 'Top Products', 
    path: '/top-products', 
    moduleKey: 'items',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    icon: ShoppingBag, 
    label: 'Online Store', 
    path: '/online-store', 
    moduleKey: 'sale',
    hasDropdown: true,
    hasAdd: false,
    subItems: [
      { label: 'Orders & Overview', path: '/online-store', hasAdd: false },
      { label: 'Products & Pricing', path: '/online-store?tab=products', hasAdd: false },
      { label: 'Coupons & Deals', path: '/online-store?tab=promotions', hasAdd: false },
      { label: 'Store Settings', path: '/online-store?tab=settings', hasAdd: false },
    ]
  },
  { 
    icon: FileText, 
    label: 'Sale', 
    path: '/sale/invoices', 
    moduleKey: 'sale',
    addPath: '/sale/invoices?action=add',
    hasDropdown: true,
    hasAdd: true,
    subItems: [
      { label: 'Sale Invoices', path: '/sale/invoices', addPath: '/sale/invoices?action=add', hasAdd: true },
      { label: 'Estimate / Quotation', path: '/sale/quotation', addPath: '/sale/quotation?action=add', hasAdd: true },
      { label: 'Payment In', path: '/sale/payment-in', addPath: '/sale/payment-in?action=add', hasAdd: true },
      { label: 'Sale Order', path: '/sale/order', addPath: '/sale/order?action=add', hasAdd: true },
      { label: 'Delivery Challan', path: '/sale/challan', addPath: '/sale/challan?action=add', hasAdd: true },
      { label: 'Sale Return / Cr. Note', path: '/sale/return', addPath: '/sale/return?action=add', hasAdd: true },
      { label: 'Cashier Shifts & POS', path: '/shift-management', hasAdd: false },
    ]
  },
  { 
    icon: DollarSign, 
    label: 'Shift Management', 
    path: '/shift-management', 
    moduleKey: 'sale',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    icon: ShoppingCart, 
    label: 'Purchase', 
    path: '/purchase', 
    moduleKey: 'purchase',
    addPath: '/purchase?action=add',
    hasDropdown: true,
    hasAdd: true,
    subItems: [
      { label: 'Purchase Bills', path: '/purchase', addPath: '/purchase?action=add', hasAdd: true },
      { label: 'Payment Out', path: '/purchase/payment-out', addPath: '/purchase/payment-out?action=add', hasAdd: true },
      { label: 'Purchase Order', path: '/purchase/order', addPath: '/purchase/order?action=add', hasAdd: true },
      { label: 'Purchase Return/ Dr. Note', path: '/purchase/return', addPath: '/purchase/return?action=add', hasAdd: true },
    ]
  },
  { 
    icon: Wallet, 
    label: 'Cash in Hand', 
    path: '/cash-in-hand', 
    moduleKey: 'bank',
    hasDropdown: false, 
    hasAdd: true,
    addPath: '/cash-in-hand?action=adjust'
  },
  { 
    icon: Wallet, 
    label: 'Expenses', 
    path: '/expenses', 
    moduleKey: 'expenses',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    icon: Landmark, 
    label: 'Cash & Bank', 
    path: '/bank', 
    moduleKey: 'bank',
    hasDropdown: true,
    hasAdd: false,
    subItems: [
      { label: 'Bank Accounts', path: '/bank', addPath: '/bank?action=add-bank', hasAdd: true },
      { label: 'Cash In Hand', path: '/cash-in-hand', addPath: '/cash-in-hand?action=adjust', hasAdd: true },
      { label: 'Shift Reconciliation', path: '/shift-management', hasAdd: false },
      { label: 'Cheques', path: '/bank/cheques', hasAdd: false },
      { label: 'Loan Accounts', path: '/bank/loan-accounts', addPath: '/bank/loan-accounts?action=add', hasAdd: true },
    ]
  },
  { 
    icon: BarChart2, 
    label: 'Reports', 
    path: '/reports', 
    moduleKey: 'reports',
    hasDropdown: true, 
    hasAdd: false,
    subItems: REPORT_LIST.map(r => ({
      label: `${r.categoryLabel} > ${r.label}`,
      path: `/reports?report=${r.id}`,
      hasAdd: false
    }))
  },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen,
  isCollapsed = false,
  setIsCollapsed
}) => {
  const { business, activeRole, canAccess } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  // Modals state for Backup/Restore
  const [activeBackupModal, setActiveBackupModal] = useState<'auto' | 'computer' | 'drive' | 'restore' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Explicit state for dropdowns (Sale, Purchase, Cash & Bank, Backup/Restore, Utilities, Reports)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Sale: true,
    Purchase: true,
    'Cash & Bank': false,
    'Backup/Restore': false,
    Utilities: true, // Default open matching screenshot
    Reports: false,
    Settings: false,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    showToast('Synchronizing with cloud and all connected browsers...');
    await syncEngine.pullServerSync(true);
    await syncEngine.pushServerSync();
    setTimeout(() => {
      setIsSyncing(false);
      showToast('All data successfully synchronized!');
    }, 600);
  };

  // Automatically keep section open if user is currently on that route
  useEffect(() => {
    if (location.pathname.startsWith('/sale')) {
      setExpandedMenus(prev => ({ ...prev, Sale: true }));
    } else if (location.pathname.startsWith('/purchase')) {
      setExpandedMenus(prev => ({ ...prev, Purchase: true }));
    } else if (location.pathname.startsWith('/bank')) {
      setExpandedMenus(prev => ({ ...prev, 'Cash & Bank': true }));
    } else if (location.pathname.startsWith('/utilities')) {
      setExpandedMenus(prev => ({ ...prev, Utilities: true }));
    } else if (location.pathname.startsWith('/reports')) {
      setExpandedMenus(prev => ({ ...prev, Reports: true }));
    } else if (location.pathname.startsWith('/settings')) {
      setExpandedMenus(prev => ({ ...prev, Settings: true }));
    }
  }, [location.pathname]);

  const toggleDropdown = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleQuickAdd = (addPath: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(addPath);
    setIsOpen(false);
  };

  // Backup to Computer Handler
  const handleBackupToComputer = async () => {
    try {
      const backupJson = await exportFullBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const companyClean = (business?.name || 'MBI_Inventra').replace(/[^a-zA-Z0-9]/g, '_');
      a.href = url;
      a.download = `MBI_Inventra_Backup_${companyClean}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database backup exported to computer successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to generate backup.');
    }
  };

  // Filter main items and their sub-items according to current role permissions, Module Visibility & General Settings
  const visibleNavItems = useMemo(() => {
    const mods = settings.modules || {
      sales: true,
      purchases: true,
      inventory: true,
      parties: true,
      expenses: true,
      banking: true,
      reports: true,
      pos: true,
      syncShare: true,
    };

    return mainNavItems
      .filter(item => {
        if (!canAccess(item.moduleKey)) return false;
        if (item.label === 'Sale' && mods.sales === false) return false;
        if (item.label === 'Purchase' && mods.purchases === false) return false;
        if (item.label === 'Items' && (mods.inventory === false || settings.item.enableItem === false)) return false;
        if (item.label === 'Top Products' && mods.inventory === false) return false;
        if (item.label === 'Parties' && mods.parties === false) return false;
        if (item.label === 'Expenses' && mods.expenses === false) return false;
        if ((item.label === 'Cash & Bank' || item.label === 'Cash in Hand') && mods.banking === false) return false;
        if (item.label === 'Reports' && mods.reports === false) return false;
        return true;
      })
      .map(item => {
        if (!item.subItems) return item;
        const filteredSubs = item.subItems.filter(sub => {
          if (sub.label.includes('Estimate') && !settings.general.estimateQuotation) return false;
          if (sub.label.includes('Sale Order') && !settings.general.salePurchaseOrder) return false;
          if (sub.label.includes('Purchase Order') && !settings.general.salePurchaseOrder) return false;
          if (sub.label.includes('Delivery Challan') && !settings.general.deliveryChallan) return false;
          return true;
        });
        return { ...item, subItems: filteredSubs };
      });
  }, [mainNavItems, canAccess, settings.general, settings.item.enableItem, settings.modules]);

  const isSyncAllowed = canAccess('syncShare') && settings.modules?.syncShare !== false;
  const isBackupAllowed = canAccess('backup');
  const isUtilitiesAllowed = canAccess('utilities');
  const isSettingsAllowed = canAccess('settings');

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container - Deep Navy #0F172A Theme */}
      <aside className={cn(
        'fixed top-0 left-0 bottom-0 z-50 bg-[#0f172a] text-slate-300 flex flex-col transition-all duration-200 ease-in-out lg:static border-r border-slate-800/80 select-none overflow-hidden',
        isOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'lg:w-[68px]' : 'lg:w-[220px]'
      )}>
        
        {/* Company Header Card */}
        <div 
          onClick={() => setIsCompanyModalOpen(true)}
          className={cn(
            "h-[56px] px-3 flex items-center border-b border-slate-800 bg-[#0b1120] hover:bg-[#1e293b] cursor-pointer transition-colors group flex-shrink-0",
            isCollapsed ? "justify-center" : "justify-between"
          )}
          title={isCollapsed ? (business?.name || "MBI INVENTRA") : "Click to view & edit Company Profile"}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm flex-shrink-0">
              {business?.logo ? (
                <img src={business.logo} alt="Logo" className="w-full h-full object-contain rounded-full" />
              ) : (
                <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-black">
                  {business?.name ? business.name.charAt(0) : 'M'}
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-[12.5px] font-bold text-white tracking-wide truncate group-hover:text-blue-300 transition-colors uppercase">
                  {business?.name || 'MBI INVENTRA'}
                </h1>
                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-medium">
                  <span>{business?.phone || '03364585863'}</span>
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
              <ChevronRight className="hidden lg:block w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Navigation Items (Scrollable without visible scrollbars) */}
        <nav className="flex-1 overflow-y-auto py-1 px-0 space-y-0.5 no-scrollbar text-[13px]">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const isExpanded = expandedMenus[item.label];

            return (
              <div key={item.label} className="group relative">
                {/* Main Item Row */}
                <div
                  className={cn(
                    'flex items-center transition-colors font-medium cursor-pointer border-l-[3px]',
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2 min-h-[38px]',
                    isActive 
                      ? 'bg-[#1e293b] text-white border-blue-500 font-semibold shadow-xs' 
                      : 'border-transparent text-slate-300 hover:bg-[#1e293b]/70 hover:text-white'
                  )}
                  title={isCollapsed ? item.label : undefined}
                  onClick={(e) => {
                    if (isCollapsed && setIsCollapsed) {
                      setIsCollapsed(false);
                    }
                    if (item.hasDropdown) {
                      toggleDropdown(item.label, e);
                    } else {
                      navigate(item.path);
                      setIsOpen(false);
                    }
                  }}
                >
                  <NavLink 
                    to={item.path} 
                    className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-3")}
                    onClick={(e) => {
                      if (item.hasDropdown) {
                        e.preventDefault();
                        toggleDropdown(item.label, e);
                      } else {
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <item.icon className={cn(
                        'w-[18px] h-[18px]',
                        isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white transition-colors'
                      )} />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="truncate text-[13px] font-semibold tracking-normal flex-1">{item.label}</span>
                        {item.label === 'Top Products' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                            HOT
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1.5">
                      {/* Quick Add Button (+) */}
                      {item.hasAdd && item.addPath && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(item.addPath!, e)}
                          title={`Create New ${item.label}`}
                          className="w-6 h-6 flex items-center justify-center bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer group/btn"
                        >
                          <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform duration-150" />
                        </button>
                      )}

                      {/* Dropdown Chevron Toggle */}
                      {item.hasDropdown && (
                        <button
                          type="button"
                          onClick={(e) => toggleDropdown(item.label, e)}
                          title={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub Menu Items (Natural flow when expanded, NEVER inside collapsed sidebar) */}
                {item.subItems && isExpanded && !isCollapsed && (
                  <div className="bg-[#131d33] py-1 border-l-[3px] border-transparent animate-in fade-in slide-in-from-top-1 duration-150">
                    {item.label === 'Reports' ? (
                      REPORT_CATEGORIES.map((cat, catIdx) => (
                        <div key={catIdx} className="mb-1">
                          <div className="px-3.5 py-1.5 pl-8 pr-3 text-[11px] font-extrabold text-blue-300 uppercase tracking-wider bg-[#0f172a]/90 border-y border-slate-800/80 flex items-center justify-between sticky top-0 z-10">
                            <span>{cat.categoryLabel}</span>
                          </div>
                          <div className="py-0.5 space-y-0.5">
                            {cat.items.map((subItem, sIdx) => {
                              const subPath = `/reports?report=${subItem.id}`;
                              const isSubActive = location.pathname === '/reports' && location.search === `?report=${subItem.id}`;
                              return (
                                <div
                                  key={sIdx}
                                  onClick={() => {
                                    navigate(subPath);
                                    setIsOpen(false);
                                  }}
                                  className={cn(
                                    'flex items-center justify-between px-3.5 py-1.5 min-h-[30px] transition-colors text-[12.5px] font-medium pl-10 pr-3 group/sub cursor-pointer',
                                    isSubActive
                                      ? 'bg-[#1e293b] text-white font-semibold'
                                      : 'text-slate-400 hover:bg-[#1e293b]/60 hover:text-white'
                                  )}
                                >
                                  <NavLink
                                    to={subPath}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsOpen(false);
                                    }}
                                    className="flex-1 truncate"
                                  >
                                    <span>{subItem.label}</span>
                                  </NavLink>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      item.subItems.map((subItem, index) => {
                        const isSubActive = 
                          location.pathname === subItem.path || 
                          (subItem.path === '/sale/invoices' && (location.pathname === '/sale' || location.pathname === '/sale/invoices'));

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              navigate(subItem.path);
                              setIsOpen(false);
                            }}
                            className={cn(
                              'flex items-center justify-between px-3.5 py-1.5 min-h-[32px] transition-colors text-[12.5px] font-medium pl-10 pr-3 group/sub cursor-pointer',
                              isSubActive
                                ? 'bg-[#1e293b] text-white font-semibold'
                                : 'text-slate-400 hover:bg-[#1e293b]/60 hover:text-white'
                            )}
                          >
                            <NavLink
                              to={subItem.path}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                              }}
                              className="flex-1 truncate"
                            >
                              <span>{subItem.label}</span>
                            </NavLink>

                            {subItem.hasAdd && subItem.addPath && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAdd(subItem.addPath!, e);
                                }}
                                title={`Add ${subItem.label}`}
                                className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 rounded-md transition-all opacity-90 group-hover/sub:opacity-100 active:scale-95 ml-1.5 cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && item.subItems && item.subItems.length > 0 && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-blue-400" />
                        {item.label}
                      </span>
                      {item.hasAdd && item.addPath && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item.addPath!, e);
                          }}
                          className="h-5 px-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          Add
                        </button>
                      )}
                    </div>
                    <div className="py-1 max-h-[300px] overflow-y-auto">
                      {item.subItems.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => {
                            navigate(sub.path);
                            setIsOpen(false);
                          }}
                          className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <span className="truncate">{sub.label}</span>
                          {sub.hasAdd && sub.addPath && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd(sub.addPath!, e);
                              }}
                              className="h-4 px-1.5 flex items-center gap-0.5 bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded text-[9px] font-medium"
                            >
                              <Plus className="w-2 h-2" />
                              Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Bottom Utility & Admin Sections */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-0.5">
            
            {/* Sync & Share Navigation Link */}
            {isSyncAllowed && (
              <NavLink
                to="/sync-share"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium transition-colors border-l-[3px]',
                  isActive 
                    ? 'bg-[#1e293b] text-white border-blue-500 font-semibold' 
                    : 'border-transparent text-slate-300 hover:bg-[#1e293b]/70 hover:text-white'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className={cn(
                      'w-[18px] h-[18px]',
                      location.pathname === '/sync-share' ? 'text-blue-400' : 'text-slate-400'
                    )} />
                  </div>
                  <span className="truncate text-[13px] font-semibold">Sync & Share</span>
                </div>
                {/* Active Sync Green Dot */}
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 mr-1" />
              </NavLink>
            )}

            {/* BACKUP / RESTORE DROPDOWN */}
            {isBackupAllowed && (
              <div className="group relative">
                {/* Main Header Item */}
                <div 
                  onClick={(e) => {
                    if (isCollapsed) {
                      setActiveBackupModal('auto');
                    } else {
                      toggleDropdown('Backup/Restore', e);
                    }
                  }}
                  title={isCollapsed ? "Backup / Restore" : undefined}
                  className={cn(
                    'flex items-center transition-colors cursor-pointer border-l-[3px] border-transparent text-slate-300 hover:bg-[#1e293b]/70 hover:text-white',
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium',
                    expandedMenus['Backup/Restore'] ? 'text-white' : ''
                  )}
                >
                  <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-[18px] h-[18px] text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">Backup/Restore</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expandedMenus['Backup/Restore'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                        Backup / Restore
                      </span>
                    </div>
                    <div className="py-1">
                      <div 
                        onClick={() => {
                          setActiveBackupModal('auto');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Auto Backup
                      </div>
                      <div 
                        onClick={() => {
                          handleBackupToComputer();
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span>Backup To Computer</span>
                        <Download className="w-3 h-3 text-slate-400" />
                      </div>
                      <div 
                        onClick={() => {
                          setActiveBackupModal('drive');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Backup To Drive
                      </div>
                      <div 
                        onClick={() => {
                          setActiveBackupModal('restore');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Restore Backup
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Menu Items */}
                {expandedMenus['Backup/Restore'] && !isCollapsed && (
                  <div className="bg-[#131d33] py-1 border-l-[3px] border-transparent animate-in fade-in slide-in-from-top-1 duration-150 text-[12.5px] font-medium">
                    
                    {/* Auto Backup */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('auto');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors"
                    >
                      Auto Backup
                    </div>

                    {/* Backup To Computer */}
                    <div 
                      onClick={() => {
                        handleBackupToComputer();
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors flex items-center justify-between group/comp"
                    >
                      <span>Backup To Computer</span>
                      <Download className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/comp:opacity-100 transition-opacity" />
                    </div>

                    {/* Backup To Drive */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('drive');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors"
                    >
                      Backup To Drive
                    </div>

                    {/* Restore Backup */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('restore');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors"
                    >
                      Restore Backup
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Dropdown */}
            {isSettingsAllowed && (
              <div className="group relative">
                <div 
                  onClick={(e) => {
                    if (isCollapsed) {
                      navigate('/settings');
                      setIsOpen(false);
                    } else {
                      toggleDropdown('Settings', e);
                    }
                  }}
                  title={isCollapsed ? "Settings" : undefined}
                  className={cn(
                    'flex items-center transition-colors cursor-pointer border-l-[3px]',
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium',
                    (expandedMenus['Settings'] || location.pathname === '/settings') ? 'text-white' : 'text-slate-300 hover:bg-[#1e293b]/70 hover:text-white border-transparent'
                  )}
                >
                  <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <Settings className={cn(
                        "w-[18px] h-[18px] transition-colors",
                        location.pathname === '/settings' ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'
                      )} />
                    </div>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">Settings</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expandedMenus['Settings'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl py-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-blue-400" />
                        Settings
                      </span>
                    </div>
                    <div className="py-1 max-h-[360px] overflow-y-auto">
                      {SETTINGS_TABS.map((tab) => {
                        const subPath = `/settings?tab=${encodeURIComponent(tab.key)}`;
                        const currentTabParam = new URLSearchParams(location.search).get('tab');
                        const activeResolvedKey = resolveTabKey(currentTabParam);
                        const isSubActive = location.pathname === '/settings' && activeResolvedKey === tab.key;
                        return (
                          <div
                            key={tab.key}
                            onClick={() => {
                              navigate(subPath);
                              setIsOpen(false);
                            }}
                            className={cn(
                              "px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors",
                              isSubActive ? "bg-slate-800 text-white font-bold" : "text-slate-300 hover:text-white"
                            )}
                          >
                            <span className="truncate">{tab.label}</span>
                            {tab.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600/80 text-white text-[9px] font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expandedMenus['Settings'] && !isCollapsed && (
                  <div className="bg-[#131d33] py-1 border-l-[3px] border-transparent animate-in fade-in slide-in-from-top-1 duration-150">
                    {SETTINGS_TABS.map((tab) => {
                      const subPath = `/settings?tab=${encodeURIComponent(tab.key)}`;
                      const currentTabParam = new URLSearchParams(location.search).get('tab');
                      const activeResolvedKey = resolveTabKey(currentTabParam);
                      const isSubActive = location.pathname === '/settings' && activeResolvedKey === tab.key;
                      return (
                        <div
                          key={tab.key}
                          onClick={() => {
                            navigate(subPath);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'flex items-center justify-between px-3.5 py-1.5 min-h-[30px] transition-colors text-[12.5px] font-medium pl-10 pr-3 cursor-pointer select-none',
                            isSubActive
                              ? 'bg-[#1e293b] text-white font-semibold'
                              : 'text-slate-400 hover:bg-[#1e293b]/60 hover:text-white'
                          )}
                        >
                          <NavLink
                            to={subPath}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(subPath);
                              setIsOpen(false);
                            }}
                            className="flex-1 truncate flex items-center justify-between"
                          >
                            <span>{tab.label}</span>
                            {tab.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600/80 text-white text-[9px] font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </NavLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Plans & Pricing */}
            <NavLink 
              to="/pricing"
              onClick={() => setIsOpen(false)}
              title={isCollapsed ? "Plans & Pricing" : undefined}
              className={({ isActive }) => cn(
                'flex items-center transition-colors border-l-[3px]',
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2 min-h-[38px] text-[13px] font-medium',
                isActive 
                  ? 'bg-[#1e293b] text-white border-blue-500 font-semibold' 
                  : 'text-slate-300 hover:bg-[#1e293b]/70 hover:text-white border-transparent'
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Award className="w-[18px] h-[18px] text-slate-400" />
              </div>
              {!isCollapsed && <span className="truncate text-[13px] font-semibold">Plans & Pricing</span>}
            </NavLink>

            {/* Share Feedback */}
            <NavLink 
              to="/feedback"
              onClick={() => setIsOpen(false)}
              title={isCollapsed ? "Share Feedback" : undefined}
              className={({ isActive }) => cn(
                'flex items-center transition-colors border-l-[3px]',
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2 min-h-[38px] text-[13px] font-medium',
                isActive 
                  ? 'bg-[#1e293b] text-white border-emerald-500 font-semibold' 
                  : 'text-slate-300 hover:bg-[#1e293b]/70 hover:text-white border-transparent'
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
              </div>
              {!isCollapsed && <span className="truncate text-[13px] font-semibold">Share Feedback</span>}
            </NavLink>

          </div>
        </nav>

        {/* Multi-Browser & Cloud Sync Status Badge */}
        <div className={cn(
          "border-t border-slate-800/80 bg-[#080d19] transition-all",
          isCollapsed ? "p-2 flex flex-col items-center justify-center" : "px-3 py-2 flex items-center justify-between"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  syncStatus === 'synced' ? "bg-emerald-400" : syncStatus === 'syncing' ? "bg-amber-400" : "bg-rose-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  syncStatus === 'synced' ? "bg-emerald-500" : syncStatus === 'syncing' ? "bg-amber-500" : "bg-rose-500"
                )}></span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1">
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Multi-Browser Live Sync'}
                </p>
                <p className="text-[9.5px] text-slate-400 truncate">Tabs & browsers connected</p>
              </div>
            </div>
          ) : (
            <div title="Multi-Browser Sync Active" className="flex items-center justify-center p-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  syncStatus === 'synced' ? "bg-emerald-400" : "bg-amber-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  syncStatus === 'synced' ? "bg-emerald-500" : "bg-amber-500"
                )}></span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Force Sync Across All Tabs & Connected Browsers"
            className={cn(
              "px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs",
              isCollapsed ? "mt-1.5" : ""
            )}
          >
            <RefreshCw className={cn("w-3 h-3 text-blue-400", isSyncing && "animate-spin")} />
            {!isCollapsed && <span className="text-[10px] font-bold">Sync Now</span>}
          </button>
        </div>

        {/* Desktop Collapse / Expand Toggle Bar */}
        <div className="hidden lg:flex items-center justify-between p-2 border-t border-slate-800/80 bg-[#0b1120] text-slate-400">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-2">
              Collapse Sidebar
            </span>
          )}
          <button
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mx-auto flex items-center gap-1.5 text-xs font-semibold"
            title={isCollapsed ? "Expand Sidebar (Full labels)" : "Collapse Sidebar (Compact icons)"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-400" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Backup & Restore Interactive Modals */}
      <BackupModals 
        activeModal={activeBackupModal} 
        onClose={() => setActiveBackupModal(null)} 
      />

      {/* Company Profile Modal */}
      <CompanyProfileModal 
        isOpen={isCompanyModalOpen} 
        onClose={() => setIsCompanyModalOpen(false)} 
      />
    </>
  );
};
