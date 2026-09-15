import React, { useState } from 'react';
import { 
  Award, Check, Sparkles, Shield, Phone, ArrowRight, 
  HelpCircle, Star, Zap, CheckCircle2, ArrowLeft, Key, MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LicenseActivationModal } from '../components/admin/LicenseActivationModal';
import { getLicenseInfo } from '../lib/licenseManager';

type BillingInterval = 'monthly' | '1year' | '3years' | '5years';

export const Pricing: React.FC = () => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('1year');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedPlanSuccess, setSelectedPlanSuccess] = useState<string | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(() => getLicenseInfo());

  const plans = [
    {
      name: 'Basic',
      badge: '🟢 Basic Shop',
      tagline: 'Essential billing, thermal printing & inventory for single-location retail pharmacies.',
      prices: {
        monthly: 'Rs. 1,499',
        '1year': 'Rs. 14,990',
        '3years': 'Rs. 34,990',
        '5years': 'Rs. 54,990',
      },
      savings: 'Save Rs. 2,998/yr',
      popular: false,
      color: 'border-slate-200 bg-white hover:border-blue-300',
      buttonBg: 'bg-slate-900 hover:bg-slate-800 text-white',
      features: [
        'Unlimited Cashiers & User Accounts',
        'High-Speed Thermal POS & A4 Bills',
        'Medicine Inventory & Category Tree',
        'Customer & Supplier Ledger Accounts',
        'Sales & Purchase Tracking',
        'Barcode Scanner & Bluetooth Thermal',
        'Cash in Hand & Expense Tracking',
        'Low Stock Reorder Notifications',
        'CSV / Excel Report Exports',
        '100% Offline Mode & Local Backups',
        'Standard WhatsApp Support'
      ]
    },
    {
      name: 'Business',
      badge: '🔵 Business Pro ⭐',
      tagline: 'Comprehensive multi-warehouse, batch expiry alert & automated tax management.',
      prices: {
        monthly: 'Rs. 2,499',
        '1year': 'Rs. 24,990',
        '3years': 'Rs. 59,990',
        '5years': 'Rs. 89,990',
      },
      savings: 'Save Rs. 4,998/yr • Most Popular',
      popular: true,
      color: 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/30 shadow-xl',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      features: [
        'Everything in Basic Plan +',
        'Multi-Warehouse & Sub-Location Stock',
        'Batch & Expiry 30/60/90 Days Alerts',
        'Purchase Orders & Goods Receipt Notes',
        'Credit Notes & Debit Notes (Returns)',
        'Cash & Bank Account Reconciliation',
        'Profit & Loss Statement Generator',
        'Customer Aging & Recovery Tracker',
        'Tax Compliance (FBR / GST Ready)',
        'Daily Book & Balance Sheet',
        'Priority 24/7 WhatsApp Support'
      ]
    },
    {
      name: 'Enterprise',
      badge: '🟣 Premium Enterprise',
      tagline: 'Multi-branch sync, enterprise audit logs, custom invoice branding & dedicated server.',
      prices: {
        monthly: 'Rs. 3,999',
        '1year': 'Rs. 39,990',
        '3years': 'Rs. 89,990',
        '5years': 'Rs. 129,990',
      },
      savings: 'Save Rs. 7,998/yr • Best Value',
      popular: false,
      color: 'border-purple-200 bg-white hover:border-purple-300',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      features: [
        'Everything in Business Plan +',
        'Unlimited Pharmacy Branches & Hubs',
        'Role-Based Access (Custom Permissions)',
        'Granular Audit Logs & Activity Trails',
        'Custom Thermal & Laser Bill Templates',
        'Multi-Register Cash Drawer Lock',
        'Encrypted Cloud Synchronization',
        'Automated Remote Nightly Backups',
        'Dedicated VIP Account Manager',
        'Priority On-Site & Remote Setup'
      ]
    }
  ];

  const handleSubscribe = (planName: string) => {
    setSelectedPlanSuccess(planName);
    const whatsappNum = '923364585863';
    const message = encodeURIComponent(
      `Hello M Bilal Inayat! I want to activate my pharmacy (${business?.name || 'MBI Inventra User'}) for the *${planName} Plan* (${billingInterval.toUpperCase()}). Please provide activation details.`
    );
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, '_blank');
  };

  const faqs = [
    {
      q: 'Does MBI Inventra work 100% offline without internet?',
      a: 'Yes! MBI Inventra is engineered to run completely offline. You can conduct lightning-fast POS billing, update inventory, print receipts, and track customer debts without an internet connection.'
    },
    {
      q: 'How fast is plan activation after payment?',
      a: 'Activation is immediate! After contacting on WhatsApp (0336-4585863), you receive your unique pharmacy license key within 5-10 minutes, which unlocks all features instantly in the app.'
    },
    {
      q: 'Can I export my sales and inventory reports for tax filing?',
      a: 'Yes! You can export your full medicine catalog, stock valuations, and detailed sales registers as CSV or Excel spreadsheets formatted for accountant review and tax compliance.'
    },
    {
      q: 'Can I upgrade or downgrade my plan later?',
      a: 'Yes, you can upgrade from Basic to Business Pro or Enterprise at any time. You only pay the prorated difference for the remaining duration.'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 font-sans overflow-y-auto h-full">
      
      {/* Top Breadcrumb & Quick Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Plans & Licensing</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${licenseInfo.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {licenseInfo.status === 'Active' ? `Active: ${licenseInfo.plan}` : 'Trial Version'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">Transparent pricing for retail pharmacies and wholesale distributors</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLicenseModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>Enter License Key</span>
          </button>
          <button
            onClick={() => {
              const whatsappNum = '923364585863';
              window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent('Hello M Bilal Inayat! I have a question about MBI Inventra pricing.')}`, '_blank');
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>WhatsApp Support</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {selectedPlanSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-bold">Subscription Request Initiated for {selectedPlanSuccess} Plan!</div>
              <div className="text-xs text-emerald-700">WhatsApp has been opened with your pre-filled inquiry to M Bilal Inayat (0336-4585863).</div>
            </div>
          </div>
          <button 
            onClick={() => setSelectedPlanSuccess(null)}
            className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Section & Billing Frequency Switcher */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Flexible Plans Built for Pharmacy Operations</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Select Your Pharmacy Software License
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Everything your pharmacy needs: fast POS billing, batch expiry tracking, barcode generation, thermal printing, and tax compliance.
        </p>

        {/* Billing Interval Toggle */}
        <div className="pt-3 flex justify-center">
          <div className="inline-flex bg-slate-200/90 p-1.5 rounded-2xl shadow-inner gap-1">
            {[
              { key: 'monthly', label: 'Monthly' },
              { key: '1year', label: '1 Year (Save 30%)' },
              { key: '3years', label: '3 Years (Save 45%)' },
              { key: '5years', label: '5 Years (Save 60%)' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setBillingInterval(item.key as BillingInterval)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  billingInterval === item.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {plans.map((plan) => {
          const price = plan.prices[billingInterval];
          return (
            <div
              key={plan.name}
              className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all bg-white relative ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Most Popular</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-black text-slate-900">{plan.badge}</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {plan.savings}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-6 min-h-[32px]">{plan.tagline}</p>

                <div className="mb-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-center">
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {price}
                  </div>
                  <div className="text-[11px] text-slate-500 uppercase font-bold mt-1">
                    Billed {billingInterval === 'monthly' ? 'Monthly' : billingInterval === '1year' ? 'Annually' : billingInterval === '3years' ? 'Every 3 Years' : 'Every 5 Years'}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Features Included:</div>
                  <div className="space-y-2">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98 cursor-pointer ${plan.buttonBg}`}
                >
                  <span>Activate {plan.name} via WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsLicenseModalOpen(true)}
                  className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Already have a key? Activate here
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Highlights Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Why Pharmacies Choose MBI Inventra</h3>
          <p className="text-xs text-slate-500">Customized specifically for medical stores, pharmacies, and wholesale dealers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <h4 className="text-sm font-bold text-slate-900">High-Speed POS Billing</h4>
            <p className="text-xs text-slate-500">Instant barcode scanning, keyboard-first shortcuts, and crystal-clear thermal receipts in under 3 seconds.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
              🛡️
            </div>
            <h4 className="text-sm font-bold text-slate-900">Batch & Expiry Protection</h4>
            <p className="text-xs text-slate-500">Prevent dispensing expired medicines. Automated 30/60/90-day alert monitor with return debit notes.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
              📑
            </div>
            <h4 className="text-sm font-bold text-slate-900">Tax & Audit Readiness</h4>
            <p className="text-xs text-slate-500">Export CSV and Excel registers for tax compliance, sales audits, profit & loss, and ledger reconciliations.</p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Frequently Asked Questions</h3>
          <p className="text-xs text-slate-500">Everything you need to know about licensing and offline features.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-xs sm:text-sm hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-blue-600 text-base font-mono font-bold">{activeFaq === idx ? '−' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Developer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <Phone className="w-3.5 h-3.5" />
            <span>Direct Developer Hotline</span>
          </div>
          <h3 className="text-lg sm:text-2xl font-black tracking-tight">Need Custom Features or Hardware Setup?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Contact Lead Developer M Bilal Inayat for barcode printer configuration, multi-device networking, or customized pharmacy features.
          </p>
        </div>

        <button
          onClick={() => {
            const whatsappNum = '923364585863';
            window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent('Hello M Bilal Inayat, I need assistance with MBI Inventra pharmacy software.')}`, '_blank');
          }}
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-98 flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Phone className="w-4 h-4" />
          <span>Call / WhatsApp 0336-4585863</span>
        </button>
      </div>

      {/* License Key Modal */}
      <LicenseActivationModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onStatusChange={() => setLicenseInfo(getLicenseInfo())}
      />
    </div>
  );
};
