import React from 'react';

/**
 * Footer — Minimal strip at the bottom of the app.
 * 1px top border, copyright on the left, attribution on the right.
 * On mobile the two items stack and centre (handled by CSS).
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <span className="footer__copy">
        &copy; {year} The Panel
      </span>
      <span className="footer__powered">
        Powered by <span>Groq</span> &middot; LLaMA 3.3 70B
      </span>
    </footer>
  );
}
