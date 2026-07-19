import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const AiSymptomChecker = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const commonSymptomsList = [
    'Fever',
    'Headache',
    'Cough',
    'Cold / Running Nose',
    'Sore Throat',
    'Skin Rash',
    'Itching',
    'Muscle / Body Pain',
    'Chest Tightness',
    'Fatigue',
  ];

  const handleCheckboxChange = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    // Combine checked checklist + text area
    const symptomsList = [...selectedSymptoms];
    if (description.trim()) {
      symptomsList.push(description.trim());
    }

    if (symptomsList.length === 0) {
      toast.error('Please enter a description or select at least one symptom');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post('/api/ai/analyze-symptoms', {
        symptoms: symptomsList.join(', '),
      });

      if (res.data.success) {
        setResult(res.data.data);
        toast.success('AI Symptom analysis complete!');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to complete symptom analysis';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in">
      <h1 className="dashboard-title">AI Symptom Assistant</h1>
      
      <div className="dashboard-grids">
        {/* Symptom Input panel */}
        <div className="grid-column">
          <div className="glass-panel">
            <h3>Describe Your Symptoms</h3>
            <p className="specialty-text" style={{ marginBottom: '1rem' }}>
              Select common symptoms or write a detailed description. Our AI model will assess possible concerns.
            </p>

            <form onSubmit={handleAnalyze}>
              {/* Checklist */}
              <div className="form-group">
                <label className="form-label">Common Symptoms Checklist</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '0.5rem 0 1.25rem 0' }}>
                  {commonSymptomsList.map((symptom) => (
                    <label key={symptom} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes(symptom)}
                        onChange={() => handleCheckboxChange(symptom)}
                      />
                      {symptom}
                    </label>
                  ))}
                </div>
              </div>

              {/* Text Description */}
              <div className="form-group">
                <label className="form-label">Write Custom Description (Optional)</label>
                <textarea
                  className="form-input"
                  rows="4"
                  placeholder="e.g. Sharp pain in the right shoulder when lifting arm, lasting for 3 days..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Analyzing Clinical Patterns...' : '🤖 Analyze Symptoms'}
              </button>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div className="grid-column">
          {loading && (
            <div className="glass-panel loading-container" style={{ minHeight: '300px' }}>
              <div className="spinner"></div>
              <h4>Analyzing Clinical Inputs...</h4>
              <p className="specialty-text">Consulting Medical Assistant AI</p>
            </div>
          )}

          {!loading && !result && (
            <div className="empty-panel glass-panel" style={{ minHeight: '300px' }}>
              <span>🔍</span>
              <h3>No Analysis Yet</h3>
              <p>Submit your symptoms on the left to receive a digital AI clinical review.</p>
            </div>
          )}

          {!loading && result && (
            <div className="glass-panel animate-fade-in">
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                AI Medical Analysis
              </h3>

              {/* Recommended Specialist */}
              <div className="symptoms-box" style={{ borderColor: '#bee5eb', backgroundColor: '#e7f1ff', marginBottom: '1rem' }}>
                <span className="box-lbl">RECOMMENDED SPECIALIST:</span>
                <h4 style={{ color: 'var(--primary)', marginTop: '0.2rem' }}>
                  👨‍⚕️ {result.recommendedSpecialist}
                </h4>
              </div>

              {/* Possible Conditions */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span className="form-label">Possible Conditions:</span>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#333' }}>
                  {result.possibleConditions?.map((cond) => (
                    <li key={cond} style={{ marginBottom: '0.25rem' }}>{cond}</li>
                  ))}
                </ul>
              </div>

              {/* Home Care */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span className="form-label">Suggested Care & Tips:</span>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#555' }}>
                  {result.homeCareSuggestions?.map((tip) => (
                    <li key={tip} style={{ marginBottom: '0.25rem' }}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.75rem', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                ⚠️ <strong>Medical Disclaimer:</strong> {result.disclaimer}
              </div>

              {/* Booking Shortcut */}
              <button
                onClick={() => navigate('/', { state: { initialSpecialization: result.recommendedSpecialist } })}
                className="btn btn-primary w-full"
              >
                Find & Book {result.recommendedSpecialist}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiSymptomChecker;
