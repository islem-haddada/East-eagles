import React, { useState, useEffect } from 'react';
import { athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Athletes.css';

const Athletes = () => {
    const notify = useNotification();
    const confirm = useConfirm();
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, approved, pending, rejected
    const [paymentFilter, setPaymentFilter] = useState('all'); // all, paid, unpaid
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
        const confirmed = await confirm(
            'Êtes-vous sûr de vouloir approuver cet athlète ?',
            {
                title: 'Approuver l\'athlète',
                confirmText: 'Approuver',
                cancelText: 'Annuler',
                type: 'info'
            }
        );
        if (!confirmed) return;
        try {
            await athleteAPI.approve(id);
            fetchAthletes(); // Refresh list
        } catch (error) {
            notify.error('Erreur lors de l\'approbation');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Raison du rejet :');
        if (reason === null) return; // Cancelled
        try {
            await athleteAPI.reject(id, reason);
            fetchAthletes();
        } catch (error) {
            notify.error('Erreur lors du rejet');
        }
    };

    const filteredAthletes = athletes.filter(athlete => {
        const matchesSearch = (athlete.first_name + ' ' + athlete.last_name).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filter === 'all' || athlete.approval_status === filter;
        const matchesPayment = paymentFilter === 'all' ||
            (paymentFilter === 'paid' && athlete.payment_valid === true) ||
            (paymentFilter === 'unpaid' && athlete.payment_valid !== true);

        return matchesSearch && matchesStatus && matchesPayment;
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
                        <option value="approved">Approuvés</option>
                        <option value="pending">En attente</option>
                        <option value="rejected">Rejetés</option>
                    </select>
                    <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="filter-select">
                        <option value="all">💰 Tous paiements</option>
                        <option value="paid">✅ Payés</option>
                        <option value="unpaid">❌ Impayés</option>
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
                            <th>💰 Paiement</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAthletes.map(athlete => (
                            <tr key={athlete.id}>
                                <td>{athlete.first_name} {athlete.last_name}</td>
                                <td>{athlete.email}</td>
                                <td>{athlete.weight_category || '-'}</td>
                                <td>{athlete.belt_level || '-'}</td>
                                <td>
                                    <span className={`status-badge ${athlete.approval_status}`}>
                                        {athlete.approval_status === 'approved' ? 'Approuvé' :
                                            athlete.approval_status === 'pending' ? 'En attente' :
                                                athlete.approval_status === 'rejected' ? 'Rejeté' : athlete.approval_status}
                                    </span>
                                </td>
                                <td>
                                    {athlete.payment_valid === true ? (
                                        <div>
                                            <span className="status-badge approved">✅ Payé</span>
                                            {athlete.payment_end_date && (
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                                                    Jusqu'au {new Date(athlete.payment_end_date).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    ) : athlete.payment_end_date ? (
                                        <div>
                                            <span className="status-badge rejected">❌ Expiré</span>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                                                Depuis {new Date(athlete.payment_end_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="status-badge inactive">⚠️ Aucun paiement</span>
                                    )}
                                </td>
                                <td>
                                    {athlete.approval_status === 'pending' && (
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
                                <td colSpan="7" className="text-center">Aucun athlète trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Athletes;
