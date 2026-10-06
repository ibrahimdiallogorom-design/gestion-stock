import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useStock } from '../context/StockContext';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useStock();

  if (!confirmModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                confirmModal.isDestructive
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <button
              onClick={closeConfirmModal}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeConfirmModal}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                confirmModal.onConfirm();
                closeConfirmModal();
              }}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
                confirmModal.isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              {confirmModal.confirmLabel || 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
