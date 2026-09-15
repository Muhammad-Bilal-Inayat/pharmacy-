import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall';
import { Download, WifiOff } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Install on iPhone / iPad</h3>
              <p className="mt-2 text-sm text-slate-600">
                1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  // Offline state is seamlessly displayed in the top application bar via SyncStatusIndicator
  return null;
};
