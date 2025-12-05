import React, { useState, useEffect } from 'react';
import { athleteAPI, trainingAPI, documentAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalAthletes: 0,
        pendingAthletes: 0,
        upcomingTrainings: 0,
        pendingDocuments: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Parallel requests
                const [athletesRes, pendingAthletesRes, trainingsRes, docsRes] = await Promise.all([
                    athleteAPI.getAll(),
                    athleteAPI.getPending(),
                    trainingAPI.getUpcoming(),
                    documentAPI.getPending()
                ]);

                setStats({
                    totalAthletes: athletesRes.data?.length || 0,
                    pendingAthletes: pendingAthletesRes.data?.length || 0,
                    upcomingTrainings: trainingsRes.data?.length || 0,
                    pendingDocuments: docsRes.data?.length || 0
                });
            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="dashboard">
            <h1>Tableau de Bord</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Athlètes Total</h3>
                    <div className="stat-value">{stats.totalAthletes}</div>
                </div>
                <div className="stat-card warning">
                    <h3>En Attente</h3>
                    <div className="stat-value">{stats.pendingAthletes}</div>
                    <p>Athlètes à valider</p>
                </div>
                <div className="stat-card info">
                    <h3>Entraînements</h3>
                    <div className="stat-value">{stats.upcomingTrainings}</div>
                    <p>Sessions à venir</p>
                </div>
                <div className="stat-card warning">
                    <h3>Documents</h3>
                    <div className="stat-value">{stats.pendingDocuments}</div>
                    <p>À vérifier</p>
                </div>
            </div>

            <div className="recent-activity">
                {/* Placeholder for recent activity list */}
                <h2>Activité Récente</h2>
                <p>Aucune activité récente.</p>
            </div>
        </div>
    );
};

export default Dashboard;
