import React, { useState } from 'react';
import { 
  X, Shield, Mail, Lock, User, Cloud, CheckCircle2, 
  AlertCircle, LogOut, ArrowRight, Database, RefreshCw, 
  ExternalLink, Sparkles, KeyRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dbMedicines, dbInvoices, dbPurchaseOrders, dbSuppliers, dbPartyPayments, dbExpenses } from '../../lib/db';
import { saveRecordToFirestore } from '../../lib/firebase';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    firebaseUser, 
    userProfile, 
    business, 
    activeRole,
    loginGoogle, 
    loginEmailPass, 
    registerEmailPass, 
    logout 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncStats, setCloudSyncStats] = useState<{ total: number; uploaded: number } | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginGoogle();
      setSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Google Sign-in popup was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginEmailPass(email, password);
        setSuccessMsg('Logged in successfully!');
      } else {
        await registerEmailPass(email, password);
        setSuccessMsg('Account registered successfully!');
      }
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloudDataUpload = async () => {
    setIsCloudSyncing(true);
    setError(null);
    try {
      const [meds, invs, pos, sups, pays, exps] = await Promise.all([
        dbMedicines.getAll().catch(() => []),
        dbInvoices.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => []),
        dbPartyPayments.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
      ]);

      const allItems = [
        ...meds.map(m => ({ col: 'medicines', id: m.id, data: m })),
        ...invs.map(i => ({ col: 'invoices', id: i.id, data: i })),
        ...pos.map(p => ({ col: 'purchaseOrders', id: p.id, data: p })),
        ...sups.map(s => ({ col: 'suppliers', id: s.id, data: s })),
        ...pays.map(p => ({ col: 'partyPayments', id: p.id, data: p })),
        ...exps.map(e => ({ col: 'expenses', id: e.id, data: e })),
      ];

      setCloudSyncStats({ total: allItems.length, uploaded: 0 });

      let count = 0;
      for (const item of allItems) {
        await saveRecordToFirestore(item.col, item.id, item.data);
        count++;
        setCloudSyncStats({ total: allItems.length, uploaded: count });
      }

      setSuccessMsg(`Successfully uploaded ${count} local records to Firebase Cloud Firestore!`);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload records to Firestore.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Firebase Cloud & Google Auth
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Cloud Live
                </span>
              </h3>
              <p className="text-xs text-slate-300">Secure Cloud Firestore & Google Account Authentication</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Feedback alerts */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Notice</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Success</p>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Connected User State */}
          {firebaseUser ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {firebaseUser.photoURL ? (
                    <img src={firebaseUser.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-blue-500" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                      {firebaseUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{firebaseUser.displayName || 'Google Account'}</h4>
                    <p className="text-xs text-slate-500">{firebaseUser.email}</p>
                    <span className="inline-block mt-1 text-[10.5px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Role: {activeRole}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    await logout();
                    setSuccessMsg('Logged out successfully');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              {/* Cloud Sync Tool */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-600" />
                      Cloud Firestore Backup
                    </p>
                    <p className="text-slate-500 text-[11px]">Push all offline bills, inventory, & parties to Google Cloud</p>
                  </div>

                  <button
                    onClick={handleCloudDataUpload}
                    disabled={isCloudSyncing}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    {isCloudSyncing ? 'Syncing...' : 'Sync to Cloud'}
                  </button>
                </div>

                {cloudSyncStats && (
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${(cloudSyncStats.uploaded / (cloudSyncStats.total || 1)) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-3 shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {loading ? 'Connecting...' : 'Sign in with Google Account'}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase">or with email</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="email"
                      required
                      placeholder="admin@mbinventra.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Processing...' : mode === 'login' ? 'Sign In to Account' : 'Create Free Cloud Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="text-center pt-2">
                {mode === 'login' ? (
                  <p className="text-xs text-slate-500">
                    Don't have a cloud account?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('register')} 
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Register Free
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Already registered?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('login')} 
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cloud Infrastructure Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Firebase Project
              </span>
              <span className="font-mono text-[11px] text-slate-800">rock-bus-wmgf5</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Firestore Free Tier:</span>
              <span className="font-bold text-emerald-600">1 GB Storage + 20K Writes/Day</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Auth Users Quota:</span>
              <span className="font-bold text-emerald-600">50,000 Free Active Users</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
