import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// Simple in-memory cache
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function TemplatesList({ token }) {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [msg, setMsg] = useState('')

  const fetchWithCache = useCallback(async (url, options = {}) => {
    const cacheKey = `${url}_${token}`;
    const cached = dataCache.get(cacheKey);
    
    // Check if we have valid cached data
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    // Fetch fresh data
    const response = await fetch(url, { 
      ...options,
      headers: { 
        ...options.headers,
        Authorization: `Bearer ${token}` 
      }
    });
    
    const data = await response.json();
    
    // Cache the data
    if (response.ok) {
      dataCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
    
    return data;
  }, [token]);

  async function loadTemplates(useCache = true) {
    try {
      setMsg('Loading...')
      const data = await fetchWithCache('/api/admin/templates')
      setTemplates(data)
      setMsg('')
    } catch (err) {
      setMsg('Network error')
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Count visible elements in layout
  const countVisibleElements = (layout) => {
    return layout ? layout.filter(item => item.visible !== false).length : 0
  }

  // Delete template
  async function deleteTemplate(templateId) {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }
    
    try {
      setMsg('Deleting...')
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setMsg('Template deleted successfully')
        // Clear cache and reload templates list
        dataCache.clear();
        loadTemplates()
      } else {
        setMsg(data.message || 'Error deleting template')
      }
    } catch (err) {
      setMsg('Network error')
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Certificate Templates</h1>
          <p className="text-gray-600 mt-1">Manage your certificate templates</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admin/template')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Template
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => { dataCache.clear(); loadTemplates(); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template._id} className="card bg-white shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            <div className="card-body p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="card-title text-lg font-semibold text-gray-800">{template.courseName}</h3>
                  <p className="text-sm text-gray-600 mt-1">Batch: {template.batchCode}</p>
                </div>
                <span className="badge badge-primary badge-outline">{template.courseCode}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dimensions:</span>
                  <span className="font-medium">{template.width} × {template.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Elements:</span>
                  <span className="font-medium">{countVisibleElements(template.textLayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">{formatDate(template.createdAt)}</span>
                </div>
              </div>
              
              <div className="card-actions justify-end mt-6 gap-2">
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate(`/admin/template/${template._id}`)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-error btn-outline"
                  onClick={() => deleteTemplate(template._id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {templates.length === 0 && !msg && (
          <div className="col-span-full">
            <div className="card bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="card-body p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-800 mt-4">No templates found</h3>
                <p className="text-gray-600 mt-2">Get started by creating your first certificate template.</p>
                <button 
                  className="btn btn-primary mt-4"
                  onClick={() => navigate('/admin/template')}
                >
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}