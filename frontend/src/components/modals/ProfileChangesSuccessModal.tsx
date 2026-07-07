import React from 'react';
import { X, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ProfileChangeItem {
  field: string;
  oldValue: string;
  newValue: string;
  isImage?: boolean;
}

interface ProfileChangesSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ProfileChangeItem[];
  title?: string;
}

export const ProfileChangesSuccessModal: React.FC<ProfileChangesSuccessModalProps> = ({
  isOpen,
  onClose,
  changes,
  title = "Your Profile Changes Done Successfully."
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
          {/* Backdrop click */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            className="relative bg-slate-900 border border-slate-800/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col z-10 my-auto"
          >
            {/* Header / Success Indicator */}
            <div className="p-6 pb-4 flex flex-col items-center text-center space-y-3 relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight leading-snug">
                  {title}
                </h3>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-900/50 border-t border-slate-800/60 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Got it, Thank You!</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
