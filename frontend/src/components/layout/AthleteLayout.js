import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import '../layout/Layout.css';
import logo from '../../assets/logo.png';

const AthleteLayout = () => {
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        document.dir = lng === 'ar' ? 'rtl' : 'ltr';
    };

    const isActive = (path) => location.pathname === path;

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
                    <p className="user-role">ATHLÈTE</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/athlete" className={isActive('/athlete') ? 'active' : ''}>
                        {t('sidebar.my_dashboard')}
                    </Link>
                    <Link to="/athlete/profile" className={isActive('/athlete/profile') ? 'active' : ''}>
                        {t('sidebar.my_profile')}
                    </Link>
                    <Link to="/athlete/trainings" className={isActive('/athlete/trainings') ? 'active' : ''}>
                        {t('sidebar.my_trainings')}
                    </Link>
                    <Link to="/athlete/payments" className={isActive('/athlete/payments') ? 'active' : ''}>
                        {t('sidebar.my_payments')}
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

export default AthleteLayout;
