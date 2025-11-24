import React, { useEffect, useState, Suspense } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import logo from './assets/logo.png'
const Login = React.lazy(() => import('./pages/Login'))
const Courses = React.lazy(() => import('./pages/Courses'))
const Batches = React.lazy(() => import('./pages/Batches'))
const TemplateUpload = React.lazy(() => import('./pages/TemplateUpload'))
const TemplatesList = React.lazy(() => import('./pages/TemplatesList'))
const ImportStudents = React.lazy(() => import('./pages/ImportStudents'))
const Students = React.lazy(() => import('./pages/Students'))
const Instructors = React.lazy(() => import('./pages/Instructors'))
const CertificateDownload = React.lazy(() => import('./pages/CertificateDownload'))
const ApiTest = React.lazy(() => import('./pages/ApiTest'))

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const save = (t) => { setToken(t); if (t) localStorage.setItem('token', t); else localStorage.removeItem('token'); }
  return { token, setToken: save }
}

function Nav({ onLogout }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const nav = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login'
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b shadow-sm">
      <div className="container py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="shrink-0">
              <img src={logo} alt="Logo" className="h-8 w-auto sm:h-9" />
            </Link>
            <button
              className="inline-flex items-center justify-center lg:hidden p-2 rounded-md border hover:bg-gray-50"
              onClick={() => setOpen(v => !v)}
              aria-label="Toggle sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="font-bold text-lg truncate">TE Certification</Link>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden lg:flex items-center gap-1">
              {isAdmin ? (
                <>
                  <Link to="/admin/courses" className="px-3 py-2 rounded-md hover:bg-gray-100">Courses</Link>
                  <Link to="/admin/batches" className="px-3 py-2 rounded-md hover:bg-gray-100">Batches</Link>
                  <Link to="/admin/template" className="px-3 py-2 rounded-md hover:bg-gray-100">Upload Template</Link>
                  <Link to="/admin/templates" className="px-3 py-2 rounded-md hover:bg-gray-100">Templates</Link>
                  <Link to="/admin/students" className="px-3 py-2 rounded-md hover:bg-gray-100">Students</Link>
                  <Link to="/admin/students/import" className="px-3 py-2 rounded-md hover:bg-gray-100">Import</Link>
                  <Link to="/admin/instructors" className="px-3 py-2 rounded-md hover:bg-gray-100">Instructors</Link>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition"
                    onClick={() => { onLogout(); nav('/admin/login') }}
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                    </svg>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" className="px-3 py-2 rounded-md hover:bg-gray-100">Download</Link>
                  <Link to="/admin/login" className="px-3 py-2 rounded-md hover:bg-gray-100">Admin</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t bg-white">
          <div className="container py-2 flex flex-col gap-1">
            {isAdmin ? (
              <>
                <Link to="/admin/courses" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Courses</Link>
                <Link to="/admin/batches" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Batches</Link>
                <Link to="/admin/template" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Upload Template</Link>
                <Link to="/admin/templates" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Templates</Link>
                <Link to="/admin/students" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Students</Link>
                <Link to="/admin/students/import" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Import</Link>
                <Link to="/admin/instructors" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Instructors</Link>
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-left border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition"
                  onClick={() => { setOpen(false); onLogout(); nav('/admin/login') }}
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Download</Link>
                <Link to="/admin/login" className="px-3 py-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>Admin</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default function App() {
  const { token, setToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hideNav = location.pathname === '/' || location.pathname === '/admin/login'
  
  // Remove the automatic redirect to login when no token

  return (
    <div className="flex flex-col min-h-screen">
      {!hideNav && <Nav onLogout={() => setToken('')} />}
      <main className="flex-1 container py-6">
        <Suspense fallback={<div className="py-10 text-center text-gray-500">Loading...</div>}>
        <Routes>
          <Route path="/admin/login" element={<Login setToken={setToken} />} />
          <Route path="/admin/courses" element={<Courses token={token} />} />
          <Route path="/admin/batches" element={<Batches token={token} />} />
          <Route path="/admin/template" element={<TemplateUpload token={token} />} />
          <Route path="/admin/template/:templateId" element={<TemplateUpload token={token} />} />
          <Route path="/admin/templates" element={<TemplatesList token={token} />} />
          <Route path="/admin/students/import" element={<ImportStudents token={token} />} />
          <Route path="/admin/students" element={<Students token={token} />} />
          <Route path="/admin/instructors" element={<Instructors token={token} />} />
          <Route path="/test" element={<ApiTest token={token} />} />
          <Route path="/" element={<CertificateDownload />} />
          <Route path="*" element={<CertificateDownload />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  )
}