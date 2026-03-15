import { useState, useEffect } from 'react'
import { getResults } from '../lib/api.js'
import './Results.css'

const GRADE_LABEL = { A: 'Excellent', B: 'Good', C: 'Average', D: 'Needs Work' }
const GRADE_COLOR = { A: 'green', B: 'accent', C: 'orange', D: 'red' }

export default function Results() {
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getResults()
    .then(data => {
      const arr = Array.isArray(data) ? data : []
      setResults(arr)
      if (arr.length > 0) setSelected(arr[0])
    })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" /><span>Loading results...</span>
    </div>
  )

  if (error) return (
    <div className="empty-results animate-in">
      <div className="empty-icon">!</div>
      <h2>Backend not reachable</h2>
      <p style={{fontSize:'13px',color:'var(--text-secondary)',maxWidth:'400px',textAlign:'center'}}>{error}</p>
    </div>
  )

  if (results.length === 0) return (
    <div className="empty-results animate-in">
      <div className="empty-icon">◎</div>
      <h2>No results yet</h2>
      <p>Completed calls will appear here with scores and coaching reports.</p>
    </div>
  )

  return (
    <div className="results-page animate-in">
      <div className="results-header">
        <h1 className="page-title">Call Results</h1>
        <p className="page-sub">{results.length} coaching session{results.length !== 1 ? 's' : ''} completed</p>
      </div>

      <div className="results-layout">
        {/* Left: list */}
        <div className="results-list">
          {results.map(r => {
            const gc = GRADE_COLOR[r.grade] || 'muted'
            return (
              <div
              key={r.call_sid || Math.random()}
                className={`result-item ${selected?.call_sid === r.call_sid ? 'active' : ''}`}
                onClick={() => setSelected(r)}
              >
                <div className="ri-top">
                  <div className="ri-name">{r.candidate_name || 'Unknown'}</div>
                  {r.grade && (
                    <span className={`ri-grade grade-${gc}`}>{r.grade}</span>
                  )}
                </div>
                <div className="ri-role">{r.job_role || '—'}</div>
                <div className="ri-bottom">
                  {r.score != null && (
                    <span className="ri-score">{r.score}/100</span>
                  )}
                  <span className={`ri-readiness readiness-${(r.readiness || '').replace(/\s+/g,'-').toLowerCase()}`}>
                    {r.readiness || r.overall_readiness || '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: detail */}
        {selected && <ResultDetail r={selected} />}
      </div>
    </div>
  )
}

function ResultDetail({ r }) {
  const gc = GRADE_COLOR[r.grade] || 'muted'
  const gl = GRADE_LABEL[r.grade] || '—'

  const tips = [
    r.coaching_tip_1,
    r.coaching_tip_2,
    ...(Array.isArray(r.coaching_tips) ? r.coaching_tips : [])
  ].filter(Boolean)

  const ed = r.extracted_data || {}
  const strength = r.key_strength || ed.key_strength
  const weakness = r.main_weakness || ed.main_weakness
  const sentiment = r.candidate_sentiment || ed.candidate_sentiment
  const langPref = r.language_preference || r.language_used || ed.language_preference

  return (
    <div className="result-detail animate-in" key={r.call_sid}>
      {/* Top header */}
      <div className="rd-header">
        <div>
          <div className="rd-name">{r.candidate_name || 'Candidate'}</div>
          <div className="rd-role">{r.job_role} {r.employer_name ? `· ${r.employer_name}` : ''}</div>
        </div>
        <div className={`rd-grade-badge grade-${gc}`}>
          <div className="rd-grade-letter">{r.grade || '?'}</div>
          <div className="rd-grade-label">{gl}</div>
        </div>
      </div>

      {/* Score bar */}
      {r.score != null && (
        <div className="rd-score-section">
          <div className="rd-score-row">
            <span className="rd-score-num">{r.score}</span>
            <span className="rd-score-den">/100</span>
            <span className={`rd-readiness readiness-${(r.readiness||'').replace(/\s+/g,'-').toLowerCase()}`}>
              {r.readiness}
            </span>
          </div>
          <div className="score-bar-bg">
            <div
              className={`score-bar-fill grade-bar-${gc}`}
              style={{ width: `${r.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata chips */}
      <div className="rd-chips">
        {langPref && <Chip label="Language" value={langPref} />}
        {(r.candidate_confidence || ed.candidate_confidence) && (
          <Chip label="Confidence" value={r.candidate_confidence || ed.candidate_confidence} />
        )}
        {sentiment && <Chip label="Sentiment" value={sentiment} />}
        {(r.call_completed || ed.call_completed) && (
          <Chip label="Completed" value={r.call_completed || ed.call_completed} />
        )}
        {Number(r.duration_seconds) > 0 && (
          <Chip label="Duration" value={`${Math.round(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s`} />
        )}
      </div>

      {/* Strengths / Weaknesses */}
      {(strength || weakness) && (
        <div className="rd-insights">
          {strength && (
            <div className="rd-insight rd-strength">
              <div className="rd-insight-label">Key strength</div>
              <div className="rd-insight-text">{strength}</div>
            </div>
          )}
          {weakness && (
            <div className="rd-insight rd-weakness">
              <div className="rd-insight-label">Area to improve</div>
              <div className="rd-insight-text">{weakness}</div>
            </div>
          )}
        </div>
      )}

      {/* Coaching tips */}
      {tips.length > 0 && (
        <div className="rd-tips">
          <div className="rd-section-title">Coaching tips spoken to candidate</div>
          {tips.map((tip, i) => (
            <div className="rd-tip" key={i}>
              <div className="rd-tip-num">{i + 1}</div>
              <div className="rd-tip-text">{tip}</div>
            </div>
          ))}
        </div>
      )}

      {/* Transcript snippet */}
      {Array.isArray(r.transcript) && r.transcript.length > 0 && (
        <div className="rd-transcript">
          <div className="rd-section-title">Call transcript</div>
          <div className="transcript-scroll">
            {(r.transcript || []).slice(0, 20).map((line, i) => (
              <div key={i} className={`tline tline-${line.role || line.speaker || 'agent'}`}>
                <span className="tline-role">
                  {(line.role || line.speaker || 'agent') === 'assistant' ? 'Agent' : 'Candidate'}
                </span>
                <span className="tline-text">{line.content || line.text || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rd-callid">Call ID: {r.call_sid}</div>
    </div>
  )
}

function Chip({ label, value }) {
  return (
    <div className="rd-chip">
      <span className="chip-label">{label}</span>
      <span className="chip-value">{value}</span>
    </div>
  )
}
