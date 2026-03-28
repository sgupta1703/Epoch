import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Global CSS — must be first so variables are available to all components
import './components/Navbar.css';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
