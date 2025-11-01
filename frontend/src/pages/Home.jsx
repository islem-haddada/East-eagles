import React from 'react';
import EventList from '../components/events/EventList';
import AnnouncementList from '../components/announcements/AnnouncementList';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Bienvenue au Club Scientifique</h1>
        <p>Rejoignez une communauté passionnée par la science et l'innovation</p>
        <Link to="/register" className="btn btn-primary btn-large">
          Rejoindre le club
        </Link>
      </section>

      <section className="section">
        <AnnouncementList />
      </section>

      <section className="section">
        <EventList />
      </section>
    </div>
  );
};

export default Home;