import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';

const AiMedicalAssistant = () => {
  const toast = useToast();
  
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: 'Hello! I am AegisCare\'s AI Medical Assistant. I can help explain diseases, standard uses of medicines, or interpret numbers on your lab reports. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(false);
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/chat', { message: userMessage });
      if (res.data.success) {
        const responseText = res.data.response;
        const isEmergency = res.data.emergencyDetected;

        setMessages(prev => [...prev, { role: 'model', content: responseText, timestamp: new Date() }]);
        
        if (isEmergency) {
          setEmergencyAlert(true);
          toast.warning('⚠️ Potentially critical emergency detected! Seek clinical care immediately.');
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      toast.error('AI Assistant is currently unavailable. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '720px' }}>
      <h1 className="dashboard-title">💬 AI Clinical Assistant</h1>
      
      {emergencyAlert && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '1rem', textTransform: 'none', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.25rem', textAlign: 'center' }}>
          🚨 POTENTIAL MEDICAL EMERGENCY DETECTED!<br />
          If you are experiencing severe symptoms (e.g. crushing chest pain, difficulty breathing, or sudden numbness), please click below to contact responders immediately:<br />
          <Link to="/sos" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '0.5rem', backgroundColor: '#fff', color: '#dc3545', border: '1px solid #dc3545', fontWeight: 'bold' }}>
            🆘 Launch Emergency SOS
          </Link>
        </div>
      )}

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '480px', padding: '1rem', marginBottom: '1rem' }}>
        {/* Chat Thread */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.25rem', marginBottom: '1rem' }}>
          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            const isEmergency = msg.content.includes('[EMERGENCY_ALERT]');
            return (
              <div
                key={idx}
                style={{
                  alignSelf: isModel ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  backgroundColor: isEmergency ? '#f8d7da' : (isModel ? '#f1f3f5' : 'var(--primary)'),
                  color: isEmergency ? '#721c24' : (isModel ? '#333' : '#fff'),
                  border: isEmergency ? '1px solid #f5c6cb' : (isModel ? '1px solid #dee2e6' : 'none'),
                  fontSize: '0.85rem',
                  lineHeight: '1.4'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '0.2rem', color: isModel ? 'var(--primary)' : '#e9ecef' }}>
                  {isModel ? '🤖 AegisCare Medical Bot' : '👤 You'}
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                <div style={{ fontSize: '0.65rem', textAlign: 'right', marginTop: '0.25rem', opacity: 0.7 }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', padding: '0.6rem 0.8rem', backgroundColor: '#e9ecef', borderRadius: '6px', fontSize: '0.8rem', color: '#666' }}>
              🤖 Typing diagnosis details...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Controls */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #dee2e6', paddingTop: '0.8rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Describe medical conditions or ask about prescriptions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{ flex: 1, margin: 0 }}
          />
          <button type="submit" className="btn btn-primary" style={{ margin: 0, minWidth: '80px' }} disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <p className="specialty-text" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#777' }}>
        ⚠️ <strong>Medical Disclaimer:</strong> AegisCare AI Assistant provides informational advice based on LLM outputs and is not a clinical physician. In case of high-risk symptoms, contact direct hospital emergency services immediately.
      </p>
    </div>
  );
};

export default AiMedicalAssistant;
