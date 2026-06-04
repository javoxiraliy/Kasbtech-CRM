import { AlertTriangle, X, Check } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title = "Tasdiqlash", 
  message = "Haqiqatan ham ushbu amalni bajarmoqchimisiz?", 
  onConfirm, 
  onCancel, 
  confirmText = "Ha, o'chirish", 
  cancelText = "Bekor qilish",
  type = "danger" 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card glass w-full max-w-md overflow-hidden shadow-2xl border border-dark-800 animate-scale-up">
        {/* Header */}
        <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-900/50">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
            {title}
          </h3>
          <button onClick={onCancel} className="p-1 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-dark-200 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/30 flex gap-3">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 btn-secondary justify-center py-2 text-xs font-semibold"
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className={`flex-1 btn-primary justify-center py-2 text-xs font-semibold ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.25)]' 
                : 'bg-yellow-600 hover:bg-yellow-700 hover:shadow-[0_0_15px_rgba(202,138,4,0.25)]'
            }`}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
