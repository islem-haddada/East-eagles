import React from 'react';
import EventList from '../components/events/EventList';

const Events = () => {
  return (
    <div className="events-page">
      <h1>Tous les événements</h1>
      <EventList />
    </div>
  );
};

export default Events;