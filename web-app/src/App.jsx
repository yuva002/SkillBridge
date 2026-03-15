import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import AddCandidate from './pages/AddCandidate.jsx'
import Results from './pages/Results.jsx'
import './App.css'

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'add', label: '+ Add Candidate' },
  { id: 'results', label: 'Call Results' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">SB</span>
            <div>
              <div className="logo-name">SkillBridge</div>
              <div className="logo-tagline">Voice Interview Coach</div>
            </div>
          </div>
          <nav className="nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`nav-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="header-badge">
            <span className="dot" />
            Bolna AI Powered
          </div>
        </div>
      </header>
      <main className="app-main">
        {tab === 'dashboard' && <Dashboard onAddClick={() => setTab('add')} onResultsClick={() => setTab('results')} />}
        {tab === 'add' && <AddCandidate onSuccess={() => setTab('dashboard')} />}
        {tab === 'results' && <Results />}
      </main>
    </div>
  )
}
