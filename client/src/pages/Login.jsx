import React, { useState } from 'react'

export default function Login({ setToken }) {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('StrongPassword123')
  const [msg, setMsg] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setMsg('Logging in...')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.message || 'Login failed'); return }
      setToken(data.token)
      setMsg('Logged in')
      location.href = '/admin/courses'
    } catch (e) {
      setMsg('Network error')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-center">Admin Login</h2>
        <p className="mt-2 text-sm text-gray-600 text-center">Sign in to manage courses, templates, and more.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input w-full mt-1" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input w-full mt-1" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          <button className="btn w-full" type="submit">Sign in</button>
        </form>
        {msg && (
          <div className={`mt-4 text-sm ${msg.includes('error')||msg.includes('failed')? 'text-red-600':'text-gray-600'}`}>{msg}</div>
        )}
      </div>
    </div>
  )
}
