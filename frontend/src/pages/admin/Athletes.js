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

    const handleDelete = async (id) => {
        const confirmed = await confirm(
            'Êtes-vous sûr de vouloir supprimer cet athlète ? Cette action est irréversible.',
            {
                title: 'Supprimer l\'athlète',
                confirmText: 'Supprimer',
                cancelText: 'Annuler',
                type: 'danger'
            }
        );
        if (!confirmed) return;
        try {
            await athleteAPI.delete(id);
            fetchAthletes();
            notify.success('Athlète supprimé avec succès');
        } catch (error) {
            notify.error('Erreur lors de la suppression');
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

    const [selectedAthlete, setSelectedAthlete] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    const handleViewDetails = (athlete) => {
        setSelectedAthlete(athlete);
        setEditForm(athlete);
        setIsEditing(false);
    };

    const closeDetailsModal = () => {
        setSelectedAthlete(null);
        setIsEditing(false);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveDetails = async () => {
        try {
            const payload = {
                ...editForm,
                weight: editForm.weight ? parseFloat(editForm.weight) : 0,
                height: editForm.height ? parseFloat(editForm.height) : 0,
                // Ensure birth_date is in YYYY-MM-DD format if it exists
                birth_date: editForm.birth_date ? editForm.birth_date.split('T')[0] : ''
            };
            await athleteAPI.update(selectedAthlete.id, payload);
            notify.success('Profil mis à jour avec succès');
            fetchAthletes(); // Refresh list
            setSelectedAthlete(payload); // Update local view
            setIsEditing(false);
        } catch (error) {
            console.error("Update error:", error);
            notify.error('Erreur lors de la mise à jour');
        }
    };

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
                            <th>Téléphone</th>
                            <th>Date de Naissance</th>
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
                                <td>{athlete.phone || '-'}</td>
                                <td>{athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString() : '-'}</td>
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
                                    <div className="action-buttons">
                                        <button onClick={() => handleViewDetails(athlete)} className="btn-view" title="Voir Détails">👁️</button>
                                        {athlete.approval_status === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(athlete.id)} className="btn-approve" title="Approuver">✓</button>
                                                <button onClick={() => handleReject(athlete.id)} className="btn-reject" title="Rejeter">✗</button>
                                            </>
                                        )}
                                        <button onClick={() => handleDelete(athlete.id)} className="btn-delete" title="Supprimer">🗑️</button>
                                    </div>
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

            {/* Details Modal */}
            {selectedAthlete && (
                <div className="modal-overlay" onClick={closeDetailsModal}>
                    <div className="modal-content details-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Profil de {selectedAthlete.first_name} {selectedAthlete.last_name}</h2>
                            <div className="modal-actions">
                                {!isEditing ? (
                                    <button className="btn-edit" onClick={() => setIsEditing(true)}>✎ Modifier</button>
                                ) : (
                                    <button className="btn-save" onClick={handleSaveDetails}>💾 Enregistrer</button>
                                )}
                                <button className="close-btn" onClick={closeDetailsModal}>&times;</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="profile-header-section">
                                <div className="profile-image-container">
                                    {selectedAthlete.profile_image ? (
                                        <img src={selectedAthlete.profile_image} alt="Profile" className="profile-image" />
                                    ) : (
                                        <div className="profile-initials">
                                            {selectedAthlete.first_name[0]}{selectedAthlete.last_name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-summary">
                                    <h3>{selectedAthlete.first_name} {selectedAthlete.last_name}</h3>
                                    <p className="email">{selectedAthlete.email}</p>
                                    <span className={`status-badge ${selectedAthlete.approval_status}`}>
                                        {selectedAthlete.approval_status}
                                    </span>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="details-section">
                                    <h4>Informations Personnelles</h4>
                                    <div className="info-row">
                                        <span className="label">Date de Naissance:</span>
                                        {isEditing ? (
                                            <input type="date" name="birth_date" value={editForm.birth_date ? editForm.birth_date.split('T')[0] : ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.birth_date ? new Date(selectedAthlete.birth_date).toLocaleDateString() : '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Sexe:</span>
                                        {isEditing ? (
                                            <select name="gender" value={editForm.gender || ''} onChange={handleEditChange} className="edit-input">
                                                <option value="">Sélectionner</option>
                                                <option value="male">Masculin</option>
                                                <option value="female">Féminin</option>
                                            </select>
                                        ) : (
                                            <span className="value">{selectedAthlete.gender === 'male' ? 'Masculin' : selectedAthlete.gender === 'female' ? 'Féminin' : '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Téléphone:</span>
                                        {isEditing ? (
                                            <input type="text" name="phone" value={editForm.phone || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.phone || '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Adresse:</span>
                                        {isEditing ? (
                                            <input type="text" name="address" value={editForm.address || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.address || '-'}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4>Informations Physiques</h4>
                                    <div className="info-row">
                                        <span className="label">Poids (kg):</span>
                                        {isEditing ? (
                                            <input type="number" name="weight" value={editForm.weight || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.weight ? `${selectedAthlete.weight} kg` : '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Taille (cm):</span>
                                        {isEditing ? (
                                            <input type="number" name="height" value={editForm.height || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.height ? `${selectedAthlete.height} cm` : '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Groupe Sanguin:</span>
                                        {isEditing ? (
                                            <select name="blood_type" value={editForm.blood_type || ''} onChange={handleEditChange} className="edit-input">
                                                <option value="">Sélectionner</option>
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                            </select>
                                        ) : (
                                            <span className="value">{selectedAthlete.blood_type || '-'}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="details-section full-width">
                                    <h4>Informations Médicales</h4>
                                    <div className="info-row">
                                        <span className="label">Conditions:</span>
                                        {isEditing ? (
                                            <input type="text" name="medical_conditions" value={editForm.medical_conditions || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.medical_conditions || 'Aucune'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Allergies:</span>
                                        {isEditing ? (
                                            <input type="text" name="allergies" value={editForm.allergies || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.allergies || 'Aucune'}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="details-section full-width">
                                    <h4>Contact d'Urgence</h4>
                                    <div className="info-row">
                                        <span className="label">Nom:</span>
                                        {isEditing ? (
                                            <input type="text" name="emergency_contact_name" value={editForm.emergency_contact_name || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.emergency_contact_name || '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Téléphone:</span>
                                        {isEditing ? (
                                            <input type="text" name="emergency_contact_phone" value={editForm.emergency_contact_phone || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.emergency_contact_phone || '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Relation:</span>
                                        {isEditing ? (
                                            <input type="text" name="emergency_contact_relation" value={editForm.emergency_contact_relation || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.emergency_contact_relation || '-'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeDetailsModal}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Athletes;
