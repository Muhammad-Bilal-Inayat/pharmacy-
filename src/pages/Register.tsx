import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { PackageCheck, Phone, MessageSquare } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('vip123@admin.com');
  const [password, setPassword] = useState('vip123');
  const [name, setName] = useState('VIP User');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const uid = 'local-user-' + Date.now();
      const newProfile: User = { 
         id: uid, 
         email, 
         name, 
         role: 'Admin', 
         pin: '0000',
         businessId: '', // Will set in Business Setup
         createdAt: new Date().toISOString() 
      };
      localStorage.setItem('mock_user_profile', JSON.stringify(newProfile));
      
      await login(email);
      navigate('/setup');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#1e293b]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0f172a] text-[#2563eb] shadow-lg mb-3">
          <PackageCheck className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">MBI Inventra</h1>
        <p className="mt-1 text-xs text-[#64748b] font-medium">Create your business organization profile</p>
        <h2 className="mt-4 text-center text-lg font-bold text-[#1e293b]">Create your account</h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-[#dc2626] p-3 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-[#1e293b] uppercase tracking-wider mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full rounded-xl border border-slate-200 shadow-xs focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] px-3.5 py-2.5 text-sm text-[#1e293b] bg-slate-50/50" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1e293b] uppercase tracking-wider mb-1">Email address</label>
              <input 
                type="email" 
                required 
                className="w-full rounded-xl border border-slate-200 shadow-xs focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] px-3.5 py-2.5 text-sm text-[#1e293b] bg-slate-50/50" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1e293b] uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full rounded-xl border border-slate-200 shadow-xs focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] px-3.5 py-2.5 text-sm text-[#1e293b] bg-slate-50/50" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            <button 
              type="submit" 
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Sign up for MBI Inventra
            </button>
          </form>
          
          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <Link to="/login" className="text-[#2563eb] hover:underline text-xs font-bold">
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-6 text-center text-xs text-[#64748b] space-y-1">
          <p className="font-semibold text-slate-700">Official Support & Assistance:</p>
          <div className="flex items-center justify-center gap-3 font-semibold text-slate-800">
            <a href="tel:03364585863" className="flex items-center gap-1 text-[#2563eb] hover:underline">
              <Phone className="w-3.5 h-3.5" /> 03364585863
            </a>
            <span className="text-slate-300">|</span>
            <a href="https://wa.me/923281302636" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#16a34a] hover:underline">
              <MessageSquare className="w-3.5 h-3.5" /> 03281302636
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
