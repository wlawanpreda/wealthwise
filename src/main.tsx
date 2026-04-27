import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './components/FirebaseProvider';
import { FinancialProvider } from './context/FinancialContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseProvider>
      <FinancialProvider>
        <App />
      </FinancialProvider>
    </FirebaseProvider>
  </StrictMode>,
);
