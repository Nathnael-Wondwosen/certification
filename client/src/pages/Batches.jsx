import React, { useEffect, useState } from 'react'

export default function Batches({ token }) {
  const [courses, setCourses] = useState([])
  const [courseCode, setCourseCode] = useState('')
  const [code, setCode] = useState('')
  const [year, setYear] = useState('')
  const [list, setList] = useState([])
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editCode, setEditCode] = useState('')
  const [editYear, setEditYear] = useState('')

  async function loadCourses() {
    const res = await fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (res.ok) { setCourses(data); if (!courseCode && data[0]) setCourseCode(data[0].code) }
  }

  function startEdit(b){
    setEditingId(b._id); setEditCode(b.code); setEditYear(b.year||'')
  }
  function cancelEdit(){
    setEditingId(null); setEditCode(''); setEditYear('')
  }
  async function saveEdit(id){
    const res = await fetch(`/api/admin/batches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: editCode, year: editYear? Number(editYear): undefined })
    })
    const data = await res.json(); if (!res.ok) { alert(data.message||'Error'); return }
    cancelEdit();
    const c = courses.find(x=>x.code===courseCode); loadBatches(c?._id)
  }
  async function remove(id){
    if (!confirm('Delete this batch?')) return
    const res = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.message||'Error'); return }
    const c = courses.find(x=>x.code===courseCode); loadBatches(c?._id)
  }
  async function loadBatches(courseId) {
    if (!courseId) return setList([])
    const res = await fetch(`/api/admin/batches?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (res.ok) setList(data)
  }

  useEffect(() => { loadCourses() }, [])
  useEffect(() => {
    const c = courses.find(x=>x.code===courseCode); loadBatches(c?._id)
  }, [courses, courseCode])

  async function add() {
    setMsg('Saving...')
    const res = await fetch('/api/admin/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseCode, code, year: year? Number(year): undefined })
    })
    const data = await res.json(); if (!res.ok) { setMsg(data.message || 'Error'); return }
    setMsg('Saved'); setCode(''); setYear('');
    const c = courses.find(x=>x.code===courseCode); loadBatches(c?._id)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Add Batch</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="select w-full" value={courseCode} onChange={e=>setCourseCode(e.target.value)}>
            {courses.map(c=> <option key={c._id} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
          <input className="input w-full" placeholder="Batch code (e.g., 2025A)" value={code} onChange={e=>setCode(e.target.value)} />
          <input className="input w-full" placeholder="Year" value={year} onChange={e=>setYear(e.target.value)} />
          <button className="btn w-full md:w-auto" onClick={add}>Add</button>
        </div>
        {msg && <div className="text-sm text-gray-600 mt-2">{msg}</div>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Batches</h2>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Course</th>
              <th className="th">Batch</th>
              <th className="th">Year</th>
              <th className="th">Created</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(b => (
              <tr key={b._id} className="odd:bg-white even:bg-gray-50">
                <td className="td">{courses.find(c=>c._id===b.course)?.code}</td>
                <td className="td">{editingId===b._id ? (<input className="input w-full" value={editCode} onChange={e=>setEditCode(e.target.value)} />) : b.code}</td>
                <td className="td">{editingId===b._id ? (<input className="input w-full" value={editYear} onChange={e=>setEditYear(e.target.value)} />) : (b.year||'')}</td>
                <td className="td">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="td space-x-2">
                  {editingId===b._id ? (
                    <>
                      <button className="btn" onClick={()=>saveEdit(b._id)}>Save</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={()=>startEdit(b)}>Edit</button>
                      <button className="btn-danger" onClick={()=>remove(b._id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
