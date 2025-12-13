import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Athletes.css';

const Athletes = () => {
    const { t, i18n } = useTranslation();
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
            t('admin_athletes.confirm_approve'),
            {
                title: t('admin_athletes.confirm_approve_title'),
                confirmText: t('common.validate'),
                cancelText: t('common.cancel'),
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
        const reason = prompt(t('admin_athletes.reject_reason'));
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
            t('admin_athletes.confirm_delete'),
            {
                title: t('admin_athletes.confirm_delete_title'),
                confirmText: t('common.delete'),
                cancelText: t('common.cancel'),
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
        const matchesStatus = filter === 'all' || athlete.membership_status === filter;
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
                weight_kg: editForm.weight_kg ? parseFloat(editForm.weight_kg) : 0,
                // Ensure date_of_birth is in YYYY-MM-DD format if it exists
                date_of_birth: editForm.date_of_birth ? editForm.date_of_birth.split('T')[0] : ''
            };
            await athleteAPI.update(selectedAthlete.id, payload);
            notify.success(t('common.success'));
            fetchAthletes(); // Refresh list
            setSelectedAthlete(payload); // Update local view
            setIsEditing(false);
        } catch (error) {
            console.error("Update error:", error);
            notify.error(t('common.error'));
        }
    };

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'fr-FR';

    if (loading) return <div>{t('common.loading')}</div>;

    const getStatusLabel = (status) => {
        switch (status) {
            case 'approved': return t('admin_athletes.status_approved');
            case 'pending': return t('admin_athletes.status_pending');
            case 'rejected': return t('admin_athletes.status_rejected');
            default: return status;
        }
    };

    return (
        <div className="athletes-page">
            <div className="page-header">
                <h1>{t('admin_athletes.title')}</h1>
                <div className="actions">
                    <input
                        type="text"
                        placeholder={t('admin_athletes.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
                        <option value="all">{t('admin_athletes.filter_all')}</option>
                        <option value="approved">{t('admin_athletes.filter_approved')}</option>
                        <option value="pending">{t('admin_athletes.filter_pending')}</option>
                        <option value="rejected">{t('admin_athletes.filter_rejected')}</option>
                    </select>
                    <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="filter-select">
                        <option value="all">💰 {t('admin_athletes.payment_all')}</option>
                        <option value="paid">✅ {t('admin_athletes.payment_paid')}</option>
                        <option value="unpaid">❌ {t('admin_athletes.payment_unpaid')}</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin_athletes.th_name')}</th>
                            <th>{t('admin_athletes.th_email')}</th>
                            <th>{t('admin_athletes.th_phone')}</th>
                            <th>{t('admin_athletes.th_dob')}</th>
                            <th>{t('admin_athletes.th_status')}</th>
                            <th>💰 {t('admin_athletes.th_payment')}</th>
                            <th>{t('admin_athletes.th_actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAthletes.map(athlete => (
                            <tr key={athlete.id}>
                                <td>{athlete.first_name} {athlete.last_name}</td>
                                <td>{athlete.email}</td>
                                <td>{athlete.phone || '-'}</td>
                                <td>
                                    {athlete.date_of_birth && !athlete.date_of_birth.startsWith('0001')
                                        ? new Date(athlete.date_of_birth).toLocaleDateString(locale)
                                        : '-'}
                                </td>
                                <td>
                                    <span className={`status-badge ${athlete.membership_status}`}>
                                        {getStatusLabel(athlete.membership_status)}
                                    </span>
                                </td>
                                <td>
                                    {athlete.payment_valid === true ? (
                                        <div>
                                            <span className="status-badge approved">✅ {t('admin_athletes.status_paid')}</span>
                                            {athlete.payment_end_date && (
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                                                    {t('admin_athletes.until')} {new Date(athlete.payment_end_date).toLocaleDateString(locale)}
                                                </div>
                                            )}
                                        </div>
                                    ) : athlete.payment_end_date ? (
                                        <div>
                                            <span className="status-badge rejected">❌ {t('admin_athletes.status_expired')}</span>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                                                {t('admin_athletes.since')} {new Date(athlete.payment_end_date).toLocaleDateString(locale)}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="status-badge inactive">⚠️ {t('admin_athletes.status_none')}</span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleViewDetails(athlete)} className="btn-view" title={t('common.view_details')}>👁️</button>
                                        {athlete.membership_status === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(athlete.id)} className="btn-approve" title={t('common.validate')}>✓</button>
                                                <button onClick={() => handleReject(athlete.id)} className="btn-reject" title={t('common.reject')}>✗</button>
                                            </>
                                        )}
                                        <button onClick={() => handleDelete(athlete.id)} className="btn-delete" title={t('common.delete')}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredAthletes.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center">{t('admin_athletes.no_athletes')}</td>
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
                            <h2>{t('admin_athletes.profile_of')} {selectedAthlete.first_name} {selectedAthlete.last_name}</h2>
                            <div className="modal-actions">
                                {!isEditing ? (
                                    <button className="btn-edit" onClick={() => setIsEditing(true)}>✎ {t('common.edit')}</button>
                                ) : (
                                    <button className="btn-save" onClick={handleSaveDetails}>💾 {t('common.save')}</button>
                                )}
                                <button className="close-btn" onClick={closeDetailsModal}>&times;</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="profile-header-section">
                                <div className="profile-image-container">
                                    {selectedAthlete.photo_url ? (
                                        <img src={selectedAthlete.photo_url} alt="Profile" className="profile-image" />
                                    ) : (
                                        <div className="profile-initials">
                                            {selectedAthlete.first_name[0]}{selectedAthlete.last_name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-summary">
                                    <h3>{selectedAthlete.first_name} {selectedAthlete.last_name}</h3>
                                    <p className="email">{selectedAthlete.email}</p>
                                    <span className={`status-badge ${selectedAthlete.membership_status}`}>
                                        {getStatusLabel(selectedAthlete.membership_status)}
                                    </span>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="details-section">
                                    <h4>{t('profile.personal_info')}</h4>
                                    <div className="info-row">
                                        <span className="label">{t('profile.labels.dob')}:</span>
                                        {isEditing ? (
                                            <input type="date" name="date_of_birth" value={editForm.date_of_birth ? editForm.date_of_birth.split('T')[0] : ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">
                                                {selectedAthlete.date_of_birth && !selectedAthlete.date_of_birth.startsWith('0001')
                                                    ? new Date(selectedAthlete.date_of_birth).toLocaleDateString(locale)
                                                    : '-'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">{t('profile.labels.gender')}:</span>
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
                                        <span className="label">{t('profile.labels.phone')}:</span>
                                        {isEditing ? (
                                            <input type="text" name="phone" value={editForm.phone || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.phone || '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">{t('profile.labels.address')}:</span>
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
                                        <span className="label">{t('profile.labels.weight')}:</span>
                                        {isEditing ? (
                                            <input type="number" name="weight_kg" value={editForm.weight_kg || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.weight_kg ? `${selectedAthlete.weight_kg} kg` : '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">{t('profile.hero_badges.belt')}:</span>
                                        {isEditing ? (
                                            <select name="belt_level" value={editForm.belt_level || ''} onChange={handleEditChange} className="edit-input">
                                                <option value="">Sélectionner</option>
                                                <option value="Ceinture Blanche">Ceinture Blanche</option>
                                                <option value="Ceinture Jaune">Ceinture Jaune</option>
                                                <option value="Ceinture Orange">Ceinture Orange</option>
                                                <option value="Ceinture Verte">Ceinture Verte</option>
                                                <option value="Ceinture Bleue">Ceinture Bleue</option>
                                                <option value="Ceinture Marron">Ceinture Marron</option>
                                                <option value="Ceinture Noire">Ceinture Noire</option>
                                            </select>
                                        ) : (
                                            <span className="value">{selectedAthlete.belt_level || 'Ceinture Blanche'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Catégorie:</span>
                                        {isEditing ? (
                                            <input type="text" name="weight_category" value={editForm.weight_category || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.weight_category || '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">{t('profile.labels.blood_type')}:</span>
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
                                    <h4>{t('profile.labels.medical')}</h4>
                                    <div className="info-row">
                                        <span className="label">Conditions:</span>
                                        {isEditing ? (
                                            <input type="text" name="medical_conditions" value={editForm.medical_conditions || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.medical_conditions || t('common.none')}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">{t('profile.labels.allergies')}:</span>
                                        {isEditing ? (
                                            <input type="text" name="allergies" value={editForm.allergies || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.allergies || t('common.none')}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="details-section full-width">
                                    <h4>{t('profile.labels.emergency_contact')}</h4>
                                    <div className="info-row">
                                        <span className="label">{t('admin_athletes.th_name')}:</span>
                                        {isEditing ? (
                                            <input type="text" name="emergency_contact_name" value={editForm.emergency_contact_name || ''} onChange={handleEditChange} className="edit-input" />
                                        ) : (
                                            <span className="value">{selectedAthlete.emergency_contact_name || '-'}</span>
                                        )}
                                    </div>
                                    <div className="info-row">
                                        <span className="label">{t('admin_athletes.th_phone')}:</span>
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
                            <button className="btn-secondary" onClick={closeDetailsModal}>{t('common.cancel')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Athletes;
