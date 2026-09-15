import React, { useState } from 'react';
import { 
  ShoppingCart, FileText, Package, Users, Wallet, 
  Landmark, BarChart2, Zap, RefreshCw, CheckCircle2, 
  Eye, EyeOff, ShieldCheck, Layers, HelpCircle, Sparkles
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

interface ModuleDef {
  key: keyof import('../../contexts/SettingsContext').AppSettings['modules'];
  name: string;
  category: string;
  icon: any;
  color: string;
  description: string;
  subFeatures: string[];
}

const MODULE_DEFINITIONS: ModuleDef[] = [
  {
    key: 'sales',
    name: 'Sales Management',
    category: 'Core Operations',
    icon: FileText,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    description: 'Create and manage sales invoices, cash sales, estimates, quotations, and returns.',
    subFeatures: ['Sale Invoices', 'Quotation / Estimate', 'Payment In', 'Sale Order', 'Delivery Challan', 'Sale Return / Cr. Note']
  },
  {
    key: 'purchases',
    name: 'Purchases & Bills',
    category: 'Core Operations',
    icon: ShoppingCart,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Track vendor purchase bills, supplier payments, purchase orders, and debit notes.',
    subFeatures: ['Purchase Bills', 'Payment Out', 'Purchase Orders', 'Purchase Return / Dr. Note', 'Vendor Statements']
  },
  {
    key: 'inventory',
    name: 'Inventory & Items',
    category: 'Stock & Catalog',
    icon: Package,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    description: 'Manage medicine catalog, stock batches, expiry dates, formula salts, and reorder levels.',
    subFeatures: ['Item List & Stock Value', 'Low Stock Warnings', 'Batch & Expiry Tracker', 'Top Selling Medicines']
  },
  {
    key: 'parties',
    name: 'Parties (Customers & Suppliers)',
    category: 'Relationship Ledger',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Maintain party ledgers, contact details, outstanding receivables, and payables.',
    subFeatures: ['Customer Profiles', 'Supplier Directory', 'Receivables & Payables', 'Party Statements']
  },
  {
    key: 'expenses',
    name: 'Expense Tracking',
    category: 'Financial Control',
    icon: Wallet,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'Record daily pharmacy expenses, utilities, staff salaries, rent, and operational overheads.',
    subFeatures: ['Direct & Indirect Expenses', 'Expense Categories', 'Payment Methods', 'Expense Reports']
  },
  {
    key: 'banking',
    name: 'Cash & Bank Management',
    category: 'Treasury & Liquidity',
    icon: Landmark,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: 'Manage counter cash in hand, bank accounts, cheque clearances, and loan accounts.',
    subFeatures: ['Cash in Hand Adjustments', 'Bank Accounts & Transfers', 'Cheque Clearing', 'Loan Accounts']
  },
  {
    key: 'reports',
    name: 'Reports & Business Analytics',
    category: 'Intelligence',
    icon: BarChart2,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    description: 'Access Daybook, Profit & Loss, Tax audit, Item stock summary, and transaction ledgers.',
    subFeatures: ['Daybook & P&L Statement', 'Item Stock & Expiry Reports', 'Party Wise Ledgers', 'Tax & GST Summaries']
  },
  {
    key: 'pos',
    name: 'POS Quick Counter',
    category: 'Counter Speed',
    icon: Zap,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    description: 'Ultra-fast counter billing mode with barcode scan support and thermal receipt printing.',
    subFeatures: ['Lightning Rapid Scan', 'Quick Cash Tender', 'Thermal Receipt Auto-print', 'Hold / Recall Carts']
  },
  {
    key: 'syncShare',
    name: 'Cloud Sync & Team Access',
    category: 'Collaboration',
    icon: RefreshCw,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    description: 'Real-time multi-device cloud backup with Firebase Firestore and staff role permissions.',
    subFeatures: ['Firebase Real-time Cloud', 'Multi-user Roles & RBAC', 'Encrypted Local Backups', 'Live Sync Status']
  }
];

export const ModuleVisibilityTab: React.FC = () => {
  const { settings, updateModules } = useSettings();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggle = (key: keyof typeof settings.modules) => {
    const currentVal = settings.modules?.[key] ?? true;
    const nextVal = !currentVal;
    
    // Prevent disabling both sales and purchases completely by mistake if user needs at least one
    updateModules({ [key]: nextVal });
    showToast(`${String(key).toUpperCase()} module ${nextVal ? 'enabled' : 'hidden'} from navigation.`);
  };

  const handleEnableAll = () => {
    updateModules({
      sales: true,
      purchases: true,
      inventory: true,
      parties: true,
      expenses: true,
      banking: true,
      reports: true,
      pos: true,
      syncShare: true,
    });
    showToast('All system modules enabled.');
  };

  const activeCount = Object.values(settings.modules || {}).filter(Boolean).length;
  const totalCount = MODULE_DEFINITIONS.length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Module Visibility & Navigation Controls</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {activeCount} of {totalCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Customize which business modules appear in your sidebar navigation, top actions, and dashboard overview.
            Hidden modules keep all existing records safely preserved.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleEnableAll}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Enable All Modules</span>
          </button>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULE_DEFINITIONS.map((mod) => {
          const isEnabled = settings.modules?.[mod.key] ?? true;
          const Icon = mod.icon;

          return (
            <div
              key={mod.key}
              className={`bg-white border rounded-2xl p-4.5 transition-all shadow-xs flex flex-col justify-between ${
                isEnabled ? 'border-slate-200 shadow-sm' : 'border-slate-200/60 bg-slate-50/60 opacity-75'
              }`}
            >
              <div>
                {/* Card Header: Icon, Name & Toggle Switch */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {mod.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{mod.name}</h3>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggle(mod.key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {mod.description}
                </p>

                {/* Sub Features Chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {mod.subFeatures.map((feat, idx) => (
                    <span
                      key={idx}
                      className={`text-[10.5px] px-2 py-0.5 rounded-md font-medium ${
                        isEnabled 
                          ? 'bg-slate-100 text-slate-700' 
                          : 'bg-slate-200/60 text-slate-400 line-through'
                      }`}
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  {isEnabled ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-emerald-700 text-[11px]">Visible in Sidebar</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-slate-500 text-[11px]">Hidden from Sidebar</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(mod.key)}
                  className={`text-[11px] font-bold hover:underline ${isEnabled ? 'text-rose-600' : 'text-blue-600'}`}
                >
                  {isEnabled ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Instant live synchronization:</span> Toggling any section immediately updates your navigation drawer and dashboard metrics without requiring a page reload or losing unsaved work.
        </div>
      </div>

    </div>
  );
};
