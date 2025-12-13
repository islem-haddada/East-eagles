import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { trainingAPI, documentAPI, paymentAPI, scheduleAPI } from '../../services/api';
import './AthleteDashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [upcomingTrainings, setUpcomingTrainings] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [athleteInfo, setAthleteInfo] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trainingsRes, docsRes, historyRes, paymentsRes] = await Promise.all([
                    trainingAPI.getUpcoming(),
                    documentAPI.getByAthlete(user.id),
                    trainingAPI.getHistory(),
                    paymentAPI.getMyPayments()
                ]);

                setUpcomingTrainings(trainingsRes.data?.slice(0, 5) || []);
                setDocuments(docsRes.data || []);

                // Calculate stats
                const history = historyRes.data || [];
                const attendedCount = history.filter(h => h.attended).length;
                const totalSessions = history.length;

                // Calculate Subscription Status
                const payments = paymentsRes.data || [];
                let subStatus = { status: 'expired', expiryDate: null, daysLeft: 0 };

                if (payments.length > 0) {
                    const latestPayment = payments.reduce((latest, current) => {
                        return new Date(current.end_date) > new Date(latest.end_date) ? current : latest;
                    });

                    const expiry = new Date(latestPayment.end_date);
                    const today = new Date();
                    const diffTime = expiry - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    subStatus = {
                        status: diffDays >= 0 ? 'active' : 'expired',
                        expiryDate: expiry,
                        daysLeft: diffDays
                    };
                }

                setSubscription(subStatus);
                setAthleteInfo({
                    status: user.status || 'pending',
                    stats: {
                        attended: attendedCount,
                        total: totalSessions
                    }
                });

            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [user.id]);

    const safePercentage = (value, total) => {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    const pendingDocs = documents.filter(d => d.validation_status === 'pending').length;
    const validatedDocs = documents.filter(d => d.validation_status === 'validated').length;

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'fr-FR';

    return (
        <div className="athlete-dashboard">
            {/* Welcome Section */}
            <div className="welcome-section">
                <div className="welcome-content">
                    <h1>👋 {user.first_name || user.email?.split('@')[0]}</h1>
                    <p className="welcome-subtitle">{t('athlete_dashboard.welcome_subtitle')}</p>
                </div>
                <div className="quick-actions">
                    <Link to="/athlete/profile" className="action-btn primary">
                        <span className="action-icon">👤</span>
                        <span>{t('sidebar.my_profile')}</span>
                    </Link>
                    <Link to="/athlete/trainings" className="action-btn secondary">
                        <span className="action-icon">🏋️</span>
                        <span>{t('sidebar.my_trainings')}</span>
                    </Link>
                    <Link to="/athlete/payments" className="action-btn tertiary">
                        <span className="action-icon">💳</span>
                        <span>{t('sidebar.my_payments')}</span>
                    </Link>
                </div>
            </div>

            {athleteInfo?.status === 'pending' && (
                <div className="alert-banner warning">
                    <span className="alert-icon">⏳</span>
                    <span>{t('athlete_dashboard.pending_validation')}</span>
                </div>
            )}

            {/* Quick Stats Overview */}
            <div className="stats-overview">
                <h2>📊 {t('athlete_dashboard.overview')}</h2>
                <div className="stats-grid">
                    <div className={`stat-card ${subscription?.status === 'active' ? 'success' : 'danger'}`}>
                        <div className="stat-icon">💳</div>
                        <div className="stat-content">
                            <h3>{t('athlete_dashboard.subscription')}</h3>
                            <div className="stat-value">
                                {subscription?.status === 'active' ? t('athlete_dashboard.active') : t('athlete_dashboard.expired')}
                            </div>
                            {subscription?.expiryDate && (
                                <p className="stat-label">
                                    {subscription.daysLeft > 0
                                        ? `${subscription.daysLeft} ${t('athlete_dashboard.days_left')}`
                                        : `${t('athlete_dashboard.expired_since')} ${Math.abs(subscription.daysLeft)} ${t('common.days') || 'jours'}`}
                                </p>
                            )}
                        </div>
                        <div className={`status-badge ${subscription?.status}`}>
                            {subscription?.status === 'active' ? '✓' : '✗'}
                        </div>
                    </div>

                    <div className="stat-card primary">
                        <div className="stat-icon">🏋️</div>
                        <div className="stat-content">
                            <h3>{t('athlete_dashboard.attended_sessions')}</h3>
                            <div className="stat-value">{athleteInfo?.stats?.attended || 0}</div>
                            <p className="stat-label">Sur {athleteInfo?.stats?.total || 0} {t('athlete_dashboard.total')}</p>
                        </div>
                        <div className="progress-ring">
                            <svg width="60" height="60">
                                <circle cx="30" cy="30" r="25" fill="none" stroke="#e5e7eb" strokeWidth="5"></circle>
                                <circle
                                    cx="30" cy="30" r="25"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="5"
                                    strokeDasharray={`${(safePercentage(athleteInfo?.stats?.attended, athleteInfo?.stats?.total) / 100) * 157} 157`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 30 30)"
                                ></circle>
                            </svg>
                            <span className="progress-label">
                                {safePercentage(athleteInfo?.stats?.attended, athleteInfo?.stats?.total)}%
                            </span>
                        </div>
                    </div>

                    <div className="stat-card info">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <h3>{t('athlete_dashboard.upcoming_sessions')}</h3>
                            <div className="stat-value">{upcomingTrainings.length}</div>
                            <p className="stat-label">{t('athlete_dashboard.coming_up')}</p>
                        </div>
                        <Link to="/athlete/trainings" className="stat-action">{t('common.view_details')} →</Link>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-icon">📄</div>
                        <div className="stat-content">
                            <h3>{t('athlete_dashboard.documents_stat')}</h3>
                            <div className="stat-value">{documents.length}</div>
                            <p className="stat-label">{validatedDocs} {t('athlete_dashboard.validated')} • {pendingDocs} {t('athlete_dashboard.pending')}</p>
                        </div>
                        <Link to="/athlete/profile" className="stat-action">{t('athlete_dashboard.manage')} →</Link>
                    </div>
                </div>
            </div>

            {/* Upcoming Trainings */}
            <div className="section-card">
                <div className="section-header">
                    <h2>📋 {t('athlete_dashboard.upcoming_title')}</h2>
                    <Link to="/athlete/trainings" className="btn-link">{t('athlete_dashboard.view_all')} →</Link>
                </div>
                <div className="trainings-list">
                    {upcomingTrainings.map(session => (
                        <div key={session.id} className="training-item">
                            <div className="training-date">
                                <div className="day">{new Date(session.session_date).getDate()}</div>
                                <div className="month">
                                    {new Date(session.session_date).toLocaleDateString(locale, { month: 'short' })}
                                </div>
                            </div>
                            <div className="training-info">
                                <h4>{session.title}</h4>
                                <p><span className="icon">📍</span> {session.location}</p>
                                <p><span className="icon">🥋</span> {session.level}</p>
                            </div>
                            <div className="training-time">
                                {new Date(session.session_date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                    {upcomingTrainings.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon">🏃</span>
                            <p>{t('athlete_dashboard.no_upcoming')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;