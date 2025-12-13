import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EventCard from './EventCard';
import { eventAPI } from '../../services/api';
import './EventList.css';

const EventList = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventAPI.getAll();
        setEvents(data || []);
      } catch (err) {
        setError(t('components.events.error_load'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [t]);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="event-list">
      <h2>{t('components.events.title')}</h2>
      {events.length === 0 ? (
        <p className="no-events">{t('components.events.no_events')}</p>
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