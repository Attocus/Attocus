import React from 'react';
import { ShieldCheck, Video, X, Lock } from 'lucide-react';

interface CameraConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmConsent: () => void;
}

export const CameraConsentModal: React.FC<CameraConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirmConsent
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="camera-consent-modal-overlay"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="camera-consent-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-md overflow-hidden text-[#202326] p-6 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE4]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0E6] text-[#2E7D32] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-serif font-bold text-[#1A1D20]">
              Attention Monitor Consent
            </h3>
          </div>
          <button
            type="button"
            id="close-camera-consent-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#EFF1EB] flex items-center justify-center text-[#6E747B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-[#2D3135] leading-relaxed font-medium">
            "We only detect when your attention leaves the screen — nothing is recorded or stored."
          </p>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E5DC] text-xs text-[#52585E] space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-[#2E7D32] shrink-0 mt-0.5" />
              <span>All gaze evaluation is performed strictly in local memory on your device.</span>
            </div>
            <div className="flex items-start gap-2">
              <Video className="w-3.5 h-3.5 text-[#406882] shrink-0 mt-0.5" />
              <span>You can turn the monitor off at any moment using the instant switch in the sidebar.</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            id="decline-camera-consent-btn"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl border border-[#D0D4CC] text-[#555A60] hover:bg-[#F2F4F0] font-medium transition-colors"
          >
            No thanks
          </button>

          <button
            type="button"
            id="accept-camera-consent-btn"
            onClick={onConfirmConsent}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Enable Attention Monitor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
