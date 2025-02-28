import React from 'react';
import '../styles/Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">SafeRoute</h1>
        <p className="app-subtitle">行動を変える防犯マップアプリ</p>
      </div>
    </header>
  );
};

export default Header;