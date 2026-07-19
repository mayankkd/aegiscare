import React from 'react';

const Footer = () => {
  return (
    <footer className="footer-container glass-panel">
      <div className="footer-inner">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} AegisCare Telemedicine Platform. All rights reserved.
        </p>
        <div className="footer-meta">
          <span>Secure Encrypted Connection</span>
          <span className="meta-divider">•</span>
          <span>HIPAA Compliant</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
