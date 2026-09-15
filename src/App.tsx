import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Billing } from './pages/Billing';
import { Suppliers } from './pages/Suppliers';
import { Purchases } from './pages/Purchases';
import { Expenses } from './pages/Expenses';
import { Bank } from './pages/Bank';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { SyncAndShare } from './pages/SyncAndShare';
import { Utilities } from './pages/Utilities';
import { TopProducts } from './pages/TopProducts';
import { CashInHand } from './pages/CashInHand';
import { ShiftManagement } from './pages/ShiftManagement';
import { Pricing } from './pages/Pricing';
import { Feedback } from './pages/Feedback';
import { OnlineStoreManagement } from './pages/OnlineStoreManagement';
import { StoreLayout } from './pages/store/StoreLayout';
import { StoreHome } from './pages/store/StoreHome';
import { StoreCatalog } from './pages/store/StoreCatalog';
import { StoreProductDetail } from './pages/store/StoreProductDetail';
import { StoreCart } from './pages/store/StoreCart';
import { StoreCheckout } from './pages/store/StoreCheckout';
import { StoreOrderConfirmation } from './pages/store/StoreOrderConfirmation';
import { StoreOrderTracking } from './pages/store/StoreOrderTracking';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import SetupBusiness from './pages/SetupBusiness';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { hasRouteAccess } from './lib/permissions';
import { ShieldAlert, ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, business, loading } = useAuth();
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  // Safety timer: Never allow ProtectedRoute to hang in loading state indefinitely
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
      console.warn('[MBI ProtectedRoute] Auth initialization timeout reached; proceeding to render with cached state.');
    }, 2500);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !loadTimedOut) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">Starting MBI Inventra...</h2>
          <p className="text-xs text-slate-400">Verifying session & loading offline database</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!business && window.location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  
  return <>{children}</>;
}

function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const { activeRole, activeUser, setActiveRole, setActiveUser } = useAuth();
  const location = useLocation();

  const isAllowed = hasRouteAccess(activeRole, location.pathname);

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-500">
              Your current active role (<span className="font-bold text-slate-800">{activeRole}</span>) does not have permission to view this module.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
            <p className="font-semibold text-slate-700">Role Policy:</p>
            <p>Access to <span className="font-mono text-slate-800 font-bold">{location.pathname}</span> is protected by organization role settings.</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              to="/"
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go to Home</span>
            </Link>

            <button
              onClick={() => {
                setActiveUser(null);
                setActiveRole('Primary Admin');
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch to Admin</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/setup" element={<ProtectedRoute><SetupBusiness /></ProtectedRoute>} />

      {/* Public Online Storefront Routes */}
      <Route path="/store" element={<StoreLayout />}>
        <Route index element={<StoreHome />} />
        <Route path="products" element={<StoreCatalog />} />
        <Route path="product/:id" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
        <Route path="checkout" element={<StoreCheckout />} />
        <Route path="order-success/:id" element={<StoreOrderConfirmation />} />
        <Route path="track" element={<StoreOrderTracking />} />
      </Route>
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RoleAccessGuard><Dashboard /></RoleAccessGuard>} />
        <Route path="online-store" element={<RoleAccessGuard><OnlineStoreManagement /></RoleAccessGuard>} />
        <Route path="sale" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/invoices" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/quotation" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/estimate" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/payment-in" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/order" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/challan" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="sale/return" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
        <Route path="items" element={<RoleAccessGuard><Inventory /></RoleAccessGuard>} />
        <Route path="top-products" element={<RoleAccessGuard><TopProducts /></RoleAccessGuard>} />
        <Route path="parties" element={<RoleAccessGuard><Suppliers /></RoleAccessGuard>} />
        <Route path="purchase" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
        <Route path="purchase/bills" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
        <Route path="purchase/payment-out" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
        <Route path="purchase/order" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
        <Route path="purchase/return" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
        <Route path="expenses" element={<RoleAccessGuard><Expenses /></RoleAccessGuard>} />
        <Route path="reports" element={<RoleAccessGuard><Reports /></RoleAccessGuard>} />
        <Route path="bank" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
        <Route path="bank/accounts" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
        <Route path="bank/cash-in-hand" element={<RoleAccessGuard><CashInHand /></RoleAccessGuard>} />
        <Route path="cash-in-hand" element={<RoleAccessGuard><CashInHand /></RoleAccessGuard>} />
        <Route path="shift-management" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
        <Route path="sale/shifts" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
        <Route path="bank/shifts" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
        <Route path="bank/cheques" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
        <Route path="bank/loan-accounts" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
        <Route path="sync-share" element={<RoleAccessGuard><SyncAndShare /></RoleAccessGuard>} />
        <Route path="utilities" element={<RoleAccessGuard><Utilities /></RoleAccessGuard>} />
        <Route path="settings" element={<RoleAccessGuard><Settings /></RoleAccessGuard>} />
        <Route path="pricing" element={<RoleAccessGuard><Pricing /></RoleAccessGuard>} />
        <Route path="feedback" element={<RoleAccessGuard><Feedback /></RoleAccessGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    console.log('%c[MBI App]%c App tree mounted successfully.', 'color: #3b82f6; font-weight: bold;', 'color: #94a3b8;');
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
