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
  const [customFields, setCustomFields] = useState({})
  const [newStatus, setNewStatus] = useState('pending')
  const [createdId, setCreatedId] = useState('')
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [instructors, setInstructors] = useState([])
  const [instructorMode, setInstructorMode] = useState('pick') // pick | other
  const [courseAttributes, setCourseAttributes] = useState([]) // Store enabled attributes for selected course

  // Edit student form
  const [editingStudent, setEditingStudent] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    courseCode: '',
    batchCode: '',
    status: 'pending',
    instructor: '',
    completionDate: '',
    an: '',
    ad: ''
  })

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
        if (!courseCode && coursesData[0]) {
          setCourseCode(coursesData[0].code);
          // Set initial course attributes if available
          if (coursesData[0].attributes) {
            setCourseAttributes(coursesData[0].attributes);
          }
        }
      }
    })()
  }, [])

  // load batches and attributes for selected course with caching
  useEffect(() => {
    (async () => {
      console.log('Available courses:', courses); // Debug log
      const course = courses.find(c => c.code === courseCode);
      console.log('Selected course:', course); // Debug log
      
      if (!course) { 
        console.log('No course found with code:', courseCode); // Debug log
        setBatches([]);
        setCourseAttributes([]);
        return; 
      }
      
      // Set course attributes if available
      if (course.attributes && course.attributes.length > 0) {
        console.log('Setting course attributes:', course.attributes); // Debug log
        setCourseAttributes(course.attributes);
      } else {
        console.log('No attributes found for course:', course.code, course.name); // Debug log
        setCourseAttributes([]);
      }
      
      // Check if we have cached batches for this course
      const cacheKey = `batches_${course._id}`;
      const batchesData = await fetchWithCache(`/api/admin/batches?courseId=${course._id}`, cacheKey);
      if (batchesData) {
        setBatches(batchesData);
        if (!batchCode && batchesData[0]) setBatchCode(batchesData[0].code);
      }
      
      // refresh instructors for the selected course
      const instData = await fetchWithCache(
        `/api/admin/instructors?courseCode=${encodeURIComponent(course.code)}`,
        `instructors_${course.code}`
      );
      if (instData) setInstructors(instData);
    })();
    
    // reset paging when filters change
    setPage(1);
    load();
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

  // Handle custom field changes
  const handleCustomFieldChange = (field, value) => {
    setCustomFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate input field for a custom attribute
  const renderCustomField = (attr) => {
    const value = customFields[attr.name] || '';
    const inputId = `field-${attr.name}`;
    
    return (
      <div key={attr.name} className="mb-4">
        <label htmlFor={inputId} className="label">
          <span>{attr.label || attr.name}</span>
          {attr.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {attr.type === 'select' ? (
          <select
            id={inputId}
            className="select select-bordered w-full"
            value={value}
            onChange={(e) => handleCustomFieldChange(attr.name, e.target.value)}
            required={attr.required}
          >
            <option value="">Select {attr.label || attr.name}</option>
            {attr.options?.map((option, i) => (
              <option key={i} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            type={attr.type || 'text'}
            className="input input-bordered w-full"
            placeholder={attr.placeholder || `Enter ${attr.label || attr.name}`}
            value={value}
            onChange={(e) => handleCustomFieldChange(attr.name, e.target.value)}
            required={attr.required}
          />
        )}
        
        {attr.description && (
          <div className="text-xs text-gray-500 mt-1">
            {attr.description}
          </div>
        )}
      </div>
    );
  };

  // Validate required fields before submission
  const validateForm = () => {
    if (!courseCode) {
      setMsg('Please select a course');
      return false;
    }
    
    if (!batchCode) {
      setMsg('Please select a batch');
      return false;
    }
    
    // Check required custom fields
    const missingFields = [];
    courseAttributes.forEach(attr => {
      if (attr.required && !customFields[attr.name]) {
        missingFields.push(attr.label || attr.name);
      }
    });
    
    if (missingFields.length > 0) {
      setMsg(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    return true;
  };

  async function createStudent(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setMsg('Creating...');
    setCreatedId('');
    
    // Include all custom fields, even empty ones (they might be handled by the server)
    const body = { 
      name: name.trim(),
      email: email.trim(),
      courseCode,
      batchCode,
      status: newStatus,
      instructor: instructor.trim(),
      completionDate,
      customFields: { ...customFields } // Send all fields, let server handle validation
    };
    const res = await fetch('/api/admin/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body)
    })
    const data = await res.json(); if (!res.ok) { setMsg(data.message||'Error'); return }
    setMsg('Created')
    setCreatedId(data.publicId)
    setName(''); setEmail(''); setInstructor(''); setCompletionDate('')
    setCustomFields({});
    // after create, reload first page to include newest at top
    setPage(1);
    load();
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
      an: student.customFields?.an || '',
      ad: student.customFields?.ad || ''
    })
  }

  // Close edit form
  function closeEditForm() {
    setEditingStudent(null)
  }

  // Handle edit form changes
  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Update student
  async function updateStudent(e) {
    e.preventDefault()
    setMsg('Updating...')
    
    const { an, ad, ...rest } = editForm;
    const updateData = {
      ...rest,
      customFields: {
        an,
        ad,
        ...(editingStudent?.customFields || {}) // Preserve other custom fields if they exist
      }
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

  // Debug function to fetch and log course data
  const debugFetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('Courses API Response:', data);
      alert('Check console for course data');
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Error fetching courses. Check console for details.');
    }
  };

  return (
    <div className="w-full">
      <button 
        onClick={debugFetchCourses}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg z-50"
        title="Debug: Fetch Course Data"
      >
        🐞
      </button>
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
                    className="select select-bordered w-full" 
                    value={courseCode} 
                    onChange={e => { 
                      setCourseCode(e.target.value);
                      setBatchCode('');
                      setCustomFields({});
                    }}
                    disabled={courses.length === 0}
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  {courses.length === 0 && (
                    <div className="text-xs text-gray-500 mt-1">Loading courses...</div>
                  )}
                </div>
                <div>
                  <label className="label">Batch</label>
                  <select 
                    className="select select-bordered w-full" 
                    value={batchCode} 
                    onChange={e => setBatchCode(e.target.value)}
                    disabled={batches.length === 0}
                  >
                    <option value="">Select a batch</option>
                    {batches.map(b => (
                      <option key={b._id} value={b.code}>
                        {b.code}
                      </option>
                    ))}
                  </select>
                  {batches.length === 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {courseCode ? 'Loading batches...' : 'Select a course first'}
                    </div>
                  )}
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
                
                {/* Course Attributes Section */}
                <div className={`mt-6 pt-4 ${courseAttributes.length > 0 ? 'border-t border-gray-200' : ''}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-700">
                      Course Attributes
                      {courseCode && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          (for {courses.find(c => c.code === courseCode)?.name || 'selected course'})
                        </span>
                      )}
                    </h3>
                    {courseAttributes.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {courseAttributes.length} {courseAttributes.length === 1 ? 'attribute' : 'attributes'}
                      </span>
                    )}
                  </div>
                  
                  {!courseCode ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Select a course to see available attributes
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : courseAttributes.length > 0 ? (
                    <div className="space-y-4">
                      {courseAttributes.map((attr, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          {renderCustomField(attr)}
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                              {attr.type || 'text'}
                            </span>
                            {attr.required && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No attributes defined</h3>
                      <p className="mt-1 text-sm text-gray-500">This course doesn't have any custom attributes defined.</p>
                    </div>
                  )}
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