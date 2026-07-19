import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PatientDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review states
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [dashboardTab, setDashboardTab] = useState('consultations');

  // EHR states
  const [ehrBloodGroup, setEhrBloodGroup] = useState('');
  const [ehrAllergies, setEhrAllergies] = useState('');
  const [ehrChronicDiseases, setEhrChronicDiseases] = useState('');
  const [ehrPreviousSurgeries, setEhrPreviousSurgeries] = useState('');
  const [ehrCurrentMedicines, setEhrCurrentMedicines] = useState('');
  const [ehrVaccinationHistory, setEhrVaccinationHistory] = useState([]);
  const [ehrFamilyHistory, setEhrFamilyHistory] = useState('');
  const [ehrEmergencyContact, setEhrEmergencyContact] = useState({ name: '', relationship: '', phone: '' });
  const [savingEhr, setSavingEhr] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDate, setVaccineDate] = useState('');

  // Reminders states
  const [reminders, setReminders] = useState([]);
  const [remMedName, setRemMedName] = useState('');
  const [remDosage, setRemDosage] = useState('');
  const [remFreq, setRemFreq] = useState('daily');
  const [remTime, setRemTime] = useState('');
  const [addingReminder, setAddingReminder] = useState(false);

  // OCR Scanner states
  const [ocrData, setOcrData] = useState(null);
  const [scanningOcr, setScanningOcr] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/appointments');
      if (res.data.success) {
        setAppointments(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchEhr = async () => {
    try {
      const res = await axios.get('/api/ehr');
      if (res.data.success && res.data.data) {
        const ehr = res.data.data;
        setEhrBloodGroup(ehr.bloodGroup || '');
        setEhrAllergies(ehr.allergies ? ehr.allergies.join(', ') : '');
        setEhrChronicDiseases(ehr.chronicDiseases ? ehr.chronicDiseases.join(', ') : '');
        setEhrPreviousSurgeries(ehr.previousSurgeries ? ehr.previousSurgeries.join(', ') : '');
        setEhrCurrentMedicines(ehr.currentMedicines ? ehr.currentMedicines.join(', ') : '');
        setEhrVaccinationHistory(ehr.vaccinationHistory || []);
        setEhrFamilyHistory(ehr.familyHistory || '');
        setEhrEmergencyContact(ehr.emergencyContact || { name: '', relationship: '', phone: '' });
      }
    } catch (err) {
      console.error('Failed to load EHR profile:', err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await axios.get('/api/reminders');
      if (res.data.success) {
        setReminders(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchEhr();
    fetchReminders();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const res = await axios.put(`/api/appointments/${id}`, { status: 'cancelled' });
      if (res.data.success) {
        toast.success('Appointment cancelled successfully');
        fetchAppointments(); // Refresh list
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to cancel appointment';
      toast.error(errorMsg);
    }
  };

  const handleReportUpload = async (e, appointmentId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('report', file);

    toast.info('Uploading medical report...');
    try {
      const res = await axios.post(`/api/appointments/${appointmentId}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Medical report uploaded successfully!');
        fetchAppointments(); // Refresh dashboard
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to upload report';
      toast.error(errorMsg);
    }
  };

  const handleReviewSubmit = async (e, appointmentId) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error('Please enter review comments');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await axios.post('/api/reviews', {
        appointmentId,
        rating: reviewRating,
        comment: reviewComment,
      });

      if (res.data.success) {
        toast.success('Review submitted successfully!');
        setActiveReviewId(null);
        setReviewComment('');
        fetchAppointments(); // Refresh dashboard
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to submit review';
      toast.error(errorMsg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveEhr = async (e) => {
    e.preventDefault();
    setSavingEhr(true);
    try {
      const res = await axios.put('/api/ehr', {
        bloodGroup: ehrBloodGroup,
        allergies: ehrAllergies.split(',').map((x) => x.trim()).filter(Boolean),
        chronicDiseases: ehrChronicDiseases.split(',').map((x) => x.trim()).filter(Boolean),
        previousSurgeries: ehrPreviousSurgeries.split(',').map((x) => x.trim()).filter(Boolean),
        currentMedicines: ehrCurrentMedicines.split(',').map((x) => x.trim()).filter(Boolean),
        vaccinationHistory: ehrVaccinationHistory,
        familyHistory: ehrFamilyHistory,
        emergencyContact: ehrEmergencyContact,
      });

      if (res.data.success) {
        toast.success('Electronic Health Record (EHR) profile saved successfully!');
        fetchEhr();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save EHR record';
      toast.error(errorMsg);
    } finally {
      setSavingEhr(false);
    }
  };

  const handleAddVaccine = (e) => {
    e.preventDefault();
    if (!vaccineName.trim() || !vaccineDate) {
      toast.error('Specify vaccine details first');
      return;
    }
    const newVaccines = [...ehrVaccinationHistory, { vaccineName: vaccineName.trim(), date: new Date(vaccineDate) }];
    setEhrVaccinationHistory(newVaccines);
    setVaccineName('');
    setVaccineDate('');
    toast.success('Vaccine added locally. Click Save EHR Profile below to sync.');
  };

  const handleRemoveVaccine = (index) => {
    const newVaccines = ehrVaccinationHistory.filter((_, idx) => idx !== index);
    setEhrVaccinationHistory(newVaccines);
    toast.info('Vaccine removed locally. Save profile to apply changes.');
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!remMedName.trim() || !remDosage.trim() || !remTime) {
      toast.error('Please specify medicine name, dosage, and reminder time');
      return;
    }
    setAddingReminder(true);
    try {
      const res = await axios.post('/api/reminders', {
        medicineName: remMedName.trim(),
        dosage: remDosage.trim(),
        frequency: remFreq,
        time: remTime,
      });
      if (res.data.success) {
        toast.success('Pill reminder successfully created!');
        setRemMedName('');
        setRemDosage('');
        setRemTime('');
        fetchReminders();
        // Ask for push notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create reminder');
    } finally {
      setAddingReminder(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      const res = await axios.delete(`/api/reminders/${id}`);
      if (res.data.success) {
        toast.success('Reminder removed successfully');
        fetchReminders();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete reminder');
    }
  };

  const handleOcrScanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('report', file);

    setScanningOcr(true);
    setOcrData(null);
    toast.info('AI is scanning document and extracting clinical fields...');
    try {
      const res = await axios.post('/api/ai/scan-report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setOcrData(res.data.data);
        toast.success('Medical report scanned successfully!');
      }
    } catch (err) {
      console.error('OCR scan failed:', err);
      toast.error(err.response?.data?.error || 'Failed to complete AI OCR scan');
    } finally {
      setScanningOcr(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC', // Keep dates matching DB save format
    });
  };

  // Group appointments
  const upcoming = appointments.filter((app) => ['confirmed', 'pending'].includes(app.status));
  const past = appointments.filter((app) => ['completed', 'cancelled'].includes(app.status));

  return (
    <div className="dashboard-container container animate-fade-in">
      <h1 className="dashboard-title">Patient Dashboard</h1>

      {/* Profile Overview */}
      <section className="profile-section glass-panel">
        <h3>Medical Profile</h3>
        <div className="profile-grid">
          <div className="profile-item">
            <span className="lbl">Name</span>
            <span className="val">{user?.name}</span>
          </div>
          <div className="profile-item">
            <span className="lbl">Email</span>
            <span className="val">{user?.email}</span>
          </div>
          <div className="profile-item">
            <span className="lbl">Phone</span>
            <span className="val">{user?.profile?.phone || 'Not provided'}</span>
          </div>
          <div className="profile-item">
            <span className="lbl">Gender</span>
            <span className="val">{user?.profile?.gender || 'Not provided'}</span>
          </div>
          <div className="profile-item">
            <span className="lbl">Date of Birth</span>
            <span className="val">
              {user?.profile?.dateOfBirth
                ? new Date(user.profile.dateOfBirth).toLocaleDateString('en-US', { timeZone: 'UTC' })
                : 'Not provided'}
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Menu */}
      <div className="tab-menu" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #dee2e6', flexWrap: 'wrap' }}>
        <button
          onClick={() => setDashboardTab('consultations')}
          className={`btn ${dashboardTab === 'consultations' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px 4px 0 0', margin: 0, borderBottom: 'none' }}
        >
          📅 Consultations History
        </button>
        <button
          onClick={() => setDashboardTab('ehr')}
          className={`btn ${dashboardTab === 'ehr' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px 4px 0 0', margin: 0, borderBottom: 'none' }}
        >
          🏥 Health Records (EHR)
        </button>
        <button
          onClick={() => setDashboardTab('reminders')}
          className={`btn ${dashboardTab === 'reminders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px 4px 0 0', margin: 0, borderBottom: 'none' }}
        >
          ⏰ Pill Reminders
        </button>
        
        {/* Upload Scan report file trigger */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '34px', borderRadius: '4px 4px 0 0', borderBottom: 'none' }}>
            {scanningOcr ? '⏳ Analyzing Report...' : '🤖 AI OCR Scanner'}
            <input
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleOcrScanUpload}
              disabled={scanningOcr}
            />
          </label>
        </div>
      </div>

      {/* Appointments & Tabs Content */}
      <div className="appointments-section">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading medical records...</p>
          </div>
        ) : (
          <>
            {/* Consultations History Tab */}
            {dashboardTab === 'consultations' && (
              <div className="dashboard-grids animate-fade-in">
                {/* Upcoming Consultations */}
                <div className="grid-column">
                  <h3 className="section-subtitle">Upcoming Consultations</h3>
                  {upcoming.length > 0 ? (
                    <div className="appointment-list">
                      {upcoming.map((app) => (
                        <div key={app._id} className="appointment-card glass-panel">
                          <div className="card-top">
                            <div>
                              <h4>{app.doctor?.name}</h4>
                              <p className="specialty-text">{app.doctorProfile?.specialization}</p>
                            </div>
                            <span className="badge badge-info">{app.status}</span>
                          </div>

                          <div className="card-middle">
                            <div className="meta-row">
                              <span className="meta-icon">📅</span>
                              <span>{formatDate(app.date)}</span>
                            </div>
                            <div className="meta-row">
                              <span className="meta-icon">⏰</span>
                              <span>{app.slot}</span>
                            </div>
                            {app.symptoms && (
                              <div className="symptoms-box">
                                <span className="box-lbl">Reported Symptoms:</span>
                                <p className="box-val">{app.symptoms}</p>
                              </div>
                            )}

                            {app.reports && app.reports.length > 0 && (
                              <div className="symptoms-box" style={{ borderColor: 'var(--border-color)' }}>
                                <span className="box-lbl">Uploaded Medical Reports:</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                                  {app.reports.map((rep) => (
                                    <a
                                      key={rep._id}
                                      href={rep.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline' }}
                                    >
                                      📄 {rep.name}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Meeting Room Link */}
                            {app.status === 'confirmed' && app.meetingRoom && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <Link to={`/video/${app.meetingRoom}`} className="btn btn-primary btn-sm w-full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                                  🎥 Join Video Room
                                </Link>
                              </div>
                            )}
                          </div>

                          <div className="card-footer" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div className="form-group" style={{ margin: 0, flex: 1 }}>
                              <label className="btn btn-secondary btn-sm" style={{ display: 'block', textAlign: 'center', margin: 0, cursor: 'pointer' }}>
                                📤 Upload Report
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleReportUpload(e, app._id)}
                                />
                              </label>
                            </div>
                            {app.status !== 'cancelled' && (
                              <button onClick={() => handleCancel(app._id)} className="btn btn-danger btn-sm" style={{ flex: 1 }}>
                                Cancel Slot
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-panel glass-panel">
                      <span>📅</span>
                      <p>No upcoming appointments</p>
                    </div>
                  )}
                </div>

                {/* Past Consultations */}
                <div className="grid-column">
                  <h3 className="section-subtitle">Medical History</h3>
                  {past.length > 0 ? (
                    <div className="appointment-list">
                      {past.map((app) => (
                        <div key={app._id} className="appointment-card glass-panel" style={{ opacity: 0.9 }}>
                          <div className="card-top">
                            <div>
                              <h4>{app.doctor?.name}</h4>
                              <p className="specialty-text">{app.doctorProfile?.specialization}</p>
                            </div>
                            <span className={`badge ${app.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                              {app.status}
                            </span>
                          </div>

                          <div className="card-middle">
                            <div className="meta-row">
                              <span className="meta-icon">📅</span>
                              <span>{formatDate(app.date)}</span>
                            </div>
                            <div className="meta-row">
                              <span className="meta-icon">⏰</span>
                              <span>{app.slot}</span>
                            </div>

                            {app.status === 'completed' && app.prescription && (
                              <div className="prescription-box glass-panel">
                                <span className="box-lbl">📄 Prescriptions & Doctor Notes:</span>
                                <p className="prescription-notes" style={{ marginBottom: '0.8rem' }}>{app.prescription}</p>
                                <a
                                  href={`${!window.location.hostname.includes('localhost') && !window.location.hostname.includes('192.168.') ? 'https://aegiscare-backend.onrender.com' : `http://${window.location.hostname}:5001`}/api/appointments/${app._id}/prescription-pdf?token=${localStorage.getItem('token')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', textDecoration: 'none' }}
                                >
                                  📥 Download PDF Prescription
                                </a>
                              </div>
                            )}

                            {app.status === 'completed' && (
                              <div style={{ marginTop: '0.8rem' }}>
                                {app.isReviewed ? (
                                  <div className="badge badge-success" style={{ display: 'inline-block', textAlign: 'center', width: '100%', padding: '0.4rem', textTransform: 'none' }}>
                                    ⭐ Reviewed
                                  </div>
                                ) : activeReviewId === app._id ? (
                                  <form
                                    onSubmit={(e) => handleReviewSubmit(e, app._id)}
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid #dee2e6',
                                      borderRadius: '4px',
                                      backgroundColor: '#f8f9fa',
                                      marginTop: '0.5rem',
                                    }}
                                  >
                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                                        Select Rating
                                      </label>
                                      <select
                                        className="form-input"
                                        value={reviewRating}
                                        onChange={(e) => setReviewRating(Number(e.target.value))}
                                        style={{ padding: '0.25rem', fontSize: '0.75rem' }}
                                      >
                                        <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                                        <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                                        <option value={3}>⭐⭐⭐ (3/5)</option>
                                        <option value={2}>⭐⭐ (2/5)</option>
                                        <option value={1}>⭐ (1/5)</option>
                                      </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                                        Review Comments
                                      </label>
                                      <textarea
                                        className="form-input"
                                        rows="2"
                                        placeholder="Write a feedback comment..."
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        style={{ fontSize: '0.75rem' }}
                                        required
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => setActiveReviewId(null)}
                                        className="btn btn-secondary btn-sm flex-1"
                                        style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        className="btn btn-primary btn-sm flex-1"
                                        disabled={submittingReview}
                                        style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                                      >
                                        {submittingReview ? 'Submitting...' : 'Submit'}
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveReviewId(app._id);
                                      setReviewRating(5);
                                      setReviewComment('');
                                    }}
                                    className="btn btn-primary btn-sm w-full"
                                    style={{ display: 'block', textAlign: 'center' }}
                                  >
                                    ⭐ Write Review
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-panel glass-panel">
                      <span>📂</span>
                      <p>No medical history records</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Health Records (EHR) Tab */}
            {dashboardTab === 'ehr' && (
              <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                <h3 style={{ borderBottom: '2px solid #0056b3', paddingBottom: '0.5rem', color: '#0056b3', marginBottom: '1rem' }}>
                  Electronic Health Records (EHR)
                </h3>
                <form onSubmit={handleSaveEhr}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Blood Group</label>
                      <select
                        className="form-select"
                        value={ehrBloodGroup}
                        onChange={(e) => setEhrBloodGroup(e.target.value)}
                      >
                        <option value="">Not Selected</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Allergies (comma separated)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Peanuts, Penicillin"
                        value={ehrAllergies}
                        onChange={(e) => setEhrAllergies(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Chronic Diseases (comma separated)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Hypertension, Diabetes"
                        value={ehrChronicDiseases}
                        onChange={(e) => setEhrChronicDiseases(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Previous Surgeries (comma separated)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Appendectomy (2018)"
                        value={ehrPreviousSurgeries}
                        onChange={(e) => setEhrPreviousSurgeries(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Current Medications (comma separated)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Metformin 500mg"
                        value={ehrCurrentMedicines}
                        onChange={(e) => setEhrCurrentMedicines(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Family Medical History</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Father has cardiac history"
                        value={ehrFamilyHistory}
                        onChange={(e) => setEhrFamilyHistory(e.target.value)}
                      />
                    </div>
                  </div>

                  <h4 style={{ color: '#0056b3', marginTop: '1.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.25rem' }}>
                    Emergency Contact
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Contact Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={ehrEmergencyContact.name}
                        onChange={(e) => setEhrEmergencyContact({ ...ehrEmergencyContact, name: e.target.value })}
                        placeholder="Name"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Relationship</label>
                      <input
                        type="text"
                        className="form-input"
                        value={ehrEmergencyContact.relationship}
                        onChange={(e) => setEhrEmergencyContact({ ...ehrEmergencyContact, relationship: e.target.value })}
                        placeholder="Relationship"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={ehrEmergencyContact.phone}
                        onChange={(e) => setEhrEmergencyContact({ ...ehrEmergencyContact, phone: e.target.value })}
                        placeholder="Phone"
                      />
                    </div>
                  </div>

                  <h4 style={{ color: '#0056b3', marginTop: '1.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.25rem' }}>
                    Vaccination History
                  </h4>
                  {ehrVaccinationHistory.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {ehrVaccinationHistory.map((vac, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '0.8rem' }}>
                          <span>🛡️ <strong>{vac.vaccineName}</strong> ({new Date(vac.date).toLocaleDateString()})</span>
                          <button type="button" onClick={() => handleRemoveVaccine(idx)} style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>No vaccination records added yet.</p>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Vaccine Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Covid-19 Booster"
                        value={vaccineName}
                        onChange={(e) => setVaccineName(e.target.value)}
                        style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, width: '150px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Date Received</label>
                      <input
                        type="date"
                        className="form-input"
                        value={vaccineDate}
                        onChange={(e) => setVaccineDate(e.target.value)}
                        style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <button type="button" onClick={handleAddVaccine} className="btn btn-secondary btn-sm" style={{ height: '34px', margin: 0 }}>
                      ➕ Add Vaccine
                    </button>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={savingEhr} style={{ width: '100%' }}>
                    {savingEhr ? 'Saving Profiles...' : '💾 Save EHR Profile'}
                  </button>
                </form>
              </div>
            )}

            {/* Pill Reminders Tab */}
            {dashboardTab === 'reminders' && (
              <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                <h3 style={{ borderBottom: '2px solid #0056b3', paddingBottom: '0.5rem', color: '#0056b3', marginBottom: '1.25rem' }}>
                  💊 Medicine & Pill Reminders
                </h3>
                
                <form onSubmit={handleAddReminder} style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', border: '1px solid #dee2e6', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>⏰ Set New Pill Reminder</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Medicine Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Paracetamol 650"
                        value={remMedName}
                        onChange={(e) => setRemMedName(e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Dosage Description</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 1 Tablet"
                        value={remDosage}
                        onChange={(e) => setRemDosage(e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Frequency</label>
                      <select
                        className="form-select"
                        value={remFreq}
                        onChange={(e) => setRemFreq(e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.8rem', height: 'auto', minHeight: '34px' }}
                      >
                        <option value="daily">Everyday (Daily)</option>
                        <option value="weekly">Once Weekly</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Reminder Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={remTime}
                        onChange={(e) => setRemTime(e.target.value)}
                        style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '34px', margin: 0 }} disabled={addingReminder}>
                      {addingReminder ? 'Adding...' : '🔔 Set Reminder'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#333', marginBottom: '0.75rem' }}>Active Pill Reminders ({reminders.length})</h4>
                {reminders.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {reminders.map((rem) => (
                      <div key={rem._id} className="glass-panel" style={{ padding: '1rem', border: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', color: '#0056b3' }}>💊 {rem.medicineName}</h4>
                          <p style={{ margin: '0 0 0.15rem 0', fontSize: '0.8rem', color: '#555' }}>
                            <strong>Dosage:</strong> {rem.dosage}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#777' }}>
                            📅 {rem.frequency} at ⏰ <strong>{rem.time}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteReminder(rem._id)}
                          className="btn btn-danger btn-sm"
                          style={{ margin: 0, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
                    <span>🔔</span>
                    <p style={{ margin: '0.5rem 0 0 0' }}>No active pill schedules. Configure one above.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* OCR Results Modal popup */}
      {ocrData && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '520px', textAlign: 'left' }}>
            <div className="modal-header">
              <h3>🤖 AI OCR Scanner Report</h3>
              <button className="modal-close" onClick={() => setOcrData(null)}>×</button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '400px' }}>
              <p><strong>Document Type:</strong> {ocrData.documentType}</p>
              <p><strong>Patient Name:</strong> {ocrData.patientName}</p>
              
              <h4 style={{ color: '#0056b3', marginTop: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.25rem' }}>Extracted Findings</h4>
              {ocrData.keyFindings && ocrData.keyFindings.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                      <th style={{ padding: '0.4rem', textAlign: 'left' }}>Metric / Test</th>
                      <th style={{ padding: '0.4rem', textAlign: 'left' }}>Value</th>
                      <th style={{ padding: '0.4rem', textAlign: 'center' }}>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocrData.keyFindings.map((finding, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.4rem' }}>{finding.metric}</td>
                        <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>{finding.value}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                          <span className={`badge ${
                            finding.status?.toLowerCase().includes('high') || finding.status?.toLowerCase().includes('low') || finding.status?.toLowerCase().includes('abnormal')
                              ? 'badge-danger' : 'badge-success'
                          }`} style={{ fontSize: '0.7rem' }}>
                            {finding.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#666' }}>No specific metrics extracted.</p>
              )}

              <h4 style={{ color: '#0056b3', marginTop: '1.25rem' }}>AI Clinical Interpretation</h4>
              <p style={{ fontSize: '0.8rem', padding: '0.6rem', backgroundColor: '#e9ecef', borderRadius: '4px', fontStyle: 'italic', margin: '0.25rem 0' }}>
                "{ocrData.interpretation}"
              </p>

              <h4 style={{ color: '#0056b3', marginTop: '1.25rem' }}>Next Steps</h4>
              <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.25rem 0' }}>
                👉 {ocrData.recommendedNextSteps}
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setOcrData(null)} className="btn btn-primary w-full" style={{ margin: 0 }}>
                Dismiss Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
