import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App.jsx'
import BrandSprite from './components/BrandSprite.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrandSprite />
    <App />
  </StrictMode>,
)
