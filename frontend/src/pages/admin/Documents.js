import React, { useState, useEffect } from 'react';
import { documentAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Documents.css';

const REQUIRED_DOCUMENTS = [
    { type: 'medical_certificate', label: 'Certificat Médical' },
    { type: 'insurance', label: 'Assurance Sportive' },
    { type: 'id_card', label: 'Carte d\'Identité' },
    { type: 'photo', label: 'Photo d\'Identité' },
    { type: 'parental_consent', label: 'Autorisation Parentale (Mineurs)' }
];

const Documents = () => {
    const notify = useNotification();
    const confirm = useConfirm();

    // State
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'archives'
    const [documents, setDocuments] = useState([]); // Pending documents
    const [athletes, setAthletes] = useState([]); // All athletes for archives
    const [selectedAthlete, setSelectedAthlete] = useState(null); // Selected athlete for folder view
    const [athleteDocuments, setAthleteDocuments] = useState([]); // Documents for selected athlete
    const [loading, setLoading] = useState(true);

    // Advanced Features State
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'approved', 'rejected', 'pending'
    const [previewDoc, setPreviewDoc] = useState(null); // Document to preview

    // Fetch pending documents
    const fetchPendingDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentAPI.getPending();
            setDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching pending documents", error);
            notify.error("Erreur lors du chargement des documents");
        } finally {
            setLoading(false);
        }
    };

    // Fetch all athletes for archives
    const fetchAthletes = async () => {
        try {
            setLoading(true);
            const response = await athleteAPI.getAll();
            setAthletes(response.data || []);
        } catch (error) {
            console.error("Error fetching athletes", error);
            notify.error("Erreur lors du chargement des athlètes");
        } finally {
            setLoading(false);
        }
    };

    // Fetch documents for a specific athlete
    const fetchAthleteDocuments = async (athleteId) => {
        try {
            setLoading(true);
            const response = await documentAPI.getByAthlete(athleteId);
            setAthleteDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching athlete documents", error);
            notify.error("Erreur lors du chargement des documents de l'athlète");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchPendingDocuments();
        fetchAthletes();
    }, []);

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedAthlete(null);
        setAthleteDocuments([]);
        setFilterStatus('all');
    };

    // Handle athlete selection
    const handleAthleteClick = (athlete) => {
        setSelectedAthlete(athlete);
        fetchAthleteDocuments(athlete.id);
    };

    // Handle back to archives
    const handleBackToArchives = () => {
        setSelectedAthlete(null);
        setAthleteDocuments([]);
    };

    const handleValidate = async (id) => {
        const confirmed = await confirm(
            'Valider ce document ?',
            {
                title: 'Valider le document',
                confirmText: 'Valider',
                cancelText: 'Annuler',
                type: 'info'
            }
        );
        if (!confirmed) return;
        try {
            await documentAPI.validate(id);
            notify.success('Document validé avec succès');
            // Refresh current view
            if (activeTab === 'pending') {
                fetchPendingDocuments();
            } else if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            }
        } catch (error) {
            notify.error('Erreur lors de la validation');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Raison du rejet :');
        if (reason === null) return;
        try {
            await documentAPI.reject(id, reason);
            notify.success('Document rejeté');
            // Refresh current view
            if (activeTab === 'pending') {
                fetchPendingDocuments();
            } else if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            }
        } catch (error) {
            notify.error('Erreur lors du rejet');
        }
    };

    const handleDownload = (id) => {
        window.open(documentAPI.download(id), '_blank');
    };

    const handlePreview = (doc) => {
        // If image or PDF, show preview
        if (doc.mime_type && (doc.mime_type.startsWith('image/') || doc.mime_type === 'application/pdf')) {
            setPreviewDoc(doc);
        } else {
            // Fallback to download
            handleDownload(doc.id);
        }
    };

    // Calculate Compliance
    const getComplianceStatus = () => {
        if (!selectedAthlete || !athleteDocuments) return { score: 0, missing: [] };

        const uploadedTypes = new Set(
            athleteDocuments
                .filter(d => d.validation_status === 'approved' || d.validation_status === 'pending')
                .map(d => d.document_type)
        );

        const missing = REQUIRED_DOCUMENTS.filter(req => {
            // Skip parental consent if athlete is adult (assuming > 18)
            // For now, we'll just list it as required for everyone or add logic if we had birthdate
            return !uploadedTypes.has(req.type);
        });

        const score = Math.round(((REQUIRED_DOCUMENTS.length - missing.length) / REQUIRED_DOCUMENTS.length) * 100);

        return { score, missing };
    };

    const compliance = getComplianceStatus();

    // Filtered Documents
    const filteredDocuments = athleteDocuments.filter(doc => {
        if (filterStatus === 'all') return true;
        return doc.validation_status === filterStatus;
    });

    // Stats
    const stats = {
        pending: documents.length,
        totalAthletes: athletes.length,
        // Mock compliance for now or calculate if possible
    };

    // Render Document Card
    const renderDocumentCard = (doc, showActions = true) => (
        <div key={doc.id} className="document-card">
            <div className="doc-icon">
                {doc.mime_type && doc.mime_type.startsWith('image/') ? '🖼️' : '📄'}
            </div>
            <div className="doc-info">
                <h3>{doc.document_type}</h3>
                <p className="filename">{doc.file_name}</p>
                <p className="meta">
                    {activeTab === 'pending' && `Athlète ID: ${doc.athlete_id} • `}
                    Date: {new Date(doc.uploaded_at).toLocaleDateString()}
                    {doc.validation_status !== 'pending' && ` • Statut: ${doc.validation_status}`}
                </p>
                {doc.notes && <p className="notes">Note: {doc.notes}</p>}
                {doc.rejection_reason && <p className="notes" style={{ color: 'var(--danger-color)', background: 'rgba(244, 67, 54, 0.1)' }}>Raison du rejet: {doc.rejection_reason}</p>}
            </div>
            <div className="doc-actions">
                <button
                    onClick={() => handlePreview(doc)}
                    className="btn-download"
                    title="Aperçu"
                >
                    Aperçu
                </button>
                <button
                    onClick={() => handleDownload(doc.id)}
                    className="btn-download"
                    title="Télécharger"
                >
                    ⬇️
                </button>

                {/* Show validate/reject buttons if pending */}
                {doc.validation_status === 'pending' && showActions && (
                    <>
                        <button
                            onClick={() => handleValidate(doc.id)}
                            className="btn-validate"
                            title="Valider"
                        >
                            Valider
                        </button>
                        <button
                            onClick={() => handleReject(doc.id)}
                            className="btn-reject"
                            title="Rejeter"
                        >
                            Rejeter
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="documents-page">
            <div className="page-header">
                <h1>Gestion des Documents</h1>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📄</div>
                        <div className="stat-info">
                            <h3>Documents en Attente</h3>
                            <p className="stat-value">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>Total Athlètes</h3>
                            <p className="stat-value">{stats.totalAthletes}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <h3>Taux de Conformité</h3>
                            <p className="stat-value">--%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => handleTabChange('pending')}
                >
                    En Attente
                </button>
                <button
                    className={`tab-btn ${activeTab === 'archives' ? 'active' : ''}`}
                    onClick={() => handleTabChange('archives')}
                >
                    Archives par Athlète
                </button>
            </div>

            {/* Pending Documents View */}
            {activeTab === 'pending' && (
                <div className="documents-list">
                    {loading ? (
                        <div>Chargement...</div>
                    ) : documents.length > 0 ? (
                        documents.map(doc => renderDocumentCard(doc))
                    ) : (
                        <div className="empty-state">
                            <p>Aucun document en attente de validation.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Archives View */}
            {activeTab === 'archives' && !selectedAthlete && (
                <div className="athletes-grid">
                    {loading ? (
                        <div>Chargement...</div>
                    ) : athletes.length > 0 ? (
                        athletes.map(athlete => (
                            <div
                                key={athlete.id}
                                className="athlete-folder-card"
                                onClick={() => handleAthleteClick(athlete)}
                            >
                                <span className="folder-icon">📁</span>
                                <h3>{athlete.first_name} {athlete.last_name}</h3>
                                <p>{athlete.email}</p>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <p>Aucun athlète trouvé.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Selected Athlete Folder View */}
            {activeTab === 'archives' && selectedAthlete && (
                <div className="athlete-folder-view">
                    <div className="folder-header">
                        <button onClick={handleBackToArchives} className="btn-back">
                            ← Retour aux athlètes
                        </button>
                        <h2>Dossier: {selectedAthlete.first_name} {selectedAthlete.last_name}</h2>
                    </div>

                    {/* Compliance Section */}
                    <div className="compliance-section">
                        <div className="compliance-header">
                            <h3>État du Dossier</h3>
                            <span className="compliance-score">{compliance.score}% Complet</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className={`progress-fill ${compliance.score < 100 ? 'incomplete' : ''}`}
                                style={{ width: `${compliance.score}%` }}
                            ></div>
                        </div>

                        {compliance.missing.length > 0 ? (
                            <div className="missing-docs">
                                <h4>Documents Manquants :</h4>
                                {compliance.missing.map((doc, index) => (
                                    <div key={index} className="missing-doc-item">
                                        <span className="missing-icon">⚠️</span>
                                        <span>{doc.label} est requis</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="missing-doc-item" style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)', background: 'rgba(76, 175, 80, 0.1)' }}>
                                <span className="missing-icon">✅</span>
                                <span>Dossier complet</span>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="filters">
                        <button
                            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('all')}
                        >
                            Tous
                        </button>
                        <button
                            className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('approved')}
                        >
                            Validés
                        </button>
                        <button
                            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('pending')}
                        >
                            En Attente
                        </button>
                        <button
                            className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('rejected')}
                        >
                            Rejetés
                        </button>
                    </div>

                    <div className="documents-list">
                        {loading ? (
                            <div>Chargement...</div>
                        ) : filteredDocuments.length > 0 ? (
                            filteredDocuments.map(doc => renderDocumentCard(doc, true))
                        ) : (
                            <div className="empty-state">
                                <p>Aucun document trouvé pour ce filtre.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewDoc && (
                <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Aperçu: {previewDoc.file_name}</h3>
                            <button className="btn-close" onClick={() => setPreviewDoc(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            {previewDoc.mime_type === 'application/pdf' ? (
                                <iframe
                                    src={documentAPI.download(previewDoc.id)}
                                    className="preview-iframe"
                                    title="PDF Preview"
                                />
                            ) : (
                                <img
                                    src={documentAPI.download(previewDoc.id)}
                                    alt="Preview"
                                    className="preview-image"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
