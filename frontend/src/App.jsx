import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const AiSymptomChecker = lazy(() => import('./pages/AiSymptomChecker'));
const VideoRoom = lazy(() => import('./pages/VideoRoom'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AiMedicalAssistant = lazy(() => import('./pages/AiMedicalAssistant'));
const EmergencySos = lazy(() => import('./pages/EmergencySos'));

// Protected Route Component for Role-Based Authorization
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading session data...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  return (
    <Router>
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Suspense
            fallback={
              <div className="loading-container" style={{ minHeight: '300px' }}>
                <div className="spinner"></div>
                <p>Loading medical resources...</p>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Patient Protected Dashboard */}
              <Route
                path="/patient-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Patient Protected AI Symptom Checker */}
              <Route
                path="/ai-symptoms"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <AiSymptomChecker />
                  </ProtectedRoute>
                }
              />

              {/* Doctor Protected Dashboard */}
              <Route
                path="/doctor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Video Consultation Room */}
              <Route
                path="/video/:roomId"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                    <VideoRoom />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Dashboard */}
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Protected AI Medical Assistant */}
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <AiMedicalAssistant />
                  </ProtectedRoute>
                }
              />
              {/* Protected Emergency SOS */}
              <Route
                path="/sos"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <EmergencySos />
                  </ProtectedRoute>
                }
              />
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
