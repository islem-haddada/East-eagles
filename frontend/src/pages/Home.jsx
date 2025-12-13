import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import sandaAction from '../assets/sanda_action.png';
import clubTraining from '../assets/club_training.png';
import sandaEquipment from '../assets/sanda_equipment.png';
import logo from '../assets/logo.png';
import './Home.css';

const Home = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="home-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="home-header">
        <div className="logo-section">
          <img src={logo} alt="East Eagles Logo" className="logo-img" />
          <span className="logo-text">East Eagles</span>
        </div>

        <div className="header-right">
          <div className="language-switcher">
            <button
              className={`lang-btn ${i18n.language === 'fr' ? 'active' : ''}`}
              onClick={() => changeLanguage('fr')}
            >
              FR
            </button>
            <button
              className={`lang-btn ${i18n.language === 'ar' ? 'active' : ''}`}
              onClick={() => changeLanguage('ar')}
            >
              AR
            </button>
          </div>

          <nav className="home-nav">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="nav-link">{t('auth.btn_login')}</Link>
                <Link to="/register" className="btn btn-primary">{t('auth.btn_register')}</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>{t('home.hero_title')}</h1>
          <p>{t('home.hero_subtitle')}</p>
          <div className="hero-buttons">
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-primary btn-large">
                {t('home.btn_join')}
              </Link>
            )}
          </div>
        </div>
      </section>


      <section className="section about-section">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <h2>{t('home.about_sanda_title')}</h2>
              <p>{t('home.about_sanda_desc')}</p>
            </div>
            <div className="about-image">
              <img src={sandaAction} alt="Sanda Action" />
            </div>
          </div>
        </div>
      </section>

      <section className="section about-section alt-bg">
        <div className="container">
          <div className="about-grid reverse">
            <div className="about-image">
              <img src={clubTraining} alt="Club Training" />
            </div>
            <div className="about-text">
              <h2>{t('home.about_club_title')}</h2>
              <p>{t('home.about_club_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section gallery-section">
        <div className="container">
          <h2>{t('home.gallery_title')}</h2>
          <div className="gallery-grid">
            <div className="gallery-item">
              <img src={sandaAction} alt="Sanda Action" />
            </div>
            <div className="gallery-item">
              <img src={clubTraining} alt="Club Training" />
            </div>
            <div className="gallery-item">
              <img src={sandaEquipment} alt="Sanda Equipment" />
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>East Eagles</h3>
              <p>{t('home.hero_subtitle')}</p>
            </div>

            <div className="footer-section">
              <h3>Contact</h3>
              <p>Email: contact@easteagles.com</p>
              <p>Phone: +213 555 123 456</p>
              <p>Address: Salle Omnisports, Alger</p>
            </div>

            <div className="footer-section">
              <h3>Social</h3>
              <div className="social-links">
                <a href="#facebook" className="social-link">Facebook</a>
                <a href="#instagram" className="social-link">Instagram</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 East Eagles Sanda Club. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;