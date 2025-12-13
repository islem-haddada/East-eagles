import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AnnouncementCard from './AnnouncementCard';
import { announcementAPI } from '../../services/api';
import './AnnouncementList.css';

const AnnouncementList = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementAPI.getAll();
        setAnnouncements(data || []);
      } catch (err) {
        setError(t('components.announcements.error_load'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [t]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="announcement-list">
      <h2>{t('components.announcements.title')}</h2>
      {announcements.length === 0 ? (
        <p className="no-announcements">{t('components.announcements.no_announcements')}</p>
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