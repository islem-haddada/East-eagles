import React, { useState, useEffect } from 'react';
import { memberAPI, eventAPI, announcementAPI, API_BASE_URL } from '../services/api';
import * as XLSX from 'xlsx';
import './Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load data on tab change
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'members') {
        const data = await memberAPI.getAll();
        setMembers(data || []);
      } else if (activeTab === 'events') {
        const data = await eventAPI.getAll();
        setEvents(data || []);
      } else if (activeTab === 'announcements') {
        const data = await announcementAPI.getAll();
        setAnnouncements(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erreur lors du chargement des données');
    }
    setLoading(false);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');
      if (activeTab === 'members') {
        await fetch(`${API_BASE_URL}/members/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
      } else if (activeTab === 'events') {
        await fetch(`${API_BASE_URL}/events/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
      } else if (activeTab === 'announcements') {
        await fetch(`${API_BASE_URL}/announcements/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
      }
      setEditingId(null);
      setSuccess('Élément modifié avec succès');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleAdd = async () => {
    try {
      setError('');
      setSuccess('');
      if (activeTab === 'members') {
        await memberAPI.create(newForm);
      } else if (activeTab === 'events') {
        await eventAPI.create(newForm);
      } else if (activeTab === 'announcements') {
        await announcementAPI.create(newForm);
      }
      setNewForm({});
      setShowAddForm(false);
      setSuccess('Élément ajouté avec succès');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      console.error('Error adding:', error);
      setError(error.message || 'Erreur lors de l\'ajout');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ?')) return;

    try {
      setError('');
      setSuccess('');
      if (activeTab === 'members') {
        await fetch(`${API_BASE_URL}/members/${id}`, { method: 'DELETE' });
      } else if (activeTab === 'events') {
        await fetch(`${API_BASE_URL}/events/${id}`, { method: 'DELETE' });
      } else if (activeTab === 'announcements') {
        await fetch(`${API_BASE_URL}/announcements/${id}`, { method: 'DELETE' });
      }
      setSuccess('Élément supprimé avec succès');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const exportToExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(members);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Membres');
      XLSX.writeFile(wb, `membres_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSuccess('Export Excel réussi');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Erreur lors de l\'export');
    }
  };

  return (
    <div className="admin-container">
      <h1>🔧 Panel d'Administration</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Membres ({members.length})
        </button>
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📅 Événements ({events.length})
        </button>
        <button
          className={`tab ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          📢 Annonces ({announcements.length})
        </button>
      </div>

      {loading && <p className="loading">Chargement...</p>}

      {/* Members Tab */}
      {activeTab === 'members' && !loading && (
        <div className="admin-content">
          <div className="content-header">
            <h2>Gestion des Membres</h2>
            <div className="header-actions">
              <button onClick={() => setShowAddForm(!showAddForm)} className="btn-add">
                {showAddForm ? '✕ Annuler' : '+ Ajouter un membre'}
              </button>
              <button onClick={exportToExcel} className="btn-export">
                📥 Exporter Excel
              </button>
            </div>
          </div>

          {showAddForm && (
            <div className="form-container">
              <h3>Ajouter un nouveau membre</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" value={newForm.first_name || ''} onChange={(e) => setNewForm({ ...newForm, first_name: e.target.value })} placeholder="Prénom" />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" value={newForm.last_name || ''} onChange={(e) => setNewForm({ ...newForm, last_name: e.target.value })} placeholder="Nom" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={newForm.email || ''} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} placeholder="Email" />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" value={newForm.phone || ''} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} placeholder="Téléphone" />
                </div>
                <div className="form-group">
                  <label>ID Étudiant</label>
                  <input type="text" value={newForm.student_id || ''} onChange={(e) => setNewForm({ ...newForm, student_id: e.target.value })} placeholder="ID Étudiant" />
                </div>
                <div className="form-group">
                  <label>Filière</label>
                  <input type="text" value={newForm.field_of_study || ''} onChange={(e) => setNewForm({ ...newForm, field_of_study: e.target.value })} placeholder="Filière" />
                </div>
              </div>
              <button onClick={handleAdd} className="btn-save">✓ Ajouter</button>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Prénom</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Filière</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                editingId === member.id ? (
                  <tr key={member.id} className="edit-row">
                    <td>{member.id}</td>
                    <td><input value={editForm.first_name || ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></td>
                    <td><input value={editForm.last_name || ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></td>
                    <td><input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                    <td><input value={editForm.field_of_study || ''} onChange={(e) => setEditForm({ ...editForm, field_of_study: e.target.value })} /></td>
                    <td>
                      <button onClick={handleSave} className="btn-save">✓ Sauvegarder</button>
                      <button onClick={() => setEditingId(null)} className="btn-cancel">✕ Annuler</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={member.id}>
                    <td>{member.id}</td>
                    <td>{member.first_name}</td>
                    <td>{member.last_name}</td>
                    <td>{member.email}</td>
                    <td>{member.field_of_study}</td>
                    <td>
                      <button onClick={() => handleEdit(member)} className="btn-edit">Éditer</button>
                      <button onClick={() => handleDelete(member.id)} className="btn-delete">Supprimer</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && !loading && (
        <div className="admin-content">
          <div className="content-header">
            <h2>Gestion des Événements</h2>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-add">
              {showAddForm ? '✕ Annuler' : '+ Ajouter un événement'}
            </button>
          </div>

          {showAddForm && (
            <div className="form-container">
              <h3>Ajouter un nouvel événement</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Titre *</label>
                  <input type="text" value={newForm.title || ''} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Titre" />
                </div>
                <div className="form-group full">
                  <label>Description</label>
                  <textarea value={newForm.description || ''} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Description" />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="datetime-local" value={newForm.date || ''} onChange={(e) => setNewForm({ ...newForm, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Lieu *</label>
                  <input type="text" value={newForm.location || ''} onChange={(e) => setNewForm({ ...newForm, location: e.target.value })} placeholder="Lieu" />
                </div>
                <div className="form-group">
                  <label>URL Image</label>
                  <input type="url" value={newForm.image_url || ''} onChange={(e) => setNewForm({ ...newForm, image_url: e.target.value })} placeholder="URL de l'image" />
                </div>
                <div className="form-group">
                  <label>Max Participants</label>
                  <input type="number" value={newForm.max_participants || ''} onChange={(e) => setNewForm({ ...newForm, max_participants: e.target.value })} placeholder="Nombre max" />
                </div>
              </div>
              <button onClick={handleAdd} className="btn-save">✓ Ajouter</button>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Date</th>
                <th>Lieu</th>
                <th>Max Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                editingId === event.id ? (
                  <tr key={event.id} className="edit-row">
                    <td>{event.id}</td>
                    <td><input value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></td>
                    <td><input type="datetime-local" value={editForm.date || ''} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} /></td>
                    <td><input value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></td>
                    <td><input type="number" value={editForm.max_participants || ''} onChange={(e) => setEditForm({ ...editForm, max_participants: e.target.value })} /></td>
                    <td>
                      <button onClick={handleSave} className="btn-save">✓ Sauvegarder</button>
                      <button onClick={() => setEditingId(null)} className="btn-cancel">✕ Annuler</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={event.id}>
                    <td>{event.id}</td>
                    <td>{event.title}</td>
                    <td>{new Date(event.date).toLocaleDateString('fr-FR')}</td>
                    <td>{event.location}</td>
                    <td>{event.max_participants}</td>
                    <td>
                      <button onClick={() => handleEdit(event)} className="btn-edit">Éditer</button>
                      <button onClick={() => handleDelete(event.id)} className="btn-delete">Supprimer</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && !loading && (
        <div className="admin-content">
          <div className="content-header">
            <h2>Gestion des Annonces</h2>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-add">
              {showAddForm ? '✕ Annuler' : '+ Ajouter une annonce'}
            </button>
          </div>

          {showAddForm && (
            <div className="form-container">
              <h3>Ajouter une nouvelle annonce</h3>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Titre *</label>
                  <input type="text" value={newForm.title || ''} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Titre" />
                </div>
                <div className="form-group full">
                  <label>Contenu *</label>
                  <textarea value={newForm.content || ''} onChange={(e) => setNewForm({ ...newForm, content: e.target.value })} placeholder="Contenu" rows="4" />
                </div>
                <div className="form-group checkbox">
                  <input type="checkbox" checked={newForm.is_pinned || false} onChange={(e) => setNewForm({ ...newForm, is_pinned: e.target.checked })} id="is_pinned" />
                  <label htmlFor="is_pinned">Épingler cette annonce</label>
                </div>
              </div>
              <button onClick={handleAdd} className="btn-save">✓ Ajouter</button>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Contenu (aperçu)</th>
                <th>Épinglée</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(ann => (
                editingId === ann.id ? (
                  <tr key={ann.id} className="edit-row">
                    <td>{ann.id}</td>
                    <td><input value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></td>
                    <td><textarea value={editForm.content || ''} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} rows="3" /></td>
                    <td><input type="checkbox" checked={editForm.is_pinned || false} onChange={(e) => setEditForm({ ...editForm, is_pinned: e.target.checked })} /></td>
                    <td>
                      <button onClick={handleSave} className="btn-save">✓ Sauvegarder</button>
                      <button onClick={() => setEditingId(null)} className="btn-cancel">✕ Annuler</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={ann.id}>
                    <td>{ann.id}</td>
                    <td>{ann.title}</td>
                    <td>{ann.content.substring(0, 50)}...</td>
                    <td>{ann.is_pinned ? '✅' : '❌'}</td>
                    <td>
                      <button onClick={() => handleEdit(ann)} className="btn-edit">Éditer</button>
                      <button onClick={() => handleDelete(ann.id)} className="btn-delete">Supprimer</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Admin;
