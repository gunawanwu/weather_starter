import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
// Must precede './index.css' so the map/pin overrides there win the cascade.
import 'leaflet/dist/leaflet.css';
import './index.css';

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
