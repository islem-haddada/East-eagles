import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { athleteAPI, trainingAPI, documentAPI, paymentAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalAthletes: 0,
        approvedAthletes: 0,
        pendingAthletes: 0,
        upcomingTrainings: 0,
        pendingDocuments: 0,
        unpaidAthletes: 0,
        recentPayments: 0
    });
    const [recentActivity, setRecentActivity] = useState({
        athletes: [],
        payments: [],
        documents: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [athletesRes, pendingAthletesRes, trainingsRes, docsRes, paymentsRes] = await Promise.all([
                    athleteAPI.getAll(),
                    athleteAPI.getPending(),
                    trainingAPI.getUpcoming(),
                    documentAPI.getPending(),
                    paymentAPI.getRecent()
                ]);

                const athletes = athletesRes.data || [];
                const approved = athletes.filter(a => a.approval_status === 'approved');
                const unpaid = athletes.filter(a => a.payment_valid !== true);

                // Always use real data
                setStats({
                    totalAthletes: athletes.length,
                    approvedAthletes: approved.length,
                    pendingAthletes: pendingAthletesRes.data?.length || 0,
                    upcomingTrainings: trainingsRes.data?.length || 0,
                    pendingDocuments: docsRes.data?.length || 0,
                    unpaidAthletes: unpaid.length,
                    recentPayments: paymentsRes.data?.length || 0
                });

                setRecentActivity({
                    athletes: (pendingAthletesRes.data || []).slice(0, 5),
                    payments: (paymentsRes.data || []).slice(0, 5),
                    documents: (docsRes.data || []).slice(0, 5)
                });
            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchStats();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);

        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, []);

    // Helper function to safely calculate percentage
    const safePercentage = (value, total) => {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>📊 Tableau de Bord</h1>
                <p className="dashboard-subtitle">Vue d'ensemble de votre club</p>
            </div>

            {/* Main Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-content">
                        <div className="stat-icon">👥</div>
                        <div style={{ flex: 1 }}>
                            <h3>Total Athlètes</h3>
                            <div className="stat-value">{stats.totalAthletes}</div>
                            <p className="stat-label">{stats.approvedAthletes} approuvés</p>
                        </div>
                        <div className="progress-ring">
                            <svg width="60" height="60">
                                <circle cx="30" cy="30" r="25" fill="none" stroke="#e5e7eb" strokeWidth="5"></circle>
                                <circle
                                    cx="30" cy="30" r="25"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="5"
                                    strokeDasharray={`${(safePercentage(stats.approvedAthletes, stats.totalAthletes) / 100) * 157} 157`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 30 30)"
                                ></circle>
                            </svg>
                            <span className="progress-label">{safePercentage(stats.approvedAthletes, stats.totalAthletes)}%</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-content">
                        <div className="stat-icon">⏳</div>
                        <div style={{ flex: 1 }}>
                            <h3>En Attente</h3>
                            <div className="stat-value">{stats.pendingAthletes}</div>
                            <p className="stat-label">À valider</p>
                        </div>
                    </div>
                    <Link to="/admin/athletes" className="stat-action">Voir →</Link>
                </div>

                <div className="stat-card danger">
                    <div className="stat-content">
                        <div className="stat-icon">💰</div>
                        <div style={{ flex: 1 }}>
                            <h3>Impayés</h3>
                            <div className="stat-value">{stats.unpaidAthletes}</div>
                            <p className="stat-label">Paiements en retard</p>
                        </div>
                    </div>
                    <Link to="/admin/athletes" className="stat-action">Voir →</Link>
                    <div className="trend-indicator negative">
                        <span className="trend-arrow">↑</span>
                        <span className="trend-value">{safePercentage(stats.unpaidAthletes, stats.totalAthletes)}%</span>
                    </div>
                </div>

                <div className="stat-card info">
                    <div className="stat-content">
                        <div className="stat-icon">🏋️</div>
                        <div style={{ flex: 1 }}>
                            <h3>Entraînements</h3>
                            <div className="stat-value">{stats.upcomingTrainings}</div>
                            <p className="stat-label">Sessions à venir</p>
                        </div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-content">
                        <div className="stat-icon">💵</div>
                        <div style={{ flex: 1 }}>
                            <h3>Paiements</h3>
                            <div className="stat-value">{stats.recentPayments}</div>
                            <p className="stat-label">Ce mois</p>
                        </div>
                    </div>
                    <div className="trend-indicator positive">
                        <span className="trend-arrow">↑</span>
                        <span className="trend-value">+{stats.recentPayments}</span>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-content">
                        <div className="stat-icon">📄</div>
                        <div style={{ flex: 1 }}>
                            <h3>Documents</h3>
                            <div className="stat-value">{stats.pendingDocuments}</div>
                            <p className="stat-label">À vérifier</p>
                        </div>
                    </div>
                    <Link to="/admin/documents" className="stat-action">Voir →</Link>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-card">
                    <h3>📊 Répartition des Athlètes</h3>
                    <div className="bar-chart">
                        <div className="bar-item">
                            <div className="bar-label">Approuvés</div>
                            <div className="bar-container">
                                <div
                                    className="bar-fill success"
                                    style={{ width: `${safePercentage(stats.approvedAthletes, stats.totalAthletes)}%` }}
                                >
                                    <span className="bar-value">{stats.approvedAthletes}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bar-item">
                            <div className="bar-label">En attente</div>
                            <div className="bar-container">
                                <div
                                    className="bar-fill warning"
                                    style={{ width: `${safePercentage(stats.pendingAthletes, stats.totalAthletes)}%` }}
                                >
                                    <span className="bar-value">{stats.pendingAthletes}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bar-item">
                            <div className="bar-label">Impayés</div>
                            <div className="bar-container">
                                <div
                                    className="bar-fill danger"
                                    style={{ width: `${safePercentage(stats.unpaidAthletes, stats.totalAthletes)}%` }}
                                >
                                    <span className="bar-value">{stats.unpaidAthletes}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>🎯 Taux de Paiement</h3>
                    <div className="progress-circle-container">
                        <svg className="progress-circle" width="200" height="200">
                            <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="15"></circle>
                            <circle
                                cx="100" cy="100" r="80"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="15"
                                strokeDasharray={`${(safePercentage(stats.totalAthletes - stats.unpaidAthletes, stats.totalAthletes) / 100) * 502} 502`}
                                strokeLinecap="round"
                                transform="rotate(-90 100 100)"
                                className="progress-circle-bar"
                            ></circle>
                        </svg>
                        <div className="progress-circle-label">
                            <div className="progress-percentage">
                                {safePercentage(stats.totalAthletes - stats.unpaidAthletes, stats.totalAthletes)}%
                            </div>
                            <div className="progress-text">Payés</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
