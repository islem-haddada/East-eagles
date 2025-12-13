import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { athleteAPI, documentAPI, paymentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const notify = useNotification();
    const { t } = useTranslation();

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
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'documents', 'payments'

    const fetchData = async () => {
        try {
            // Fetch athlete profile from backend
            const profileRes = await athleteAPI.getProfile();
            setAthlete(profileRes.data);
            setEditForm(profileRes.data);

            // Fetch documents using the athlete ID from the profile
            if (profileRes.data && profileRes.data.id) {
                const [docsRes, paymentsRes] = await Promise.all([
                    documentAPI.getMyDocuments(),
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

    const handleOpenDocument = async (docId, fileName) => {
        try {
            notify.info(t('common.loading'));
            const response = await documentAPI.download(docId);

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename or default
            const name = fileName || 'document';
            link.setAttribute('download', name);

            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            notify.success(t('common.success'));
        } catch (error) {
            console.error("Download error", error);
            notify.error("Erreur lors du téléchargement du fichier");
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
            notify.success(t('common.success'));
        } catch (error) {
            console.error("Error updating profile", error);
            notify.error(t('common.error'));
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
            notify.success(t('common.success'));
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
            notify.error(t('common.error'));
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="loading-spinner">{t('common.loading')}</div>;
    if (!athlete) return <div className="error-message">{t('common.error')}</div>;

    return (
        <div className="profile-page">
            {/* Hero Section */}
            <div className="profile-hero">
                <div className="hero-content">
                    <div className="hero-avatar-container">
                        <div
                            className="hero-avatar"
                            onClick={() => document.getElementById('profileImageInput').click()}
                            style={{
                                backgroundImage: athlete.photo_url ? `url(${athlete.photo_url})` : 'none',
                            }}
                        >
                            {!athlete.photo_url && athlete.first_name && athlete.last_name && `${athlete.first_name[0]}${athlete.last_name[0]}`}
                            <div className="hero-avatar-overlay">
                                <span>📷</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            id="profileImageInput"
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={async (e) => {
                                if (e.target.files[0]) {
                                    const formData = new FormData();
                                    formData.append('file', e.target.files[0]);
                                    try {
                                        notify.info(t('common.loading'));
                                        const res = await athleteAPI.uploadProfileImage(formData);
                                        setAthlete(res.data);
                                        notify.success(t('common.success'));
                                    } catch (error) {
                                        console.error(error);
                                        notify.error(t('common.error'));
                                    }
                                }
                            }}
                        />
                    </div>
                    <div className="hero-info">
                        <h1>{athlete.first_name} {athlete.last_name}</h1>
                        <div className="hero-badges">
                            <span className="badge belt-badge">{athlete.belt_level || 'Ceinture Blanche'}</span>
                            <span className={`badge status-badge ${athlete.approval_status}`}>{athlete.approval_status}</span>
                        </div>
                    </div>
                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-value">{documents.length}</span>
                            <span className="stat-label">{t('profile.documents')}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{payments.length}</span>
                            <span className="stat-label">{t('profile.payments')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="profile-tabs">
                <button
                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    {t('profile.personal_info')}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                >
                    {t('profile.documents')}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    {t('profile.payments')}
                </button>
            </div>

            {/* Tab Content */}
            <div className="profile-content">
                {activeTab === 'info' && (
                    <div className="tab-pane fade-in">
                        <div className="card info-card">
                            <div className="card-header">
                                <h2>{t('profile.personal_info')}</h2>
                                <button className="btn-icon" onClick={() => setIsEditing(!isEditing)}>
                                    {isEditing ? '✕' : '✎'}
                                </button>
                            </div>

                            {isEditing ? (
                                <form onSubmit={handleSaveProfile} className="edit-profile-form">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>{t('profile.labels.firstname')}</label>
                                            <input type="text" name="first_name" value={editForm.first_name || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.lastname')}</label>
                                            <input type="text" name="last_name" value={editForm.last_name || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.email')}</label>
                                            <input type="email" value={athlete.email} disabled className="input-disabled" />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.dob')}</label>
                                            <input type="date" name="birth_date" value={editForm.birth_date ? editForm.birth_date.split('T')[0] : ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.gender')}</label>
                                            <select name="gender" value={editForm.gender || ''} onChange={handleEditChange}>
                                                <option value="">Sélectionner</option>
                                                <option value="male">Masculin</option>
                                                <option value="female">Féminin</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.phone')}</label>
                                            <input type="text" name="phone" value={editForm.phone || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>{t('profile.labels.address')}</label>
                                            <input type="text" name="address" value={editForm.address || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.weight')}</label>
                                            <input type="number" name="weight" value={editForm.weight || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.height')}</label>
                                            <input type="number" name="height" value={editForm.height || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.blood_type')}</label>
                                            <select name="blood_type" value={editForm.blood_type || ''} onChange={handleEditChange}>
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
                                        </div>
                                        <div className="form-group full-width">
                                            <label>{t('profile.labels.medical')}</label>
                                            <input type="text" name="medical_conditions" value={editForm.medical_conditions || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>{t('profile.labels.allergies')}</label>
                                            <input type="text" name="allergies" value={editForm.allergies || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.emergency_contact')}</label>
                                            <input type="text" name="emergency_contact_name" value={editForm.emergency_contact_name || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('profile.labels.emergency_phone')}</label>
                                            <input type="text" name="emergency_contact_phone" value={editForm.emergency_contact_phone || ''} onChange={handleEditChange} />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>{t('common.cancel')}</button>
                                        <button type="submit" className="btn-primary">{t('common.save')}</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.email')}</span>
                                        <span className="value">{athlete.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.dob')}</span>
                                        <span className="value">{athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.gender')}</span>
                                        <span className="value">{athlete.gender === 'male' ? 'Masculin' : athlete.gender === 'female' ? 'Féminin' : '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.phone')}</span>
                                        <span className="value">{athlete.phone || '-'}</span>
                                    </div>
                                    <div className="info-item full-width">
                                        <span className="label">{t('profile.labels.address')}</span>
                                        <span className="value">{athlete.address || '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.weight')}</span>
                                        <span className="value">{athlete.weight ? `${athlete.weight} kg` : '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.height')}</span>
                                        <span className="value">{athlete.height ? `${athlete.height} cm` : '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.blood_type')}</span>
                                        <span className="value">{athlete.blood_type || '-'}</span>
                                    </div>
                                    <div className="info-item full-width">
                                        <span className="label">{t('profile.labels.medical')}</span>
                                        <span className="value">{athlete.medical_conditions || '-'}</span>
                                    </div>
                                    <div className="info-item full-width">
                                        <span className="label">{t('profile.labels.allergies')}</span>
                                        <span className="value">{athlete.allergies || '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.emergency_contact')}</span>
                                        <span className="value">{athlete.emergency_contact_name || '-'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t('profile.labels.emergency_phone')}</span>
                                        <span className="value">{athlete.emergency_contact_phone || '-'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="tab-pane fade-in">
                        <div className="documents-layout">
                            <div className="card upload-card">
                                <h3>📤 {t('profile.upload_document')}</h3>
                                <form onSubmit={handleUpload}>
                                    <div className="form-group">
                                        <label>{t('profile.type')}</label>
                                        <select name="document_type" value={uploadForm.document_type} onChange={handleInputChange}>
                                            <option value="medical_certificate">Certificat Médical</option>
                                            <option value="photo">Photo d'identité</option>
                                            <option value="id_card">Carte d'identité</option>
                                            <option value="parental_consent">Autorisation Parentale</option>
                                            <option value="other">Autre</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.expiry')}</label>
                                        <input type="date" name="expiry_date" value={uploadForm.expiry_date} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.file')}</label>
                                        <input type="file" id="fileInput" onChange={handleFileChange} required className="file-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.notes')}</label>
                                        <input type="text" name="notes" value={uploadForm.notes} onChange={handleInputChange} placeholder={t('common.optional')} />
                                    </div>
                                    <button type="submit" disabled={uploading} className="btn-primary full-width">
                                        {uploading ? t('common.loading') : t('profile.upload_btn')}
                                    </button>
                                </form>
                            </div>

                            <div className="documents-grid">
                                {documents.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).map(doc => (
                                    <div key={doc.id} className="document-card clickable" onClick={() => handleOpenDocument(doc.id, doc.original_name || `document-${doc.document_type}`)}>
                                        <div className={`doc-icon-wrapper ${doc.document_type}`}>
                                            <span className="doc-icon">📄</span>
                                        </div>
                                        <div className="doc-info">
                                            <h4>{t(`admin_documents.label_${doc.document_type}`) || doc.document_type.replace(/_/g, ' ')}</h4>
                                            <div className="doc-meta">
                                                <p className="doc-date">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                                                {doc.expiry_date && (
                                                    <p className={`doc-expiry ${new Date(doc.expiry_date) < new Date() ? 'expired' : ''}`}>
                                                        Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="doc-status-row">
                                                <span className={`status-pill ${doc.validation_status}`}>
                                                    {doc.validation_status === 'approved' ? '✅ Validé' :
                                                        doc.validation_status === 'rejected' ? '❌ Rejeté' : '⏳ En attente'}
                                                </span>
                                                <button className="btn-view-doc">👁️ Ouvrir</button>
                                            </div>
                                        </div>
                                        {doc.rejection_reason && (
                                            <div className="doc-rejection-tooltip" title={doc.rejection_reason}>
                                                ❓ Motif du rejet
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {documents.length === 0 && (
                                    <div className="empty-state">
                                        <p>Aucun document pour le moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="tab-pane fade-in">
                        <div className="card">
                            <h3>{t('profile.payments')}</h3>
                            <div className="table-responsive">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Montant</th>
                                            <th>Période</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(p => (
                                            <tr key={p.id}>
                                                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                                                <td className="amount">{p.amount} DA</td>
                                                <td>{p.months_covered} mois (jusqu'au {p.end_date})</td>
                                                <td><span className="status-pill valid">Payé</span></td>
                                            </tr>
                                        ))}
                                        {payments.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center">Aucun paiement enregistré.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
