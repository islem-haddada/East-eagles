import React, { useState, useEffect } from 'react';
import { scheduleAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Schedule.css';

const Schedule = () => {
    const notify = useNotification();
    const confirm = useConfirm();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
    const [formData, setFormData] = useState({
        day_of_week: 'Monday',
        start_time: '18:00',
        duration_minutes: 90,
        title: 'Entraînement Sanda',
        location: 'Salle Principale',
        description: ''
    });

    const daysOfWeek = [
        { value: 'Monday', label: 'Lundi', short: 'Lun' },
        { value: 'Tuesday', label: 'Mardi', short: 'Mar' },
        { value: 'Wednesday', label: 'Mercredi', short: 'Mer' },
        { value: 'Thursday', label: 'Jeudi', short: 'Jeu' },
        { value: 'Friday', label: 'Vendredi', short: 'Ven' },
        { value: 'Saturday', label: 'Samedi', short: 'Sam' },
        { value: 'Sunday', label: 'Dimanche', short: 'Dim' }
    ];

    const fetchSchedules = async () => {
        try {
            const res = await scheduleAPI.getAll();
            console.log('🔍 API Response:', res.data);
            if (res.data && res.data.length > 0) {
                console.log('🔍 First schedule item:', res.data[0]);
                console.log('🔍 Start time of first item:', res.data[0].start_time);
            }
            setSchedules(res.data || []);
        } catch (error) {
            console.error("Error fetching schedules", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const resetForm = () => {
        setFormData({
            day_of_week: 'Monday',
            start_time: '18:00',
            duration_minutes: 90,
            title: 'Entraînement Sanda',
            location: 'Salle Principale',
            description: ''
        });
        setEditId(null);
        setShowForm(false);
    };

    const handleEdit = (slot) => {
        setFormData({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            duration_minutes: slot.duration_minutes,
            title: slot.title,
            location: slot.location,
            description: slot.description || ''
        });
        setEditId(slot.id);
        setShowForm(true);
    };

    // Check for time conflicts
    const checkTimeConflict = (day, startTime, duration, excludeId = null) => {
        const newStart = parseTime(startTime);
        const newEnd = newStart + duration;

        return schedules.some(slot => {
            if (slot.id === excludeId || slot.day_of_week !== day) return false;

            const existingStart = parseTime(slot.start_time);
            const existingEnd = existingStart + slot.duration_minutes;

            return (newStart < existingEnd && newEnd > existingStart);
        });
    };

    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check for conflicts
        const hasConflict = checkTimeConflict(
            formData.day_of_week,
            formData.start_time,
            parseInt(formData.duration_minutes),
            editId
        );

        if (hasConflict) {
            const confirmed = await confirm(
                'Ce créneau chevauche une séance existante. Voulez-vous continuer quand même ?',
                {
                    title: 'Conflit détecté',
                    confirmText: 'Continuer',
                    cancelText: 'Annuler',
                    type: 'warning'
                }
            );
            if (!confirmed) return;
        }

        try {
            const data = {
                ...formData,
                duration_minutes: parseInt(formData.duration_minutes)
            };

            if (editId) {
                await scheduleAPI.update(editId, data);
                notify.success('Créneau modifié avec succès');
            } else {
                await scheduleAPI.create(data);
                notify.success('Créneau ajouté avec succès');
            }

            resetForm();
            fetchSchedules();
        } catch (error) {
            console.error("Save error:", error);
            notify.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm(
            'Êtes-vous sûr de vouloir supprimer ce créneau ?',
            {
                title: 'Supprimer le créneau',
                confirmText: 'Supprimer',
                cancelText: 'Annuler',
                type: 'danger'
            }
        );

        if (confirmed) {
            try {
                await scheduleAPI.delete(id);
                fetchSchedules();
            } catch (error) {
                console.error("Delete error:", error);
                notify.error('Erreur lors de la suppression');
            }
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const getDayLabel = (dayValue) => {
        const day = daysOfWeek.find(d => d.value === dayValue);
        return day ? day.label : dayValue;
    };

    const getShortDayLabel = (dayValue) => {
        const day = daysOfWeek.find(d => d.value === dayValue);
        return day ? day.short : dayValue;
    };

    // Group schedules by day for calendar view
    const groupedSchedules = () => {
        const grouped = {};
        daysOfWeek.forEach(day => {
            grouped[day.value] = schedules
                .filter(s => s.day_of_week === day.value)
                .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
        });
        return grouped;
    };

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    const grouped = groupedSchedules();

    return (
        <div className="schedule-page">
            <div className="page-header">
                <div>
                    <h1>Planning Hebdomadaire</h1>
                    <p className="page-subtitle">{schedules.length} créneaux programmés</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            📅 Calendrier
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            📋 Liste
                        </button>
                    </div>
                    <button onClick={() => {
                        if (showForm) resetForm();
                        else setShowForm(true);
                    }} className="btn-primary">
                        {showForm ? 'Annuler' : '➕ Ajouter un Créneau'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="schedule-form-card">
                    <h3>{editId ? '✏️ Modifier le Créneau' : '➕ Nouveau Créneau Récurrent'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Jour</label>
                                <select
                                    name="day_of_week"
                                    value={formData.day_of_week}
                                    onChange={handleChange}
                                >
                                    {daysOfWeek.map(day => (
                                        <option key={day.value} value={day.value}>
                                            {day.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Heure de début</label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Titre</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Durée (minutes)</label>
                                <input
                                    type="number"
                                    name="duration_minutes"
                                    value={formData.duration_minutes}
                                    onChange={handleChange}
                                    min="15"
                                    step="15"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Lieu</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-submit">
                            {editId ? '💾 Modifier' : '➕ Ajouter au Planning'}
                        </button>
                    </form>
                </div>
            )}

            {viewMode === 'calendar' ? (
                <div className="calendar-view">
                    <div className="week-grid">
                        {daysOfWeek.map(day => (
                            <div key={day.value} className="day-column">
                                <div className="day-header">
                                    <div className="day-name">{day.label}</div>
                                    <div className="day-count">{grouped[day.value].length} séance{grouped[day.value].length !== 1 ? 's' : ''}</div>
                                </div>
                                <div className="day-slots">
                                    {grouped[day.value].length > 0 ? (
                                        grouped[day.value].map(slot => (
                                            <div key={slot.id} className="calendar-slot">
                                                <div className="slot-time">🕐 {slot.start_time}</div>
                                                <div className="slot-title">{slot.title}</div>
                                                <div className="slot-location">📍 {slot.location}</div>
                                                <div className="slot-duration">{slot.duration_minutes} min</div>
                                                <div className="slot-actions">
                                                    <button onClick={() => handleEdit(slot)} className="btn-edit" title="Modifier">✎</button>
                                                    <button onClick={() => handleDelete(slot.id)} className="btn-delete" title="Supprimer">×</button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-day">Aucune séance</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="schedule-grid">
                    {schedules.map(slot => (
                        <div key={slot.id} className="schedule-card">
                            <div className="schedule-header">
                                <span className="day-badge">{getDayLabel(slot.day_of_week)}</span>
                                <div className="card-actions">
                                    <button onClick={() => handleEdit(slot)} className="btn-edit" title="Modifier">✎</button>
                                    <button onClick={() => handleDelete(slot.id)} className="btn-delete" title="Supprimer">×</button>
                                </div>
                            </div>
                            <div className="schedule-time">
                                {slot.start_time} <span className="duration">({slot.duration_minutes} min)</span>
                            </div>
                            <h3 className="schedule-title">{slot.title}</h3>
                            <p className="schedule-location">📍 {slot.location}</p>
                        </div>
                    ))}
                    {schedules.length === 0 && (
                        <div className="no-schedule">Aucun créneau défini.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Schedule;
