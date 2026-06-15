import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import VisualizerPopout from './pages/VisualizerPopout.tsx'

const isPopout = window.location.pathname === '/visualizer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPopout ? <VisualizerPopout /> : <App />}
  </StrictMode>,
)
