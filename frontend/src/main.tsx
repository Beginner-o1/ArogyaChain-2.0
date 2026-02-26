import { createRoot } from 'react-dom/client'
import { AuthProvider } from "./context/AuthContext";
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)