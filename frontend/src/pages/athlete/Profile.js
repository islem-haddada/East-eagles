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

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState({ show: false, docId: null, docName: '' });

    // Preview modal state
    const [previewModal, setPreviewModal] = useState({ show: false, doc: null, url: null });

    // Upload form state
    const [uploadForm, setUploadForm] = useState({
        document_type: 'medical_certificate',
        notes: '',
        expiry_date: '',
        file: null
    });
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'documents', 'payments'

    const getDocumentTypeLabel = (type) => {
        const key = `profile.document_types.${type}`;
        const translated = t(key);
        return translated !== key ? translated : (type?.replace(/_/g, ' ') || t('profile.documents'));
    };

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

    const handleOpenDocument = async (doc) => {
        try {
            const token = localStorage.getItem('token');
            const previewUrl = `${documentAPI.getPreviewUrl(doc.id)}?token=${token}`;
            
            setPreviewModal({ 
                show: true, 
                doc: doc,
                url: previewUrl
            });
        } catch (error) {
            console.error("Preview error", error);
            notify.error("Erreur lors de l'ouverture du document");
        }
    };

    const handleDownloadDocument = async (docId, fileName) => {
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

    const closePreviewModal = () => {
        setPreviewModal({ show: false, doc: null, url: null });
    };

    const openDeleteModal = (docId, docName) => {
        setDeleteModal({ show: true, docId, docName });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ show: false, docId: null, docName: '' });
    };

    const confirmDeleteDocument = async () => {
        try {
            await documentAPI.deleteMyDocument(deleteModal.docId);
            notify.success("Document supprimé avec succès");
            closeDeleteModal();
            fetchData();
        } catch (error) {
            console.error("Delete error", error);
            notify.error("Erreur lors de la suppression du document");
            closeDeleteModal();
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
                            {/* Upload Card */}
                            <div className="card upload-card">
                                <h3>📤 {t('profile.upload_document')}</h3>
                                <form onSubmit={handleUpload}>
                                    <div className="form-group">
                                        <label>{t('profile.type')}</label>
                                        <select name="document_type" value={uploadForm.document_type} onChange={handleInputChange}>
                                            <option value="medical_certificate">{t('profile.document_types.medical_certificate')}</option>
                                            <option value="photo">{t('profile.document_types.photo')}</option>
                                            <option value="identity_card">{t('profile.document_types.identity_card')}</option>
                                            <option value="insurance">{t('profile.document_types.insurance')}</option>
                                            <option value="parental_authorization">{t('profile.document_types.parental_authorization')}</option>
                                            <option value="other">{t('profile.document_types.other')}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.expiry')}</label>
                                        <input type="date" name="expiry_date" value={uploadForm.expiry_date} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.file')}</label>
                                        <div className="file-upload-wrapper">
                                            <input type="file" id="fileInput" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                                            <label htmlFor="fileInput" className="file-upload-label">
                                                {uploadForm.file ? uploadForm.file.name : t('profile.drag_drop') + ' ' + t('profile.file_types')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.notes')}</label>
                                        <input type="text" name="notes" value={uploadForm.notes} onChange={handleInputChange} placeholder={t('profile.optional_notes')} />
                                    </div>
                                    <button type="submit" disabled={uploading || !uploadForm.file} className="btn-primary full-width">
                                        {uploading ? t('profile.uploading') : t('profile.upload_btn')}
                                    </button>
                                </form>
                            </div>

                            {/* Documents History */}
                            <div className="documents-history-container">
                                <div className="documents-history-header">
                                    <h3>📋 {t('profile.my_documents')} ({documents.length})</h3>
                                    <div className="docs-stats">
                                        <span className="doc-stat validated">✓ {documents.filter(d => d.validation_status === 'validated').length} {t('profile.validated')}</span>
                                        <span className="doc-stat pending">⏳ {documents.filter(d => d.validation_status === 'pending').length} {t('profile.pending')}</span>
                                        <span className="doc-stat rejected">✗ {documents.filter(d => d.validation_status === 'rejected').length} {t('profile.rejected')}</span>
                                    </div>
                                </div>

                                {documents.length === 0 ? (
                                    <div className="empty-docs-state">
                                        <span className="empty-icon">📭</span>
                                        <p>{t('profile.no_documents')}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Documents Table */}
                                        <div className="documents-table-wrapper">
                                            <table className="documents-history-table">
                                                <thead>
                                                    <tr>
                                                        <th>{t('profile.table.type')}</th>
                                                        <th>{t('profile.table.file')}</th>
                                                        <th>{t('profile.table.uploaded_at')}</th>
                                                        <th>{t('profile.table.status')}</th>
                                                        <th>{t('profile.table.validated_at')}</th>
                                                        <th>{t('profile.table.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {documents
                                                        .sort((a, b) => new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at))
                                                        .map(doc => (
                                                        <tr key={doc.id} className={`doc-row ${doc.validation_status}`}>
                                                            <td>
                                                                <div className="doc-type-cell">
                                                                    <span className="doc-type-icon-small">
                                                                        {doc.document_type === 'medical_certificate' && '🏥'}
                                                                        {doc.document_type === 'photo' && '📷'}
                                                                        {doc.document_type === 'identity_card' && '🪪'}
                                                                        {doc.document_type === 'insurance' && '🛡️'}
                                                                        {doc.document_type === 'parental_authorization' && '👨‍👩‍👧'}
                                                                        {doc.document_type === 'other' && '📄'}
                                                                        {!['medical_certificate', 'photo', 'identity_card', 'insurance', 'parental_authorization', 'other'].includes(doc.document_type) && '📄'}
                                                                    </span>
                                                                    {getDocumentTypeLabel(doc.document_type)}
                                                                </div>
                                                            </td>
                                                            <td className="doc-filename-cell">
                                                                {doc.file_name || doc.original_name || 'Document'}
                                                            </td>
                                                            <td className="doc-date-cell">
                                                                {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('fr-FR', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </td>
                                                            <td>
                                                                <span className={`status-badge-small ${doc.validation_status}`}>
                                                                    {doc.validation_status === 'validated' && t('profile.status.validated')}
                                                                    {doc.validation_status === 'rejected' && t('profile.status.rejected')}
                                                                    {doc.validation_status === 'pending' && t('profile.status.pending')}
                                                                    {!['validated', 'rejected', 'pending'].includes(doc.validation_status) && t('profile.status.pending')}
                                                                </span>
                                                                {doc.rejection_reason && (
                                                                    <div className="rejection-tooltip">
                                                                        ⚠️ {doc.rejection_reason}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="doc-date-cell">
                                                                {doc.validated_at ? new Date(doc.validated_at).toLocaleDateString('fr-FR', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                }) : '-'}
                                                            </td>
                                                            <td>
                                                                <div className="doc-actions">
                                                                    <button 
                                                                        className="btn-action-view"
                                                                        onClick={() => handleOpenDocument(doc)}
                                                                        title={t('profile.actions.view')}
                                                                    >
                                                                        👁️
                                                                    </button>
                                                                    <button 
                                                                        className="btn-action-download"
                                                                        onClick={() => handleDownloadDocument(doc.id, doc.file_name || doc.original_name)}
                                                                        title={t('profile.actions.download')}
                                                                    >
                                                                        ⬇️
                                                                    </button>
                                                                    <button 
                                                                        className="btn-action-delete"
                                                                        onClick={() => openDeleteModal(doc.id, getDocumentTypeLabel(doc.document_type))}
                                                                        title={t('profile.actions.delete')}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Timeline View */}
                                        <div className="documents-timeline">
                                            <h4>{t('profile.recent_history')}</h4>
                                            <div className="timeline">
                                                {documents
                                                    .sort((a, b) => new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at))
                                                    .slice(0, 5)
                                                    .map((doc, index) => (
                                                    <div key={doc.id} className={`timeline-item ${doc.validation_status}`}>
                                                        <div className="timeline-marker"></div>
                                                        <div className="timeline-content">
                                                            <div className="timeline-date">
                                                                {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('fr-FR', {
                                                                    day: '2-digit',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="timeline-title">
                                                                <span className="timeline-icon">
                                                                    {doc.document_type === 'medical_certificate' && '🏥'}
                                                                    {doc.document_type === 'photo' && '📷'}
                                                                    {doc.document_type === 'identity_card' && '🪪'}
                                                                    {doc.document_type === 'insurance' && '🛡️'}
                                                                    {doc.document_type === 'parental_authorization' && '👨‍👩‍👧'}
                                                                    {doc.document_type === 'other' && '📄'}
                                                                    {!['medical_certificate', 'photo', 'identity_card', 'insurance', 'parental_authorization', 'other'].includes(doc.document_type) && '📄'}
                                                                </span>
                                                                {getDocumentTypeLabel(doc.document_type)}
                                                            </div>
                                                            <div className="timeline-status">
                                                                <span className={`status-badge-small ${doc.validation_status}`}>
                                                                    {doc.validation_status === 'validated' && t('profile.status.validated')}
                                                                    {doc.validation_status === 'rejected' && t('profile.status.rejected')}
                                                                    {doc.validation_status === 'pending' && t('profile.status.pending')}
                                                                    {!['validated', 'rejected', 'pending'].includes(doc.validation_status) && t('profile.status.pending')}
                                                                </span>
                                                            </div>
                                                            {doc.validated_at && (
                                                                <div className="timeline-validated">
                                                                    {doc.validation_status === 'validated' ? '✓ Validé' : '✗ Traité'} le {new Date(doc.validated_at).toLocaleDateString('fr-FR')}
                                                                </div>
                                                            )}
                                                            {doc.rejection_reason && (
                                                                <div className="timeline-rejection">
                                                                    <strong>Motif:</strong> {doc.rejection_reason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
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

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={closeDeleteModal}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-icon">🗑️</div>
                        <h3>{t('profile.delete_modal.title')}</h3>
                        <p>{t('profile.delete_modal.message')} <strong>"{deleteModal.docName}"</strong> ?</p>
                        <p className="delete-modal-warning">{t('profile.delete_modal.warning')}</p>
                        <div className="delete-modal-actions">
                            <button className="btn-cancel" onClick={closeDeleteModal}>
                                {t('profile.delete_modal.cancel')}
                            </button>
                            <button className="btn-confirm-delete" onClick={confirmDeleteDocument}>
                                {t('profile.delete_modal.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewModal.show && previewModal.doc && (
                <div className="preview-modal-overlay" onClick={closePreviewModal}>
                    <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-modal-header">
                            <h3>{previewModal.doc.file_name || previewModal.doc.original_name}</h3>
                            <button className="preview-close-btn" onClick={closePreviewModal}>×</button>
                        </div>
                        <div className="preview-modal-content">
                            {previewModal.doc.mime_type?.startsWith('image/') ? (
                                <img 
                                    src={previewModal.url} 
                                    alt={previewModal.doc.file_name} 
                                />
                            ) : previewModal.doc.mime_type === 'application/pdf' ? (
                                <iframe 
                                    src={previewModal.url} 
                                    title={previewModal.doc.file_name}
                                />
                            ) : (
                                <div className="preview-not-supported">
                                    <p>{t('profile.preview.not_supported')}</p>
                                    <small>{t('profile.preview.download_instead')}</small>
                                </div>
                            )}
                        </div>
                        <div className="preview-modal-footer">
                            <button 
                                className="btn-preview-download"
                                onClick={() => handleDownloadDocument(previewModal.doc.id, previewModal.doc.file_name)}
                            >
                                ⬇️ {t('profile.preview.download')}
                            </button>
                            <button className="btn-preview-close" onClick={closePreviewModal}>
                                {t('profile.preview.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
