/**
 * MBI Inventra - Custom 'Install App' Banner
 * Detects if the app is running in a browser tab and offers 1-click standalone PWA installation.
 */

import React, { useState, useEffect } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, Laptop, X, Sparkles, Check, Share } from 'lucide-react';

const PWA_BANNER_DISMISS_KEY = 'mbi_pwa_banner_dismissed_until';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed banner within 7 days
    const dismissedUntil = localStorage.getItem(PWA_BANNER_DISMISS_KEY);
    if (dismissedUntil) {
      const expiry = parseInt(dismissedUntil, 10);
      if (Date.now() < expiry) {
        setIsDismissed(true);
        return;
      }
    }
    // Only show if not already installed as standalone app
    setIsDismissed(isInstalled);
  }, [isInstalled]);

  const handleDismiss = () => {
    // Dismiss for 7 days
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(PWA_BANNER_DISMISS_KEY, sevenDays.toString());
    setIsDismissed(true);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  // Show if either browser supports beforeinstallprompt OR is on iOS browser
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 border-b border-indigo-500/20 shadow-xs relative z-20 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Install MBI Inventra as a Desktop / Mobile App
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9.5px] font-bold">
                <Sparkles className="w-2.5 h-2.5" /> 100% Offline Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300 hidden md:block">
              Experience lightning-fast point-of-sale speeds, standalone window mode, and offline resilience with no browser URL bar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-97 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 ${isInstalling ? 'animate-bounce' : ''}`} />
            <span>{isInstalling ? 'Installing...' : isIOS ? 'Install on iOS' : 'Install App'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss for 7 days"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs select-none"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-900 border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Install on iPhone / iPad</h3>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  Tap the <strong className="text-slate-900 font-semibold inline-flex items-center gap-1"><Share className="w-3 h-3 inline" /> Share</strong> icon in the Safari bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  Scroll down and select <strong className="text-slate-900 font-semibold">Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  Tap <strong className="text-slate-900 font-semibold">Add</strong> in the top right corner. The app will launch like a native application!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
