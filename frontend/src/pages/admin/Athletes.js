import React, { useState, useEffect } from 'react';
import { athleteAPI } from '../../services/api';
import './Athletes.css';

const Athletes = () => {
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, pending
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAthletes = async () => {
        try {
            const response = await athleteAPI.getAll();
            setAthletes(response.data || []);
        } catch (error) {
            console.error("Error fetching athletes", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAthletes();
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm('Confirmer l\'approbation ?')) return;
        try {
            await athleteAPI.approve(id);
            fetchAthletes(); // Refresh list
        } catch (error) {
            alert('Erreur lors de l\'approbation');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Raison du rejet :');
        if (reason === null) return; // Cancelled
        try {
            await athleteAPI.reject(id, reason);
            fetchAthletes();
        } catch (error) {
            alert('Erreur lors du rejet');
        }
    };

    const filteredAthletes = athletes.filter(athlete => {
        const matchesSearch = (athlete.first_name + ' ' + athlete.last_name).toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'all') return matchesSearch;
        return matchesSearch && athlete.status === filter;
    });

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="athletes-page">
            <div className="page-header">
                <h1>Gestion des Athlètes</h1>
                <div className="actions">
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
                        <option value="all">Tous</option>
                        <option value="active">Actifs</option>
                        <option value="pending">En attente</option>
                        <option value="inactive">Inactifs</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Catégorie</th>
                            <th>Ceinture</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAthletes.map(athlete => (
                            <tr key={athlete.id}>
                                <td>{athlete.first_name} {athlete.last_name}</td>
                                <td>{athlete.email}</td>
                                <td>{athlete.category || '-'}</td>
                                <td>{athlete.belt_level || '-'}</td>
                                <td>
                                    <span className={`status-badge ${athlete.status}`}>
                                        {athlete.status}
                                    </span>
                                </td>
                                <td>
                                    {athlete.status === 'pending' && (
                                        <div className="action-buttons">
                                            <button onClick={() => handleApprove(athlete.id)} className="btn-approve">✓</button>
                                            <button onClick={() => handleReject(athlete.id)} className="btn-reject">✗</button>
                                        </div>
                                    )}
                                    {/* Add edit/delete buttons here */}
                                </td>
                            </tr>
                        ))}
                        {filteredAthletes.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center">Aucun athlète trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Athletes;
