import React, { useState, useEffect } from 'react';
import { documentAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Documents.css';

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

    // Initial load based on active tab
    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingDocuments();
        } else if (activeTab === 'archives' && !selectedAthlete) {
            fetchAthletes();
        }
    }, [activeTab, selectedAthlete]);

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedAthlete(null);
        setAthleteDocuments([]);
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
        fetchAthletes();
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

    // Render Document Card
    const renderDocumentCard = (doc, showActions = true) => (
        <div key={doc.id} className="document-card">
            <div className="doc-icon">📄</div>
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
                    onClick={() => handleDownload(doc.id)}
                    className="btn-download"
                    title="Télécharger/Voir"
                >
                    Voir
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

                    <div className="documents-list">
                        {loading ? (
                            <div>Chargement...</div>
                        ) : athleteDocuments.length > 0 ? (
                            athleteDocuments.map(doc => renderDocumentCard(doc, true))
                        ) : (
                            <div className="empty-state">
                                <p>Aucun document dans ce dossier.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
