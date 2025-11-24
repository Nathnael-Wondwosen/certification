import React, { useEffect, useState } from 'react'

export default function Courses({ token }) {
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')

  async function load() {
    const res = await fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (res.ok) setList(data)
  }

  async function add() {
    setMsg('Saving...')
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, code })
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.message || 'Error'); return }
    setMsg('Saved')
    setName(''); setCode('')
    load()
  }

  useEffect(() => { load() }, [])

  function startEdit(c){
    setEditingId(c._id); setEditName(c.name); setEditCode(c.code)
  }
  function cancelEdit(){
    setEditingId(null); setEditName(''); setEditCode('')
  }
  async function saveEdit(id){
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName, code: editCode })
    })
    const data = await res.json(); if (!res.ok) { alert(data.message||'Error'); return }
    cancelEdit(); load()
  }
  async function remove(id){
    if (!confirm('Delete this course?')) return
    const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.message||'Error'); return }
    load()
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Add Course</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input w-full" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input w-full" placeholder="Code" value={code} onChange={e=>setCode(e.target.value)} />
          <button className="btn w-full md:w-auto" onClick={add}>Add</button>
        </div>
        {msg && <div className="text-sm text-gray-600 mt-2">{msg}</div>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Courses</h2>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Code</th>
              <th className="th">Created</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c._id} className="odd:bg-white even:bg-gray-50">
                <td className="td">{editingId===c._id ? (<input className="input w-full" value={editName} onChange={e=>setEditName(e.target.value)} />) : c.name}</td>
                <td className="td">{editingId===c._id ? (<input className="input w-full" value={editCode} onChange={e=>setEditCode(e.target.value)} />) : c.code}</td>
                <td className="td">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="td space-x-2">
                  {editingId===c._id ? (
                    <>
                      <button className="btn" onClick={()=>saveEdit(c._id)}>Save</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={()=>startEdit(c)}>Edit</button>
                      <button className="btn-danger" onClick={()=>remove(c._id)}>Delete</button>
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
