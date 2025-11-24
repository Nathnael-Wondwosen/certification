import React, { useState } from 'react'
import logo from '../assets/logo.png'

export default function CertificateDownload() {
  const [id, setId] = useState('')
  const [message, setMessage] = useState('')
  const [showLinks, setShowLinks] = useState(false)

  async function checkId(e) {
    e.preventDefault()
    if (!id.trim()) {
      setMessage('Please enter an ID')
      return
    }
    
    setMessage('Checking...')
    setShowLinks(false)
    
    try {
      const res = await fetch(`/api/public/certificate/${id}`)
      const data = await res.json()
      
      if (!res.ok) {
        setMessage(data.message || 'Certificate not found')
        return
      }
      
      setMessage('Certificate found!')
      setShowLinks(true)
    } catch (error) {
      setMessage('Network error occurred')
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="card w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="Organization Logo" className="h-10 w-auto sm:h-12" />
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Download Your Certificate</h1>
            <p className="text-sm text-gray-600">Enter your certificate ID to download a copy</p>
          </div>
        </div>

        <div className="grid gap-3">
          <label className="label">Certificate ID</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              className="input flex-1"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="e.g. TE-2025-ABC123"
              autoFocus
            />
            <button className="btn" onClick={checkId}>Check</button>
          </div>
          <div className="text-xs text-gray-500">Your ID is provided by the Customer Services.</div>
          <div className="text-xs text-gray-600">እባክዎን መለያ ቁጥርዎን እዚህ ጋር ያስገቡ።</div>
        </div>

        {message && (
          <div className={`mt-4 text-sm ${message.includes('error') || message.includes('not found') ? 'text-red-600' : 'text-gray-700'}`}>
            {message}
          </div>
        )}

        {showLinks && (
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <a href={`/api/public/certificate/${id}/png`} className="btn flex-1" target="_blank" rel="noopener">Download PNG</a>
            <a href={`/api/public/certificate/${id}/pdf`} className="btn flex-1" target="_blank" rel="noopener">Download PDF</a>
          </div>
        )}

        <div className="mt-6 text-sm">
          Need admin access? <a href="/admin/login" className="link">Go to Admin Login</a>
        </div>
      </div>
    </div>
  )
}