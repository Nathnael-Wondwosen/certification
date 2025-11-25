import React, { useEffect, useState } from 'react'

export default function ImportStudents({ token }) {
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!file) { setMsg('Please choose a CSV file'); return }
    try {
      setMsg('Uploading...')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/students/import', { method:'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) { setMsg(data.message || 'Import failed'); setResult(null); return }
      setResult(data)
      setMsg(`Imported: ${data.upserted} rows; Errors: ${data.errors?.length||0}`)
    } catch (e) {
      setMsg('Network error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Import Students (CSV)</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <input className="block" type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0]||null)} />
          </div>
          <div>
            <button className="btn" type="submit">Upload</button>
          </div>
        </form>
        {msg && <div className="text-sm text-gray-600 mt-2">{msg}</div>}
      </div>

      {result && (
        <div className="card">
          <h3 className="font-semibold mb-2">Import Result</h3>
          <div className="text-sm text-gray-700">Upserted: {result.upserted} | Errors: {result.errors?.length||0}</div>
          {result.errors?.length > 0 && (
            <ul className="list-disc ml-5 mt-3 space-y-1">
              {result.errors.map((er, idx) => (
                <li key={idx} className="text-red-600 text-sm">{er.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
