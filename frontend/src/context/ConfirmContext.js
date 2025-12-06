import React, { createContext, useContext, useState, useCallback } from 'react';
import './ConfirmDialog.css';

const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setDialog({
                message,
                title: options.title || 'Confirmation',
                confirmText: options.confirmText || 'Confirmer',
                cancelText: options.cancelText || 'Annuler',
                type: options.type || 'danger', // 'danger', 'warning', 'info'
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && (
                <div className="confirm-overlay" onClick={dialog.onCancel}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className={`confirm-icon confirm-icon-${dialog.type}`}>
                            {dialog.type === 'danger' && '🗑️'}
                            {dialog.type === 'warning' && '⚠️'}
                            {dialog.type === 'info' && 'ℹ️'}
                        </div>
                        <h3 className="confirm-title">{dialog.title}</h3>
                        <p className="confirm-message">{dialog.message}</p>
                        <div className="confirm-actions">
                            <button
                                className="btn-cancel"
                                onClick={dialog.onCancel}
                            >
                                {dialog.cancelText}
                            </button>
                            <button
                                className={`btn-confirm btn-confirm-${dialog.type}`}
                                onClick={dialog.onConfirm}
                            >
                                {dialog.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
