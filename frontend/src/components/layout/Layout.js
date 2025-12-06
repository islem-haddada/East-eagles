import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

import logo from '../../assets/logo.png';

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="layout-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src={logo} alt="East Eagles Logo" className="sidebar-logo" />
                    <h2>East Eagles</h2>
                    <p className="user-role">{user?.role?.toUpperCase()}</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                        Dashboard
                    </Link>
                    <Link to="/admin/athletes" className={isActive('/admin/athletes') ? 'active' : ''}>
                        Athlètes
                    </Link>
                    <Link to="/admin/schedule" className={isActive('/admin/schedule') ? 'active' : ''}>
                        Planning
                    </Link>
                    <Link to="/admin/payments" className={isActive('/admin/payments') ? 'active' : ''}>
                        Paiements
                    </Link>
                    <Link to="/admin/documents" className={isActive('/admin/documents') ? 'active' : ''}>
                        Documents
                    </Link>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={logout} className="btn-logout">
                        Déconnexion
                    </button>
                </div>
            </aside>
            <main className="main-content">
                <header className="top-bar">
                    <h3>Bonjour, {user?.first_name}</h3>
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
