import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Setup base URL for Axios dynamically using current window hostname
const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isProd = !apiHost.includes('localhost') && !apiHost.includes('192.168.');
axios.defaults.baseURL = isProd 
  ? 'https://aegiscare-backend.onrender.com' 
  : `http://${apiHost}:5001`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Sync token to Axios headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Check if user is logged in on refresh
  const loadUser = async () => {
    if (!token) {
      setUser(null);
      setDoctorProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setDoctorProfile(res.data.doctorProfile);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [token]);

  // Login
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid credentials';
      return { success: false, error: errorMsg };
    }
  };

  // Register
  const register = async (userData) => {
    try {
      const res = await axios.post('/api/auth/register', userData);
      if (res.data.success) {
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMsg };
    }
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    setDoctorProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        doctorProfile,
        token,
        loading,
        login,
        register,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
