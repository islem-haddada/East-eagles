import React from 'react';
import Navigation from './Navigation';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <h1>🔬 Club Scientifique</h1>
            <p className="tagline">Innovation et Découverte</p>
          </div>
          <Navigation />
        </div>
      </div>
    </header>
  );
};

export default Header;