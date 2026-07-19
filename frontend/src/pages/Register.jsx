import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Register = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    // Doctor specific fields
    specialization: 'General Physician',
    bio: '',
    experience: '',
    pricePerConsultation: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password } = formData;

    if (!name || !email || !password) {
      toast.error('Name, email, and password are required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    
    // Structure payload based on role
    const payload = {
      name,
      email,
      password,
      role,
      phone: formData.phone,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
    };

    if (role === 'doctor') {
      payload.specialization = formData.specialization;
      payload.bio = formData.bio;
      payload.experience = Number(formData.experience) || 1;
      payload.pricePerConsultation = Number(formData.pricePerConsultation) || 50;
    }

    const result = await register(payload);
    setSubmitting(false);

    if (result.success) {
      toast.success('Registration successful! Welcome to AegisCare.');
      navigate('/');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-container container animate-fade-in">
      <div className="auth-card register-card glass-panel">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Register as a patient to schedule bookings, or sign up as a provider</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Register As</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === 'patient' ? 'active' : ''}`}
                onClick={() => setRole('patient')}
              >
                👤 Patient
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'doctor' ? 'active' : ''}`}
                onClick={() => setRole('doctor')}
              >
                🩺 Medical Doctor
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Aarav Sharma"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="e.g. aarav.sharma@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="e.g. 98765 43210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Gender</label>
              <select
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                className="form-input"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Doctor specific fields */}
          {role === 'doctor' && (
            <div className="doctor-extra-fields glass-panel animate-fade-in">
              <h4 className="extra-title">Professional Credentials</h4>
              
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Medical Specialization</label>
                  <select
                    name="specialization"
                    className="form-select"
                    value={formData.specialization}
                    onChange={handleChange}
                  >
                    <option value="General Physician">General Physician</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Dermatologist">Dermatologist</option>
                    <option value="Pediatrician">Pediatrician</option>
                    <option value="Neurologist">Neurologist</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Years of Experience</label>
                  <input
                    type="number"
                    name="experience"
                    className="form-input"
                    placeholder="e.g. 8"
                    value={formData.experience}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Consultation Fee (₹ INR)</label>
                  <input
                    type="number"
                    name="pricePerConsultation"
                    className="form-input"
                    placeholder="e.g. 500"
                    value={formData.pricePerConsultation}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Professional Biography</label>
                <textarea
                  name="bio"
                  className="form-input"
                  rows="3"
                  placeholder="Tell patients about your clinical focus, qualifications..."
                  value={formData.bio}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full auth-btn"
            disabled={submitting}
          >
            {submitting ? 'Registering Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
