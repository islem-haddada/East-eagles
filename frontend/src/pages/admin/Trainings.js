import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trainingAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Trainings.css';

const Trainings = () => {
    const notify = useNotification();
    const confirm = useConfirm();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        session_date: '',
        duration_minutes: 90,
        location: 'Salle Principale',
        max_participants: 20,
        level: 'all'
    });

    const fetchTrainings = async () => {
        try {
            const response = await trainingAPI.getAll();
            setTrainings(response.data || []);
        } catch (error) {
            console.error("Error fetching trainings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainings();
    }, []);

    const handleDelete = async (id) => {
        const confirmed = await confirm(
            'Supprimer cette séance ?',
            {
                title: 'Supprimer la séance',
                confirmText: 'Supprimer',
                cancelText: 'Annuler',
                type: 'danger'
            }
        );
        if (!confirmed) return;
        try {
            await trainingAPI.delete(id);
            fetchTrainings();
        } catch (error) {
            notify.error('Erreur lors de la suppression');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Format date for backend "YYYY-MM-DD HH:mm"
            // Use the raw value from input (YYYY-MM-DDTHH:mm) and replace T with space
            // This preserves local time selected by user
            const formattedDate = formData.session_date.replace('T', ' ');

            await trainingAPI.create({
                ...formData,
                session_date: formattedDate,
                duration_minutes: parseInt(formData.duration_minutes),
                max_participants: parseInt(formData.max_participants)
            });
            setShowForm(false);
            fetchTrainings();
            setFormData({
                title: '',
                description: '',
                session_date: '',
                duration_minutes: 90,
                location: 'Salle Principale',
                max_participants: 20,
                level: 'all'
            });
        } catch (error) {
            console.error("Create error:", error);
            notify.error(`Erreur lors de la création: ${error.response?.data || error.message} `);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="trainings-page">
            <div className="page-header">
                <h1>Planning</h1>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                    {showForm ? 'Annuler' : 'Nouvelle Séance'}
                </button>
            </div>

            {showForm && (
                <div className="training-form-card">
                    <h3>Créer une séance</h3>
                    <form onSubmit={handleSubmit}>
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
                                <label>Date et Heure</label>
                                <input
                                    type="datetime-local"
                                    name="session_date"
                                    value={formData.session_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Durée (min)</label>
                                <input
                                    type="number"
                                    name="duration_minutes"
                                    value={formData.duration_minutes}
                                    onChange={handleChange}
                                    required
                                />
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
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>
                        <button type="submit" className="btn-submit">Créer</button>
                    </form>
                </div>
            )}

            <div className="trainings-list">
                {trainings.map(session => (
                    <div key={session.id} className="training-card">
                        <div className="training-info">
                            <h3>{session.title}</h3>
                            <p className="date">
                                {new Date(session.session_date).toLocaleString('fr-FR', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            <p className="details">
                                {session.location} • {session.duration_minutes} min • {session.level}
                            </p>
                        </div>
                        <div className="training-actions">
                            <Link to={`/ admin / trainings / ${session.id}/attendance`} className="btn-attendance" >
                                Présences
                            </Link >
                            <button onClick={() => handleDelete(session.id)} className="btn-delete">
                                Supprimer
                            </button>
                        </div >
                    </div >
                ))}
                {trainings.length === 0 && <p>Aucune séance programmée.</p>}
            </div >
        </div >
    );
};

export default Trainings;
