import React from 'react';
import EventList from '../components/events/EventList';
import './Events.css';

const Events = () => {
  return (
    <div className="events-page">
      <h1>Tous les événements</h1>
      <p className="events-subtitle">Découvrez nos prochains événements et inscrivez-vous!</p>
      <EventList />
    </div>
  );
};

export default Events;