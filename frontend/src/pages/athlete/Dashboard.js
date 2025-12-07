import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { trainingAPI, documentAPI, paymentAPI, scheduleAPI } from '../../services/api';
import './AthleteDashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const [upcomingTrainings, setUpcomingTrainings] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [athleteInfo, setAthleteInfo] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [weeklySchedule, setWeeklySchedule] = useState([]);
    const [trainingHistory, setTrainingHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trainingsRes, docsRes, historyRes, paymentsRes, scheduleRes] = await Promise.all([
                    trainingAPI.getUpcoming(),
                    documentAPI.getByAthlete(user.id),
                    trainingAPI.getHistory(),
                    paymentAPI.getMyPayments(),
                    scheduleAPI.getAll()
                ]);

                setUpcomingTrainings(trainingsRes.data?.slice(0, 5) || []);
                setDocuments(docsRes.data || []);
                setWeeklySchedule(scheduleRes.data || []);
                setTrainingHistory(historyRes.data || []);

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

    // Calculate attendance trend for the last 5 sessions
    const calculateAttendanceTrend = () => {
        if (!trainingHistory || trainingHistory.length === 0) return [];
        
        // Sort by date descending and take last 5
        const sorted = [...trainingHistory].sort((a, b) => 
            new Date(b.session_date) - new Date(a.session_date)
        ).slice(0, 5);
        
        return sorted.map(session => ({
            date: new Date(session.session_date).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short' 
            }),
            attended: session.attended ? 1 : 0
        })).reverse(); // Reverse to show chronological order
    };

    const attendanceTrend = calculateAttendanceTrend();

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    const pendingDocs = documents.filter(d => d.validation_status === 'pending').length;
    const validatedDocs = documents.filter(d => d.validation_status === 'validated').length;

    return (
        <div className="athlete-dashboard">
            {/* Welcome Section */}
            <div className="welcome-section">
                <div className="welcome-content">
                    <h1>👋 Bonjour, {user.first_name || user.email?.split('@')[0]}</h1>
                    <p className="welcome-subtitle">Bienvenue sur votre tableau de bord personnel</p>
                </div>
                <div className="quick-actions">
                    <Link to="/athlete/profile" className="action-btn primary">
                        <span className="action-icon">👤</span>
                        <span>Mon Profil</span>
                    </Link>
                    <Link to="/athlete/trainings" className="action-btn secondary">
                        <span className="action-icon">🏋️</span>
                        <span>Mes Entraînements</span>
                    </Link>
                    <Link to="/athlete/payments" className="action-btn tertiary">
                        <span className="action-icon">💳</span>
                        <span>Mes Paiements</span>
                    </Link>
                </div>
            </div>

            {athleteInfo?.status === 'pending' && (
                <div className="alert-banner warning">
                    <span className="alert-icon">⏳</span>
                    <span>Votre inscription est en attente de validation par un administrateur.</span>
                </div>
            )}

            {/* Quick Stats Overview */}
            <div className="stats-overview">
                <h2>📊 Vue d'ensemble</h2>
                <div className="stats-grid">
                    <div className={`stat-card ${subscription?.status === 'active' ? 'success' : 'danger'}`}>
                        <div className="stat-icon">💳</div>
                        <div className="stat-content">
                            <h3>Abonnement</h3>
                            <div className="stat-value">
                                {subscription?.status === 'active' ? 'ACTIF' : 'EXPIRÉ'}
                            </div>
                            {subscription?.expiryDate && (
                                <p className="stat-label">
                                    {subscription.daysLeft > 0
                                        ? `${subscription.daysLeft} jours restants`
                                        : `Expiré depuis ${Math.abs(subscription.daysLeft)} jours`}
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
                            <h3>Séances Suivies</h3>
                            <div className="stat-value">{athleteInfo?.stats?.attended || 0}</div>
                            <p className="stat-label">Sur {athleteInfo?.stats?.total || 0} total</p>
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
                            <h3>Prochaines Séances</h3>
                            <div className="stat-value">{upcomingTrainings.length}</div>
                            <p className="stat-label">À venir</p>
                        </div>
                        <Link to="/athlete/trainings" className="stat-action">Voir →</Link>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-icon">📄</div>
                        <div className="stat-content">
                            <h3>Documents</h3>
                            <div className="stat-value">{documents.length}</div>
                            <p className="stat-label">{validatedDocs} validés • {pendingDocs} en attente</p>
                        </div>
                        <Link to="/athlete/profile" className="stat-action">Gérer →</Link>
                    </div>
                </div>
            </div>

            {/* Performance Chart */}
            <div className="section-card">
                <div className="section-header">
                    <h2>📈 Tendance de Participation</h2>
                </div>
                {attendanceTrend.length > 0 ? (
                    <div className="performance-chart">
                        <div className="chart-container">
                            <div className="chart-bars">
                                {attendanceTrend.map((item, index) => (
                                    <div key={index} className="chart-bar-container">
                                        <div 
                                            className={`chart-bar ${item.attended ? 'attended' : 'missed'}`}
                                            style={{ height: item.attended ? '100%' : '20%' }}
                                        ></div>
                                        <div className="chart-label">{item.date}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="chart-legend">
                            <div className="legend-item">
                                <div className="legend-color attended"></div>
                                <span>Présent</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color missed"></div>
                                <span>Absent</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <span className="empty-icon">📊</span>
                        <p>Aucune donnée de participation disponible</p>
                    </div>
                )}
            </div>

            {/* Weekly Schedule */}
            <div className="section-card">
                <div className="section-header">
                    <h2>📅 Planning Hebdomadaire</h2>
                    <Link to="/athlete/trainings" className="btn-link">Voir détails →</Link>
                </div>
                {weeklySchedule.length > 0 ? (
                    <div className="schedule-week">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                            const dayLabels = {
                                'Monday': 'Lundi', 'Tuesday': 'Mardi', 'Wednesday': 'Mercredi',
                                'Thursday': 'Jeudi', 'Friday': 'Vendredi', 'Saturday': 'Samedi', 'Sunday': 'Dimanche'
                            };
                            const slot = weeklySchedule.find(s => s.day_of_week === day);
                            return (
                                <div key={day} className={`schedule-day ${slot ? 'has-schedule' : ''}`}>
                                    <div className="day-header">{dayLabels[day]}</div>
                                    <div className="day-content">
                                        {slot ? `${slot.start_time} (${slot.duration_minutes} min)` : '-'}
                                    </div>
                                    {slot && <div className="day-title">{slot.title}</div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">
                        <span className="empty-icon">📅</span>
                        <p>Aucun planning hebdomadaire défini</p>
                    </div>
                )}
            </div>

            {/* Upcoming Trainings */}
            <div className="section-card">
                <div className="section-header">
                    <h2>📋 Prochains Entraînements</h2>
                    <Link to="/athlete/trainings" className="btn-link">Voir tout →</Link>
                </div>
                <div className="trainings-list">
                    {upcomingTrainings.map(session => (
                        <div key={session.id} className="training-item">
                            <div className="training-date">
                                <div className="day">{new Date(session.session_date).getDate()}</div>
                                <div className="month">
                                    {new Date(session.session_date).toLocaleDateString('fr', { month: 'short' })}
                                </div>
                            </div>
                            <div className="training-info">
                                <h4>{session.title}</h4>
                                <p><span className="icon">📍</span> {session.location}</p>
                                <p><span className="icon">🥋</span> {session.level}</p>
                            </div>
                            <div className="training-time">
                                {new Date(session.session_date).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                    {upcomingTrainings.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon">🏃</span>
                            <p>Aucun entraînement prévu pour le moment</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Status */}
            {subscription?.expiryDate && (
                <div className="section-card">
                    <div className="section-header">
                        <h2>💰 Statut de Paiement</h2>
                        <Link to="/athlete/payments" className="btn-link">Historique →</Link>
                    </div>
                    <div className="payment-status">
                        <div className="payment-info">
                            <div className="payment-detail">
                                <span className="label">Date d'expiration</span>
                                <span className="value">{subscription.expiryDate.toLocaleDateString('fr', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}</span>
                            </div>
                            {subscription.daysLeft <= 7 && subscription.daysLeft > 0 && (
                                <div className="alert-banner danger">
                                    <span className="alert-icon">⚠️</span>
                                    <span>Votre abonnement expire bientôt ! Pensez à renouveler.</span>
                                </div>
                            )}
                            {subscription.daysLeft <= 0 && (
                                <div className="alert-banner danger">
                                    <span className="alert-icon">⚠️</span>
                                    <span>Votre abonnement a expiré ! Veuillez renouveler pour continuer.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;