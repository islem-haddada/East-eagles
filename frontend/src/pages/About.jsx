import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <h1>À propos du Club Scientifique</h1>
      
      <div className="about-content">
        <section className="about-section">
          <h2>🎯 Notre Mission</h2>
          <p>
            Le Club Scientifique a pour mission de promouvoir la science, la recherche 
            et l'innovation au sein de notre université. Nous créons un espace où les 
            étudiants passionnés peuvent se rencontrer, apprendre et collaborer sur 
            des projets scientifiques.
          </p>
        </section>

        <section className="about-section">
          <h2>🌟 Nos Objectifs</h2>
          <ul>
            <li>Organiser des conférences et ateliers scientifiques</li>
            <li>Encourager la recherche et l'innovation</li>
            <li>Créer un réseau d'étudiants passionnés de science</li>
            <li>Participer à des compétitions scientifiques</li>
            <li>Développer des projets collaboratifs</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>💡 Nos Activités</h2>
          <div className="activities-grid">
            <div className="activity-card">
              <h3>🔬 Workshops</h3>
              <p>Ateliers pratiques sur divers sujets scientifiques</p>
            </div>
            <div className="activity-card">
              <h3>🎤 Conférences</h3>
              <p>Interventions d'experts et chercheurs</p>
            </div>
            <div className="activity-card">
              <h3>🏆 Compétitions</h3>
              <p>Participation à des concours nationaux et internationaux</p>
            </div>
            <div className="activity-card">
              <h3>🤝 Projets</h3>
              <p>Développement de projets innovants en équipe</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>👥 Rejoignez-nous!</h2>
          <p>
            Que vous soyez étudiant en sciences, en ingénierie ou simplement 
            passionné par la science, vous êtes les bienvenus! Inscrivez-vous 
            dès maintenant pour faire partie de notre communauté.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;