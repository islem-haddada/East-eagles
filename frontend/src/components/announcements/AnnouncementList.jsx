import React, { useState, useEffect } from 'react';
import AnnouncementCard from './AnnouncementCard';
import { announcementAPI } from '../../services/api';
import './AnnouncementList.css';

const AnnouncementList = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementAPI.getAll();
        setAnnouncements(data);
      } catch (err) {
        setError('Erreur lors du chargement des annonces');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="announcement-list">
      <h2>Annonces</h2>
      {announcements.length === 0 ? (
        <p className="no-announcements">Aucune annonce disponible.</p>
      ) : (
        <div className="announcement-container">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;