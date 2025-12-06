import React, { useState, useEffect } from 'react';
import { trainingAPI, scheduleAPI } from '../../services/api';
import './MyTrainings.css';

const MyTrainings = () => {
    const [upcoming, setUpcoming] = useState([]);
    const [history, setHistory] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrainings = async () => {
            try {
                const [upcomingRes, historyRes, scheduleRes] = await Promise.all([
                    trainingAPI.getUpcoming(),
                    trainingAPI.getHistory(),
                    scheduleAPI.getAll()
                ]);
                setUpcoming(upcomingRes.data || []);
                setHistory(historyRes.data || []);
                setSchedule(scheduleRes.data || []);
            } catch (error) {
                console.error("Error fetching trainings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrainings();
    }, []);

    const daysOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7 };
    const sortedSchedule = [...schedule].sort((a, b) => daysOrder[a.day_of_week] - daysOrder[b.day_of_week]);

    const getDayLabel = (day) => {
        const labels = {
            'Monday': 'Lundi', 'Tuesday': 'Mardi', 'Wednesday': 'Mercredi',
            'Thursday': 'Jeudi', 'Friday': 'Vendredi', 'Saturday': 'Samedi', 'Sunday': 'Dimanche'
        };
        return labels[day] || day;
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="my-trainings-page">
            <h1>Mes Entraînements</h1>

            <section className="schedule-section">
                <h2>Planning Hebdomadaire</h2>
                <div className="weekly-grid">
                    {sortedSchedule.map(slot => (
                        <div key={slot.id} className="weekly-card">
                            <div className="day-header">{getDayLabel(slot.day_of_week)}</div>
                            <div className="time-slot">
                                {slot.start_time}
                                <span className="duration">({slot.duration_minutes} min)</span>
                            </div>
                            <div className="slot-title">{slot.title}</div>
                            <div className="slot-location">📍 {slot.location}</div>
                        </div>
                    ))}
                    {sortedSchedule.length === 0 && <p>Aucun créneau fixe défini.</p>}
                </div>
            </section>

            <section className="upcoming-section">
                <h2>Séances à Venir</h2>
                <div className="trainings-grid">
                    {upcoming.map(session => (
                        <div key={session.id} className="training-card">
                            <div className="card-header">
                                <div className="date-badge">
                                    <span className="day">{new Date(session.session_date).getDate()}</span>
                                    <span className="month">
                                        {new Date(session.session_date).toLocaleString('fr-FR', { month: 'short' })}
                                    </span>
                                </div>
                                <div className="session-info">
                                    <h3>{session.title}</h3>
                                    <p className="time">
                                        {new Date(session.session_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {session.duration_minutes} min
                                    </p>
                                </div>
                            </div>
                            <div className="card-body">
                                <p><strong>Lieu:</strong> {session.location}</p>
                                <p><strong>Niveau:</strong> {session.level}</p>
                                {session.description && <p className="description">{session.description}</p>}
                            </div>
                        </div>
                    ))}
                    {upcoming.length === 0 && <p>Aucun entraînement spécifique à venir.</p>}
                </div>
            </section>

            <section className="history-section">
                <h2>Historique</h2>
                <div className="history-list">
                    {history.map(session => (
                        <div key={session.id} className={`history-item ${session.attended ? 'present' : 'absent'}`}>
                            <div className="date">
                                {new Date(session.session_date).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="title">{session.session_title}</div>
                            <div className="status">
                                {session.attended ? 'Présent' : 'Absent'}
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && <p>Aucun historique disponible.</p>}
                </div>
            </section>
        </div>
    );
};

export default MyTrainings;
