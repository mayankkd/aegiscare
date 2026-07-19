import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BookingModal from '../components/BookingModal';
import { io } from 'socket.io-client';

const Home = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');

  // Practice Filters
  const [experience, setExperience] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [minRating, setMinRating] = useState('');
  
  // Booking modal state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      let url = `/api/doctors?specialization=${specialization}&search=${search}`;
      if (experience) url += `&experience=${experience}`;
      if (maxFee) url += `&maxFee=${maxFee}`;
      if (location) url += `&location=${encodeURIComponent(location)}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      if (language) url += `&language=${encodeURIComponent(language)}`;
      if (minRating) url += `&minRating=${minRating}`;

      const res = await axios.get(url);
      if (res.data.success) {
        setDoctors(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      toast.error('Failed to load doctors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search/filter API calls
    const delayDebounceFn = setTimeout(() => {
      fetchDoctors();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, specialization, experience, maxFee, location, city, language, minRating]);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:5001`);

    socket.on('doctor:status-updated', (data) => {
      setDoctors((prevDoctors) =>
        prevDoctors.map((doc) =>
          doc.user?._id === data.doctorId || doc.user === data.doctorId
            ? { ...doc, status: data.status }
            : doc
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleBookClick = (doctor) => {
    if (!user) {
      toast.info('Please log in to book an appointment');
      navigate('/login');
      return;
    }

    if (user.role !== 'patient') {
      toast.warning('Only patients can book consultations');
      return;
    }

    setSelectedDoctor(doctor);
    setShowModal(true);
  };

  const specializations = [
    'Cardiologist',
    'Dermatologist',
    'Pediatrician',
    'General Physician',
    'Neurologist',
  ];

  return (
    <div className="home-container container animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section glass-panel">
        <h1 className="hero-title">Your Health, Guided By Experts</h1>
        <p className="hero-subtitle">
          Securely schedule physical or remote consultations with board-certified physicians. 
          Manage your appointments and medical records in a single place.
        </p>
        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">10k+</span>
            <span className="stat-label">Active Patients</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">150+</span>
            <span className="stat-label">Specialist Doctors</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">4.9★</span>
            <span className="stat-label">Average Rating</span>
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="directory-section">
        <div className="directory-header">
          <h2>Find a Specialist</h2>
          <p>Search by name or filter by medical specialty</p>
        </div>

        {/* Compounding Search & Practice Filters Toolbar */}
        <div className="filters-container glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', padding: '1rem', marginBottom: '1.5rem' }}>
          {/* Search Doctor */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Doctor Name</label>
            <input
              type="text"
              placeholder="Search by name..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem' }}
            />
          </div>

          {/* Specialty */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Specialization</label>
            <select
              className="form-select"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem', height: 'auto', minHeight: '34px', width: '100%' }}
            >
              <option value="">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>City</label>
            <select
              className="form-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem', height: 'auto', minHeight: '34px', width: '100%' }}
            >
              <option value="">All Cities</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Chennai">Chennai</option>
              <option value="Gurugram">Gurugram</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          {/* Language */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Language</label>
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem', height: 'auto', minHeight: '34px', width: '100%' }}
            >
              <option value="">All Languages</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Tamil">Tamil</option>
            </select>
          </div>

          {/* Min Rating */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Min Rating</label>
            <select
              className="form-select"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem', height: 'auto', minHeight: '34px', width: '100%' }}
            >
              <option value="">Any Rating</option>
              <option value="4.0">⭐ 4.0 & above</option>
              <option value="4.5">⭐ 4.5 & above</option>
              <option value="4.8">⭐ 4.8 & above</option>
            </select>
          </div>

          {/* Experience */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Experience</label>
            <select
              className="form-select"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem', height: 'auto', minHeight: '34px', width: '100%' }}
            >
              <option value="">All Experience</option>
              <option value="5">5+ Years</option>
              <option value="10">10+ Years</option>
              <option value="15">15+ Years</option>
            </select>
          </div>

          {/* Fee Limit */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Max Fee Scale</label>
            <select
              className="form-select"
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem', height: 'auto', minHeight: '34px', width: '100%' }}
            >
              <option value="">Any Fee</option>
              <option value="500">Under ₹500</option>
              <option value="1000">Under ₹1000</option>
              <option value="1500">Under ₹1500</option>
              <option value="2000">Under ₹2000</option>
            </select>
          </div>

          {/* Hospital Location */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>Hospital Address</label>
            <input
              type="text"
              placeholder="e.g. Apollo, Sector..."
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.45rem' }}
            />
          </div>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading clinical schedules...</p>
          </div>
        ) : doctors.length > 0 ? (
          <div className="doctors-grid">
            {doctors.map((doctor) => (
              <div key={doctor._id} className="doctor-card glass-panel">
                <div className="doctor-card-header">
                  <div className="avatar-placeholder">🩺</div>
                  <div>
                    <h3 className="doctor-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {doctor.user?.name}
                      <span
                        title={`Status: ${doctor.status || 'Offline'}`}
                        style={{
                          display: 'inline-block',
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: doctor.status === 'Online' ? '#28a745' : (doctor.status === 'Busy' ? '#ffc107' : (doctor.status === 'In Consultation' ? '#dc3545' : '#6c757d')),
                          boxShadow: doctor.status === 'Online' ? '0 0 6px #28a745' : 'none'
                        }}
                      />
                    </h3>
                    <span className="doctor-specialty badge badge-info">
                      {doctor.specialization}
                    </span>
                  </div>
                </div>

                <div className="doctor-card-body">
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.3rem' }}>
                    🏥 <strong>{doctor.hospitalName || 'AegisCare Clinic'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.6rem' }}>
                    🗣️ {doctor.languages ? doctor.languages.join(', ') : 'Hindi, English'} | 📍 {doctor.city || 'New Delhi'}
                  </div>
                  <p className="doctor-bio">{doctor.bio}</p>
                  
                  <div className="doctor-meta-grid">
                    <div className="meta-box">
                      <span className="meta-label">Experience</span>
                      <span className="meta-val">{doctor.experience} Years</span>
                    </div>
                    <div className="meta-box">
                      <span className="meta-label">Rating</span>
                      <span className="meta-val">⭐ {doctor.rating} ({doctor.reviewsCount})</span>
                    </div>
                    <div className="meta-box">
                      <span className="meta-label">Consultation</span>
                      <span className="meta-val">₹{doctor.pricePerConsultation}</span>
                    </div>
                  </div>
                </div>

                <div className="doctor-card-footer">
                  {user?.role === 'doctor' ? (
                    <button className="btn btn-secondary w-full" disabled>
                      Doctor Panel Account
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => handleBookClick(doctor)}
                    >
                      Book Consultation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state glass-panel">
            <span>🔍</span>
            <h3>No Doctors Found</h3>
            <p>Try refining your search terms or selecting a different specialization.</p>
          </div>
        )}
      </section>

      {/* Booking Modal */}
      {showModal && selectedDoctor && (
        <BookingModal
          doctor={selectedDoctor}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            // Refetch doctor availability or list if needed
            fetchDoctors();
          }}
        />
      )}
    </div>
  );
};

export default Home;
