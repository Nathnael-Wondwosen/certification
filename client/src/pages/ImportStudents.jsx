import React, { useEffect, useState } from 'react'
import { parse } from 'papaparse'

const FIELD_OPTIONS = [
  { value: 'name', label: 'Student Name' },
  { value: 'amharicName', label: 'Student Name (Amharic)' },
  { value: 'email', label: 'Email' },
  { value: 'courseCode', label: 'Course Code' },
  { value: 'batchCode', label: 'Batch Code' },
  { value: 'publicId', label: 'Public ID' },
  { value: 'status', label: 'Status' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'completionDate', label: 'Completion Date' },
  { value: 'amharicDate', label: 'Completion Date (Amharic)' }
]

export default function ImportStudents({ token }) {
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [previewRows, setPreviewRows] = useState([])

  // Parse CSV headers when file selected
  const onFileChange = (f) => {
    setFile(f)
    setMsg('')
    setResult(null)
    setHeaders([])
    setMapping({})
    setPreviewRows([])
    if (!f) return
    parse(f, {
      preview: 5,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields || [])
        setPreviewRows(res.data || [])
        // initialize mapping with identity (header -> header)
        const m = {}
        (res.meta.fields || []).forEach(h => { m[h] = h })
        setMapping(m)
      },
      error: () => setMsg('Failed to parse CSV')
    })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setMsg('Please choose a CSV file'); return }
    try {
      setMsg('Uploading...')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mapping', JSON.stringify(mapping))
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
            <input className="block" type="file" accept=".csv" onChange={e=>onFileChange(e.target.files?.[0]||null)} />
          </div>

          {headers.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded">
              <div className="text-sm font-medium mb-2">Map CSV columns to fields</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {headers.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="text-xs text-gray-700 w-36 truncate">{h}</div>
                    <select className="select select-sm select-bordered" value={mapping[h]||''} onChange={(e)=>setMapping(prev=>({...prev,[h]: e.target.value}))}>
                      <option value="">(ignore)</option>
                      {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      <option value={h}>(use header name)</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Make sure required fields like <strong>courseCode</strong> and <strong>batchCode</strong> are mapped.</div>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="bg-white border border-gray-100 p-2 rounded text-sm overflow-auto">
              <div className="font-medium mb-2">Preview (first rows)</div>
              <table className="table-auto w-full text-xs">
                <thead>
                  <tr>{headers.map((h, i) => <th key={i} className="px-1 py-0.5 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {previewRows.map((r, ri) => (
                    <tr key={ri}>{headers.map((h, ci) => <td key={ci} className="px-1 py-0.5 align-top">{String(r[h]||'')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
