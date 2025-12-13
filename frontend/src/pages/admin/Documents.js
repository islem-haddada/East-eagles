import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { documentAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Documents.css';

const Documents = () => {
    const { t } = useTranslation();
    const notify = useNotification();
    const confirm = useConfirm();

    // Document types for select dropdown
    const DOCUMENT_TYPES = [
        'medical_certificate',
        'insurance', 
        'id_card',
        'photo',
        'parental_consent',
        'other'
    ];

    // Get document type label with translation
    const getDocTypeLabel = (type) => {
        const key = `admin_documents.doc_types.${type}`;
        const translated = t(key);
        return translated !== key ? translated : type;
    };

    // State
    const [activeTab, setActiveTab] = useState('athletes');
    const [athletes, setAthletes] = useState([]);
    const [selectedAthlete, setSelectedAthlete] = useState(null);
    const [athleteDocuments, setAthleteDocuments] = useState([]);
    const [pendingDocuments, setPendingDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Upload modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadDocType, setUploadDocType] = useState('medical_certificate');
    const [uploadNotes, setUploadNotes] = useState('');
    const [uploadExpiryDate, setUploadExpiryDate] = useState('');
    const [uploading, setUploading] = useState(false);

    // Preview state
    const [previewDoc, setPreviewDoc] = useState(null);

    // Fetch athletes
    const fetchAthletes = async () => {
        try {
            setLoading(true);
            const response = await athleteAPI.getAll();
            setAthletes(response.data || []);
        } catch (error) {
            console.error('Error fetching athletes:', error);
            notify.error('Erreur lors du chargement des athlètes');
        } finally {
            setLoading(false);
        }
    };

    // Fetch pending documents
    const fetchPendingDocuments = async () => {
        try {
            const response = await documentAPI.getPending();
            setPendingDocuments(response.data || []);
        } catch (error) {
            console.error('Error fetching pending documents:', error);
        }
    };

    // Fetch athlete documents
    const fetchAthleteDocuments = async (athleteId) => {
        try {
            setLoading(true);
            const response = await documentAPI.getByAthlete(athleteId);
            setAthleteDocuments(response.data || []);
        } catch (error) {
            console.error('Error fetching athlete documents:', error);
            notify.error('Erreur lors du chargement des documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAthletes();
        fetchPendingDocuments();
    }, []);

    // Handle athlete selection
    const handleSelectAthlete = (athlete) => {
        setSelectedAthlete(athlete);
        fetchAthleteDocuments(athlete.id);
    };

    // Handle back to list
    const handleBackToList = () => {
        setSelectedAthlete(null);
        setAthleteDocuments([]);
    };

    // Handle file upload
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !selectedAthlete) return;

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('athlete_id', selectedAthlete.id);
        formData.append('document_type', uploadDocType);
        formData.append('notes', uploadNotes);
        if (uploadExpiryDate) {
            formData.append('expiry_date', uploadExpiryDate);
        }

        try {
            setUploading(true);
            await documentAPI.upload(formData);
            notify.success('Document téléversé avec succès');
            setShowUploadModal(false);
            resetUploadForm();
            fetchAthleteDocuments(selectedAthlete.id);
            fetchPendingDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            notify.error('Erreur lors du téléversement');
        } finally {
            setUploading(false);
        }
    };

    const resetUploadForm = () => {
        setUploadFile(null);
        setUploadDocType('medical_certificate');
        setUploadNotes('');
        setUploadExpiryDate('');
    };

    // Handle document validation
    const handleValidate = async (docId) => {
        const confirmed = await confirm('Voulez-vous valider ce document ?', {
            title: 'Valider le document',
            confirmText: 'Valider',
            cancelText: 'Annuler',
            type: 'info'
        });
        if (!confirmed) return;

        try {
            await documentAPI.validate(docId);
            notify.success('Document validé');
            if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            }
            fetchPendingDocuments();
        } catch (error) {
            notify.error('Erreur lors de la validation');
        }
    };

    // Handle document rejection
    const handleReject = async (docId) => {
        const reason = prompt('Raison du rejet :');
        if (reason === null) return;

        try {
            await documentAPI.reject(docId, reason);
            notify.success('Document rejeté');
            if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            }
            fetchPendingDocuments();
        } catch (error) {
            notify.error('Erreur lors du rejet');
        }
    };

    // Handle document delete
    const handleDelete = async (docId) => {
        const confirmed = await confirm('Voulez-vous vraiment supprimer ce document ? Cette action est irréversible.', {
            title: 'Supprimer le document',
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            await documentAPI.delete(docId);
            notify.success('Document supprimé');
            if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            }
            fetchPendingDocuments();
        } catch (error) {
            console.error('Delete error:', error);
            notify.error('Erreur lors de la suppression');
        }
    };

    // Handle document download
    const handleDownload = (docId) => {
        const token = localStorage.getItem('token');
        const url = `${documentAPI.getDownloadUrl(docId)}?token=${token}`;
        window.open(url, '_blank');
    };

    // Handle document preview
    const handlePreview = (doc) => {
        const previewableTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (doc.mime_type && previewableTypes.includes(doc.mime_type)) {
            setPreviewDoc(doc);
        } else {
            handleDownload(doc.id);
        }
    };

    // Get status badge class
    const getStatusClass = (status) => {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            default: return 'status-pending';
        }
    };

    // Get status label
    const getStatusLabel = (status) => {
        switch (status) {
            case 'approved': return t('admin_documents.status_approved');
            case 'rejected': return t('admin_documents.status_rejected');
            default: return t('admin_documents.status_pending');
        }
    };

    // Filter athletes by search
    const filteredAthletes = athletes.filter(athlete => {
        const term = searchTerm.toLowerCase();
        return (
            athlete.first_name?.toLowerCase().includes(term) ||
            athlete.last_name?.toLowerCase().includes(term) ||
            athlete.email?.toLowerCase().includes(term)
        );
    });

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    // Render stats
    const renderStats = () => (
        <div className="docs-stats">
            <div className="stat-card">
                <div className="stat-icon">📁</div>
                <div className="stat-info">
                    <span className="stat-value">{athletes.length}</span>
                    <span className="stat-label">{t('admin_documents.athletes')}</span>
                </div>
            </div>
            <div className="stat-card warning">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                    <span className="stat-value">{pendingDocuments.length}</span>
                    <span className="stat-label">{t('admin_documents.stats_pending')}</span>
                </div>
            </div>
        </div>
    );

    // Render athlete list
    const renderAthleteList = () => (
        <div className="athletes-section">
            <div className="section-header">
                <h2>📂 {t('admin_documents.athlete_folders')}</h2>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder={t('admin_documents.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-state">{t('common.loading')}</div>
            ) : filteredAthletes.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <p>{t('admin_documents.no_athletes')}</p>
                </div>
            ) : (
                <div className="athletes-grid">
                    {filteredAthletes.map(athlete => (
                        <div
                            key={athlete.id}
                            className="athlete-card"
                            onClick={() => handleSelectAthlete(athlete)}
                        >
                            <div className="athlete-avatar">
                                {athlete.first_name?.charAt(0)}{athlete.last_name?.charAt(0)}
                            </div>
                            <div className="athlete-info">
                                <h3>{athlete.first_name} {athlete.last_name}</h3>
                                <p>{athlete.email}</p>
                            </div>
                            <div className="athlete-arrow">→</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Render athlete documents view
    const renderAthleteDocuments = () => (
        <div className="athlete-docs-section">
            <div className="section-header">
                <button className="btn-back" onClick={handleBackToList}>
                    ← {t('admin_documents.back')}
                </button>
                <h2>
                    {t('admin_documents.documents_of')} {selectedAthlete.first_name} {selectedAthlete.last_name}
                </h2>
                <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                    + {t('admin_documents.add_document')}
                </button>
            </div>

            {loading ? (
                <div className="loading-state">{t('common.loading')}</div>
            ) : athleteDocuments.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📄</div>
                    <p>{t('admin_documents.no_documents')}</p>
                    <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                        {t('admin_documents.add_first_document')}
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('admin_documents.th_type')}</th>
                                <th>{t('admin_documents.th_filename')}</th>
                                <th>{t('admin_documents.th_upload_date')}</th>
                                <th>{t('admin_documents.th_expiry')}</th>
                                <th>{t('admin_documents.th_status')}</th>
                                <th>{t('admin_documents.th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {athleteDocuments.map(doc => (
                                <tr key={doc.id}>
                                    <td>{getDocTypeLabel(doc.document_type)}</td>
                                    <td className="filename">{doc.file_name}</td>
                                    <td>{formatDate(doc.uploaded_at)}</td>
                                    <td>{formatDate(doc.expiry_date)}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusClass(doc.validation_status)}`}>
                                            {getStatusLabel(doc.validation_status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-icon"
                                                onClick={() => handlePreview(doc)}
                                                title="Voir"
                                            >
                                                👁️
                                            </button>
                                            <button 
                                                className="btn-icon"
                                                onClick={() => handleDownload(doc.id)}
                                                title="Télécharger"
                                            >
                                                ⬇️
                                            </button>
                                            {doc.validation_status === 'pending' && (
                                                <>
                                                    <button 
                                                        className="btn-icon success"
                                                        onClick={() => handleValidate(doc.id)}
                                                        title="Valider"
                                                    >
                                                        ✅
                                                    </button>
                                                    <button 
                                                        className="btn-icon danger"
                                                        onClick={() => handleReject(doc.id)}
                                                        title="Rejeter"
                                                    >
                                                        ❌
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                className="btn-icon delete"
                                                onClick={() => handleDelete(doc.id)}
                                                title="Supprimer"
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
            )}
        </div>
    );

    // Render pending documents tab
    const renderPendingDocuments = () => (
        <div className="pending-section">
            <div className="section-header">
                <h2>⏳ {t('admin_documents.pending_validation')}</h2>
            </div>

            {loading ? (
                <div className="loading-state">{t('common.loading')}</div>
            ) : pendingDocuments.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <p>{t('admin_documents.no_pending')}</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('admin_documents.th_athlete')}</th>
                                <th>{t('admin_documents.th_type')}</th>
                                <th>{t('admin_documents.th_filename')}</th>
                                <th>{t('admin_documents.th_upload_date')}</th>
                                <th>{t('admin_documents.th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingDocuments.map(doc => {
                                const athlete = athletes.find(a => a.id === doc.athlete_id);
                                return (
                                    <tr key={doc.id}>
                                        <td className="athlete-name">
                                            {athlete 
                                                ? `${athlete.first_name} ${athlete.last_name}`
                                                : `Athlète #${doc.athlete_id}`
                                            }
                                        </td>
                                        <td>{getDocTypeLabel(doc.document_type)}</td>
                                        <td className="filename">{doc.file_name}</td>
                                        <td>{formatDate(doc.uploaded_at)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-icon"
                                                    onClick={() => handlePreview(doc)}
                                                    title="Voir"
                                                >
                                                    👁️
                                                </button>
                                                <button 
                                                    className="btn-icon success"
                                                    onClick={() => handleValidate(doc.id)}
                                                    title="Valider"
                                                >
                                                    ✅
                                                </button>
                                                <button 
                                                    className="btn-icon danger"
                                                    onClick={() => handleReject(doc.id)}
                                                    title="Rejeter"
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // Render upload modal
    const renderUploadModal = () => (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📤 {t('admin_documents.add_document')}</h3>
                    <button className="btn-close" onClick={() => setShowUploadModal(false)}>×</button>
                </div>
                <form onSubmit={handleUpload}>
                    <div className="form-group">
                        <label>{t('admin_documents.label_type')}</label>
                        <select
                            value={uploadDocType}
                            onChange={(e) => setUploadDocType(e.target.value)}
                        >
                            {DOCUMENT_TYPES.map(type => (
                                <option key={type} value={type}>
                                    {getDocTypeLabel(type)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{t('admin_documents.label_file')}</label>
                        <input
                            type="file"
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            required
                        />
                        {uploadFile && (
                            <span className="file-name">{uploadFile.name}</span>
                        )}
                    </div>
                    <div className="form-group">
                        <label>{t('admin_documents.label_expiry')}</label>
                        <input
                            type="date"
                            value={uploadExpiryDate}
                            onChange={(e) => setUploadExpiryDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('admin_documents.label_notes')}</label>
                        <textarea
                            value={uploadNotes}
                            onChange={(e) => setUploadNotes(e.target.value)}
                            placeholder={t('admin_documents.notes_placeholder')}
                            rows={3}
                        />
                    </div>
                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-secondary"
                            onClick={() => setShowUploadModal(false)}
                        >
                            {t('common.cancel')}
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary"
                            disabled={!uploadFile || uploading}
                        >
                            {uploading ? t('admin_documents.uploading') : t('admin_documents.upload')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // Render preview modal
    const renderPreviewModal = () => {
        if (!previewDoc) return null;
        
        const token = localStorage.getItem('token');
        const previewUrl = `${documentAPI.getPreviewUrl(previewDoc.id)}?token=${token}`;
        const isImage = previewDoc.mime_type?.startsWith('image/');
        const isPDF = previewDoc.mime_type === 'application/pdf';

        return (
            <div className="preview-modal-overlay" onClick={() => setPreviewDoc(null)}>
                <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="preview-modal-header">
                        <h3>{previewDoc.file_name}</h3>
                        <button className="preview-close-btn" onClick={() => setPreviewDoc(null)}>×</button>
                    </div>
                    <div className="preview-modal-content">
                        {isImage && (
                            <img src={previewUrl} alt={previewDoc.file_name} />
                        )}
                        {isPDF && (
                            <iframe 
                                src={previewUrl} 
                                title={previewDoc.file_name}
                            />
                        )}
                        {!isImage && !isPDF && (
                            <div className="preview-not-supported">
                                <p>{t('admin_documents.preview_unavailable')}</p>
                                <small>{t('admin_documents.download_to_view')}</small>
                            </div>
                        )}
                    </div>
                    <div className="preview-modal-footer">
                        <button 
                            className="btn-preview-download"
                            onClick={() => handleDownload(previewDoc.id)}
                        >
                            ⬇️ {t('admin_documents.btn_download')}
                        </button>
                        <button className="btn-preview-close" onClick={() => setPreviewDoc(null)}>
                            {t('admin_documents.btn_close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="documents-page">
            <div className="page-header">
                <h1>📋 {t('admin_documents.title')}</h1>
            </div>

            {renderStats()}

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'athletes' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('athletes'); setSelectedAthlete(null); }}
                >
                    📂 {t('admin_documents.by_athlete')}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    ⏳ {t('admin_documents.tab_pending')} ({pendingDocuments.length})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'athletes' && (
                    selectedAthlete ? renderAthleteDocuments() : renderAthleteList()
                )}
                {activeTab === 'pending' && renderPendingDocuments()}
            </div>

            {showUploadModal && renderUploadModal()}
            {previewDoc && renderPreviewModal()}
        </div>
    );
};

export default Documents;
