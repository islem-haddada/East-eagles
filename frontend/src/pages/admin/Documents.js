import React, { useState, useEffect } from 'react';
import { documentAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Documents.css';

const Documents = () => {
    const notify = useNotification();
    const confirm = useConfirm();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDocuments = async () => {
        try {
            const response = await documentAPI.getPending();
            setDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

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
            fetchDocuments(); // Refresh list
        } catch (error) {
            notify.error('Erreur lors de la validation');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Raison du rejet :');
        if (reason === null) return;
        try {
            await documentAPI.reject(id, reason);
            fetchDocuments();
        } catch (error) {
            notify.error('Erreur lors du rejet');
        }
    };

    const handleDownload = (id, fileName) => {
        // In a real app, this might be a direct link or a blob download
        // Using the helper from api.js
        window.open(documentAPI.download(id), '_blank');
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="documents-page">
            <div className="page-header">
                <h1>Documents en Attente</h1>
            </div>

            <div className="documents-list">
                {documents.map(doc => (
                    <div key={doc.id} className="document-card">
                        <div className="doc-icon">📄</div>
                        <div className="doc-info">
                            <h3>{doc.document_type}</h3>
                            <p className="filename">{doc.file_name}</p>
                            <p className="meta">
                                Athlète ID: {doc.athlete_id} •
                                {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                            {doc.notes && <p className="notes">Note: {doc.notes}</p>}
                        </div>
                        <div className="doc-actions">
                            <button
                                onClick={() => handleDownload(doc.id, doc.file_name)}
                                className="btn-download"
                            >
                                Voir
                            </button>
                            <button
                                onClick={() => handleValidate(doc.id)}
                                className="btn-validate"
                            >
                                Valider
                            </button>
                            <button
                                onClick={() => handleReject(doc.id)}
                                className="btn-reject"
                            >
                                Rejeter
                            </button>
                        </div>
                    </div>
                ))}
                {documents.length === 0 && (
                    <div className="empty-state">
                        <p>Aucun document en attente de validation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Documents;
