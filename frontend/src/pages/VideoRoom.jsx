import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLeave = () => {
    if (user?.role === 'patient') {
      navigate('/patient-dashboard');
    } else if (user?.role === 'doctor') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/');
    }
  };

  const jitsiUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false`;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1000px' }}>
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3>Telehealth Video Consultation</h3>
          <p className="specialty-text">Room ID: <strong>{roomId}</strong></p>
        </div>
        <button onClick={handleLeave} className="btn btn-danger">
          🚪 Leave Consultation
        </button>
      </div>

      <div className="glass-panel" style={{ height: '600px', overflow: 'hidden', padding: '0', border: '2px solid #dee2e6' }}>
        <iframe
          src={jitsiUrl}
          title="Jitsi Consultation Room"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
        ></iframe>
      </div>
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p className="specialty-text" style={{ fontSize: '0.8rem' }}>
          🔒 End-to-end encrypted peer connection. Ensure microphone and camera access are allowed.
        </p>
      </div>
    </div>
  );
};

export default VideoRoom;
