import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Simple cache for dropdown data
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function TemplateUpload({ token }) {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('template') // 'template' or 'text'
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [courseCode, setCourseCode] = useState('')
  const [batchCode, setBatchCode] = useState('')
  const [width, setWidth] = useState(1600)
  const [height, setHeight] = useState(1131)
  const [zoom, setZoom] = useState(0.5)
  const [showSidebar, setShowSidebar] = useState(true)
  const [layout, setLayout] = useState([
    { field: "name", x: 800, y: 500, fontSize: 64, color: "#000000", align: "center", visible: true },
    { field: "amharicName", x: 800, y: 540, fontSize: 64, color: "#000000", align: "center", visible: false },
    { field: "course", x: 800, y: 580, fontSize: 36, color: "#333333", align: "center", visible: true },
    { field: "date", x: 800, y: 660, fontSize: 28, color: "#555555", align: "center", visible: true },
    { field: "amharicDate", x: 800, y: 700, fontSize: 28, color: "#555555", align: "center", visible: false },
    { field: "instructor", x: 800, y: 740, fontSize: 28, color: "#555555", align: "center", visible: true },
    { field: "batch", x: 800, y: 820, fontSize: 22, color: "#666666", align: "center", visible: true }
  ])
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [existingTemplate, setExistingTemplate] = useState(null)
  const [msg, setMsg] = useState('')
  const [draggingItem, setDraggingItem] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  const scaleRef = useRef(zoom)
  useEffect(() => { scaleRef.current = zoom }, [zoom])

  // Available fields for templates (includes Amharic variants)
  const FIELD_OPTIONS = [
    { value: 'name', label: 'Student Name' },
    { value: 'amharicName', label: 'Student Name (Amharic)' },
    { value: 'course', label: 'Course Name' },
    { value: 'date', label: 'Completion Date' },
    { value: 'amharicDate', label: 'Completion Date (Amharic)' },
    { value: 'instructor', label: 'Instructor' },
    { value: 'batch', label: 'Batch Code' },
    { value: 'publicId', label: 'Public ID' }
  ];
  const [fieldToAdd, setFieldToAdd] = useState(FIELD_OPTIONS[0].value)

  const fetchWithCache = useCallback(async (url) => {
    // Check cache first
    const cached = dataCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    // Fetch fresh data
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    
    // Cache successful responses
    if (res.ok) {
      dataCache.set(url, {
        data,
        timestamp: Date.now()
      });
    }
    
    return res.ok ? data : null;
  }, [token]);

  async function loadCourses() {
    const data = await fetchWithCache('/api/admin/courses')
    if (data) { 
      setCourses(data); 
      if (data[0]) setCourseCode(data[0].code) 
    }
  }
  
  async function loadBatches(courseId) {
    if (!courseId) return setBatches([])
    const data = await fetchWithCache(`/api/admin/batches?courseId=${courseId}`)
    if (data) { 
      setBatches(data); 
      if (data[0]) setBatchCode(data[0].code) 
    }
  }

  // Load existing template if editing
  async function loadTemplate(templateId) {
    try {
      setMsg('Loading template...')
      const res = await fetch(`/api/admin/templates/${templateId}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) {
        setExistingTemplate(data)
        setCourseCode(data.courseCode)
        setBatchCode(data.batchCode)
        setWidth(data.width)
        setHeight(data.height)
        
        // Create a new layout by merging the default layout with the saved template data
        // This ensures all default elements are present with their saved properties
        const newLayout = layout.map(defaultItem => {
          // Find the corresponding item in the saved template
          const savedItem = data.textLayout.find(item => item.field === defaultItem.field)
          // If found, use the saved item's properties; otherwise, use the default
          // Make sure to preserve the visible property correctly
          if (savedItem) {
            return {
              ...defaultItem, // Start with default properties
              ...savedItem,   // Override with saved properties
              visible: savedItem.visible !== undefined ? savedItem.visible : true // Default to visible if not set
            }
          }
          return { ...defaultItem, visible: true } // Default items should be visible
        })
        
        // Handle any additional items in the saved template that aren't in the default layout
        const additionalItems = data.textLayout
          .filter(savedItem => !layout.some(defaultItem => defaultItem.field === savedItem.field))
          .map(item => ({
            field: item.field || "custom", 
            x: item.x || 800, 
            y: item.y || 500, 
            fontSize: item.fontSize || 48, 
            color: item.color || "#000000", 
            align: item.align || "center", 
            ...item, // Override defaults with saved properties
            visible: item.visible !== undefined ? item.visible : true
          }))
        
        setLayout([...newLayout, ...additionalItems])
        
        // Load the existing background image as a blob to avoid authorization issues
        loadBackgroundImage(templateId)
        setMsg('')
      } else {
        setMsg(data.message || 'Error loading template')
      }
    } catch (err) {
      setMsg('Network error')
    }
  }
  
  // Load background image as a blob
  async function loadBackgroundImage(templateId) {
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/background`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (res.ok) {
        const blob = await res.blob()
        const imageUrl = URL.createObjectURL(blob)
        setPreviewUrl(imageUrl)
      } else {
        setPreviewUrl(null)
      }
    } catch (err) {
      console.error('Error loading background image:', err)
      setPreviewUrl(null)
    }
  }

  useEffect(() => { loadCourses() }, [])
  useEffect(() => { const c = courses.find(x=>x.code===courseCode); loadBatches(c?._id) }, [courses, courseCode])

  // Load template if editing
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId)
    }
  }, [templateId])

  // Handle file selection for preview
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  // Handle drag start
  const handleDragStart = (e, index) => {
    const item = layout[index]
    const rect = canvasRef.current.getBoundingClientRect()
    setDraggingItem(index)
    setDragOffset({
      x: (e.clientX - rect.left) / scaleRef.current - item.x,
      y: (e.clientY - rect.top) / scaleRef.current - item.y
    })
  }

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault()
    if (draggingItem === null) return

    const rect = canvasRef.current.getBoundingClientRect()
    const newX = (e.clientX - rect.left) / scaleRef.current - dragOffset.x
    const newY = (e.clientY - rect.top) / scaleRef.current - dragOffset.y

    setLayout(prev => {
      const newLayout = [...prev]
      newLayout[draggingItem] = {
        ...newLayout[draggingItem],
        x: Math.max(0, Math.min(width, newX)),
        y: Math.max(0, Math.min(height, newY))
      }
      return newLayout
    })

    setDraggingItem(null)
  }

  // Update field properties
  const updateField = (index, property, value) => {
    setLayout(prev => {
      const newLayout = [...prev]
      newLayout[index] = {
        ...newLayout[index],
        [property]: value
      }
      return newLayout
    })
  }

  // Toggle field visibility
  const toggleFieldVisibility = (index) => {
    setLayout(prev => {
      const newLayout = [...prev]
      newLayout[index] = {
        ...newLayout[index],
        visible: !newLayout[index].visible
      }
      return newLayout
    })
  }

  // Add a new field to the layout (if not already present)
  const addFieldToLayout = (field) => {
    if (!field) return
    // Prevent duplicates
    if (layout.some(i => i.field === field)) {
      setMsg('Field already present in layout')
      return
    }
    const defaults = { x: 800, y: 500, fontSize: 48, color: '#000000', align: 'center', visible: true }
    setLayout(prev => [...prev, { field, ...defaults }])
  }

  // Convert layout to JSON string for submission (including ALL elements with their visibility state)
  const layoutJson = JSON.stringify(layout, null, 2)

  async function onSubmit(e) {
    e.preventDefault()
    // For editing, we still need to upload a new image or keep the existing one
    // In a real implementation, you might want to handle this differently
    if (!file && !existingTemplate) { 
      setMsg('Please choose a background image'); 
      return 
    }
    try {
      setMsg('Saving...')
      const fd = new FormData()
      fd.append('courseCode', courseCode)
      fd.append('batchCode', batchCode)
      fd.append('width', String(width))
      fd.append('height', String(height))
      fd.append('textLayout', layoutJson)
      if (file) {
        fd.append('background', file)
      }
      
      // Use PUT for updating existing templates, POST for new ones
      const method = existingTemplate ? 'PUT' : 'POST'
      const url = existingTemplate ? `/api/admin/templates/${existingTemplate._id}` : '/api/admin/templates'
      
      const res = await fetch(url, { 
        method, 
        headers: { Authorization: `Bearer ${token}` }, 
        body: fd 
      })
      const data = await res.json()
      if (!res.ok) { 
        setMsg(data.message || 'Save failed')
        return 
      }
      setMsg('Template saved')
      // Redirect to templates list after saving
      setTimeout(() => navigate('/admin/templates'), 1000)
    } catch(err) {
      console.error('Network error:', err)
      setMsg('Network error: ' + err.message)
    }
  }

  // Get field label
  const getFieldLabel = (field) => {
    switch (field) {
      case 'name': return 'Student Name'
      case 'amharicName': return 'Student Name (Amharic)'
      case 'course': return 'Course Name'
      case 'amharicDate': return 'Completion Date (Amharic)'
      case 'date': return 'Completion Date'
      case 'instructor': return 'Instructor'
      case 'batch': return 'Batch Code'
      default: return field
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {existingTemplate ? 'Edit Certificate Template' : 'Upload Certificate Template'}
          </h1>
          <p className="text-gray-600 mt-1">
            {existingTemplate ? 'Modify your existing certificate template' : 'Create a new certificate template'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="inline-flex lg:hidden items-center justify-center p-2 rounded-md border hover:bg-gray-50"
            onClick={() => setShowSidebar(v => !v)}
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8M4 18h16" />
            </svg>
          </button>
          <div className="hidden lg:flex items-center gap-1">
            <button className="btn btn-sm" onClick={() => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(2)))}>−</button>
            <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
            <button className="btn btn-sm" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
            <button className="btn btn-sm" onClick={() => setZoom(1)}>100%</button>
            <button className="btn btn-sm" onClick={() => setZoom(0.6)}>Fit</button>
          </div>
          <button 
            className="btn btn-outline"
            onClick={() => navigate('/admin/templates')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            View All Templates
          </button>
        </div>
      </div>
      
      {msg && (
        <div className="alert alert-info mb-6">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{msg}</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-[520px_minmax(0,1fr)] xl:grid-cols-[600px_minmax(0,1fr)] gap-1 lg:gap-2">
        {/* Left Column - Controls with Tabs (collapsible on small screens) */}
        <div className={`lg:w-[520px] xl:w-[600px] ${showSidebar ? '' : 'hidden lg:block'} lg:sticky lg:top-16 lg:self-start`}>
          <div className="card bg-white shadow-sm rounded-xl border border-gray-200 w-full">
            <div className="card-body p-0">
              {/* Tab Navigation */}
              <div
                className="inline-flex w-full rounded-md bg-gray-100 p-1"
                role="tablist"
                aria-label="Template editor sections"
                onKeyDown={(e) => {
                  const order = ['template','text']
                  const i = order.indexOf(activeTab)
                  if (e.key === 'ArrowRight') {
                    const next = order[(i + 1) % order.length]
                    setActiveTab(next)
                    setTimeout(() => document.getElementById(`tab-${next}`)?.focus(), 0)
                    e.preventDefault()
                  }
                  if (e.key === 'ArrowLeft') {
                    const prev = order[(i - 1 + order.length) % order.length]
                    setActiveTab(prev)
                    setTimeout(() => document.getElementById(`tab-${prev}`)?.focus(), 0)
                    e.preventDefault()
                  }
                  if (e.key === 'Home') {
                    setActiveTab(order[0])
                    setTimeout(() => document.getElementById(`tab-${order[0]}`)?.focus(), 0)
                    e.preventDefault()
                  }
                  if (e.key === 'End') {
                    setActiveTab(order[order.length - 1])
                    setTimeout(() => document.getElementById(`tab-${order[order.length - 1]}`)?.focus(), 0)
                    e.preventDefault()
                  }
                }}
              >
                <button 
                  id="tab-template"
                  role="tab"
                  aria-selected={activeTab === 'template'}
                  aria-controls="tabpanel-template"
                  tabIndex={activeTab === 'template' ? 0 : -1}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition ${activeTab === 'template' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('template')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Template
                </button>
                <button 
                  id="tab-text"
                  role="tab"
                  aria-selected={activeTab === 'text'}
                  aria-controls="tabpanel-text"
                  tabIndex={activeTab === 'text' ? 0 : -1}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition ${activeTab === 'text' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('text')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Text
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="p-3">
                {activeTab === 'template' ? (
                  // Template Information Tab
                  <div id="tabpanel-template" role="tabpanel" aria-labelledby="tab-template" className="space-y-3">
                    <div>
                      <label className="label-text text-xs text-gray-500">Course</label>
                      <select 
                        className="select select-bordered select-sm w-full" 
                        value={courseCode} 
                        onChange={e=>setCourseCode(e.target.value)} 
                        disabled={!!existingTemplate}
                      >
                        {courses.map(c=> <option key={c._id} value={c.code}>{c.name} ({c.code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-text text-xs text-gray-500">Batch</label>
                      <select 
                        className="select select-bordered select-sm w-full" 
                        value={batchCode} 
                        onChange={e=>setBatchCode(e.target.value)} 
                        disabled={!!existingTemplate}
                      >
                        {batches.map(b=> <option key={b._id} value={b.code}>{b.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-text text-xs text-gray-500">Width (px)</label>
                      <input 
                        type="number" 
                        className="input input-bordered input-sm w-full" 
                        value={width} 
                        onChange={e=>setWidth(Number(e.target.value))} 
                        placeholder="Width" 
                      />
                    </div>
                    <div>
                      <label className="label-text text-xs text-gray-500">Height (px)</label>
                      <input 
                        type="number" 
                        className="input input-bordered input-sm w-full" 
                        value={height} 
                        onChange={e=>setHeight(Number(e.target.value))} 
                        placeholder="Height" 
                      />
                    </div>
                    <div>
                      <label className="label-text text-xs text-gray-500">Background Image</label>
                      <input 
                        type="file" 
                        className="file-input file-input-bordered file-input-sm w-full" 
                        accept="image/*" 
                        onChange={e=>setFile(e.target.files?.[0]||null)} 
                      />
                      {existingTemplate && !file && (
                        <div className="text-xs text-gray-500 mt-1">
                          Leave blank to keep existing image
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Text Elements Tab
                  <div id="tabpanel-text" role="tabpanel" aria-labelledby="tab-text" className="space-y-2 max-h-[70vh] lg:max-h-[75vh] overflow-y-auto pr-1">
                    {/* Add field control: lets admin add extra fields (including Amharic) */}
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        className="select select-bordered select-sm"
                        value={fieldToAdd}
                        onChange={(e) => setFieldToAdd(e.target.value)}
                      >
                        {FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => addFieldToLayout(fieldToAdd)}
                      >
                        Add Field
                      </button>
                      <div className="text-xs text-gray-500">Add common or Amharic fields to template</div>
                    </div>
                    {layout.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded p-2 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <label className="label cursor-pointer flex items-center p-0">
                            <input 
                              type="checkbox" 
                              checked={item.visible} 
                              onChange={() => toggleFieldVisibility(index)}
                              className="checkbox checkbox-primary checkbox-xs mr-2"
                            />
                            <span className="label-text text-xs font-medium text-gray-700">{getFieldLabel(item.field)}</span>
                          </label>
                          <div className={`badge badge-xs ${item.visible ? 'badge-success' : 'badge-ghost'}`}>
                            {item.visible ? 'On' : 'Off'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 mt-0">
                          <div>
                            <label className="label-text text-xs text-gray-500">Size</label>
                            <input 
                              type="range" 
                              min="10" 
                              max="100" 
                              value={item.fontSize} 
                              onChange={(e) => updateField(index, 'fontSize', Number(e.target.value))}
                              className="range range-xs range-primary"
                              disabled={!item.visible}
                            />
                            <div className="text-xs text-center text-gray-500">{item.fontSize}</div>
                          </div>
                          <div>
                            <label className="label-text text-xs text-gray-500">Color</label>
                            <input 
                              type="color" 
                              value={item.color} 
                              onChange={(e) => updateField(index, 'color', e.target.value)}
                              className="w-full h-6 rounded border border-gray-300"
                              disabled={!item.visible}
                            />
                          </div>
                          <div>
                            <label className="label-text text-xs text-gray-500">X Pos</label>
                            <input 
                              type="range" 
                              min="0" 
                              max={width} 
                              value={item.x} 
                              onChange={(e) => updateField(index, 'x', Number(e.target.value))}
                              className="range range-xs range-primary"
                              disabled={!item.visible}
                            />
                            <div className="text-xs text-center text-gray-500">{item.x}</div>
                          </div>
                          <div>
                            <label className="label-text text-xs text-gray-500">Y Pos</label>
                            <input 
                              type="range" 
                              min="0" 
                              max={height} 
                              value={item.y} 
                              onChange={(e) => updateField(index, 'y', Number(e.target.value))}
                              className="range range-xs range-primary"
                              disabled={!item.visible}
                            />
                            <div className="text-xs text-center text-gray-500">{item.y}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Save Button */}
              <div className="p-3 pt-0">
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm w-full"
                  onClick={onSubmit}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {existingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Certificate Preview (More Space) */}
        <div className="min-w-0">
          <div className="card bg-white shadow-sm rounded-xl border border-gray-200 h-full p-0 w-full">
            <div className="card-body pt-0 pb-1 px-2 lg:pt-0 lg:pb-2 lg:px-3">
              <div className="flex items-center justify-between gap-1 mb-0">
                <h2 className="card-title text-lg font-semibold text-gray-800">Certificate Preview</h2>
                <div className="flex items-center gap-1 lg:hidden">
                  <button className="btn btn-sm" onClick={() => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(2)))}>−</button>
                  <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button className="btn btn-sm" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-0 min-h-[320px] lg:min-h-[500px] flex items-center justify-center overflow-auto">
                <div className="relative" style={{ width: width * zoom, height: height * zoom }}>
                  <div 
                    ref={canvasRef}
                    className="relative bg-white shadow-lg rounded overflow-hidden"
                    style={{ width, height, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Certificate preview" 
                        className="absolute inset-0"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : existingTemplate ? (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="font-medium">Existing template background</div>
                          <div className="text-sm mt-1">(Upload new image to change)</div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="font-medium">Preview will appear here</div>
                          <div className="text-sm mt-1">after uploading background image</div>
                        </div>
                      </div>
                    )}
                    {layout.filter(item => item.visible).map((item, index) => {
                      const originalIndex = layout.findIndex(i => i.field === item.field);
                      return (
                        <div
                          key={originalIndex}
                          draggable
                          onDragStart={(e) => handleDragStart(e, originalIndex)}
                          className={`absolute cursor-move px-3 py-1.5 rounded text-sm font-medium shadow-sm ${
                            draggingItem === originalIndex ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white bg-opacity-80 border border-gray-300'
                          }`}
                          style={{
                            left: `${(item.x / width) * 100}%`,
                            top: `${(item.y / height) * 100}%`,
                            fontSize: `${item.fontSize}px`,
                            color: item.color,
                            textAlign: item.align,
                            transform: 'translate(-50%, -50%)',
                            minWidth: '120px',
                            minHeight: '24px',
                            maxWidth: '90%',
                            wordBreak: 'break-word',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          {getFieldLabel(item.field)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-3 text-center">{previewUrl || existingTemplate ? `Preview: ${width}×${height} · ${Math.round(zoom * 100)}%` : 'No preview available'}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden JSON field for submission */}
      <div className="hidden">
        <label className="label">Layout (JSON)</label>
        <textarea className="input w-full" value={layoutJson} readOnly rows={10} style={{fontFamily:'monospace'}} />
      </div>
    </div>
  )
}