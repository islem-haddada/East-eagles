import React from 'react';
import './AnnouncementCard.css';

const AnnouncementCard = ({ announcement }) => {
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  return (
    <div className={`announcement-card ${announcement.is_pinned ? 'pinned' : ''}`}>
      {announcement.is_pinned && <span className="pin-badge">📌 Épinglé</span>}
      <h3>{announcement.title}</h3>
      <p className="announcement-date">{formatDate(announcement.published_date)}</p>
      <p className="announcement-content">{announcement.content}</p>
    </div>
  );
};

export default AnnouncementCard;