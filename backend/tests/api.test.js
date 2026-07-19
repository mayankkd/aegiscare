const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');

let testUserId = '';

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', reject);
      if (mongoose.connection.readyState === 0) {
        mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telemedicine').catch(reject);
      }
    });
  }
});

afterAll(async () => {
  if (testUserId) {
    const User = require('../models/User');
    const EhrRecord = require('../models/EhrRecord');
    const Reminder = require('../models/Reminder');
    await EhrRecord.deleteMany({ patient: testUserId });
    await Reminder.deleteMany({ patient: testUserId });
    await User.findByIdAndDelete(testUserId);
  }
  await mongoose.connection.close();
});

describe('EHR & Reminders API Suite', () => {
  let token = '';

  beforeAll(async () => {
    const email = `test.jest.${Date.now()}@telemed.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jest Patient',
        email,
        password: 'password123',
        role: 'patient',
        phone: '99999 88888',
        gender: 'Male',
        dateOfBirth: '1992-08-08',
      });
    token = res.body.token;
    testUserId = res.body.user ? res.body.user._id : '';
  });

  test('PUT /api/ehr - create patient health profile record', async () => {
    const res = await request(app)
      .put('/api/ehr')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bloodGroup: 'O+',
        allergies: ['Dust'],
        chronicDiseases: ['Asthma'],
        previousSurgeries: ['None'],
        currentMedicines: ['Inhaler'],
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Friend',
          phone: '9876543210',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bloodGroup).toBe('O+');
  });

  test('GET /api/ehr - retrieve health profile summary', async () => {
    const res = await request(app)
      .get('/api/ehr')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bloodGroup).toBe('O+');
  });

  test('POST /api/reminders - create medicine reminder alert', async () => {
    const res = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        medicineName: 'Paracetamol',
        dosage: '650mg',
        frequency: 'daily',
        time: '08:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.medicineName).toBe('Paracetamol');
  });

  test('GET /api/reminders - retrieve active list of reminders', async () => {
    const res = await request(app)
      .get('/api/reminders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
