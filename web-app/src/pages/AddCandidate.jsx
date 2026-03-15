import { useState } from 'react'
import { addCandidate } from '../lib/api.js'
import './AddCandidate.css'

const JOB_ROLES = [
  'Electrician',
  'HVAC Technician',
  'Delivery Driver',
  'Plumber',
  'Welder',
  'Carpenter',
  'Security Guard',
  'Warehouse Worker',
  'Forklift Operator',
  'General Labour',
]

export default function AddCandidate({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', phone: '', job_role: '', employer_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !form.job_role) {
      setError('Please fill in name, phone, and job role.')
      return
    }
    // Basic phone validation
    const phone = form.phone.trim().replace(/\s/g, '')
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      setError('Please enter a valid phone number (e.g. +919876543210)')
      return
    }

    setLoading(true)
    try {
      const res = await addCandidate({ ...form, phone })
      if (res.candidate) {
        setSuccess(true)
        setTimeout(onSuccess, 1400)
      } else {
        setError(res.error || 'Failed to add candidate')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="add-success animate-in">
      <div className="success-icon">✓</div>
      <h2>Candidate added!</h2>
      <p>Redirecting to dashboard...</p>
    </div>
  )

  return (
    <div className="add-page animate-in">
      <div className="add-header">
        <h1 className="page-title">Add Candidate</h1>
        <p className="page-sub">Fill in details to enroll a candidate for an AI coaching call</p>
      </div>

      <div className="add-layout">
        <form className="add-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <input
              type="tel"
              placeholder="e.g. +919876543210"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
            <div className="form-hint">Include country code. Agent will call this number.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Role *</label>
            <select
              value={form.job_role}
              onChange={e => set('job_role', e.target.value)}
            >
              <option value="">Select a role...</option>
              {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Employer / Company Name</label>
            <input
              type="text"
              placeholder="e.g. Zomato, Larsen & Toubro"
              value={form.employer_name}
              onChange={e => set('employer_name', e.target.value)}
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : null}
            {loading ? 'Adding...' : 'Add Candidate'}
          </button>
        </form>

        <div className="add-info">
          <div className="info-card">
            <div className="info-card-title">What happens next?</div>
            <ol className="info-steps">
              <li>Candidate appears in your dashboard with <strong>Pending</strong> status</li>
              <li>Click <strong>Call Now</strong> to trigger the Bolna AI coaching call</li>
              <li>The AI agent calls their number within seconds</li>
              <li>A 4-question mock interview is conducted in Hindi or English</li>
              <li>Score + coaching tips are posted back to your dashboard</li>
            </ol>
          </div>
          <div className="info-card info-card-tip">
            <div className="info-tip-label">Tip</div>
            <p>The agent automatically detects the candidate's preferred language (Hindi / English / Hinglish) and responds accordingly — no setup needed.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
