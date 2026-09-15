import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  PackageCheck, Phone, MessageSquare, ShieldCheck, RefreshCw, 
  Cloud, CloudCheck, Lock, User, Key, ArrowRight, CheckCircle2, 
  AlertCircle, Sparkles, Building2, Smartphone, Shield, Eye, EyeOff
} from 'lucide-react';
import { dbAppUsers } from '../lib/db';
import { AppUserRecord } from '../types';

export default function Login() {
  const [identifier, setIdentifier] = useState('vip123@admin.com');
  const [password, setPassword] = useState('vip123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [availableAccounts, setAvailableAccounts] = useState<AppUserRecord[]>([]);

  const navigate = useNavigate();
  const { authenticateAndSync, loginGoogle } = useAuth();

  useEffect(() => {
    // Load existing staff/admin accounts from local DB for quick suggestions
    dbAppUsers.getAll().then(users => {
      if (users && users.length > 0) {
        setAvailableAccounts(users);
      }
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setProgressStatus('Connecting to Cloud Server...');

    try {
      await authenticateAndSync(identifier, password, (msg) => {
        setProgressStatus(msg);
      });
      setProgressStatus('Redirecting to Dashboard...');
      setTimeout(() => {
        navigate('/');
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with server. Please check your username & password.');
      setIsLoading(false);
      setProgressStatus('');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    setProgressStatus('Signing in with Google Account...');
    try {
      await loginGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or encountered an error.');
      setIsLoading(false);
      setProgressStatus('');
    }
  };

  const applyCredentials = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-blue-500 shadow-md mb-3 ring-4 ring-blue-500/10">
          <PackageCheck className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">MBI Inventra</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">Cloud ERP, Pharmacy POS & Inventory Sync System</p>
        
        {/* Server & Cloud Connection Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cloud Server Sync: Online & Ready</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-8">
          
          <div className="mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Sign in to Server</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials configured on the server to authenticate and sync live data.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Live Progress Status Box during authentication */}
            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold">Syncing With Server...</div>
                  <div className="text-[11px] text-blue-600 font-normal">{progressStatus}</div>
                </div>
              </div>
            )}

            {/* Username / Email / Mobile Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Username, Email, or Mobile</span>
                <User className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  disabled={isLoading}
                  placeholder="e.g. vip123@admin.com or 03364585863"
                  className="w-full rounded-xl border border-slate-200 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50/50 font-medium disabled:opacity-60" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                />
              </div>
            </div>

            {/* Password / Passcode Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Password / Passcode</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  disabled={isLoading}
                  placeholder="Enter passcode or password"
                  className="w-full rounded-xl border border-slate-200 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50/50 font-medium pr-10 disabled:opacity-60" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating & Syncing...</span>
                </>
              ) : (
                <>
                  <CloudCheck className="w-4 h-4" />
                  <span>Sign In & Sync Live Data</span>
                </>
              )}
            </button>

            {/* Google Login Option */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-semibold uppercase">Or continue with</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Google Single Sign-On</span>
              </button>
            </div>
          </form>

          {/* Quick-Fill Server Credentials Helper */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Server Logins</span>
              <span className="text-[10px] text-blue-600 font-normal">Click to fill</span>
            </div>

            <div className="space-y-1.5">
              {/* Master Primary Admin */}
              <button
                type="button"
                onClick={() => applyCredentials('vip123@admin.com', 'vip123')}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">👑</span>
                  <div>
                    <span className="font-bold text-slate-900">Primary Admin</span>
                    <span className="text-[11px] text-slate-500 ml-1.5">(vip123@admin.com)</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded">Pass: vip123</span>
              </button>

              {/* Staff / Salesman Accounts */}
              <button
                type="button"
                onClick={() => applyCredentials('03364585863', '0000')}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">📱</span>
                  <div>
                    <span className="font-bold text-slate-900">Admin Mobile</span>
                    <span className="text-[11px] text-slate-500 ml-1.5">(03364585863)</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded">PIN: 0000</span>
              </button>

              {/* Biller / Staff Account */}
              <button
                type="button"
                onClick={() => applyCredentials('asim@mbinventra.com', '1234')}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧑‍💼</span>
                  <div>
                    <span className="font-bold text-slate-900">Sales Staff</span>
                    <span className="text-[11px] text-slate-500 ml-1.5">(asim@mbinventra.com)</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded">PIN: 1234</span>
              </button>
            </div>
          </div>
          
          <div className="mt-5 text-center pt-3 border-t border-slate-100">
            <Link to="/register" className="text-blue-600 hover:underline text-xs font-bold inline-flex items-center gap-1">
              <span>Create New Business Organization</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Official Support & Sync Info */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Official Server Support & Technical Assistance:</p>
          <div className="flex items-center justify-center gap-3 font-semibold text-slate-800">
            <a href="tel:03364585863" className="flex items-center gap-1 text-blue-600 hover:underline">
              <Phone className="w-3.5 h-3.5" /> 03364585863
            </a>
            <span className="text-slate-300">|</span>
            <a href="https://wa.me/923281302636" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline">
              <MessageSquare className="w-3.5 h-3.5" /> 03281302636
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
