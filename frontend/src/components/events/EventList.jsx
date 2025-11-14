import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import { eventAPI } from '../../services/api';
import './EventList.css';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventAPI.getAll();
        setEvents(data || []);
      } catch (err) {
        setError('Impossible de charger les événements. Vérifiez que le serveur backend est démarré.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="event-list">
      <h2>Événements à venir</h2>
      {events.length === 0 ? (
        <p className="no-events">Aucun événement programmé pour le moment.</p>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;