import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';
import logo from '../../assets/logo.png';

const Layout = () => {
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const isActive = (path) => location.pathname === path;

    // Handle Language Change
    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        document.dir = lng === 'ar' ? 'rtl' : 'ltr';
    };

    // Set initial direction
    React.useEffect(() => {
        document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    }, [i18n.language]);

    // Close sidebar on route change
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className={`layout-container ${i18n.language === 'ar' ? 'rtl' : ''}`}>
            <div className={`overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src={logo} alt="East Eagles Logo" className="sidebar-logo" />
                    <h2>East Eagles</h2>
                    <p className="user-role">{user?.role?.toUpperCase()}</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                        {t('sidebar.dashboard')}
                    </Link>
                    <Link to="/admin/athletes" className={isActive('/admin/athletes') ? 'active' : ''}>
                        {t('sidebar.athletes')}
                    </Link>
                    <Link to="/admin/schedule" className={isActive('/admin/schedule') ? 'active' : ''}>
                        {t('sidebar.schedule')}
                    </Link>
                    <Link to="/admin/payments" className={isActive('/admin/payments') ? 'active' : ''}>
                        {t('sidebar.payments')}
                    </Link>
                    <Link to="/admin/documents" className={isActive('/admin/documents') ? 'active' : ''}>
                        {t('sidebar.documents')}
                    </Link>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={logout} className="btn-logout">
                        {t('sidebar.logout')}
                    </button>
                </div>
            </aside>
            <main className="main-content">
                <header className="top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            ☰
                        </button>
                        <h3>Bonjour, {user?.first_name}</h3>
                    </div>
                    <div className="language-switcher">
                        <button
                            className={`lang-btn ${i18n.language === 'fr' ? 'active' : ''}`}
                            onClick={() => changeLanguage('fr')}
                        >
                            FR
                        </button>
                        <button
                            className={`lang-btn ${i18n.language === 'ar' ? 'active' : ''}`}
                            onClick={() => changeLanguage('ar')}
                        >
                            AR
                        </button>
                    </div>
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
