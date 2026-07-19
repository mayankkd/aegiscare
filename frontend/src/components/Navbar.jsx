import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { io } from 'socket.io-client';

const Navbar = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Connect to Socket.io server
    const socket = io(`http://${window.location.hostname}:5001`);

    // Register user room ID
    if (user.role === 'doctor') {
      socket.emit('doctor:online', user._id);
    } else {
      socket.emit('join', user._id);
    }

    socket.on('notification', (data) => {
      // Add notification to state
      setNotifications((prev) => [data, ...prev]);
      // Trigger live toast alert
      toast.info(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowDropdown(false);
  };

  return (
    <nav className="navbar-container glass-panel">
      <div className="navbar-inner" style={{ position: 'relative' }}>
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">✦</span> AegisCare
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          {user ? (
            <>
              {user.role === 'patient' ? (
                <>
                  <Link to="/ai-symptoms" className="nav-link">Symptom Checker</Link>
                  <Link to="/ai-assistant" className="nav-link">AI Assistant</Link>
                  <Link to="/sos" className="nav-link" style={{ color: '#dc3545', fontWeight: 'bold' }}>🆘 Emergency SOS</Link>
                  <Link to="/patient-dashboard" className="nav-link">Dashboard</Link>
                </>
              ) : user.role === 'admin' ? (
                <Link to="/admin-dashboard" className="nav-link">Admin Panel</Link>
              ) : (
                <Link to="/doctor-dashboard" className="nav-link">Doctor Panel</Link>
              )}

              {/* Realtime Notification Bell Icon */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    position: 'relative',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Notifications"
                >
                  🔔
                  {notifications.length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        borderRadius: '50%',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      width: '280px',
                      backgroundColor: 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      padding: '0.5rem',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#333' }}>Alerts</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearNotifications}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0056b3',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
                        No new notifications
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifications.map((notif, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.5rem',
                              borderBottom: index === notifications.length - 1 ? 'none' : '1px solid #f8f9fa',
                              fontSize: '0.8rem',
                              lineHeight: '1.3',
                              color: '#333',
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.15rem' }}>
                              {notif.title}
                            </div>
                            <div>{notif.message}</div>
                            <span style={{ fontSize: '0.65rem', color: '#999', marginTop: '0.15rem', display: 'block' }}>
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="nav-user-info">
                <span className="user-badge">{user.role}</span>
                <span className="user-name">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
