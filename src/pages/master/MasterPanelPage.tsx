import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterServerControlModal } from '../../components/admin/MasterServerControlModal';
import { 
  ShieldCheck, ShieldAlert, ArrowLeft, Lock, Key, Server, RefreshCw
} from 'lucide-react';
import { isMasterAdminAuthenticated, checkServerMasterAuth } from '../../lib/masterServerService';

export const MasterPanelPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function verifyAuth() {
      setIsVerifying(true);
      const isAuth = await checkServerMasterAuth();
      if (isMounted) {
        setIsAuthorized(isAuth);
        setIsVerifying(false);
      }
    }
    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Master Top Security Breadcrumb */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 select-none z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            title="Return to Main Application"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to App</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
              MBI Master Server Control Hub (Root)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            SECURE RESTRICTED ZONE (PORT: 3000)
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MASTER_ADMIN</span>
          </div>
        </div>
      </div>

      {/* Main Master Control Screen / Gateway */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <MasterServerControlModal isOpen={true} onClose={handleClose} />
      </div>
    </div>
  );
};
