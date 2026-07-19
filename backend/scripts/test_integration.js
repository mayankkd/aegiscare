const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

const runTests = async () => {
  console.log('=== STARTING INTEGRATION TESTS ===');
  
  let patientToken = '';
  let patientUserId = '';
  let doctorToken = '';
  let doctorId = '';
  let appointmentId = '';
  let profileId = '';

  // 1. Register a Doctor
  console.log('\n1. Registering a doctor...');
  try {
    const res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Dr. Vikram Malhotra',
      email: 'doctor.test@telemed.com',
      password: 'password123',
      role: 'doctor',
      phone: '98765 00000',
      gender: 'Male',
      specialization: 'Neurologist',
      bio: 'Test doctor bio notes.',
      experience: 5,
      pricePerConsultation: 1200,
    });
    console.log('✓ Doctor registered successfully!', res.data.user.email);
  } catch (err) {
    if (err.response?.data?.error?.includes('exists')) {
      console.log(' doctor already exists, proceeding...');
    } else {
      console.error('✗ Doctor registration failed:', err.response?.data || err.message);
      return;
    }
  }

  // 2. Login Doctor to get token
  console.log('\n2. Logging in Doctor...');
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: 'doctor.test@telemed.com',
      password: 'password123',
    });
    doctorToken = res.data.token;
    console.log('✓ Doctor logged in successfully. Token acquired.');
  } catch (err) {
    console.error('✗ Doctor login failed:', err.response?.data || err.message);
    return;
  }

  // 3. Register a Patient
  console.log('\n3. Registering a patient...');
  const patientEmail = `patient.test.${Date.now()}@telemed.com`;
  try {
    const res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Aarav Sharma',
      email: patientEmail,
      password: 'password123',
      role: 'patient',
      phone: '98765 11111',
      gender: 'Male',
      dateOfBirth: '1990-05-15',
    });
    patientToken = res.data.token;
    patientUserId = res.data.user._id;
    console.log('✓ Patient registered successfully!', res.data.user.email);
  } catch (err) {
    console.error('✗ Patient registration failed:', err.response?.data || err.message);
    return;
  }

  // 4. Retrieve Doctors list and find the test doctor
  console.log('\n4. Retrieving doctors list...');
  try {
    const res = await axios.get(`${API_URL}/doctors`);
    const docs = res.data.data;
    const testDoc = docs.find((d) => d.user.email === 'doctor.test@telemed.com');
    if (!testDoc) {
      throw new Error('Test doctor not found in the list');
    }
    doctorId = testDoc.user._id; // This is the user ID of the doctor
    profileId = testDoc._id; // This is the profile ID of the doctor
    console.log(`✓ Doctors retrieved. Test Doctor User ID: ${doctorId}, Profile ID: ${profileId}, Specialization: ${testDoc.specialization}`);
  } catch (err) {
    console.error('✗ Retrieve doctors failed:', err.response?.data || err.message);
    return;
  }

  // 5. Query Doctor availability slots for a specific date (next Monday)
  // Let's compute a future Monday
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
  const yyyy = nextMonday.getFullYear();
  const mm = String(nextMonday.getMonth() + 1).padStart(2, '0');
  const dd = String(nextMonday.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  let selectedSlot = '';
  console.log(`\n5. Checking doctor availability for: ${dateStr}...`);
  try {
    const res = await axios.get(`${API_URL}/doctors/${profileId}?date=${dateStr}`);
    console.log('✓ Available slots:', res.data.availableSlots);
    if (res.data.availableSlots.length === 0) {
      throw new Error('No slots available for next Monday');
    }
    selectedSlot = res.data.availableSlots[0];
  } catch (err) {
    console.error('✗ Slot availability query failed:', err.response?.data || err.message);
    return;
  }

  // 6. Book an Appointment (Patient)
  console.log('\n6. Booking an appointment slot...');
  try {
    const res = await axios.post(
      `${API_URL}/appointments`,
      {
        doctorUserId: doctorId,
        date: dateStr,
        slot: selectedSlot || '09:00 AM',
        symptoms: 'Feeling frequent migrains.',
      },
      {
        headers: { Authorization: `Bearer ${patientToken}` },
      }
    );
    appointmentId = res.data.data._id;
    console.log('✓ Appointment booked in pending status! Appointment ID:', appointmentId);
  } catch (err) {
    console.error('✗ Booking failed:', err.response?.data || err.message);
    return;
  }

  // 6.5 Verify payment and confirm slot
  console.log('\n6.5. Simulating payment checkout & confirmation...');
  try {
    const res = await axios.post(
      `${API_URL}/appointments/${appointmentId}/verify-payment`,
      {
        razorpayOrderId: 'order_mock_test',
        mode: 'sandbox',
        amount: 120000,
      },
      {
        headers: { Authorization: `Bearer ${patientToken}` },
      }
    );
    console.log('✓ Payment verified. Slot confirmed status:', res.data.data.status);
  } catch (err) {
    console.error('✗ Payment verification failed:', err.response?.data || err.message);
    return;
  }

  // 7. Get patient's appointments
  console.log('\n7. Retrieving Patient appointments...');
  try {
    const res = await axios.get(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    console.log('✓ Patient appointments count:', res.data.count);
  } catch (err) {
    console.error('✗ Retrieve patient appointments failed:', err.response?.data || err.message);
    return;
  }

  // 8. Doctor writing prescription and completing appointment
  console.log('\n8. Doctor writing prescription...');
  try {
    const res = await axios.post(
      `${API_URL}/appointments/${appointmentId}/prescription`,
      {
        prescription: 'Take Ibuprofen 400mg twice a day. Rest in a quiet dark room. Follow up in 7 days.',
      },
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    console.log('✓ Prescription written! Appointment completed.', res.data.data.status);
  } catch (err) {
    console.error('✗ Writing prescription failed:', err.response?.data || err.message);
    return;
  }

  // 9. Re-verify patient appointments to see updated prescription notes
  console.log('\n9. Re-checking Patient appointments for clinical prescription notes...');
  try {
    const res = await axios.get(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const bookedApp = res.data.data.find((a) => a._id === appointmentId);
    console.log('✓ Status:', bookedApp.status);
    console.log('✓ Prescription text:', bookedApp.prescription);
  } catch (err) {
    console.error('✗ Verification check failed:', err.response?.data || err.message);
    return;
  }

  // 10. Clean up test patient record
  console.log('\n10. Cleaning up integration test patient records...');
  try {
    const adminLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@telemed.com',
      password: 'adminpassword123',
    });
    const adminToken = adminLoginRes.data.token;
    await axios.delete(`${API_URL}/admin/users/${patientUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('✓ Integration test patient cleaned up successfully.');
  } catch (err) {
    console.error('✗ Cleanup failed:', err.response?.data || err.message);
  }

  console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
};

runTests();
