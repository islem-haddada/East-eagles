import React from 'react';
import './EventCard.css';

const EventCard = ({ event }) => {
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  return (
    <div className="event-card">
      <div className="event-image">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} />
        ) : (
          <div className="event-image-placeholder">📅</div>
        )}
      </div>
      <div className="event-content">
        <h3>{event.title}</h3>
        <p className="event-date">📆 {formatDate(event.date)}</p>
        <p className="event-location">📍 {event.location}</p>
        <p className="event-description">{event.description}</p>
        {event.max_participants && (
          <p className="event-participants">
            👥 Places disponibles: {event.max_participants}
          </p>
        )}
        <button className="btn btn-primary">S'inscrire à l'événement</button>
      </div>
    </div>
  );
};

export default EventCard;