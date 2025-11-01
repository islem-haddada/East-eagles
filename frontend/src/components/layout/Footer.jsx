import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Contact</h3>
            <p>📧 club.scientifique@example.com</p>
            <p>📱 +213 555 123 456</p>
          </div>
          <div className="footer-section">
            <h3>Localisation</h3>
            <p>🏫 Université de Souk Ahras</p>
            <p>📍 Souk Ahras, Algérie</p>
          </div>
          <div className="footer-section">
            <h3>Suivez-nous</h3>
            <div className="social-links">
              <a href="#facebook">Facebook</a>
              <a href="#instagram">Instagram</a>
              <a href="#linkedin">LinkedIn</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Club Scientifique. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;