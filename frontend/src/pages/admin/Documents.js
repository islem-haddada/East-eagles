import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { documentAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Documents.css';

const Documents = () => {
    const { t, i18n } = useTranslation();
    const notify = useNotification();
    const confirm = useConfirm();

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'fr-FR';

    // Required Documents list
    const REQUIRED_DOCUMENTS = [
        { type: 'medical_certificate', labelKey: 'doc_medical_certificate' },
        { type: 'insurance', labelKey: 'doc_insurance' },
        { type: 'id_card', labelKey: 'doc_id_card' },
        { type: 'identity_card', labelKey: 'doc_id_card' }, // Legacy
        { type: 'photo', labelKey: 'doc_photo' },
        { type: 'parental_consent', labelKey: 'doc_parental_consent' }
    ];

    const getDocumentLabel = (type) => {
        const found = REQUIRED_DOCUMENTS.find(d => d.type === type);
        if (found) {
            return t(`admin_documents.${found.labelKey}`);
        }
        return type.replace(/_/g, ' ');
    };

    // State
    const [activeTab, setActiveTab] = useState('pending');
    const [documents, setDocuments] = useState([]);
    const [expiringDocuments, setExpiringDocuments] = useState([]);
    const [expiredDocuments, setExpiredDocuments] = useState([]);
    const [athletes, setAthletes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedAthlete, setSelectedAthlete] = useState(null);
    const [athleteDocuments, setAthleteDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Advanced Features State
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterTags, setFilterTags] = useState([]);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('name_asc');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchView, setShowSearchView] = useState(false);

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
            notify.success(t('common.success'));
            setUploadModalOpen(false);
            setUploadFile(null);
            setUploadCategory('');
            setUploadTags([]);
            setUploadExpiryDate('');
            setUploadNotes('');
            fetchAthleteDocuments(selectedAthlete.id);
        } catch (error) {
            console.error("Upload error", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (bulkSelectedAthletes.length === 0 || Object.keys(bulkFiles).length === 0) {
            notify.error(t('admin_documents.msg_select_athlete_file'));
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

        const athleteIds = bulkSelectedAthletes.map(a => a.id).join(',');
        formData.append('athlete_ids', athleteIds);

        Object.keys(bulkFiles).forEach(athleteId => {
            formData.append(`file_${athleteId}`, bulkFiles[athleteId]);
        });

        try {
            setLoading(true);
            const response = await documentAPI.uploadBulk(formData);
            const results = response.data;

            const successCount = results.filter(r => !r.error).length;
            const errorCount = results.filter(r => r.error).length;

            if (successCount > 0) {
                notify.success(t('admin_documents.msg_bulk_success', { count: successCount }));
            }

            if (errorCount > 0) {
                notify.error(t('admin_documents.msg_bulk_error', { count: errorCount }));
            }

            setBulkUploadModalOpen(false);
            setBulkSelectedAthletes([]);
            setBulkFiles({});
            setBulkCategory('');
            setBulkTags([]);
            setBulkExpiryDate('');
            setBulkNotes('');

            if (activeTab === 'pending') {
                fetchPendingDocuments();
            }
        } catch (error) {
            console.error("Bulk upload error", error);
            notify.error(t('admin_documents.msg_bulk_fail'));
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentAPI.getPending();
            setDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching pending documents", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiringDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentAPI.getExpiring();
            setExpiringDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching expiring documents", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiredDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentAPI.getExpired();
            setExpiredDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching expired documents", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const fetchAthletes = async () => {
        try {
            setLoading(true);
            const response = await athleteAPI.getAll();
            setAthletes(response.data || []);
        } catch (error) {
            console.error("Error fetching athletes", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await documentAPI.getCategories();
            setCategories(response.data || []);
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await documentAPI.getTags();
            setTags(response.data || []);
        } catch (error) {
            console.error("Error fetching tags", error);
        }
    };

    const fetchAthleteDocuments = async (athleteId) => {
        try {
            setLoading(true);
            const response = await documentAPI.getByAthlete(athleteId);
            setAthleteDocuments(response.data || []);
        } catch (error) {
            console.error("Error fetching athlete documents", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const performSearch = async () => {
        if (!searchTerm && filterCategory === 'all' && filterStatus === 'all' && filterTags.length === 0) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const params = {};

            if (searchTerm) params.search = searchTerm;
            if (filterCategory !== 'all') params.category_id = filterCategory;
            if (filterStatus !== 'all') params.status = filterStatus;
            if (filterTags.length > 0) params.tag_ids = filterTags.join(',');
            params.sort = sortOrder;

            const response = await documentAPI.search(params);
            setSearchResults(response.data || []);
        } catch (error) {
            console.error("Error performing search", error);
            notify.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingDocuments();
        fetchExpiringDocuments();
        fetchExpiredDocuments();
        fetchAthletes();
        fetchCategories();
        fetchTags();
    }, []);

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

    const handleAthleteClick = (athlete) => {
        setSelectedAthlete(athlete);
        fetchAthleteDocuments(athlete.id);
    };

    const handleBackToArchives = () => {
        setSelectedAthlete(null);
        setAthleteDocuments([]);
    };

    const toggleAthleteSelection = (athlete) => {
        const isSelected = bulkSelectedAthletes.some(a => a.id === athlete.id);
        if (isSelected) {
            setBulkSelectedAthletes(bulkSelectedAthletes.filter(a => a.id !== athlete.id));
        } else {
            setBulkSelectedAthletes([...bulkSelectedAthletes, athlete]);
        }
    };

    const handleBulkFileSelect = (athleteId, file) => {
        setBulkFiles(prev => ({
            ...prev,
            [athleteId]: file
        }));
    };

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
            t('admin_documents.msg_validate'),
            {
                title: t('admin_documents.btn_validate'),
                confirmText: t('admin_documents.btn_validate'),
                cancelText: t('common.cancel'),
                type: 'info'
            }
        );
        if (!confirmed) return;
        try {
            await documentAPI.validate(id);
            notify.success(t('common.success'));
            if (activeTab === 'pending') fetchPendingDocuments();
            else if (activeTab === 'expiring') fetchExpiringDocuments();
            else if (activeTab === 'expired') fetchExpiredDocuments();
            else if (selectedAthlete) fetchAthleteDocuments(selectedAthlete.id);
            else if (showSearchView) performSearch();
        } catch (error) {
            notify.error(t('common.error'));
        }
    };

    const handleReject = async (id) => {
        const reason = prompt(t('admin_documents.msg_reject'));
        if (reason === null) return;
        try {
            await documentAPI.reject(id, reason);
            notify.success(t('common.success'));
            if (activeTab === 'pending') fetchPendingDocuments();
            else if (activeTab === 'expiring') fetchExpiringDocuments();
            else if (activeTab === 'expired') fetchExpiredDocuments();
            else if (selectedAthlete) fetchAthleteDocuments(selectedAthlete.id);
            else if (showSearchView) performSearch();
        } catch (error) {
            notify.error(t('common.error'));
        }
    };

    const handleDownload = (id) => {
        const token = localStorage.getItem('token');
        const url = `${documentAPI.getDownloadUrl(id)}?token=${token}`;
        window.open(url, '_blank');
    };

    const handlePreview = (doc) => {
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
            handleDownload(doc.id);
        }
    };

    const getComplianceStatus = () => {
        if (!selectedAthlete || !athleteDocuments) return { score: 0, missing: [] };

        const uploadedTypes = new Set(
            athleteDocuments
                .filter(d => d.validation_status === 'approved' || d.validation_status === 'pending')
                .map(d => d.document_type)
        );

        const missing = REQUIRED_DOCUMENTS.filter(req => {
            return !uploadedTypes.has(req.type);
        });

        const score = Math.round(((REQUIRED_DOCUMENTS.length - missing.length) / REQUIRED_DOCUMENTS.length) * 100);

        return { score, missing };
    };

    const compliance = getComplianceStatus();

    const filteredDocuments = athleteDocuments.filter(doc => {
        if (filterStatus !== 'all' && doc.validation_status !== filterStatus) return false;
        if (filterCategory !== 'all' && (!doc.category || doc.category.id.toString() !== filterCategory)) return false;
        if (filterTags.length > 0) {
            const docTagIds = doc.tags ? doc.tags.map(t => t.id) : [];
            return filterTags.every(tagId => docTagIds.includes(tagId));
        }
        return true;
    });

    const getFilteredAthletes = () => {
        let filtered = [...athletes];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(a =>
                a.first_name.toLowerCase().includes(lowerTerm) ||
                a.last_name.toLowerCase().includes(lowerTerm) ||
                a.email.toLowerCase().includes(lowerTerm)
            );
        }
        filtered.sort((a, b) => {
            switch (sortOrder) {
                case 'name_asc': return a.last_name.localeCompare(b.last_name);
                case 'name_desc': return b.last_name.localeCompare(a.last_name);
                case 'date_newest': return new Date(b.created_at) - new Date(a.created_at);
                case 'date_oldest': return new Date(a.created_at) - new Date(b.created_at);
                default: return 0;
            }
        });
        return filtered;
    };

    const filteredAthletes = getFilteredAthletes();

    const stats = {
        pending: documents.length,
        expiring: expiringDocuments.length,
        expired: expiredDocuments.length,
        totalAthletes: athletes.length,
        activeAthletes: athletes.filter(a => a.is_active).length
    };

    const renderDocumentCard = (doc, showActions = true) => {
        let expiryInfo = null;
        if (doc.expiry_date) {
            const expiryDate = new Date(doc.expiry_date);
            const today = new Date();
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (daysUntilExpiry < 0) {
                expiryInfo = { text: t('admin_documents.status_expired'), className: 'expired' };
            } else if (daysUntilExpiry <= 30) {
                expiryInfo = { text: `${t('admin_documents.status_expiring')} (${daysUntilExpiry}j)`, className: 'expiring' };
            } else {
                expiryInfo = { text: `${t('admin_documents.label_expiry')}: ${expiryDate.toLocaleDateString(locale)}`, className: 'valid' };
            }
        }

        return (
            <div key={doc.id} className={`document-card ${expiryInfo ? expiryInfo.className : ''}`}>
                <div className="doc-icon">
                    {doc.mime_type && doc.mime_type.startsWith('image/') ? '🖼️' :
                        doc.mime_type === 'application/pdf' ? '📄' : '📁'}
                </div>
                <div className="doc-info">
                    <h3>{getDocumentLabel(doc.document_type)}</h3>
                    {doc.category && (
                        <span className="category-tag" style={{ backgroundColor: doc.category.color }}>
                            {doc.category.name}
                        </span>
                    )}
                    <p className="filename">{doc.file_name}</p>
                    <p className="meta">
                        {activeTab === 'pending' && `${t('admin_documents.label_athlete')} ID: ${doc.athlete_id} • `}
                        {t('admin_payments.th_date')}: {new Date(doc.uploaded_at).toLocaleDateString(locale)}
                        {doc.validation_status !== 'pending' && ` • ${t('admin_athletes.th_status')}: ${t(`admin_documents.status_${doc.validation_status}`) || doc.validation_status}`}
                    </p>
                    {expiryInfo && (
                        <p className={`expiry-status ${expiryInfo.className}`}>{expiryInfo.text}</p>
                    )}
                    {doc.notes && <p className="notes">{t('admin_documents.label_notes')}: {doc.notes}</p>}
                </div>
                <div className="doc-actions">
                    <button onClick={() => handlePreview(doc)} className="btn-download" title={t('admin_documents.btn_preview')}>
                        {t('admin_documents.btn_preview')}
                    </button>
                    <button onClick={() => handleDownload(doc.id)} className="btn-download" title={t('admin_documents.btn_download')}>
                        ⬇️
                    </button>
                    <button onClick={() => showDocumentVersions(doc)} className="btn-download" title={t('admin_documents.btn_versions')}>
                        📚
                    </button>
                    <button onClick={() => showShareModal(doc)} className="btn-download" title={t('admin_documents.btn_share')}>
                        🔗
                    </button>
                    {doc.validation_status === 'pending' && showActions && (
                        <>
                            <button onClick={() => handleValidate(doc.id)} className="btn-validate" title={t('admin_documents.btn_validate')}>
                                {t('admin_documents.btn_validate')}
                            </button>
                            <button onClick={() => handleReject(doc.id)} className="btn-reject" title={t('admin_documents.btn_reject')}>
                                {t('admin_documents.btn_reject')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const fetchDocumentVersions = async (documentId) => {
        try {
            const response = await documentAPI.getVersions(documentId);
            setDocumentVersions(response.data || []);
        } catch (error) {
            console.error("Error fetching document versions", error);
            notify.error(t('common.error'));
        }
    };

    const fetchDocumentShares = async (documentId) => {
        try {
            const response = await documentAPI.getShares(documentId);
            setDocumentShares(response.data || []);
        } catch (error) {
            console.error("Error fetching document shares", error);
        }
    };

    const handleShareDocument = async (e) => {
        e.preventDefault();
        if (!currentDocument || !shareData.shared_with) return;

        try {
            await documentAPI.share(currentDocument.id, shareData);
            notify.success(t('common.success'));
            setShareModalOpen(false);
            setShareData({ shared_with: '', permission_level: 'view', notes: '', expires_at: '' });
            fetchDocumentShares(currentDocument.id);
        } catch (error) {
            console.error("Share document error", error);
            notify.error(t('common.error'));
        }
    };

    const handleUnshareDocument = async (userId) => {
        if (!currentDocument) return;
        const confirmed = await confirm(
            t('admin_documents.msg_delete_share'),
            {
                title: t('admin_documents.btn_share'),
                confirmText: t('common.delete'),
                cancelText: t('common.cancel'),
                type: 'warning'
            }
        );
        if (!confirmed) return;

        try {
            await documentAPI.unshare(currentDocument.id, { user_id: userId });
            notify.success(t('common.success'));
            fetchDocumentShares(currentDocument.id);
        } catch (error) {
            console.error("Unshare document error", error);
            notify.error(t('common.error'));
        }
    };

    const showShareModal = async (doc) => {
        setCurrentDocument(doc);
        await fetchDocumentShares(doc.id);
        setShareModalOpen(true);
    };

    const handleUploadVersion = async (e) => {
        e.preventDefault();
        if (!newVersionFile || !currentDocument) return;

        const formData = new FormData();
        formData.append('file', newVersionFile);
        formData.append('notes', newVersionNotes);

        try {
            await documentAPI.uploadVersion(currentDocument.id, formData);
            notify.success(t('common.success'));
            setVersionModalOpen(false);
            setNewVersionFile(null);
            setNewVersionNotes('');
            fetchDocumentVersions(currentDocument.id);
        } catch (error) {
            console.error("Upload version error", error);
            notify.error(t('common.error'));
        }
    };

    const showDocumentVersions = async (doc) => {
        setCurrentDocument(doc);
        await fetchDocumentVersions(doc.id);
        setShowVersions(true);
    };

    const hideDocumentVersions = () => {
        setShowVersions(false);
        setCurrentDocument(null);
        setDocumentVersions([]);
    };

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

    const renderVersionCard = (version) => {
        return (
            <div key={version.id} className="document-card">
                <div className="doc-icon">
                    {version.mime_type && version.mime_type.startsWith('image/') ? '🖼️' :
                        version.mime_type === 'application/pdf' ? '📄' : '📁'}
                </div>
                <div className="doc-info">
                    <h3>{t('admin_documents.label_version')} {version.version_number}</h3>
                    <p className="filename">{version.file_name}</p>
                    <p className="meta">
                        {t('admin_payments.th_date')}: {new Date(version.uploaded_at).toLocaleDateString(locale)}
                        {version.notes && ` • Note: ${version.notes}`}
                    </p>
                </div>
                <div className="doc-actions">
                    <button onClick={() => handlePreview({ ...version, mime_type: version.mime_type, id: version.id })} className="btn-download" title={t('admin_documents.btn_preview')}>
                        {t('admin_documents.btn_preview')}
                    </button>
                    <button onClick={() => handleDownload(version.id)} className="btn-download" title={t('admin_documents.btn_download')}>
                        ⬇️
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="documents-page">
            <div className="page-header">
                <h1>{t('admin_documents.title')}</h1>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📄</div>
                        <div className="stat-info">
                            <h3>{t('admin_documents.title_pending')}</h3>
                            <p className="stat-value">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-info">
                            <h3>{t('admin_documents.title_expiring')}</h3>
                            <p className="stat-value">{stats.expiring}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">❌</div>
                        <div className="stat-info">
                            <h3>{t('admin_documents.title_expired')}</h3>
                            <p className="stat-value">{stats.expired}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{t('admin_documents.title_active_athletes')}</h3>
                            <p className="stat-value">{stats.activeAthletes}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => handleTabChange('pending')}>
                    {t('admin_documents.tab_pending')}
                </button>
                <button className={`tab-btn ${activeTab === 'expiring' ? 'active' : ''}`} onClick={() => handleTabChange('expiring')}>
                    {t('admin_documents.tab_expiring')}
                </button>
                <button className={`tab-btn ${activeTab === 'expired' ? 'active' : ''}`} onClick={() => handleTabChange('expired')}>
                    {t('admin_documents.tab_expired')}
                </button>
                <button className={`tab-btn ${activeTab === 'archives' ? 'active' : ''}`} onClick={() => handleTabChange('archives')}>
                    {t('admin_documents.tab_archives')}
                </button>
                <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => { handleTabChange('search'); setShowSearchView(true); }}>
                    {t('admin_documents.tab_search')}
                </button>
            </div>

            {activeTab === 'pending' && (
                <div className="documents-list">
                    {loading ? <div>{t('common.loading')}</div> : documents.length > 0 ? documents.map(doc => renderDocumentCard(doc)) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                </div>
            )}

            {activeTab === 'expiring' && (
                <div className="documents-list">
                    {loading ? <div>{t('common.loading')}</div> : expiringDocuments.length > 0 ? expiringDocuments.map(doc => renderDocumentCard(doc)) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                </div>
            )}

            {activeTab === 'expired' && (
                <div className="documents-list">
                    {loading ? <div>{t('common.loading')}</div> : expiredDocuments.length > 0 ? expiredDocuments.map(doc => renderDocumentCard(doc)) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                </div>
            )}

            {activeTab === 'archives' && !selectedAthlete && !showSearchView && (
                <>
                    <div className="controls-bar">
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input type="text" className="search-input" placeholder={t('admin_documents.placeholder_search_athlete')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <select className="sort-dropdown" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="name_asc">{t('admin_documents.sort_name_asc')}</option>
                            <option value="name_desc">{t('admin_documents.sort_name_desc')}</option>
                            <option value="date_newest">{t('admin_documents.sort_date_newest')}</option>
                            <option value="date_oldest">{t('admin_documents.sort_date_oldest')}</option>
                        </select>
                        <button className="btn-add-doc" onClick={() => setBulkUploadModalOpen(true)} style={{ marginLeft: '1rem' }}>
                            + {t('admin_documents.btn_bulk_upload')}
                        </button>
                    </div>

                    <div className="athletes-grid">
                        {loading ? <div>{t('common.loading')}</div> : filteredAthletes.length > 0 ? filteredAthletes.map(athlete => (
                            <div key={athlete.id} className="athlete-folder-card" onClick={() => handleAthleteClick(athlete)}>
                                <span className="folder-icon">📁</span>
                                <h3>{athlete.first_name} {athlete.last_name}</h3>
                                <p>{athlete.email}</p>
                            </div>
                        )) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                    </div>
                </>
            )}

            {showSearchView && (
                <div className="search-view">
                    <div className="controls-bar">
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input type="text" className="search-input" placeholder={t('admin_documents.placeholder_search_file')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <button className="btn-add-doc" onClick={performSearch}>{t('common.search')}</button>
                    </div>

                    <div className="filters-container">
                        <div className="filters">
                            <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="all">{t('admin_documents.filter_all_status')}</option>
                                <option value="pending">{t('admin_documents.filter_pending')}</option>
                                <option value="approved">{t('admin_documents.filter_approved')}</option>
                                <option value="rejected">{t('admin_documents.filter_rejected')}</option>
                            </select>
                            <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                <option value="all">{t('admin_documents.filter_all_categories')}</option>
                                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="documents-list">
                        {loading ? <div>{t('common.loading')}</div> : searchResults.length > 0 ? searchResults.map(doc => renderDocumentCard(doc, true)) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                    </div>
                </div>
            )}

            {activeTab === 'archives' && selectedAthlete && (
                <div className="athlete-folder-view">
                    <div className="folder-header">
                        <div className="header-left">
                            <button onClick={handleBackToArchives} className="btn-back">← {t('admin_documents.back_to_archives')}</button>
                            <h2>{t('admin_documents.folder')} {selectedAthlete.first_name} {selectedAthlete.last_name}</h2>
                        </div>
                        <button className="btn-add-doc" onClick={() => setUploadModalOpen(true)}>+ {t('admin_documents.btn_add')}</button>
                    </div>

                    <div className="compliance-section">
                        <div className="compliance-header">
                            <h3>{t('admin_documents.folder_status')}</h3>
                            <span className="compliance-score">{compliance.score}% {t('admin_documents.compliance')}</span>
                        </div>
                        <div className="progress-bar">
                            <div className={`progress-fill ${compliance.score < 100 ? 'incomplete' : ''}`} style={{ width: `${compliance.score}%` }}></div>
                        </div>
                        {compliance.missing.length > 0 ? (
                            <div className="missing-docs">
                                <h4>{t('admin_documents.missing_docs')}</h4>
                                {compliance.missing.map((doc, index) => (
                                    <div key={index} className="missing-doc-item">
                                        <span className="missing-icon">⚠️</span>
                                        <span>{t(`admin_documents.${doc.labelKey}`)} {t('admin_documents.is_required')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="missing-doc-item" style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)', background: 'rgba(76, 175, 80, 0.1)' }}>
                                <span className="missing-icon">✅</span>
                                <span>{t('admin_documents.folder_complete')}</span>
                            </div>
                        )}
                    </div>

                    <div className="documents-list">
                        {loading ? <div>{t('common.loading')}</div> : filteredDocuments.length > 0 ? filteredDocuments.map(doc => renderDocumentCard(doc, true)) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                    </div>
                </div>
            )}

            {uploadModalOpen && (
                <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('admin_documents.modal_upload_title')} {selectedAthlete?.first_name}</h3>
                            <button className="btn-close" onClick={() => setUploadModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleUpload}>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_type')}</label>
                                    <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} required>
                                        {REQUIRED_DOCUMENTS.map(doc => (
                                            <option key={doc.type} value={doc.type}>{t(`admin_documents.${doc.labelKey}`)}</option>
                                        ))}
                                        <option value="other">{t('admin_documents.doc_other')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_category')}</label>
                                    <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                                        <option value="">{t('admin_documents.placeholder_select_category')}</option>
                                        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_tags')}</label>
                                    <div className="tag-selection">
                                        {tags.map(tag => (
                                            <button key={tag.id} type="button" className={`tag-option ${uploadTags.includes(tag.id) ? 'selected' : ''}`} onClick={() => toggleTagSelection(tag.id)} style={{ backgroundColor: uploadTags.includes(tag.id) ? tag.color : 'transparent', color: uploadTags.includes(tag.id) ? 'white' : tag.color, borderColor: tag.color }}>
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_expiry')}</label>
                                    <input type="date" value={uploadExpiryDate} onChange={(e) => setUploadExpiryDate(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_file')}</label>
                                    <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_notes')}</label>
                                    <textarea value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} rows="3" />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setUploadModalOpen(false)}>{t('common.cancel')}</button>
                                    <button type="submit" className="btn-submit" disabled={!uploadFile || loading}>{loading ? t('common.loading') : t('common.save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {bulkUploadModalOpen && (
                <div className="modal-overlay" onClick={() => setBulkUploadModalOpen(false)}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>{t('admin_documents.modal_bulk_upload_title')}</h3>
                            <button className="btn-close" onClick={() => setBulkUploadModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleBulkUpload}>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_type')}</label>
                                    <select value={bulkDocType} onChange={(e) => setBulkDocType(e.target.value)} required>
                                        {REQUIRED_DOCUMENTS.map(doc => <option key={doc.type} value={doc.type}>{t(`admin_documents.${doc.labelKey}`)}</option>)}
                                        <option value="other">{t('admin_documents.doc_other')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_select_athletes')}</label>
                                    <div className="bulk-athlete-selection">
                                        {athletes.map(athlete => {
                                            const isSelected = bulkSelectedAthletes.some(a => a.id === athlete.id);
                                            return (
                                                <div key={athlete.id} className={`bulk-athlete-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleAthleteSelection(athlete)}>
                                                    <span className="athlete-name">{athlete.first_name} {athlete.last_name}</span>
                                                    {isSelected && <input type="file" onChange={(e) => handleBulkFileSelect(athlete.id, e.target.files[0])} onClick={(e) => e.stopPropagation()} style={{ marginLeft: '1rem' }} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setBulkUploadModalOpen(false)}>{t('common.cancel')}</button>
                                    <button type="submit" className="btn-submit" disabled={bulkSelectedAthletes.length === 0 || loading}>{loading ? t('common.loading') : t('common.save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showVersions && currentDocument && (
                <div className="versions-view">
                    <div className="folder-header">
                        <div className="header-left">
                            <button onClick={hideDocumentVersions} className="btn-back">← {t('common.back')}</button>
                            <h2>{t('admin_documents.versions')} {currentDocument.file_name}</h2>
                        </div>
                        <button className="btn-add-doc" onClick={() => setVersionModalOpen(true)}>+ {t('admin_documents.btn_add_version')}</button>
                    </div>
                    <div className="documents-list">
                        {documentVersions.length > 0 ? documentVersions.map(version => renderVersionCard(version)) : <div className="empty-state"><p>{t('common.none')}</p></div>}
                    </div>
                </div>
            )}

            {versionModalOpen && (
                <div className="modal-overlay" onClick={() => setVersionModalOpen(false)}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('admin_documents.modal_version_title')}</h3>
                            <button className="btn-close" onClick={() => setVersionModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleUploadVersion}>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_file')}</label>
                                    <input type="file" onChange={(e) => setNewVersionFile(e.target.files[0])} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_notes')}</label>
                                    <textarea value={newVersionNotes} onChange={(e) => setNewVersionNotes(e.target.value)} rows="3" />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setVersionModalOpen(false)}>{t('common.cancel')}</button>
                                    <button type="submit" className="btn-submit" disabled={!newVersionFile || loading}>{loading ? t('common.loading') : t('common.save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {shareModalOpen && currentDocument && (
                <div className="modal-overlay" onClick={hideShareModal}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('admin_documents.modal_share_title')}</h3>
                            <button className="btn-close" onClick={hideShareModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleShareDocument}>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_shared_with')}</label>
                                    <input type="email" placeholder="Email" value={shareData.shared_with} onChange={(e) => setShareData({ ...shareData, shared_with: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('admin_documents.label_permission')}</label>
                                    <select value={shareData.permission_level} onChange={(e) => setShareData({ ...shareData, permission_level: e.target.value })}>
                                        <option value="view">{t('admin_documents.perm_view')}</option>
                                        <option value="download">{t('admin_documents.perm_download')}</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={hideShareModal}>{t('common.cancel')}</button>
                                    <button type="submit" className="btn-submit">{t('admin_documents.btn_share')}</button>
                                </div>
                            </form>
                            <div className="shares-list">
                                <h4>{t('admin_documents.shares_list')}</h4>
                                {documentShares.length > 0 ? (
                                    <ul>
                                        {documentShares.map(share => (
                                            <li key={share.user_id}>
                                                {share.user_email} ({share.permission_level})
                                                <button onClick={() => handleUnshareDocument(share.user_id)} className="btn-delete-share">×</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p>{t('common.none')}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewDoc && (
                <div className="modal-overlay preview-overlay" onClick={() => setPreviewDoc(null)}>
                    <div className="modal-content preview-content" onClick={e => e.stopPropagation()}>
                        <button className="btn-close-preview" onClick={() => setPreviewDoc(null)}>×</button>
                        {previewDoc.mime_type.startsWith('image/') ? (
                            <img src={`${documentAPI.getDownloadUrl(previewDoc.id)}?token=${localStorage.getItem('token')}`} alt="Preview" className="preview-image" />
                        ) : previewDoc.mime_type === 'application/pdf' ? (
                            <iframe src={`${documentAPI.getDownloadUrl(previewDoc.id)}?token=${localStorage.getItem('token')}`} className="preview-iframe" title="PDF Preview" />
                        ) : (
                            <p>{t('admin_documents.preview_unavailable')}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;