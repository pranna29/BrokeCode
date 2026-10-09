import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize default dark theme for clean financial dashboard aesthetic
if (!document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(<App />);
