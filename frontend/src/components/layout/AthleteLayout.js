import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../layout/Layout.css'; // Reuse admin layout styles

import logo from '../../assets/logo.png';

const AthleteLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="layout-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src={logo} alt="East Eagles Logo" className="sidebar-logo" />
                    <h2>East Eagles</h2>
                    <p className="user-role">ATHLÈTE</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/athlete" className={isActive('/athlete') ? 'active' : ''}>
                        Dashboard
                    </Link>
                    <Link to="/athlete/profile" className={isActive('/athlete/profile') ? 'active' : ''}>
                        Mon Profil
                    </Link>
                    <Link to="/athlete/trainings" className={isActive('/athlete/trainings') ? 'active' : ''}>
                        Mes Entraînements
                    </Link>
                    <Link to="/athlete/payments" className={isActive('/athlete/payments') ? 'active' : ''}>
                        Mes Paiements
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
                    {/* <span className={`approval-badge ${user?.approval_status}`}>{user?.approval_status?.toUpperCase()}</span> */}
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AthleteLayout;
