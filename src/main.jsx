import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './editorial.css';
import './material.css';
import './select.css';
import './material-interactions.css';
import { AppearanceProvider, initializeAppearance } from './Appearance.jsx';

initializeAppearance();

createRoot(document.getElementById('root')).render(<React.StrictMode><AppearanceProvider><App /></AppearanceProvider></React.StrictMode>);
