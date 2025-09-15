import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import { AlertProvider } from './components/AlertProvider'

// Configure Amplify synchronously to ensure it's ready before any component code runs
Amplify.configure(outputs as any)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <App />
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>,
)