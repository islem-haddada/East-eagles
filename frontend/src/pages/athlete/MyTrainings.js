import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trainingAPI, scheduleAPI } from '../../services/api';
import './MyTrainings.css';

const MyTrainings = () => {
    const { t, i18n } = useTranslation();
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
        return t(`calendar.${day}`) || day;
    };

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'fr-FR';

    if (loading) return <div className="loading-spinner">{t('common.loading')}</div>;

    return (
        <div className="my-trainings-page">
            <h1>{t('athlete_trainings.title')}</h1>

            <section className="schedule-section">
                <h2>{t('athlete_trainings.weekly_schedule')}</h2>
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
                    {sortedSchedule.length === 0 && <p>{t('athlete_trainings.no_schedule')}</p>}
                </div>
            </section>

            <section className="upcoming-section">
                <h2>{t('athlete_trainings.upcoming_section')}</h2>
                <div className="trainings-grid">
                    {upcoming.map(session => (
                        <div key={session.id} className="training-card">
                            <div className="card-header">
                                <div className="date-badge">
                                    <span className="day">{new Date(session.session_date).getDate()}</span>
                                    <span className="month">
                                        {new Date(session.session_date).toLocaleString(locale, { month: 'short' })}
                                    </span>
                                </div>
                                <div className="session-info">
                                    <h3>{session.title}</h3>
                                    <p className="time">
                                        {new Date(session.session_date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {session.duration_minutes} min
                                    </p>
                                </div>
                            </div>
                            <div className="card-body">
                                <p><strong>{t('athlete_trainings.location')}:</strong> {session.location}</p>
                                <p><strong>{t('athlete_trainings.level')}:</strong> {session.level}</p>
                                {session.description && <p className="description">{session.description}</p>}
                            </div>
                        </div>
                    ))}
                    {upcoming.length === 0 && <p>{t('athlete_trainings.no_upcoming_specific')}</p>}
                </div>
            </section>

            <section className="history-section">
                <h2>{t('athlete_trainings.history')}</h2>
                <div className="history-list">
                    {history.map(session => (
                        <div key={session.id} className={`history-item ${session.attended ? 'present' : 'absent'}`}>
                            <div className="date">
                                {new Date(session.session_date).toLocaleDateString(locale)}
                            </div>
                            <div className="title">{session.session_title}</div>
                            <div className="status">
                                {session.attended ? t('athlete_trainings.present') : t('athlete_trainings.absent')}
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && <p>{t('athlete_trainings.no_history')}</p>}
                </div>
            </section>
        </div>
    );
};

export default MyTrainings;
