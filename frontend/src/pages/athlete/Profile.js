import React, { useState, useEffect } from 'react';
import { athleteAPI, documentAPI, paymentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const notify = useNotification();
    const [athlete, setAthlete] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    // Upload form state
    const [uploadForm, setUploadForm] = useState({
        document_type: 'medical_certificate',
        notes: '',
        expiry_date: '',
        file: null
    });
    const [uploading, setUploading] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch athlete profile from backend
            const profileRes = await athleteAPI.getProfile();
            setAthlete(profileRes.data);
            setEditForm(profileRes.data);

            // Fetch documents using the athlete ID from the profile
            if (profileRes.data && profileRes.data.id) {
                const [docsRes, paymentsRes] = await Promise.all([
                    documentAPI.getByAthlete(profileRes.data.id),
                    paymentAPI.getMyPayments()
                ]);
                setDocuments(docsRes.data || []);
                setPayments(paymentsRes.data || []);
            }
        } catch (error) {
            console.error("Error fetching profile data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEditChange = (e) => {
        setEditForm({
            ...editForm,
            [e.target.name]: e.target.value
        });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            // Prepare data for API
            const dataToSend = {
                ...editForm,
                weight: editForm.weight ? parseFloat(editForm.weight) : 0,
                height: editForm.height ? parseFloat(editForm.height) : 0,
                experience_years: editForm.experience_years ? parseInt(editForm.experience_years) : 0,
            };
            const res = await athleteAPI.updateProfile(dataToSend);
            setAthlete(res.data);
            setIsEditing(false);
            notify.success('Profil mis à jour avec succès');
        } catch (error) {
            console.error("Error updating profile", error);
            notify.error('Erreur lors de la mise à jour du profil');
        }
    };

    const handleFileChange = (e) => {
        setUploadForm({
            ...uploadForm,
            file: e.target.files[0]
        });
    };

    const handleInputChange = (e) => {
        setUploadForm({
            ...uploadForm,
            [e.target.name]: e.target.value
        });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadForm.file) return notify.warning('Veuillez sélectionner un fichier');

        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('athlete_id', athlete.id);
        formData.append('document_type', uploadForm.document_type);
        formData.append('notes', uploadForm.notes);
        if (uploadForm.expiry_date) {
            formData.append('expiry_date', uploadForm.expiry_date);
        }

        try {
            await documentAPI.upload(formData);
            notify.success('Document téléversé avec succès');
            setUploadForm({
                document_type: 'medical_certificate',
                notes: '',
                expiry_date: '',
                file: null
            });
            // Reset file input
            document.getElementById('fileInput').value = '';
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Upload error", error);
            notify.error('Erreur lors du téléversement');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div>Chargement...</div>;
    if (!athlete) return <div>Profil introuvable. Veuillez contacter l'administrateur.</div>;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="header-top">
                    <h1>Mon Profil</h1>
                    <button
                        className="btn-secondary"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? 'Annuler' : 'Modifier'}
                    </button>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSaveProfile} className="edit-profile-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Téléphone</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={editForm.phone || ''}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Adresse</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={editForm.address || ''}
                                    onChange={handleEditChange}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Poids (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={editForm.weight || ''}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Taille (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={editForm.height || ''}
                                    onChange={handleEditChange}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Contact d'urgence (Nom)</label>
                            <input
                                type="text"
                                name="emergency_contact_name"
                                value={editForm.emergency_contact_name || ''}
                                onChange={handleEditChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Contact d'urgence (Tél)</label>
                            <input
                                type="text"
                                name="emergency_contact_phone"
                                value={editForm.emergency_contact_phone || ''}
                                onChange={handleEditChange}
                            />
                        </div>
                        <button type="submit" className="btn-primary">Enregistrer</button>
                    </form>
                ) : (
                    <div className="athlete-card">
                        <div className="avatar-placeholder">
                            {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <div className="athlete-details">
                            <h2>{athlete.first_name} {athlete.last_name}</h2>
                            <p><strong>Email:</strong> {athlete.email}</p>
                            <p><strong>Téléphone:</strong> {athlete.phone || 'Non renseigné'}</p>
                            <p><strong>Adresse:</strong> {athlete.address || 'Non renseigné'}</p>
                            <p><strong>Catégorie:</strong> {athlete.weight_category || 'N/A'} - {athlete.belt_level || 'N/A'}</p>
                            <p><strong>Status:</strong> <span className={`status-badge ${athlete.approval_status}`}>{athlete.approval_status}</span></p>
                        </div>
                    </div>
                )}
            </div>

            <div className="documents-section">
                <h2>Mes Documents</h2>

                <div className="upload-card">
                    <h3>Ajouter un document</h3>
                    <form onSubmit={handleUpload}>
                        <div className="form-group">
                            <label>Type de document</label>
                            <select
                                name="document_type"
                                value={uploadForm.document_type}
                                onChange={handleInputChange}
                            >
                                <option value="medical_certificate">Certificat Médical</option>
                                <option value="photo">Photo d'identité</option>
                                <option value="id_card">Carte d'identité</option>
                                <option value="parental_consent">Autorisation Parentale</option>
                                <option value="other">Autre</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Date d'expiration (si applicable)</label>
                            <input
                                type="date"
                                name="expiry_date"
                                value={uploadForm.expiry_date}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Fichier</label>
                            <input
                                type="file"
                                id="fileInput"
                                onChange={handleFileChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <input
                                type="text"
                                name="notes"
                                value={uploadForm.notes}
                                onChange={handleInputChange}
                                placeholder="Info supplémentaire..."
                            />
                        </div>

                        <button type="submit" disabled={uploading} className="btn-primary">
                            {uploading ? 'Envoi...' : 'Téléverser'}
                        </button>
                    </form>
                </div>

                <div className="documents-list">
                    {documents.map(doc => (
                        <div key={doc.id} className="doc-item">
                            <div className="doc-status">
                                <span className={`status-dot ${doc.validation_status}`}></span>
                            </div>
                            <div className="doc-content">
                                <h4>{doc.document_type}</h4>
                                <p>{doc.file_name}</p>
                                <small>
                                    {new Date(doc.uploaded_at).toLocaleDateString()} •
                                    Status: {doc.validation_status}
                                </small>
                                {doc.rejection_reason && (
                                    <div className="rejection-reason">
                                        Raison du rejet: {doc.rejection_reason}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {documents.length === 0 && <p>Aucun document téléversé.</p>}
                </div>
            </div>

            <div className="payments-section">
                <h2>Historique des Paiements</h2>
                <div className="payments-list">
                    {payments.map(p => (
                        <div key={p.id} className="payment-item">
                            <div className="payment-date">
                                {new Date(p.payment_date).toLocaleDateString()}
                            </div>
                            <div className="payment-info">
                                <strong>{p.amount} DA</strong>
                                <span>{p.months_covered} mois (jusqu'au {p.end_date})</span>
                            </div>
                        </div>
                    ))}
                    {payments.length === 0 && <p>Aucun paiement enregistré.</p>}
                </div>
            </div>
        </div>
    );
};

export default Profile;
