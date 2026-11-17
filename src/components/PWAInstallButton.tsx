import React, { useState } from 'react';
import { Download, PlusSquare, Share, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  darkSurface?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  darkSurface = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const buttonClasses = darkSurface
    ? 'inline-flex items-center justify-center gap-2 min-h-[44px] w-full px-3 py-2 rounded-xl text-xs font-medium bg-[#2C3775] text-white hover:bg-[#3A4791] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
    : compact
    ? 'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-xs font-medium bg-[#EAE6FA] text-[#141B41] hover:bg-[#D8D1F5] transition-colors shrink-0 cursor-pointer'
    : 'inline-flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium bg-[#EAE6FA] text-[#141B41] hover:bg-[#D8D1F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={buttonClasses}
        title="Install FOCUS⭐️ app"
        aria-label="Install FOCUS⭐️ app"
      >
        <Download className="w-4 h-4 shrink-0" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={buttonClasses}
        title={isIOS ? 'Install on iPhone or iPad' : 'Install FOCUS⭐️'}
        aria-label={isIOS ? 'Install on iPhone or iPad' : 'Install FOCUS⭐️'}
      >
        <Download className="w-4 h-4 shrink-0" />
        {!compact && <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C1029]/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Install FOCUS⭐️"
        >
          <div
            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-[#E5E3F0] pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden pb-3 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-[#D8D1F5]" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#141B41]">Install FOCUS⭐️</h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-[#4D5275] hover:bg-[#F4F2FC] transition-colors cursor-pointer"
                aria-label="Close install instructions"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-4 text-sm text-[#343A5E]">
                <p>Add FOCUS⭐️ to your iPhone or iPad Home Screen for offline access and a full-screen workspace:</p>
                <ol className="space-y-3 bg-[#F7F6FA] rounded-xl p-4 border border-[#E5E3F0]">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#141B41] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Tap the <Share className="w-4 h-4 text-[#141B41] inline" /> <strong>Share</strong> button in Safari&apos;s toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#141B41] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Scroll down and tap <PlusSquare className="w-4 h-4 text-[#141B41] inline" /> <strong>Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#141B41] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>Tap <strong>Add</strong> in the top-right corner.</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[#343A5E]">
                <p>
                  You can install FOCUS⭐️ directly from your browser so it launches in its own window and works offline:
                </p>
                <ul className="space-y-2.5 bg-[#F7F6FA] rounded-xl p-4 border border-[#E5E3F0]">
                  <li>
                    <strong>Android Chrome / Edge:</strong> Open the browser menu (⋮) → <em>Install app</em> or <em>Add to Home screen</em>.
                  </li>
                  <li>
                    <strong>iPhone / iPad Safari:</strong> Tap Share → <em>Add to Home Screen</em>.
                  </li>
                  <li>
                    <strong>Desktop Chrome / Edge:</strong> Click the install icon in the address bar or open browser menu → <em>Install FOCUS⭐️</em>.
                  </li>
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-[#141B41] text-[#FEF3C7] px-4 py-2 text-xs font-medium border-b border-[#2C3775]"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#F5B700] shrink-0" />
      <span>Offline mode active — all changes are saved locally in IndexedDB.</span>
    </div>
  );
};
