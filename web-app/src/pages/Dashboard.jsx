import { useState, useEffect } from 'react'
import { getStats, getCandidates, triggerCall } from '../lib/api.js'
import './Dashboard.css'

const GRADE_COLOR = { A: 'green', B: 'accent', C: 'orange', D: 'red' }
const STATUS_LABEL = { pending: 'Pending', calling: 'In Call', completed: 'Done' }

export default function Dashboard({ onAddClick, onResultsClick }) {
  const [stats, setStats] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [backendError, setBackendError] = useState(null)
  const [callingId, setCallingId] = useState(null)
  const [toast, setToast] = useState(null)

  async function load() {
    try {
      const [s, c] = await Promise.all([getStats(), getCandidates()])

      setStats(s)
      setCandidates(Array.isArray(c) ? c : [])
      setBackendError(null)
    } catch (e) {
      setBackendError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleCall(candidate) {
    setCallingId(candidate.id)
    try {
      const res = await triggerCall(candidate.id)
      if (res.success) {
        showToast(`Call triggered for ${candidate.name}!`)
        setTimeout(load, 1500)
      } else {
        showToast(res.error || 'Failed to trigger call', 'error')
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setCallingId(null)
    }
  }

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <span>Connecting to backend...</span>
    </div>
  )

  if (backendError) return (
    <div className="backend-error animate-in">
      <div className="be-icon">!</div>
      <h2>Backend not reachable</h2>
      <p className="be-msg">{backendError}</p>
      <div className="be-steps">
        <div className="be-step">
          <span className="be-step-num">1</span>
          <code>cd skillbridge/backend</code>
        </div>
        <div className="be-step">
          <span className="be-step-num">2</span>
          <code>node server.js</code>
        </div>
        <div className="be-step">
          <span className="be-step-num">3</span>
          <span>Should print: <code>✅ SkillBridge backend running → http://localhost:3001</code></span>
        </div>
      </div>
      <button className="btn-primary" onClick={load}>Retry connection</button>
    </div>
  )

  return (
    <div className="dashboard animate-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Employer Dashboard</h1>
          <p className="page-sub">Manage candidates and trigger AI coaching calls</p>
        </div>
        <button className="btn-primary" onClick={onAddClick}>+ Add Candidate</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Candidates" value={stats?.total_candidates ?? 0} />
        <StatCard label="Calls Completed" value={stats?.calls_completed ?? 0} color="green" />
        <StatCard label="In Progress" value={stats?.calls_in_progress ?? 0} color="accent" />
        <StatCard label="Avg. Score" value={stats?.average_score ? `${stats.average_score}/100` : '—'} color="blue" />
        <StatCard label="Interview Ready" value={stats?.ready_for_interview ?? 0} color="green" />
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Candidates</h2>
          <button className="btn-ghost" onClick={load}>↻ Refresh</button>
        </div>

        {candidates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <p>No candidates yet.</p>
            <button className="btn-primary" onClick={onAddClick}>Add your first candidate</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="cand-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Employer</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Readiness</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(candidates) && candidates.map(c => {
                  const result = c.last_result
                  const grade = result?.grade
                  const isCalling = callingId === c.id || c.status === 'calling'
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="cand-name">{c.name}</div>
                        <div className="cand-phone">{c.phone}</div>
                      </td>
                      <td><span className="role-badge">{c.job_role}</span></td>
                      <td className="text-secondary">{c.employer_name}</td>
                      <td>
                        <span className={`status-dot status-${c.status}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                      </td>
                      <td>
                        {result?.score != null ? (
                          <span className={`score-badge grade-${GRADE_COLOR[grade] || 'muted'}`}>
                            {result.score}/100 · {grade}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className={`readiness readiness-${result?.readiness?.replace(/\s+/g, '-').toLowerCase() || 'none'}`}>
                        {result?.readiness || '—'}
                      </td>
                      <td>
                        {c.status === 'completed' ? (
                          <button className="btn-ghost-sm" onClick={onResultsClick}>View</button>
                        ) : (
                          <button
                            className={`btn-call ${isCalling ? 'calling' : ''}`}
                            onClick={() => handleCall(c)}
                            disabled={isCalling}
                          >
                            {isCalling ? <><span className="call-pulse" />Calling...</> : 'Call Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="how-it-works">
        <div className="hiw-title">How it works</div>
        <div className="hiw-steps">
          {[
            ['01', 'Add candidate', 'Enter name, phone, job role'],
            ['02', 'Trigger call', 'Bolna AI calls the candidate instantly'],
            ['03', 'Mock interview', 'Agent asks 4 role-specific questions in Hindi/English'],
            ['04', 'Score + coach', 'Answers are scored, coaching tips spoken live'],
            ['05', 'Results here', 'Full report appears in the dashboard after call'],
          ].map(([n, title, desc]) => (
            <div className="hiw-step" key={n}>
              <div className="hiw-num">{n}</div>
              <div className="hiw-text">
                <div className="hiw-step-title">{title}</div>
                <div className="hiw-step-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className={`stat-card ${color ? `stat-${color}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
