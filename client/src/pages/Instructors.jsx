import React, { useEffect, useState } from 'react'

export default function Instructors({ token }) {
  const [courses, setCourses] = useState([])
  const [courseCode, setCourseCode] = useState('')
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    (async () => {
      const rc = await fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } })
      const coursesData = await rc.json(); if (rc.ok) { setCourses(coursesData); if (coursesData[0]) setCourseCode(coursesData[0].code) }
    })()
  }, [])

  useEffect(() => { load() }, [courseCode])

  async function load() {
    if (!courseCode) { setList([]); return }
    const res = await fetch(`/api/admin/instructors?courseCode=${courseCode}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); if (res.ok) setList(data)
  }

  function startEdit(i){
    setEditingId(i._id); setEditName(i.name)
  }
  function cancelEdit(){
    setEditingId(null); setEditName('')
  }
  async function saveEdit(id){
    const res = await fetch(`/api/admin/instructors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName })
    })
    const data = await res.json(); if (!res.ok) { alert(data.message||'Error'); return }
    cancelEdit(); load()
  }
  async function remove(id){
    if (!confirm('Delete this instructor?')) return
    const res = await fetch(`/api/admin/instructors/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.message||'Error'); return }
    load()
  }

  async function add() {
    setMsg('Saving...')
    const res = await fetch('/api/admin/instructors', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseCode, name })
    })
    const data = await res.json(); if (!res.ok) { setMsg(data.message || 'Error'); return }
    setMsg('Saved'); setName(''); load()
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Add Instructor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="select w-full" value={courseCode} onChange={e=>setCourseCode(e.target.value)}>
            {courses.map(c=> <option key={c._id} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
          <input className="input w-full" placeholder="Instructor name" value={name} onChange={e=>setName(e.target.value)} />
          <button className="btn w-full md:w-auto" onClick={add}>Add</button>
        </div>
        {msg && <div className="text-sm text-gray-600 mt-2">{msg}</div>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Instructors</h2>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(i => (
              <tr key={i._id} className="odd:bg-white even:bg-gray-50">
                <td className="td">{editingId===i._id ? (<input className="input w-full" value={editName} onChange={e=>setEditName(e.target.value)} />) : i.name}</td>
                <td className="td space-x-2">
                  {editingId===i._id ? (
                    <>
                      <button className="btn" onClick={()=>saveEdit(i._id)}>Save</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={()=>startEdit(i)}>Edit</button>
                      <button className="btn-danger" onClick={()=>remove(i._id)}>Delete</button>
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
