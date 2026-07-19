require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

const doctorsData = [
  {
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: {
      phone: '98765 43210',
      gender: 'Male',
    },
    specialization: 'Cardiologist',
    bio: 'Dr. Rajesh Kumar is a senior Cardiologist with 15+ years of experience in cardiology clinics. He specializes in heart health, managing blood pressure, and preventive cardiology treatments.',
    experience: 15,
    pricePerConsultation: 1500,
    rating: 4.9,
    reviewsCount: 112,
    hospitalName: 'Fortis Hospital',
    hospitalAddress: 'Fortis Hospital, Shalimar Bagh, New Delhi, Delhi 110088',
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: {
      phone: '98765 43211',
      gender: 'Female',
    },
    specialization: 'Dermatologist',
    bio: 'Dr. Priya Sharma is a leading Dermatologist with 9 years of practice. She specializes in skin treatments, eczema management, hair fall solutions, and standard cosmetic consultations.',
    experience: 9,
    pricePerConsultation: 1200,
    rating: 4.8,
    reviewsCount: 84,
    hospitalName: 'Max Super Speciality Hospital',
    hospitalAddress: 'Max Super Speciality Hospital, Saket, New Delhi, Delhi 110017',
  },
  {
    name: 'Dr. Amit Patel',
    email: 'amit.patel@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: {
      phone: '98765 43212',
      gender: 'Male',
    },
    specialization: 'Pediatrician',
    bio: 'Dr. Amit Patel is a friendly Pediatrician dedicated to child health and developmental care. He conducts regular check-ups, manages common childhood illnesses, and answers newborn care queries.',
    experience: 12,
    pricePerConsultation: 800,
    rating: 4.9,
    reviewsCount: 156,
    hospitalName: 'Apollo Hospitals',
    hospitalAddress: 'Apollo Hospitals, Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006',
  },
  {
    name: 'Dr. Sunita Rao',
    email: 'sunita.rao@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: {
      phone: '98765 43213',
      gender: 'Female',
    },
    specialization: 'General Physician',
    bio: 'Dr. Sunita Rao provides comprehensive general medical care. She deals with seasonal infections, fever diagnostics, lifestyle advice, and coordinates referral plans for multi-specialty care.',
    experience: 7,
    pricePerConsultation: 500,
    rating: 4.7,
    reviewsCount: 65,
    hospitalName: 'Manipal Hospital',
    hospitalAddress: 'Manipal Hospital, HAL Old Airport Road, Bengaluru, Karnataka 560017',
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: {
      phone: '98765 43214',
      gender: 'Male',
    },
    specialization: 'Neurologist',
    bio: 'Dr. Vikram Singh is a dedicated Neurologist. He specializes in treating chronic migraines, epilepsy, sensory issues, muscle coordination disorders, and overall nervous system health.',
    experience: 11,
    pricePerConsultation: 2000,
    rating: 4.8,
    reviewsCount: 92,
    hospitalName: 'Medanta - The Medicity',
    hospitalAddress: 'Medanta Hospital, CH Baktawar Singh Road, Sector 38, Gurugram, Haryana 122001',
  },
];

const defaultWeeklySlots = [
  { day: 'Monday', timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  { day: 'Tuesday', timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  { day: 'Wednesday', timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  { day: 'Thursday', timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  { day: 'Friday', timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
];

const seedDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telemedicine';
    await mongoose.connect(connStr);
    console.log('Connected to MongoDB for localized seeding...');

    // Clear existing data
    await Appointment.deleteMany({});
    console.log('Cleared appointments.');

    // Only clear doctor users
    await User.deleteMany({ role: 'doctor' });
    console.log('Cleared doctor users.');

    await DoctorProfile.deleteMany({});
    console.log('Cleared doctor profiles.');

    // Seed doctors
    for (const doc of doctorsData) {
      // Create user
      const user = await User.create({
        name: doc.name,
        email: doc.email,
        password: doc.password,
        role: doc.role,
        profile: doc.profile,
      });

      // Create profile
      await DoctorProfile.create({
        user: user._id,
        specialization: doc.specialization,
        bio: doc.bio,
        experience: doc.experience,
        pricePerConsultation: doc.pricePerConsultation,
        rating: doc.rating,
        reviewsCount: doc.reviewsCount,
        hospitalName: doc.hospitalName,
        hospitalAddress: doc.hospitalAddress,
        weeklySlots: defaultWeeklySlots,
      });

    }

    // Seed Admin account
    await User.create({
      name: 'AegisCare Admin',
      email: 'admin@telemed.com',
      password: 'adminpassword123',
      role: 'admin',
      profile: {
        phone: '98765 99999',
        gender: 'Male',
      },
    });
    console.log('Seeded Admin account: admin@telemed.com / adminpassword123');

    console.log('Database successfully seeded with localized Indian profiles!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
