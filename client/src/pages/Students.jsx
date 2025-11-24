import React, { useEffect, useState, useCallback, useRef } from 'react'

export default function Students({ token }) {
  const [courseCode, setCourseCode] = useState('')
  const [batchCode, setBatchCode] = useState('')
  const [status, setStatus] = useState('')
  const [list, setList] = useState([])
  const [msg, setMsg] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50
  const [hasMore, setHasMore] = useState(false)
  const loadAbortRef = useRef(null)

  // Create student form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [instructor, setInstructor] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [newStatus, setNewStatus] = useState('pending')
  const [createdId, setCreatedId] = useState('')
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [instructors, setInstructors] = useState([])
  const [instructorMode, setInstructorMode] = useState('pick') // pick | other
  const [customFields, setCustomFields] = useState({})
  const [templateFields, setTemplateFields] = useState([])

  // Edit student form
  const [editingStudent, setEditingStudent] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    courseCode: '',
    batchCode: '',
    status: 'pending',
    instructor: '',
    completionDate: ''
  })

  const handleCourseChange = (e) => {
  setCourseCode(e.target.value);
  setCustomFields({});
}

  // Cache for dropdown data
  const [cache, setCache] = useState({})

  const fetchWithCache = useCallback(async (url, cacheKey) => {
    // Check cache first
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 30000) { // 30 seconds cache
      return cache[cacheKey].data
    }
    
    // Fetch fresh data
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    
    // Update cache
    if (res.ok) {
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          data,
          timestamp: Date.now()
        }
      }))
    }
    
    return res.ok ? data : null
  }, [token, cache])

  async function load() {
    try {
      // cancel previous request
      if (loadAbortRef.current) loadAbortRef.current.abort()
      const controller = new AbortController()
      loadAbortRef.current = controller

      const qs = new URLSearchParams({
        ...(courseCode ? { courseCode } : {}),
        ...(batchCode ? { batchCode } : {}),
        ...(status ? { status } : {}),
        page: String(page),
        limit: String(limit)
      }).toString()
      const res = await fetch(`/api/admin/students?${qs}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      const data = await res.json()
      if (res.ok) {
        setList(data)
        setHasMore(Array.isArray(data) && data.length === limit)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        // ignore abort errors
        console.error(e)
      }
    }
  }

  useEffect(() => { load() }, [page])

  // load courses and instructors for dropdowns with caching
  useEffect(() => {
    (async () => {
      const coursesData = await fetchWithCache('/api/admin/courses', 'courses')
      if (coursesData) {
        setCourses(coursesData);
        if (!courseCode && coursesData[0]) setCourseCode(coursesData[0].code)
      }
    })()
  }, [])

  // load batches and template fields for selected course with caching
  useEffect(() => {
    (async () => {
      const course = courses.find(c => c.code === courseCode)
      if (!course) { 
        setBatches([]);
        setTemplateFields([]);
        // Reset custom fields when no course is selected
        setCustomFields({});
        return;
      }
      
      // Check if we have cached batches for this course
      const cacheKey = `batches_${course._id}`
      const [batchesData, templatesData] = await Promise.all([
        fetchWithCache(`/api/admin/batches?courseId=${course._id}`, cacheKey),
        fetchWithCache(`/api/admin/templates?courseId=${course._id}`, `templates_${course._id}`)
      ])
      
      if (batchesData) {
        setBatches(batchesData);
        if (!batchCode && batchesData[0]) setBatchCode(batchesData[0].code)
      }
      
      // Reset custom fields when course changes
      setCustomFields({});
      
      // Get template fields for the selected course
      if (templatesData && templatesData.length > 0) {
        // Get all unique field names from textLayout
        const fields = new Set();
        templatesData.forEach(template => {
          if (template.textLayout && Array.isArray(template.textLayout)) {
            template.textLayout.forEach(field => {
              // Only include non-standard fields
              if (field.field && !['name', 'course', 'date', 'instructor', 'batch'].includes(field.field)) {
                fields.add(field.field);
              }
            });
          }
        });
        setTemplateFields(Array.from(fields));
      } else {
        setTemplateFields([]);
      }
      
      // refresh instructors for the selected course
      const instData = await fetchWithCache(
        `/api/admin/instructors?courseCode=${encodeURIComponent(course.code)}`,
        `instructors_${course.code}`
      )
      if (instData) setInstructors(instData)
    })()
    // reset paging when filters change
    setPage(1)
    load()
  }, [courseCode, courses])

  async function updateStatus(id, value) {
    setMsg('Updating...')
    const res = await fetch(`/api/admin/students/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: value })
    })
    const data = await res.json(); if (!res.ok) { setMsg(data.message||'Error'); return }
    setMsg('Updated'); load()
  }

  async function createStudent(e) {
    e.preventDefault()
    setMsg('Creating...'); setCreatedId('')
    
    // Prepare custom fields from the form
    const customFieldsData = {};
    templateFields.forEach(field => {
      if (customFields[field] !== undefined) {
        customFieldsData[field] = customFields[field];
      }
    });
    
    const body = { 
      name, 
      email, 
      courseCode, 
      batchCode, 
      status: newStatus, 
      instructor, 
      completionDate,
      customFields: Object.keys(customFieldsData).length > 0 ? customFieldsData : undefined
    }
    
    const res = await fetch('/api/admin/students', {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      }, 
      body: JSON.stringify(body)
    })
    
    const data = await res.json(); 
    if (!res.ok) { 
      setMsg(data.message || 'Error'); 
      return 
    }
    
    setMsg('Created')
    setCreatedId(data.publicId)
    setName(''); 
    setEmail(''); 
    setInstructor(''); 
    setCompletionDate('');
    setCustomFields({});
    
    // after create, reload first page to include newest at top
    setPage(1)
    load()
  }

  function copyId(id) {
    navigator.clipboard?.writeText(id)
  }

  // Open edit form with student data
  function openEditForm(student) {
    setEditingStudent(student._id)
    setEditForm({
      name: student.name,
      email: student.email || '',
      courseCode: student.courseCode,
      batchCode: student.batchCode,
      status: student.status,
      instructor: student.instructor || '',
      completionDate: student.completionDate ? student.completionDate.split('T')[0] : '',
      customFields: student.customFields || {}
    })
    
    // Set custom fields for the form
    if (student.customFields) {
      setCustomFields({ ...student.customFields });
    } else {
      setCustomFields({});
    }
  }

  // Close edit form
  function closeEditForm() {
    setEditingStudent(null);
    setCustomFields({});
  }

  // Handle edit form changes
  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle custom field changes
  function handleCustomFieldChange(field, value) {
    setCustomFields(prev => ({
      ...prev,
      [field]: value
    }));
  }

  // Update student
  async function updateStudent(e) {
    e.preventDefault()
    setMsg('Updating...')
    
    // Prepare custom fields for the update
    const customFieldsData = {};
    templateFields.forEach(field => {
      if (customFields[field] !== undefined) {
        customFieldsData[field] = customFields[field];
      }
    });
    
    const updateData = {
      ...editForm,
      customFields: Object.keys(customFieldsData).length > 0 ? customFieldsData : undefined
    };
    
    const res = await fetch(`/api/admin/students/${editingStudent}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(updateData)
    })
    
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.message || 'Error')
      return
    }
    
    setMsg('Student updated successfully')
    closeEditForm()
    load()
  }

  // Delete student
  async function deleteStudent(id) {
    if (!window.confirm('Are you sure you want to delete this student?')) return
    
    setMsg('Deleting...')
    const res = await fetch(`/api/admin/students/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.message || 'Error')
      return
    }
    
    setMsg('Student deleted successfully')
    load()
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Create Student Form */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Create Student</h2>
            <form onSubmit={createStudent} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="label">Course</label>
                  <select 
                    className="select w-full" 
                    value={courseCode} 
                    onChange={handleCourseChange}
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => <option key={c._id} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Batch</label>
                  <select className="select w-full" value={batchCode} onChange={e=>setBatchCode(e.target.value)}>
                    {batches.map(b => <option key={b._id} value={b.code}>{b.code}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input w-full" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input w-full" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="label">Instructor</label>
                  {instructorMode === 'pick' ? (
                    <div className="flex gap-2">
                      <select className="select w-full" value={instructor} onChange={e=>setInstructor(e.target.value)}>
                        <option value="">Select instructor</option>
                        {instructors.map((n, i) => {
                          const label = typeof n === 'string' ? n : (n?.name || '')
                          return <option key={i} value={label}>{label}</option>
                        })}
                      </select>
                      <button className="btn" type="button" onClick={()=>{ setInstructorMode('other'); setInstructor('') }}>Other</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input className="input w-full" placeholder="Enter instructor name" value={instructor} onChange={e=>setInstructor(e.target.value)} />
                      <button className="btn" type="button" onClick={()=> setInstructorMode('pick')}>Pick</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Completion Date</label>
                  <input className="input w-full" type="date" value={completionDate} onChange={e=>setCompletionDate(e.target.value)} />
                </div>
                
                {/* Dynamic Fields Section */}
                {courseCode && templateFields.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <label className="label">Certificate Fields</label>
                    {templateFields.map((field) => (
                      <div key={field} className="flex flex-col space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </label>
                        <input
                          type="text"
                          className="input w-full"
                          value={customFields[field] || ''}
                          onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 items-end">
                <div>
                  <label className="label">Status</label>
                  <select className="select w-full" value={newStatus} onChange={e=>setNewStatus(e.target.value)}>
                    <option value="pending">pending</option>
                    <option value="in_progress">in_progress</option>
                    <option value="complete">complete</option>
                    <option value="blocked">blocked</option>
                  </select>
                </div>
              </div>
              <div>
                <button className="btn" type="submit">Create</button>
                {createdId && (
                  <span className="ml-3 text-sm">Created publicId: <span className="font-mono">{createdId}</span> 
                    <button type="button" className="ml-2 text-blue-600 hover:underline" onClick={()=>copyId(createdId)}>Copy</button>
                    <a className="ml-2 link" href={`http://localhost:5000/public`} target="_blank" rel="noreferrer">Test Public</a>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Search and Students List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Search</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select className="select w-full" value={courseCode} onChange={e=>{ setCourseCode(e.target.value); setBatchCode('')}}>
                {courses.map(c => <option key={c._id} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
              <select className="select w-full" value={batchCode} onChange={e=>setBatchCode(e.target.value)}>
                <option value="">All batches</option>
                {batches.map(b => <option key={b._id} value={b.code}>{b.code}</option>)}
              </select>
              <select className="select w-full" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="">Any status</option>
                <option value="pending">pending</option>
                <option value="in_progress">in_progress</option>
                <option value="complete">complete</option>
                <option value="blocked">blocked</option>
              </select>
              <button className="btn w-full md:w-auto" onClick={load}>Filter</button>
            </div>
            {msg && <div className="text-sm text-gray-600 mt-2">{msg}</div>}
          </div>

          <div className="card overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Students</h2>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">Page {page}</div>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <button className="btn btn-sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next</button>
              </div>
            </div>
            <table className="table min-w-full">
              <thead>
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Public ID</th>
                  <th className="th">Course</th>
                  <th className="th">Batch</th>
                  <th className="th">Status</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s._id} className="odd:bg-white even:bg-gray-50">
                    <td className="td">{s.name}</td>
                    <td className="td font-mono">{s.publicId}</td>
                    <td className="td">{s.courseCode}</td>
                    <td className="td">{s.batchCode}</td>
                    <td className="td">{s.status}</td>
                    <td className="td">
                      <div className="flex gap-2">
                        {/* Edit Icon Button */}
                        <button 
                          className="btn btn-sm btn-square" 
                          onClick={() => openEditForm(s)}
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        {/* Delete Icon Button */}
                        <button 
                          className="btn btn-sm btn-square btn-error" 
                          onClick={() => deleteStudent(s._id)}
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        
                        <select className="select select-sm" value={s.status} onChange={e=>updateStatus(s._id, e.target.value)}>
                          <option value="pending">pending</option>
                          <option value="in_progress">in_progress</option>
                          <option value="complete">complete</option>
                          <option value="blocked">blocked</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">Edit Student</h2>
            <form onSubmit={updateStudent} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input 
                    className="input w-full" 
                    name="name" 
                    value={editForm.name} 
                    onChange={handleEditChange} 
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input 
                    className="input w-full" 
                    name="email" 
                    type="email" 
                    value={editForm.email} 
                    onChange={handleEditChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Course</label>
                  <select 
                    className="select w-full" 
                    name="courseCode" 
                    value={editForm.courseCode} 
                    onChange={handleEditChange}
                    required
                  >
                    {courses.map(c => (
                      <option key={c._id} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Batch</label>
                  <select 
                    className="select w-full" 
                    name="batchCode" 
                    value={editForm.batchCode} 
                    onChange={handleEditChange}
                    required
                  >
                    {batches
                      .filter(b => b.course === courses.find(c => c.code === editForm.courseCode)?._id)
                      .map(b => (
                        <option key={b._id} value={b.code}>{b.code}</option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Instructor</label>
                  <input 
                    className="input w-full" 
                    name="instructor" 
                    value={editForm.instructor} 
                    onChange={handleEditChange} 
                  />
                </div>
                <div>
                  <label className="label">Completion Date</label>
                  <input 
                    className="input w-full" 
                    name="completionDate" 
                    type="date" 
                    value={editForm.completionDate} 
                    onChange={handleEditChange} 
                  />
                </div>
                
                {/* Custom Fields in Edit Form */}
                {templateFields.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <label className="label">Certificate Fields</label>
                    {templateFields.map((field) => (
                      <div key={field} className="flex flex-col space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </label>
                        <input
                          type="text"
                          className="input w-full"
                          value={customFields[field] || ''}
                          onChange={(e) => handleCustomFieldChange(field, e.target.value)}
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select 
                    className="select w-full" 
                    name="status" 
                    value={editForm.status} 
                    onChange={handleEditChange}
                  >
                    <option value="pending">pending</option>
                    <option value="in_progress">in_progress</option>
                    <option value="complete">complete</option>
                    <option value="blocked">blocked</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={closeEditForm}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn"
                >
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}