import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

export default function Dialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info'
}: DialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl border border-outline-light/10 dark:border-outline-dark/10 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${type === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-onSurface-light dark:text-onSurface-dark'}`}>
                            {title}
                        </h3>
                        <button onClick={onCancel} className="text-onSurface-variant-light dark:text-onSurface-variant-dark hover:bg-surface-variant-light dark:hover:bg-surface-variant-dark rounded-full p-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-onSurface-variant-light dark:text-onSurface-variant-dark text-sm leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="p-4 bg-surface-variant-light dark:bg-surface-variant-dark flex gap-3 justify-end">
                    {onConfirm ? (
                        <>
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 rounded-full text-sm font-medium text-onSurface-light dark:text-onSurface-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`px-4 py-2 rounded-full text-sm font-medium text-white shadow-sm transition-transform active:scale-95 ${type === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-primary-light dark:bg-primary-dark hover:opacity-90'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-full text-sm font-medium bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 shadow-sm transition-transform active:scale-95"
                        >
                            Okay
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
