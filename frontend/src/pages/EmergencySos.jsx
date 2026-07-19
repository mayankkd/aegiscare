import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const EmergencySos = () => {
  const toast = useToast();
  
  const [coords, setCoords] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [triggeringSos, setTriggeringSos] = useState(false);
  const [sosStatus, setSosStatus] = useState(null);

  // Initialize and get geolocation
  const fetchLocationAndHospitals = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      loadMockHospitals(null, null);
      return;
    }

    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });
        loadNearbyHospitals(lat, lng);
      },
      (error) => {
        console.warn('Geolocation access denied. Loading baseline list:', error.message);
        toast.info('Location access denied. Displaying general emergency directory.');
        loadMockHospitals(null, null);
      }
    );
  };

  const loadNearbyHospitals = async (lat, lng) => {
    try {
      const res = await axios.get(`/api/sos/hospitals?lat=${lat}&lng=${lng}`);
      if (res.data.success) {
        setHospitals(res.data.data);
      }
    } catch (err) {
      console.error('Failed to get nearby hospitals:', err);
    } finally {
      setLoadingLoc(false);
    }
  };

  const loadMockHospitals = async () => {
    try {
      const res = await axios.get('/api/sos/hospitals');
      if (res.data.success) {
        setHospitals(res.data.data);
      }
    } catch (err) {
      console.error('Failed to get mock hospitals list:', err);
    } finally {
      setLoadingLoc(false);
    }
  };

  useEffect(() => {
    fetchLocationAndHospitals();
  }, []);

  const handlePanicTrigger = async () => {
    if (!window.confirm('WARNING: Are you sure you want to trigger the Emergency SOS broadcast? This will immediately alert your registered emergency contacts.')) {
      return;
    }

    setTriggeringSos(true);
    setSosStatus(null);
    try {
      const payload = {
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        address: coords ? `Coordinates: ${coords.lat}, ${coords.lng}` : 'Unknown Location',
      };
      
      const res = await axios.post('/api/sos/alert', payload);
      if (res.data.success) {
        setSosStatus({
          contact: res.data.contact,
          message: res.data.message,
        });
        toast.success('🚨 Emergency SOS alert successfully broadcasted!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to dispatch SOS alerts.';
      toast.error(errMsg);
      setSosStatus({
        error: true,
        message: errMsg,
      });
    } finally {
      setTriggeringSos(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
      <h1 className="dashboard-title" style={{ color: '#dc3545', textAlign: 'center' }}>🚨 Emergency SOS Portal</h1>
      <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
        If you are experiencing life-threatening health symptoms, use this screen to find nearby trauma units, trigger emergency alarms, and request responders.
      </p>

      {/* Geolocation warning */}
      {loadingLoc && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }}></div>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>Resolving your coordinates and matching local trauma centers...</p>
        </div>
      )}

      {/* SOS Alert Results */}
      {sosStatus && (
        <div className={`badge ${sosStatus.error ? 'badge-danger' : 'badge-success'}`} style={{ display: 'block', padding: '1rem', textTransform: 'none', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}>
          {sosStatus.error ? (
            <span>❌ SOS Alert Failed: {sosStatus.message}</span>
          ) : (
            <div>
              <span>📢 SOS DISPATCHED: {sosStatus.message}</span>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 'normal', fontSize: '0.75rem' }}>
                Contact details: {sosStatus.contact.name} ({sosStatus.contact.relationship}) - {sosStatus.contact.phone}
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Panic Button Panel */}
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderColor: '#f5c6cb', backgroundColor: '#fff5f5' }}>
          <button
            onClick={handlePanicTrigger}
            disabled={triggeringSos}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: '8px solid #f5c6cb',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(220, 53, 69, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              margin: '1rem 0'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {triggeringSos ? 'Dispatched' : '🚨 PANIC SOS'}
          </button>
          
          <p style={{ fontSize: '0.8rem', color: '#721c24', marginTop: '1rem', fontWeight: 'bold' }}>
            Clicking this button will dispatch estimated coordinates via mock gateway logs and emails to your emergency contact.
          </p>
        </div>

        {/* Emergency Directories */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ borderBottom: '2px solid #dc3545', paddingBottom: '0.5rem', color: '#dc3545', marginBottom: '1rem' }}>
            📞 Direct Responders Directory
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' }}>
              <div>
                <h4 style={{ margin: 0 }}>National Helpline (Pan India)</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>All emergencies</p>
              </div>
              <a href="tel:112" className="btn btn-primary" style={{ margin: 0, padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                📞 Call 112
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' }}>
              <div>
                <h4 style={{ margin: 0 }}>Government Ambulance</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>Medical emergencies</p>
              </div>
              <a href="tel:102" className="btn btn-primary" style={{ margin: 0, padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                📞 Call 102
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' }}>
              <div>
                <h4 style={{ margin: 0 }}>Police Helpline</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>Safety concerns</p>
              </div>
              <a href="tel:100" className="btn btn-primary" style={{ margin: 0, padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                📞 Call 100
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Seeds nearby Indian hospitals */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '2px solid #0056b3', paddingBottom: '0.5rem', color: '#0056b3', marginBottom: '1rem' }}>
          🏥 Seeded Emergency Care Centers
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {hospitals.map((h, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
              <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#0056b3' }}>
                  {h.name} {h.distance && <span style={{ fontSize: '0.75rem', color: '#28a745', fontWeight: 'bold' }}>({h.distance} km away)</span>}
                </h4>
                <p style={{ margin: '0 0 0.15rem 0', fontSize: '0.75rem', color: '#555' }}>📍 {h.address}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#777' }}>📞 Hotline: <strong>{h.phone}</strong></p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <a href={`tel:${h.phone}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none', textAlign: 'center', margin: 0 }}>
                  Call Hotline
                </a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', textAlign: 'center', margin: 0 }}>
                  Directions Map
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencySos;
