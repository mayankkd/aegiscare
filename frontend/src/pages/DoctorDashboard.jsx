import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  ArcElement
);

const DoctorDashboard = () => {
  const { doctorProfile } = useAuth();
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'analytics'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Prescription form state
  const [activePrescriptionId, setActivePrescriptionId] = useState(null);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [submittingPrescription, setSubmittingPrescription] = useState(false);

  // EHR preview states
  const [ehrPatientId, setEhrPatientId] = useState(null);
  const [ehrData, setEhrData] = useState(null);
  const [loadingEhr, setLoadingEhr] = useState(false);

  // Status state
  const [doctorStatus, setDoctorStatus] = useState(doctorProfile?.status || 'Offline');

  useEffect(() => {
    if (doctorProfile) {
      setDoctorStatus(doctorProfile.status || 'Offline');
    }
  }, [doctorProfile]);

  const handleStatusChange = async (newStatus) => {
    setDoctorStatus(newStatus);
    try {
      const res = await axios.put('/api/doctors/status', { status: newStatus });
      if (res.data.success) {
        toast.success(`Live status changed to: ${newStatus}`);
      }
    } catch (err) {
      console.error('Failed to change status:', err);
      toast.error('Failed to update live status on server');
    }
  };

  const handleViewEhr = async (patientUserId) => {
    if (ehrPatientId === patientUserId) {
      setEhrPatientId(null);
      setEhrData(null);
      return;
    }
    setEhrPatientId(patientUserId);
    setLoadingEhr(true);
    try {
      const res = await axios.get(`/api/ehr/patient/${patientUserId}`);
      if (res.data.success) {
        setEhrData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load patient EHR:', err);
      toast.error('Failed to fetch patient EHR records');
    } finally {
      setLoadingEhr(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/appointments');
      if (res.data.success) {
        setAppointments(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to load appointments schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await axios.get('/api/doctors/analytics/dashboard');
      if (res.data.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast.error('Failed to load practice analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this appointment as ${status}?`)) return;

    try {
      const res = await axios.put(`/api/appointments/${id}`, { status });
      if (res.data.success) {
        toast.success(`Appointment status updated to ${status}`);
        fetchAppointments();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update status';
      toast.error(errorMsg);
    }
  };

  const handlePrescriptionSubmit = async (e, id) => {
    e.preventDefault();
    if (!prescriptionText.trim()) {
      toast.error('Please enter prescription details before submitting');
      return;
    }

    setSubmittingPrescription(true);
    try {
      const res = await axios.post(`/api/appointments/${id}/prescription`, {
        prescription: prescriptionText,
      });

      if (res.data.success) {
        toast.success('Prescription added and consultation completed successfully!');
        setActivePrescriptionId(null);
        setPrescriptionText('');
        fetchAppointments();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to submit prescription';
      toast.error(errorMsg);
    } finally {
      setSubmittingPrescription(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const activeConsultations = appointments.filter((app) => ['confirmed', 'pending'].includes(app.status));
  const pastConsultations = appointments.filter((app) => ['completed', 'cancelled'].includes(app.status));

  return (
    <div className="dashboard-container container animate-fade-in">
      <h1 className="dashboard-title">Doctor Consultation Panel</h1>

      {/* Doctor Info Banner */}
      {doctorProfile && (
        <section className="profile-section doctor-banner glass-panel">
          <div className="banner-details">
            <span className="banner-avatar">🩺</span>
            <div>
              <h3>{doctorProfile.specialization} Credentials</h3>
              <p className="experience-val">{doctorProfile.experience} years experience</p>
              <div className="ratings-bar">
                <span>⭐ {doctorProfile.rating} Rating</span>
                <span className="divider">•</span>
                <span>₹{doctorProfile.pricePerConsultation} consultation fee</span>
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>Live Status:</span>
                <select
                  value={doctorStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Online">🟢 Online</option>
                  <option value="Offline">⚫ Offline</option>
                  <option value="Busy">🟡 Busy</option>
                  <option value="In Consultation">🔴 In Consultation</option>
                </select>
              </div>
            </div>
          </div>
          <div className="practice-stats">
            <div className="p-stat">
              <span className="stat-num">{activeConsultations.length}</span>
              <span className="stat-lbl">Active Visits</span>
            </div>
            <div className="p-stat">
              <span className="stat-num">
                {appointments.filter((app) => app.status === 'completed').length}
              </span>
              <span className="stat-lbl">Completed</span>
            </div>
          </div>
        </section>
      )}
       {/* Navigation Tabs */}
      <div className="tab-menu" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`btn ${activeTab === 'appointments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px 4px 0 0', margin: 0, borderBottom: 'none' }}
        >
          📅 Patient Appointments
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', borderRadius: '4px 4px 0 0', margin: 0, borderBottom: 'none' }}
        >
          📊 Practice Analytics
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="appointments-section">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading patient schedules...</p>
            </div>
          ) : (
            <div className="dashboard-grids">
              {/* Active Schedule */}
              <div className="grid-column">
                <h3 className="section-subtitle">Scheduled Patients</h3>
                {activeConsultations.length > 0 ? (
                  <div className="appointment-list">
                    {activeConsultations.map((app) => (
                      <div key={app._id} className="appointment-card glass-panel">
                        <div className="card-top">
                          <div>
                            <h4>{app.patient?.name}</h4>
                            <p className="specialty-text">
                              Patient • Age: {calculateAge(app.patient?.profile?.dateOfBirth)} •{' '}
                              {app.patient?.profile?.gender || 'Other'}
                            </p>
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
                          {app.patient?.profile?.phone && (
                            <div className="meta-row">
                              <span className="meta-icon">📞</span>
                              <span>{app.patient.profile.phone}</span>
                            </div>
                          )}
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
                                    style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}
                                  >
                                    📄 {rep.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* View Patient EHR Record Button */}
                          <div style={{ marginTop: '0.8rem' }}>
                            <button
                              type="button"
                              onClick={() => handleViewEhr(app.patient._id)}
                              className="btn btn-secondary btn-sm w-full"
                              style={{ display: 'block', margin: 0, textAlign: 'center' }}
                            >
                              {ehrPatientId === app.patient._id ? '📋 Close Patient EHR Profile' : '📋 View Patient EHR Profile'}
                            </button>

                            {ehrPatientId === app.patient._id && (
                              <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: '#f8f9fa', fontSize: '0.8rem', textAlign: 'left' }}>
                                {loadingEhr ? (
                                  <p style={{ margin: 0 }}>Fetching clinical profile...</p>
                                ) : ehrData ? (
                                  <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#0056b3', borderBottom: '1px solid #dee2e6', paddingBottom: '0.2rem' }}>Patient Health History</h4>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Blood Group:</strong> {ehrData.bloodGroup || 'Not Specified'}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Allergies:</strong> {ehrData.allergies?.length > 0 ? ehrData.allergies.join(', ') : 'None'}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Chronic Diseases:</strong> {ehrData.chronicDiseases?.length > 0 ? ehrData.chronicDiseases.join(', ') : 'None'}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Current Medicines:</strong> {ehrData.currentMedicines?.length > 0 ? ehrData.currentMedicines.join(', ') : 'None'}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Previous Surgeries:</strong> {ehrData.previousSurgeries?.length > 0 ? ehrData.previousSurgeries.join(', ') : 'None'}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Family History:</strong> {ehrData.familyHistory || 'None recorded'}</p>
                                    
                                    <h5 style={{ margin: '0.5rem 0 0.25rem 0', color: '#0056b3' }}>Emergency Contact</h5>
                                    <p style={{ margin: 0 }}>
                                      {ehrData.emergencyContact?.name ? `${ehrData.emergencyContact.name} (${ehrData.emergencyContact.relationship}) - ${ehrData.emergencyContact.phone}` : 'Not Specified'}
                                    </p>

                                    <h5 style={{ margin: '0.5rem 0 0.25rem 0', color: '#0056b3' }}>Vaccination Log</h5>
                                    {ehrData.vaccinationHistory?.length > 0 ? (
                                      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                                        {ehrData.vaccinationHistory.map((vac, idx) => (
                                          <li key={idx}>{vac.vaccineName} ({new Date(vac.date).toLocaleDateString()})</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p style={{ margin: 0 }}>No vaccines recorded.</p>
                                    )}
                                  </div>
                                ) : (
                                  <p style={{ margin: 0, color: '#dc3545' }}>No health profile created yet.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action workflow */}
                        {activePrescriptionId === app._id ? (
                          <form
                            onSubmit={(e) => handlePrescriptionSubmit(e, app._id)}
                            className="prescription-form animate-fade-in"
                          >
                            <div className="form-group">
                              <label className="form-label">Write Clinical Prescription / Notes</label>
                              <textarea
                                className="form-input"
                                rows="3"
                                placeholder="e.g. Paracetamol 500mg - 3 times daily for 3 days. Stay hydrated..."
                                value={prescriptionText}
                                onChange={(e) => setPrescriptionText(e.target.value)}
                                required
                              />
                            </div>
                            <div className="form-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePrescriptionId(null);
                                  setPrescriptionText('');
                                }}
                                className="btn btn-secondary btn-sm"
                                disabled={submittingPrescription}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={submittingPrescription}
                              >
                                {submittingPrescription ? 'Saving...' : 'Submit & Complete'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="card-actions-doctor" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {app.meetingRoom && (
                              <Link
                                to={`/video/${app.meetingRoom}`}
                                className="btn btn-primary btn-sm"
                                style={{ textDecoration: 'none', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                              >
                                📹 Start Call
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                setActivePrescriptionId(app._id);
                                setPrescriptionText('');
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Diagnose & Prescribe
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(app._id, 'cancelled')}
                              className="btn btn-danger btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel glass-panel">
                    <span>📅</span>
                    <p>No active appointments scheduled</p>
                  </div>
                )}
              </div>

              {/* Historical Log */}
              <div className="grid-column">
                <h3 className="section-subtitle">Past Consultations Log</h3>
                {pastConsultations.length > 0 ? (
                  <div className="appointment-list">
                    {pastConsultations.map((app) => (
                      <div key={app._id} className="appointment-card glass-panel">
                        <div className="card-top">
                          <div>
                            <h4>{app.patient?.name}</h4>
                            <p className="specialty-text">
                              Patient • Age: {calculateAge(app.patient?.profile?.dateOfBirth)} •{' '}
                              {app.patient?.profile?.gender || 'Other'}
                            </p>
                          </div>
                          <span
                            className={`badge ${
                              app.status === 'completed' ? 'badge-success' : 'badge-danger'
                            }`}
                          >
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
                                    style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}
                                  >
                                    📄 {rep.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {app.status === 'completed' && app.prescription && (
                            <div className="prescription-box glass-panel">
                              <span className="box-lbl">📄 Prescribed Notes:</span>
                              <p className="prescription-notes" style={{ marginBottom: '0.8rem' }}>{app.prescription}</p>
                              <a
                                href={`http://${window.location.hostname}:5001/api/appointments/${app._id}/prescription-pdf?token=${localStorage.getItem('token')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'inline-flex', textDecoration: 'none' }}
                              >
                                📥 Download PDF Prescription
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel glass-panel">
                    <span>📂</span>
                    <p>No records in clinical logs</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-section animate-fade-in" style={{ marginTop: '1rem' }}>
          {loadingAnalytics || !analyticsData ? (
            <div className="loading-container" style={{ minHeight: '300px' }}>
              <div className="spinner"></div>
              <p>Aggregating practice analytics...</p>
            </div>
          ) : (
            <div>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>₹</span>
                  <h3 style={{ margin: '0.5rem 0', color: 'var(--primary)' }}>
                    ₹{analyticsData.stats.totalRevenue.toLocaleString('en-IN')}
                  </h3>
                  <p className="specialty-text" style={{ margin: 0 }}>Total Revenue</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>🤝</span>
                  <h3 style={{ margin: '0.5rem 0', color: 'var(--primary)' }}>
                    {analyticsData.stats.uniquePatients}
                  </h3>
                  <p className="specialty-text" style={{ margin: 0 }}>Unique Patients</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                  <h3 style={{ margin: '0.5rem 0', color: 'var(--primary)' }}>
                    {analyticsData.stats.averageVisitDuration ? `${analyticsData.stats.averageVisitDuration}m` : '18.2m'}
                  </h3>
                  <p className="specialty-text" style={{ margin: 0 }}>Avg Visit Length</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <h3 style={{ margin: '0.5rem 0', color: 'var(--primary)' }}>
                    {analyticsData.stats.completedAppointments}
                  </h3>
                  <p className="specialty-text" style={{ margin: 0 }}>Completed Visits</p>
                </div>
              </div>

              {/* Chart Visualizations */}
              <div className="dashboard-grids">
                {/* Bookings Trend */}
                <div className="grid-column">
                  <div className="glass-panel">
                    <h3>Monthly Bookings Trend ({new Date().getFullYear()})</h3>
                    <div style={{ height: '250px', position: 'relative', marginTop: '1rem' }}>
                      <Bar
                        data={{
                          labels: analyticsData.monthlyTrends.map(t => t.month),
                          datasets: [
                            {
                              label: 'Number of Bookings',
                              data: analyticsData.monthlyTrends.map(t => t.bookings),
                              backgroundColor: '#0056b3',
                              borderWidth: 1,
                              borderRadius: 4,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: { stepSize: 1 }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="grid-column">
                  <div className="glass-panel">
                    <h3>Appointment Status Distribution</h3>
                    <div style={{ height: '250px', position: 'relative', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <Doughnut
                        data={{
                          labels: ['Completed', 'Cancelled', 'Active (Pending/Confirmed)'],
                          datasets: [
                            {
                              data: [
                                analyticsData.stats.completedAppointments,
                                analyticsData.stats.cancelledAppointments,
                                analyticsData.stats.activeAppointments
                              ],
                              backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                              borderWidth: 1,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Patient Gender Demographics */}
                <div className="grid-column">
                  <div className="glass-panel">
                    <h3>Patient Gender Demographics</h3>
                    <div style={{ height: '250px', position: 'relative', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <Doughnut
                        data={{
                          labels: ['Male', 'Female', 'Other/Unknown'],
                          datasets: [
                            {
                              data: [
                                analyticsData.stats.demographics?.male || 0,
                                analyticsData.stats.demographics?.female || 0,
                                analyticsData.stats.demographics?.other || 0
                              ],
                              backgroundColor: ['#0056b3', '#e83e8c', '#6c757d'],
                              borderWidth: 1,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
