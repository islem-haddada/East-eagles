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
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'expiring', 'expired', 'archives', or 'search'
    const [documents, setDocuments] = useState([]); // Pending documents
    const [expiringDocuments, setExpiringDocuments] = useState([]); // Expiring documents
    const [expiredDocuments, setExpiredDocuments] = useState([]); // Expired documents
    const [athletes, setAthletes] = useState([]); // All athletes for archives
    const [categories, setCategories] = useState([]); // Document categories
    const [tags, setTags] = useState([]); // Document tags
    const [selectedAthlete, setSelectedAthlete] = useState(null); // Selected athlete for folder view
    const [athleteDocuments, setAthleteDocuments] = useState([]); // Documents for selected athlete
    const [loading, setLoading] = useState(true);

    // Advanced Features State
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'approved', 'rejected', 'pending'
    const [filterCategory, setFilterCategory] = useState('all'); // Filter by category
    const [filterTags, setFilterTags] = useState([]); // Filter by tags
    const [previewDoc, setPreviewDoc] = useState(null); // Document to preview
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('name_asc');
    const [searchResults, setSearchResults] = useState([]); // Search results
    const [showSearchView, setShowSearchView] = useState(false); // Whether to show search view

    // Upload State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadDocType, setUploadDocType] = useState('medical_certificate');
    const [uploadCategory, setUploadCategory] = useState('');
    const [uploadTags, setUploadTags] = useState([]);
    const [uploadExpiryDate, setUploadExpiryDate] = useState('');
    const [uploadNotes, setUploadNotes] = useState('');
    
    // Bulk upload state
    const [bulkSelectedAthletes, setBulkSelectedAthletes] = useState([]);
    const [bulkFiles, setBulkFiles] = useState({});
    const [bulkDocType, setBulkDocType] = useState('medical_certificate');
    const [bulkCategory, setBulkCategory] = useState('');
    const [bulkTags, setBulkTags] = useState([]);
    const [bulkExpiryDate, setBulkExpiryDate] = useState('');
    const [bulkNotes, setBulkNotes] = useState('');

    // Versioning State
    const [showVersions, setShowVersions] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);
    const [documentVersions, setDocumentVersions] = useState([]);
    const [versionModalOpen, setVersionModalOpen] = useState(false);
    const [newVersionFile, setNewVersionFile] = useState(null);
    const [newVersionNotes, setNewVersionNotes] = useState('');
    
    // Sharing State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [documentShares, setDocumentShares] = useState([]);
    const [shareData, setShareData] = useState({
        shared_with: '',
        permission_level: 'view',
        notes: '',
        expires_at: ''
    });

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !selectedAthlete) return;

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('athlete_id', selectedAthlete.id);
        formData.append('document_type', uploadDocType);
        if (uploadCategory) {
            formData.append('category_id', uploadCategory);
        }
        if (uploadTags.length > 0) {
            formData.append('tag_ids', uploadTags.join(','));
        }
        formData.append('notes', uploadNotes);
        if (uploadExpiryDate) {
            formData.append('expiry_date', uploadExpiryDate);
        }

        try {
            setLoading(true);
            await documentAPI.upload(formData);
            notify.success('Document ajouté avec succès');
            setUploadModalOpen(false);
            setUploadFile(null);
            setUploadCategory('');
            setUploadTags([]);
            setUploadExpiryDate('');
            setUploadNotes('');
            // Refresh documents
            fetchAthleteDocuments(selectedAthlete.id);
        } catch (error) {
            console.error("Upload error", error);
            notify.error("Erreur lors de l'upload");
        } finally {
            setLoading(false);
        }
    };

    // Handle bulk upload
    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (bulkSelectedAthletes.length === 0 || Object.keys(bulkFiles).length === 0) {
            notify.error("Veuillez sélectionner au moins un athlète et un fichier");
            return;
        }

        const formData = new FormData();
        formData.append('document_type', bulkDocType);
        if (bulkCategory) {
            formData.append('category_id', bulkCategory);
        }
        if (bulkTags.length > 0) {
            formData.append('tag_ids', bulkTags.join(','));
        }
        formData.append('notes', bulkNotes);
        if (bulkExpiryDate) {
            formData.append('expiry_date', bulkExpiryDate);
        }
        
        // Add athlete IDs
        const athleteIds = bulkSelectedAthletes.map(a => a.id).join(',');
        formData.append('athlete_ids', athleteIds);
        
        // Add files
        Object.keys(bulkFiles).forEach(athleteId => {
            formData.append(`file_${athleteId}`, bulkFiles[athleteId]);
        });

        try {
            setLoading(true);
            const response = await documentAPI.uploadBulk(formData);
            const results = response.data;
            
            // Count successes and failures
            const successCount = results.filter(r => !r.error).length;
            const errorCount = results.filter(r => r.error).length;
            
            if (successCount > 0) {
                notify.success(`${successCount} document(s) ajouté(s) avec succès`);
            }
            
            if (errorCount > 0) {
                notify.error(`${errorCount} document(s) n'ont pas pu être ajoutés`);
            }
            
            setBulkUploadModalOpen(false);
            setBulkSelectedAthletes([]);
            setBulkFiles({});
            setBulkCategory('');
            setBulkTags([]);
            setBulkExpiryDate('');
            setBulkNotes('');
            
            // Refresh documents if needed
            if (activeTab === 'pending') {
                fetchPendingDocuments();
            }
        } catch (error) {
            console.error("Bulk upload error", error);
            notify.error("Erreur lors de l'upload en masse");
        } finally {
            setLoading(false);
        }
    };

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

    // Fetch expiring documents
    const fetchExpiringDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentAPI.getExpiring();
            setExpiringDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching expiring documents", error);
            notify.error("Erreur lors du chargement des documents expirant bientôt");
        } finally {
            setLoading(false);
        }
    };

    // Fetch expired documents
    const fetchExpiredDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentAPI.getExpired();
            setExpiredDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching expired documents", error);
            notify.error("Erreur lors du chargement des documents expirés");
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

    // Fetch document categories
    const fetchCategories = async () => {
        try {
            const response = await documentAPI.getCategories();
            setCategories(response.data || []);
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    // Fetch document tags
    const fetchTags = async () => {
        try {
            const response = await documentAPI.getTags();
            setTags(response.data || []);
        } catch (error) {
            console.error("Error fetching tags", error);
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

    // Perform advanced search
    const performSearch = async () => {
        if (!searchTerm && filterCategory === 'all' && filterStatus === 'all' && filterTags.length === 0) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const params = {};
            
            if (searchTerm) {
                params.search = searchTerm;
            }
            
            if (filterCategory !== 'all') {
                params.category_id = filterCategory;
            }
            
            if (filterStatus !== 'all') {
                params.status = filterStatus;
            }
            
            if (filterTags.length > 0) {
                params.tag_ids = filterTags.join(',');
            }
            
            params.sort = sortOrder;
            
            const response = await documentAPI.search(params);
            setSearchResults(response.data || []);
        } catch (error) {
            console.error("Error performing search", error);
            notify.error("Erreur lors de la recherche");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchPendingDocuments();
        fetchExpiringDocuments();
        fetchExpiredDocuments();
        fetchAthletes();
        fetchCategories();
        fetchTags();
    }, []);

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedAthlete(null);
        setAthleteDocuments([]);
        setFilterStatus('all');
        setFilterCategory('all');
        setFilterTags([]);
        setSearchTerm('');
        setSearchResults([]);
        setShowSearchView(false);
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

    // Toggle athlete selection for bulk upload
    const toggleAthleteSelection = (athlete) => {
        const isSelected = bulkSelectedAthletes.some(a => a.id === athlete.id);
        if (isSelected) {
            setBulkSelectedAthletes(bulkSelectedAthletes.filter(a => a.id !== athlete.id));
        } else {
            setBulkSelectedAthletes([...bulkSelectedAthletes, athlete]);
        }
    };

    // Handle file selection for bulk upload
    const handleBulkFileSelect = (athleteId, file) => {
        setBulkFiles(prev => ({
            ...prev,
            [athleteId]: file
        }));
    };

    // Toggle tag selection
    const toggleTagSelection = (tagId, isBulk = false) => {
        if (isBulk) {
            const isSelected = bulkTags.includes(tagId);
            if (isSelected) {
                setBulkTags(bulkTags.filter(id => id !== tagId));
            } else {
                setBulkTags([...bulkTags, tagId]);
            }
        } else {
            const isSelected = uploadTags.includes(tagId);
            if (isSelected) {
                setUploadTags(uploadTags.filter(id => id !== tagId));
            } else {
                setUploadTags([...uploadTags, tagId]);
            }
        }
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
            } else if (activeTab === 'expiring') {
                fetchExpiringDocuments();
            } else if (activeTab === 'expired') {
                fetchExpiredDocuments();
            } else if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            } else if (showSearchView) {
                performSearch();
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
            } else if (activeTab === 'expiring') {
                fetchExpiringDocuments();
            } else if (activeTab === 'expired') {
                fetchExpiredDocuments();
            } else if (selectedAthlete) {
                fetchAthleteDocuments(selectedAthlete.id);
            } else if (showSearchView) {
                performSearch();
            }
        } catch (error) {
            notify.error('Erreur lors du rejet');
        }
    };

    const handleDownload = (id) => {
        const token = localStorage.getItem('token');
        const url = `${documentAPI.getDownloadUrl(id)}?token=${token}`;
        window.open(url, '_blank');
    };

    const handlePreview = (doc) => {
        // Enhanced preview logic to support more file types
        const supportedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        
        if (doc.mime_type && supportedTypes.includes(doc.mime_type)) {
            setPreviewDoc(doc);
        } else {
            // Fallback to download for unsupported types
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
        if (filterStatus !== 'all' && doc.validation_status !== filterStatus) return false;
        if (filterCategory !== 'all' && (!doc.category || doc.category.id.toString() !== filterCategory)) return false;
        
        // Filter by tags (if any tags are selected, document must have ALL selected tags)
        if (filterTags.length > 0) {
            const docTagIds = doc.tags ? doc.tags.map(t => t.id) : [];
            return filterTags.every(tagId => docTagIds.includes(tagId));
        }
        
        return true;
    });

    // Filter & Sort Athletes
    const getFilteredAthletes = () => {
        let filtered = [...athletes];

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(a =>
                a.first_name.toLowerCase().includes(lowerTerm) ||
                a.last_name.toLowerCase().includes(lowerTerm) ||
                a.email.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortOrder) {
                case 'name_asc':
                    return a.last_name.localeCompare(b.last_name);
                case 'name_desc':
                    return b.last_name.localeCompare(a.last_name);
                case 'date_newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date_oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                default:
                    return 0;
            }
        });

        return filtered;
    };

    const filteredAthletes = getFilteredAthletes();

    // Stats
    const stats = {
        pending: documents.length,
        expiring: expiringDocuments.length,
        expired: expiredDocuments.length,
        totalAthletes: athletes.length,
        activeAthletes: athletes.filter(a => a.is_active).length
    };

    // Render Document Card
    const renderDocumentCard = (doc, showActions = true) => {
        // Calculate days until expiration
        let expiryInfo = null;
        if (doc.expiry_date) {
            const expiryDate = new Date(doc.expiry_date);
            const today = new Date();
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (daysUntilExpiry < 0) {
                expiryInfo = { text: 'Expiré', className: 'expired' };
            } else if (daysUntilExpiry <= 30) {
                expiryInfo = { text: `Expire dans ${daysUntilExpiry} jours`, className: 'expiring' };
            } else {
                expiryInfo = { text: `Expire le ${expiryDate.toLocaleDateString()}`, className: 'valid' };
            }
        }

        return (
            <div key={doc.id} className={`document-card ${expiryInfo ? expiryInfo.className : ''}`}>
                <div className="doc-icon">
                    {doc.mime_type && doc.mime_type.startsWith('image/') ? '🖼️' :
                     doc.mime_type === 'application/pdf' ? '📄' :
                     doc.mime_type === 'text/plain' ? '📝' :
                     doc.mime_type && (doc.mime_type.includes('word') || doc.mime_type.includes('document')) ? '📝' :
                     doc.mime_type && (doc.mime_type.includes('excel') || doc.mime_type.includes('spreadsheet')) ? '📊' :
                     doc.mime_type && (doc.mime_type.includes('powerpoint') || doc.mime_type.includes('presentation')) ? '📽️' :
                     '📁'}
                </div>
                <div className="doc-info">
                    <h3>{doc.document_type}</h3>
                    {doc.category && (
                        <span className="category-tag" style={{ backgroundColor: doc.category.color }}>
                            {doc.category.name}
                        </span>
                    )}
                    <p className="filename">{doc.file_name}</p>
                    <p className="meta">
                        {activeTab === 'pending' && `Athlète ID: ${doc.athlete_id} • `}
                        Date: {new Date(doc.uploaded_at).toLocaleDateString()}
                        {doc.validation_status !== 'pending' && ` • Statut: ${doc.validation_status}`}
                        {doc.expiry_date && ` • Expire: ${new Date(doc.expiry_date).toLocaleDateString()}`}
                    </p>
                    {expiryInfo && (
                        <p className={`expiry-status ${expiryInfo.className}`}>
                            {expiryInfo.text}
                        </p>
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                        <div className="tags-container">
                            {doc.tags.map(tag => (
                                <span key={tag.id} className="doc-tag" style={{ backgroundColor: tag.color }}>
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}
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
                    <button
                        onClick={() => showDocumentVersions(doc)}
                        className="btn-download"
                        title="Versions"
                    >
                        📚
                    </button>
                    <button
                        onClick={() => showShareModal(doc)}
                        className="btn-download"
                        title="Partager"
                    >
                        🔗
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
                                title="Rejet"
                            >
                                Rejeter
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Fetch document versions
    const fetchDocumentVersions = async (documentId) => {
        try {
            const response = await documentAPI.getVersions(documentId);
            setDocumentVersions(response.data || []);
        } catch (error) {
            console.error("Error fetching document versions", error);
            notify.error("Erreur lors du chargement des versions du document");
        }
    };
    
    // Fetch document shares
    const fetchDocumentShares = async (documentId) => {
        try {
            const response = await documentAPI.getShares(documentId);
            setDocumentShares(response.data || []);
        } catch (error) {
            console.error("Error fetching document shares", error);
            notify.error("Erreur lors du chargement des partages du document");
        }
    };
    
    // Handle document sharing
    const handleShareDocument = async (e) => {
        e.preventDefault();
        if (!currentDocument || !shareData.shared_with) return;
        
        try {
            const response = await documentAPI.share(currentDocument.id, shareData);
            notify.success('Document partagé avec succès');
            setShareModalOpen(false);
            setShareData({
                shared_with: '',
                permission_level: 'view',
                notes: '',
                expires_at: ''
            });
            
            // Refresh shares
            fetchDocumentShares(currentDocument.id);
        } catch (error) {
            console.error("Share document error", error);
            notify.error("Erreur lors du partage du document");
        }
    };
    
    // Handle unsharing document
    const handleUnshareDocument = async (userId) => {
        if (!currentDocument) return;
        
        const confirmed = await confirm(
            'Retirer le partage pour cet utilisateur ?',
            {
                title: 'Retirer le partage',
                confirmText: 'Retirer',
                cancelText: 'Annuler',
                type: 'warning'
            }
        );
        
        if (!confirmed) return;
        
        try {
            await documentAPI.unshare(currentDocument.id, { user_id: userId });
            notify.success('Partage retiré avec succès');
            
            // Refresh shares
            fetchDocumentShares(currentDocument.id);
        } catch (error) {
            console.error("Unshare document error", error);
            notify.error("Erreur lors du retrait du partage");
        }
    };
    
    // Show share modal for a document
    const showShareModal = async (doc) => {
        setCurrentDocument(doc);
        await fetchDocumentShares(doc.id);
        setShareModalOpen(true);
    };
    
    // Hide share modal
    const hideShareModal = () => {
        setShareModalOpen(false);
        setCurrentDocument(null);
        setDocumentShares([]);
        setShareData({
            shared_with: '',
            permission_level: 'view',
            notes: '',
            expires_at: ''
        });
    };

    // Handle version upload
    const handleUploadVersion = async (e) => {
        e.preventDefault();
        if (!newVersionFile || !currentDocument) return;

        const formData = new FormData();
        formData.append('file', newVersionFile);
        formData.append('notes', newVersionNotes);

        try {
            await documentAPI.uploadVersion(currentDocument.id, formData);
            notify.success('Nouvelle version ajoutée avec succès');
            setVersionModalOpen(false);
            setNewVersionFile(null);
            setNewVersionNotes('');
            
            // Refresh versions
            fetchDocumentVersions(currentDocument.id);
        } catch (error) {
            console.error("Upload version error", error);
            notify.error("Erreur lors de l'ajout de la nouvelle version");
        }
    };

    // Show versions for a document
    const showDocumentVersions = async (doc) => {
        setCurrentDocument(doc);
        await fetchDocumentVersions(doc.id);
        setShowVersions(true);
    };

    // Hide versions view
    const hideDocumentVersions = () => {
        setShowVersions(false);
        setCurrentDocument(null);
        setDocumentVersions([]);
    };

    // Render version card
    const renderVersionCard = (version) => {
        return (
            <div key={version.id} className="document-card">
                <div className="doc-icon">
                    {version.mime_type && version.mime_type.startsWith('image/') ? '🖼️' :
                     version.mime_type === 'application/pdf' ? '📄' :
                     version.mime_type === 'text/plain' ? '📝' :
                     version.mime_type && (version.mime_type.includes('word') || version.mime_type.includes('document')) ? '📝' :
                     version.mime_type && (version.mime_type.includes('excel') || version.mime_type.includes('spreadsheet')) ? '📊' :
                     version.mime_type && (version.mime_type.includes('powerpoint') || version.mime_type.includes('presentation')) ? '📽️' :
                     '📁'}
                </div>
                <div className="doc-info">
                    <h3>Version {version.version_number}</h3>
                    <p className="filename">{version.file_name}</p>
                    <p className="meta">
                        Date: {new Date(version.uploaded_at).toLocaleDateString()}
                        {version.notes && ` • Note: ${version.notes}`}
                    </p>
                </div>
                <div className="doc-actions">
                    <button
                        onClick={() => handlePreview({...version, mime_type: version.mime_type, id: version.id})}
                        className="btn-download"
                        title="Aperçu"
                    >
                        Aperçu
                    </button>
                    <button
                        onClick={() => handleDownload(version.id)}
                        className="btn-download"
                        title="Télécharger"
                    >
                        ⬇️
                    </button>
                </div>
            </div>
        );
    };

    // Render preview content based on file type
    const renderPreviewContent = (doc) => {
        if (!doc.mime_type) {
            return <div>Type de fichier inconnu</div>;
        }

        // Image files
        if (doc.mime_type.startsWith('image/')) {
            return (
                <img
                    src={`${documentAPI.getDownloadUrl(doc.id)}?token=${localStorage.getItem('token')}`}
                    alt="Preview"
                    className="preview-image"
                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
            );
        }

        // PDF files
        if (doc.mime_type === 'application/pdf') {
            return (
                <iframe
                    src={`${documentAPI.getDownloadUrl(doc.id)}?token=${localStorage.getItem('token')}`}
                    className="preview-iframe"
                    title="PDF Preview"
                    style={{ width: '100%', height: '70vh', border: 'none' }}
                />
            );
        }

        // Text files
        if (doc.mime_type === 'text/plain') {
            return (
                <iframe
                    src={`${documentAPI.getDownloadUrl(doc.id)}?token=${localStorage.getItem('token')}`}
                    className="preview-iframe"
                    title="Text Preview"
                    style={{ width: '100%', height: '70vh', border: 'none' }}
                />
            );
        }

        // Office documents - show preview unavailable message with download option
        if (doc.mime_type.includes('word') || doc.mime_type.includes('excel') || 
            doc.mime_type.includes('powerpoint') || doc.mime_type.includes('document') ||
            doc.mime_type.includes('spreadsheet') || doc.mime_type.includes('presentation')) {
            return (
                <div className="office-preview-placeholder">
                    <div className="placeholder-icon">📄</div>
                    <h3>Aperçu non disponible</h3>
                    <p>Ce type de document nécessite une application spécifique pour être visualisé.</p>
                    <button 
                        className="btn-download"
                        onClick={() => handleDownload(doc.id)}
                        style={{ marginTop: '1rem' }}
                    >
                        Télécharger le document
                    </button>
                </div>
            );
        }

        // Default fallback
        return (
            <div className="default-preview-placeholder">
                <div className="placeholder-icon">📁</div>
                <h3>Aperçu non disponible</h3>
                <p>Le type de fichier n'est pas pris en charge pour l'aperçu.</p>
                <button 
                    className="btn-download"
                    onClick={() => handleDownload(doc.id)}
                    style={{ marginTop: '1rem' }}
                >
                    Télécharger le document
                </button>
            </div>
        );
    };

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
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-info">
                            <h3>Expirant Bientôt</h3>
                            <p className="stat-value">{stats.expiring}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">❌</div>
                        <div className="stat-info">
                            <h3>Expirés</h3>
                            <p className="stat-value">{stats.expired}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>Athlètes Actifs</h3>
                            <p className="stat-value">{stats.activeAthletes}</p>
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
                    className={`tab-btn ${activeTab === 'expiring' ? 'active' : ''}`}
                    onClick={() => handleTabChange('expiring')}
                >
                    Expirant Bientôt
                </button>
                <button
                    className={`tab-btn ${activeTab === 'expired' ? 'active' : ''}`}
                    onClick={() => handleTabChange('expired')}
                >
                    Expirés
                </button>
                <button
                    className={`tab-btn ${activeTab === 'archives' ? 'active' : ''}`}
                    onClick={() => handleTabChange('archives')}
                >
                    Archives par Athlète
                </button>
                <button
                    className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => {
                        handleTabChange('search');
                        setShowSearchView(true);
                    }}
                >
                    Recherche Avancée
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

            {/* Expiring Documents View */}
            {activeTab === 'expiring' && (
                <div className="documents-list">
                    {loading ? (
                        <div>Chargement...</div>
                    ) : expiringDocuments.length > 0 ? (
                        expiringDocuments.map(doc => renderDocumentCard(doc))
                    ) : (
                        <div className="empty-state">
                            <p>Aucun document n'expire dans les 30 prochains jours.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Expired Documents View */}
            {activeTab === 'expired' && (
                <div className="documents-list">
                    {loading ? (
                        <div>Chargement...</div>
                    ) : expiredDocuments.length > 0 ? (
                        expiredDocuments.map(doc => renderDocumentCard(doc))
                    ) : (
                        <div className="empty-state">
                            <p>Aucun document expiré.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Archives View */}
            {activeTab === 'archives' && !selectedAthlete && !showSearchView && (
                <>
                    {/* Search & Sort Controls */}
                    <div className="controls-bar">
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Rechercher un athlète (nom, email)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="sort-dropdown"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="name_asc">Nom (A-Z)</option>
                            <option value="name_desc">Nom (Z-A)</option>
                            <option value="date_newest">Plus récents</option>
                            <option value="date_oldest">Plus anciens</option>
                        </select>
                        <button
                            className="btn-add-doc"
                            onClick={() => setBulkUploadModalOpen(true)}
                            style={{ marginLeft: '1rem' }}
                        >
                            + Upload en Masse
                        </button>
                    </div>

                    <div className="athletes-grid">
                        {loading ? (
                            <div>Chargement...</div>
                        ) : filteredAthletes.length > 0 ? (
                            filteredAthletes.map(athlete => (
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
                </>
            )}

            {/* Search View */}
            {showSearchView && (
                <div className="search-view">
                    <div className="controls-bar">
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Rechercher par nom de fichier ou notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn-add-doc"
                            onClick={performSearch}
                        >
                            Rechercher
                        </button>
                    </div>

                    {/* Advanced Filters */}
                    <div className="filters-container">
                        <div className="filters">
                            <select
                                className="filter-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente</option>
                                <option value="approved">Validé</option>
                                <option value="rejected">Rejeté</option>
                            </select>
                            
                            <select
                                className="filter-select"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">Toutes catégories</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            
                            <select
                                className="filter-select"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="name_asc">Nom (A-Z)</option>
                                <option value="name_desc">Nom (Z-A)</option>
                                <option value="date_asc">Date (Ancien-Nouveau)</option>
                                <option value="date_desc">Date (Nouveau-Ancien)</option>
                                <option value="expiry_asc">Expiration (Proche-Lointain)</option>
                                <option value="expiry_desc">Expiration (Lointain-Proche)</option>
                            </select>
                        </div>
                        
                        <div className="filters">
                            <div className="tag-filters">
                                <span className="filter-label">Tags:</span>
                                {tags.map(tag => (
                                    <button
                                        key={tag.id}
                                        className={`filter-btn tag-filter ${filterTags.includes(tag.id) ? 'active' : ''}`}
                                        onClick={() => {
                                            const newFilters = filterTags.includes(tag.id) 
                                                ? filterTags.filter(id => id !== tag.id)
                                                : [...filterTags, tag.id];
                                            setFilterTags(newFilters);
                                        }}
                                        style={{ 
                                            backgroundColor: filterTags.includes(tag.id) ? tag.color : 'transparent',
                                            color: filterTags.includes(tag.id) ? 'white' : tag.color,
                                            borderColor: tag.color
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="documents-list">
                        {loading ? (
                            <div>Chargement...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map(doc => renderDocumentCard(doc, true))
                        ) : searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterTags.length > 0 ? (
                            <div className="empty-state">
                                <p>Aucun document trouvé avec ces critères.</p>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>Utilisez les filtres ci-dessus pour rechercher des documents.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Athlete Folder View */}
            {activeTab === 'archives' && selectedAthlete && (
                <div className="athlete-folder-view">
                    <div className="folder-header">
                        <div className="header-left">
                            <button onClick={handleBackToArchives} className="btn-back">
                                ← Retour aux athlètes
                            </button>
                            <h2>Dossier: {selectedAthlete.first_name} {selectedAthlete.last_name}</h2>
                        </div>
                        <button
                            className="btn-add-doc"
                            onClick={() => setUploadModalOpen(true)}
                        >
                            + Ajouter un document
                        </button>
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
                    <div className="filters-container">
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
                        
                        <div className="filters">
                            <select
                                className="filter-select"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">Toutes catégories</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            
                            <div className="tag-filters">
                                <span className="filter-label">Tags:</span>
                                {tags.map(tag => (
                                    <button
                                        key={tag.id}
                                        className={`filter-btn tag-filter ${filterTags.includes(tag.id) ? 'active' : ''}`}
                                        onClick={() => {
                                            const newFilters = filterTags.includes(tag.id) 
                                                ? filterTags.filter(id => id !== tag.id)
                                                : [...filterTags, tag.id];
                                            setFilterTags(newFilters);
                                        }}
                                        style={{ 
                                            backgroundColor: filterTags.includes(tag.id) ? tag.color : 'transparent',
                                            color: filterTags.includes(tag.id) ? 'white' : tag.color,
                                            borderColor: tag.color
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
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

            {/* Upload Modal */}
            {uploadModalOpen && (
                <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Ajouter un document pour {selectedAthlete.first_name}</h3>
                            <button className="btn-close" onClick={() => setUploadModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleUpload}>
                                <div className="form-group">
                                    <label>Type de document</label>
                                    <select
                                        value={uploadDocType}
                                        onChange={(e) => setUploadDocType(e.target.value)}
                                        required
                                    >
                                        {REQUIRED_DOCUMENTS.map(doc => (
                                            <option key={doc.type} value={doc.type}>{doc.label}</option>
                                        ))}
                                        <option value="other">Autre</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Catégorie (optionnel)</label>
                                    <select
                                        value={uploadCategory}
                                        onChange={(e) => setUploadCategory(e.target.value)}
                                    >
                                        <option value="">Sélectionner une catégorie</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Tags (optionnel)</label>
                                    <div className="tag-selection">
                                        {tags.map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                className={`tag-option ${uploadTags.includes(tag.id) ? 'selected' : ''}`}
                                                onClick={() => toggleTagSelection(tag.id)}
                                                style={{ 
                                                    backgroundColor: uploadTags.includes(tag.id) ? tag.color : 'transparent',
                                                    color: uploadTags.includes(tag.id) ? 'white' : tag.color,
                                                    borderColor: tag.color
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Date d'expiration (optionnel)</label>
                                    <input
                                        type="date"
                                        value={uploadExpiryDate}
                                        onChange={(e) => setUploadExpiryDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fichier</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes (Optionnel)</label>
                                    <textarea
                                        value={uploadNotes}
                                        onChange={(e) => setUploadNotes(e.target.value)}
                                        rows="3"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setUploadModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn-submit" disabled={!uploadFile || loading}>
                                        {loading ? 'Envoi...' : 'Ajouter'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {bulkUploadModalOpen && (
                <div className="modal-overlay" onClick={() => setBulkUploadModalOpen(false)}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Upload en Masse de Documents</h3>
                            <button className="btn-close" onClick={() => setBulkUploadModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleBulkUpload}>
                                <div className="form-group">
                                    <label>Type de document</label>
                                    <select
                                        value={bulkDocType}
                                        onChange={(e) => setBulkDocType(e.target.value)}
                                        required
                                    >
                                        {REQUIRED_DOCUMENTS.map(doc => (
                                            <option key={doc.type} value={doc.type}>{doc.label}</option>
                                        ))}
                                        <option value="other">Autre</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Catégorie (optionnel)</label>
                                    <select
                                        value={bulkCategory}
                                        onChange={(e) => setBulkCategory(e.target.value)}
                                    >
                                        <option value="">Sélectionner une catégorie</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Tags (optionnel)</label>
                                    <div className="tag-selection">
                                        {tags.map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                className={`tag-option ${bulkTags.includes(tag.id) ? 'selected' : ''}`}
                                                onClick={() => toggleTagSelection(tag.id, true)}
                                                style={{ 
                                                    backgroundColor: bulkTags.includes(tag.id) ? tag.color : 'transparent',
                                                    color: bulkTags.includes(tag.id) ? 'white' : tag.color,
                                                    borderColor: tag.color
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Date d'expiration (optionnel)</label>
                                    <input
                                        type="date"
                                        value={bulkExpiryDate}
                                        onChange={(e) => setBulkExpiryDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes (Optionnel)</label>
                                    <textarea
                                        value={bulkNotes}
                                        onChange={(e) => setBulkNotes(e.target.value)}
                                        rows="3"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Sélectionner les athlètes</label>
                                    <div className="bulk-athlete-selection">
                                        {athletes.map(athlete => {
                                            const isSelected = bulkSelectedAthletes.some(a => a.id === athlete.id);
                                            return (
                                                <div 
                                                    key={athlete.id} 
                                                    className={`bulk-athlete-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => toggleAthleteSelection(athlete)}
                                                >
                                                    <span className="athlete-name">{athlete.first_name} {athlete.last_name}</span>
                                                    {isSelected && (
                                                        <input
                                                            type="file"
                                                            onChange={(e) => handleBulkFileSelect(athlete.id, e.target.files[0])}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ marginLeft: '1rem' }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setBulkUploadModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn-submit" disabled={bulkSelectedAthletes.length === 0 || loading}>
                                        {loading ? 'Envoi...' : `Uploader (${bulkSelectedAthletes.length})`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Versions View */}
            {showVersions && currentDocument && (
                <div className="versions-view">
                    <div className="folder-header">
                        <div className="header-left">
                            <button onClick={hideDocumentVersions} className="btn-back">
                                ← Retour
                            </button>
                            <h2>Versions: {currentDocument.file_name}</h2>
                        </div>
                        <button
                            className="btn-add-doc"
                            onClick={() => setVersionModalOpen(true)}
                        >
                            + Nouvelle Version
                        </button>
                    </div>

                    <div className="documents-list">
                        {documentVersions.length > 0 ? (
                            documentVersions.map(version => renderVersionCard(version))
                        ) : (
                            <div className="empty-state">
                                <p>Aucune version trouvée pour ce document.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Version Upload Modal */}
            {versionModalOpen && (
                <div className="modal-overlay" onClick={() => setVersionModalOpen(false)}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Ajouter une nouvelle version</h3>
                            <button className="btn-close" onClick={() => setVersionModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleUploadVersion}>
                                <div className="form-group">
                                    <label>Fichier</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setNewVersionFile(e.target.files[0])}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes (Optionnel)</label>
                                    <textarea
                                        value={newVersionNotes}
                                        onChange={(e) => setNewVersionNotes(e.target.value)}
                                        rows="3"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setVersionModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn-submit" disabled={!newVersionFile || loading}>
                                        {loading ? 'Envoi...' : 'Ajouter Version'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
                        
            {/* Share Document Modal */}
            {shareModalOpen && (
                <div className="modal-overlay" onClick={hideShareModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>Partager le document</h3>
                            <button className="btn-close" onClick={hideShareModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleShareDocument}>
                                <div className="form-group">
                                    <label>Partager avec (ID utilisateur)</label>
                                    <input
                                        type="number"
                                        value={shareData.shared_with}
                                        onChange={(e) => setShareData({...shareData, shared_with: e.target.value})}
                                        required
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Niveau de permission</label>
                                    <select
                                        value={shareData.permission_level}
                                        onChange={(e) => setShareData({...shareData, permission_level: e.target.value})}
                                        className="form-control"
                                    >
                                        <option value="view">Vue seulement</option>
                                        <option value="edit">Édition</option>
                                        <option value="manage">Gestion complète</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date d'expiration (optionnel)</label>
                                    <input
                                        type="date"
                                        value={shareData.expires_at}
                                        onChange={(e) => setShareData({...shareData, expires_at: e.target.value})}
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes (Optionnel)</label>
                                    <textarea
                                        value={shareData.notes}
                                        onChange={(e) => setShareData({...shareData, notes: e.target.value})}
                                        rows="3"
                                        className="form-control"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={hideShareModal}>Annuler</button>
                                    <button type="submit" className="btn-submit">
                                        Partager
                                    </button>
                                </div>
                            </form>
                                        
                            {/* Existing Shares */}
                            {documentShares.length > 0 && (
                                <div className="mt-4">
                                    <h4>Partages actifs</h4>
                                    <div className="shares-list">
                                        {documentShares.map(share => (
                                            <div key={share.id} className="share-item">
                                                <div className="share-info">
                                                    <p><strong>Utilisateur ID:</strong> {share.shared_with}</p>
                                                    <p><strong>Permission:</strong> {share.permission_level}</p>
                                                    {share.expires_at && <p><strong>Expire le:</strong> {new Date(share.expires_at).toLocaleDateString()}</p>}
                                                    {share.notes && <p><strong>Notes:</strong> {share.notes}</p>}
                                                    <p><small>Partagé le: {new Date(share.shared_at).toLocaleDateString()}</small></p>
                                                </div>
                                                <button 
                                                    className="btn-reject"
                                                    onClick={() => handleUnshareDocument(share.shared_with)}
                                                    style={{ minWidth: 'auto', padding: '0.25rem 0.5rem' }}
                                                >
                                                    Retirer
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
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
                            {renderPreviewContent(previewDoc)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;