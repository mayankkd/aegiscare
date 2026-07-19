import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const BookingModal = ({ doctor, onClose, onSuccess }) => {
  const toast = useToast();
  const { user } = useAuth();

  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  // Sandbox payment simulator state
  const [sandboxOrder, setSandboxOrder] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Fetch reviews for doctor
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`/api/reviews/doctor/${doctor.user._id}`);
        if (res.data.success) {
          setReviews(res.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching doctor reviews:', err);
      }
    };
    fetchReviews();
  }, [doctor.user._id]);

  // Helper to load external scripts (Razorpay checkout)
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Get minimum date (today) in YYYY-MM-DD format
  const getMinDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Fetch available slots when date changes
  useEffect(() => {
    if (!date) return;

    const fetchAvailableSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const res = await axios.get(`/api/doctors/${doctor._id}?date=${date}`);
        if (res.data.success) {
          setSlots(res.data.availableSlots || []);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        toast.error('Failed to load available slots for this date');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [date, doctor._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !selectedSlot) {
      toast.error('Please select both a date and a time slot');
      return;
    }

    setBooking(true);
    let pendingAppointmentId = null;

    try {
      // 1. Create the pending appointment
      const res = await axios.post('/api/appointments', {
        doctorUserId: doctor.user._id,
        date,
        slot: selectedSlot,
        symptoms,
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to initiate appointment booking');
      }

      const appointment = res.data.data;
      pendingAppointmentId = appointment._id;

      // 2. Generate Payment Order
      const orderRes = await axios.post(`/api/appointments/${pendingAppointmentId}/create-order`);
      if (!orderRes.data.success) {
        throw new Error(orderRes.data.error || 'Failed to generate payment order');
      }

      const { mode, order, key } = orderRes.data;

      if (mode === 'live') {
        // Load Razorpay Script dynamically
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error('Failed to load Razorpay SDK script. Check your internet connection.');
        }

        const options = {
          key: key,
          amount: order.amount,
          currency: order.currency,
          name: 'AegisCare Telehealth',
          description: `Consultation Booking - Dr. ${doctor.user.name}`,
          order_id: order.id,
          handler: async function (response) {
            try {
              toast.info('Verifying transaction details...');
              const verifyRes = await axios.post(`/api/appointments/${pendingAppointmentId}/verify-payment`, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                mode: 'live',
                amount: order.amount,
              });

              if (verifyRes.data.success) {
                toast.success('Payment verified successfully! Slot secured.');
                onSuccess();
                onClose();
              }
            } catch (err) {
              const errTxt = err.response?.data?.error || 'Payment validation failed';
              toast.error(errTxt);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
          },
          modal: {
            ondismiss: async function () {
              toast.warning('Payment cancelled. Securing slot aborted.');
              // Cancel pending appointment
              await axios.put(`/api/appointments/${pendingAppointmentId}`, { status: 'cancelled' });
              setBooking(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Sandbox Simulated checkout
        setSandboxOrder({
          appointmentId: pendingAppointmentId,
          orderId: order.id,
          amount: order.amount,
        });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Booking process failed';
      toast.error(errorMsg);
      // Clean up if appointment was created
      if (pendingAppointmentId) {
        await axios.put(`/api/appointments/${pendingAppointmentId}`, { status: 'cancelled' }).catch(() => {});
      }
      setBooking(false);
    }
  };

  const handleSandboxPay = async () => {
    if (!sandboxOrder) return;
    setBooking(true);
    try {
      toast.info('Processing sandbox test transaction...');
      const verifyRes = await axios.post(`/api/appointments/${sandboxOrder.appointmentId}/verify-payment`, {
        razorpayOrderId: sandboxOrder.orderId,
        mode: 'sandbox',
        amount: sandboxOrder.amount,
      });

      if (verifyRes.data.success) {
        toast.success('Simulated Sandbox Payment Confirmed! Slot secured.');
        onSuccess();
        onClose();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Simulated verification failed';
      toast.error(errorMsg);
      setBooking(false);
    }
  };

  const handleSandboxCancel = async () => {
    if (!sandboxOrder) return;
    try {
      await axios.put(`/api/appointments/${sandboxOrder.appointmentId}`, { status: 'cancelled' });
      toast.warning('Sandbox payment cancelled. Appointment deleted.');
    } catch (err) {
      console.error('Failed to cancel sandbox appointment:', err);
    }
    setSandboxOrder(null);
    setBooking(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>
            {sandboxOrder ? '🛠️ Simulated Sandbox Checkout' : 'Schedule Consultation'}
          </h3>
          <button className="modal-close" onClick={sandboxOrder ? handleSandboxCancel : onClose}>×</button>
        </div>

        <div className="modal-body">
          {sandboxOrder ? (
            /* Simulated Checkout Visual Overlay Panel */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1.25rem' }}>
                ⚠️ <strong>Nongateway Sandbox Mode:</strong> Razorpay credentials are not defined in the backend environment. We have initiated a secure sandbox transaction simulation.
              </div>
              <h4 style={{ marginBottom: '0.5rem' }}>Consultation Fee: ₹{(sandboxOrder.amount / 100).toFixed(2)}</h4>
              <p className="specialty-text" style={{ marginBottom: '1.5rem' }}>
                Payable to: <strong>Dr. {doctor.user.name}</strong>
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleSandboxCancel} className="btn btn-secondary flex-1">
                  Cancel Checkout
                </button>
                <button onClick={handleSandboxPay} className="btn btn-primary flex-1" disabled={booking}>
                  {booking ? 'Securing Slot...' : 'Confirm Test Payment'}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Booking Form */
            <>
              <div className="doctor-brief">
                <span className="doctor-avatar">🩺</span>
                <div>
                  <h4>{doctor.user.name}</h4>
                  <p>{doctor.specialization} • {doctor.experience} yrs exp</p>
                  <p className="brief-price">₹{doctor.pricePerConsultation} / session</p>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '0.8rem' }}>
                📍 <strong>Hospital:</strong> {doctor.hospitalName || 'AegisCare Clinic'}<br />
                <span style={{ color: '#555' }}>{doctor.hospitalAddress || 'Connaught Place, New Delhi'}</span>
              </div>

              <div style={{ margin: '0.8rem 0', border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
                <iframe
                  title="Hospital Location Map"
                  width="100%"
                  height="110"
                  style={{ border: 0, display: 'block' }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(doctor.hospitalAddress || 'New Delhi')}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                ></iframe>
                <div style={{ padding: '0.25rem', backgroundColor: '#e9ecef', fontSize: '0.7rem', textAlign: 'center' }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.hospitalAddress || 'New Delhi')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0056b3', textDecoration: 'underline', fontWeight: 'bold' }}
                  >
                    🗺️ Directions Link (Google Maps)
                  </a>
                </div>
              </div>

              {reviews.length > 0 && (
                <div style={{ margin: '0.8rem 0', padding: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: '#fff' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block', fontWeight: 'bold' }}>
                    Recent Patient Feedback ({reviews.length})
                  </label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {reviews.slice(0, 3).map((rev) => (
                      <div key={rev._id} style={{ padding: '0.4rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.15rem' }}>
                          <span>{rev.patient?.name}</span>
                          <span style={{ color: '#ffc107' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                        </div>
                        <p style={{ margin: 0, color: '#555', fontStyle: 'italic' }}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Select Date</label>
                  <input
                    type="date"
                    className="form-input"
                    min={getMinDate()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                {date && (
                  <div className="form-group">
                    <label className="form-label">Available Time Slots</label>
                    {loadingSlots ? (
                      <p className="slots-loading">Searching schedule...</p>
                    ) : slots.length > 0 ? (
                      <div className="slots-grid">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            className={`slot-chip ${selectedSlot === slot ? 'active' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="slots-empty">No available slots for this date. Try another day.</p>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Describe Symptoms / Reason for Visit (Optional)</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="e.g. Mild fever and cough for 2 days..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose} disabled={booking}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={booking || !date || !selectedSlot}
                  >
                    {booking ? 'Securing Slot...' : 'Proceed to Payment'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
