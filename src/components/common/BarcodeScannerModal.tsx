import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Camera, RefreshCw, Flashlight, AlertCircle, CheckCircle2, 
  Scan, Keyboard, Volume2, VolumeX, Sparkles
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string, format?: string) => void;
  title?: string;
  subtitle?: string;
}

// Audio beep generator using Web Audio API for responsive sound feedback
function playScannerBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, ctx.currentTime); // High-pitched retail scanner beep
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    // AudioContext blocked or not supported
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Product Barcode',
  subtitle = 'Position EAN-13, UPC, or QR Code within the camera frame'
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`barcode-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsStarting(true);
    setScannerError(null);
    setScannedResult(null);

    const startScanner = async () => {
      try {
        // Wait a tick for DOM element to render
        await new Promise(r => setTimeout(r, 150));
        if (!isMounted) return;

        const readerElem = document.getElementById(elementId);
        if (!readerElem) {
          throw new Error('Scanner viewfinder container not found in DOM.');
        }

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport,
          verbose: false
        });
        html5QrCodeRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
          if (!isScanningRef.current) return;
          isScanningRef.current = false;

          const formatName = decodedResult?.result?.format?.formatName || 'Barcode';
          
          if (soundEnabled) {
            playScannerBeep();
          }

          setScannedResult(decodedText);

          // Stop camera stream safely
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch(() => {});

          setTimeout(() => {
            onScanSuccess(decodedText, formatName);
            onClose();
          }, 450);
        };

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333333,
        };

        await html5QrCode.start(
          { facingMode: facingMode },
          config,
          qrCodeSuccessCallback,
          () => {} // Suppress per-frame scan failure logs
        );

        if (isMounted) {
          isScanningRef.current = true;
          setIsStarting(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsStarting(false);
          setScannerError(
            err?.message || 
            'Camera access was denied or is not available. Please allow camera permissions or enter barcode manually.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      isScanningRef.current = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [isOpen, facingMode]);

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    if (soundEnabled) playScannerBeep();
    onScanSuccess(manualCode.trim(), 'Manual EAN/UPC');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                {title}
                <span className="text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  EAN-13 / UPC Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 truncate max-w-[240px]">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Beep Sound' : 'Enable Beep Sound'}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Camera Screen */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[280px]">
          
          {/* Scanner HTML Container */}
          <div id={elementId} className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Laser Scanning Animation Overlay */}
          {!scannerError && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Target Reticle Frame */}
              <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                {/* Corner Marks */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />

                {/* Animated Red Laser Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
              </div>
              <p className="text-white/80 text-[11px] font-semibold mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                Align barcode line inside red target area
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {isStarting && !scannerError && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2.5 text-white z-10">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <p className="text-xs font-semibold">Initializing Camera Stream...</p>
            </div>
          )}

          {/* Success Detected Banner */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center gap-2 text-white z-20 animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
              <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">Barcode Detected!</p>
              <p className="text-base font-mono font-black text-white px-4 py-1.5 bg-emerald-900/80 rounded-xl border border-emerald-500/50">
                {scannedResult}
              </p>
            </div>
          )}

          {/* Error / Fallback State */}
          {scannerError && (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <div>
                <p className="text-xs font-bold text-white">Camera Access Notice</p>
                <p className="text-[11px] text-slate-300 mt-1 max-w-xs">{scannerError}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Keyboard className="w-3.5 h-3.5" />
                Type Barcode Manually
              </button>
            </div>
          )}
        </div>

        {/* Action Controls & Manual Entry */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          
          {/* Quick Barcode Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleFlipCamera}
              className="flex-1 py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Flip Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="flex-1 py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showManualInput ? 'Hide Keypad' : 'Manual Entry'}</span>
            </button>
          </div>

          {/* Manual Input Form */}
          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
              <label className="text-[11px] font-bold text-slate-700 block">
                Manual Barcode / EAN-13 / Item Code:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. 8964000190059"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </form>
          )}

          {/* Formats supported footnote */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span>Supports EAN-13, EAN-8, UPC-A, Code-128, QR</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Fill Ready
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
