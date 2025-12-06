import React, { createContext, useContext, useState, useCallback } from 'react';
import './Notifications.css';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        const notification = { id, message, type };

        setNotifications(prev => [...prev, notification]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const notify = {
        success: (message) => addNotification(message, 'success'),
        error: (message) => addNotification(message, 'error'),
        info: (message) => addNotification(message, 'info'),
        warning: (message) => addNotification(message, 'warning')
    };

    return (
        <NotificationContext.Provider value={notify}>
            {children}
            <div className="notifications-container">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`notification notification-${notification.type}`}
                        onClick={() => removeNotification(notification.id)}
                    >
                        <div className="notification-icon">
                            {notification.type === 'success' && '✓'}
                            {notification.type === 'error' && '✕'}
                            {notification.type === 'info' && 'ℹ'}
                            {notification.type === 'warning' && '⚠'}
                        </div>
                        <div className="notification-message">{notification.message}</div>
                        <button
                            className="notification-close"
                            onClick={() => removeNotification(notification.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
