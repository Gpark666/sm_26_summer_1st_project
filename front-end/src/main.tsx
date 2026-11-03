import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

const isDesktop = window.location.protocol === 'file:'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDesktop ? (
      <MemoryRouter initialEntries={['/live']}>
        <App />
      </MemoryRouter>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)