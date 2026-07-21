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
    profile: { phone: '98765 43210', gender: 'Male' },
    specialization: 'Cardiologist',
    bio: 'Dr. Rajesh Kumar is a senior Cardiologist with 15+ years of experience in cardiology clinics. He specializes in heart health, managing blood pressure, and preventive cardiology.',
    experience: 15,
    pricePerConsultation: 1500,
    rating: 4.9,
    reviewsCount: 112,
    hospitalName: 'Fortis Hospital',
    hospitalAddress: 'Shalimar Bagh, New Delhi, Delhi 110088',
    city: 'New Delhi',
    languages: ['Hindi', 'English']
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43211', gender: 'Female' },
    specialization: 'Dermatologist',
    bio: 'Dr. Priya Sharma is a leading Dermatologist with 9 years of practice. She specializes in skin treatments, eczema management, hair fall solutions, and standard cosmetic consultations.',
    experience: 9,
    pricePerConsultation: 1200,
    rating: 4.8,
    reviewsCount: 84,
    hospitalName: 'Max Super Speciality Hospital',
    hospitalAddress: 'Saket, New Delhi, Delhi 110017',
    city: 'New Delhi',
    languages: ['English', 'Hindi', 'Punjabi']
  },
  {
    name: 'Dr. Amit Patel',
    email: 'amit.patel@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43212', gender: 'Male' },
    specialization: 'Pediatrician',
    bio: 'Dr. Amit Patel is a friendly Pediatrician dedicated to child health and developmental care. He conducts checkups, manages childhood illnesses, and answers newborn care queries.',
    experience: 12,
    pricePerConsultation: 800,
    rating: 4.9,
    reviewsCount: 156,
    hospitalName: 'Apollo Hospital',
    hospitalAddress: 'Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006',
    city: 'Chennai',
    languages: ['Tamil', 'English']
  },
  {
    name: 'Dr. Sunita Rao',
    email: 'sunita.rao@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43213', gender: 'Female' },
    specialization: 'General Physician',
    bio: 'Dr. Sunita Rao provides comprehensive general medical care. She deals with seasonal infections, fever diagnostics, lifestyle advice, and coordinates referral plans for multi-specialty care.',
    experience: 7,
    pricePerConsultation: 500,
    rating: 4.7,
    reviewsCount: 65,
    hospitalName: 'Manipal Hospital',
    hospitalAddress: 'HAL Old Airport Road, Bengaluru, Karnataka 560017',
    city: 'Bengaluru',
    languages: ['Kannada', 'Hindi', 'English']
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43214', gender: 'Male' },
    specialization: 'Neurologist',
    bio: 'Dr. Vikram Singh is a dedicated Neurologist. He specializes in treating chronic migraines, epilepsy, sensory issues, muscle coordination disorders, and overall nervous system health.',
    experience: 11,
    pricePerConsultation: 2000,
    rating: 4.8,
    reviewsCount: 92,
    hospitalName: 'Medanta - The Medicity',
    hospitalAddress: 'Sector 38, Gurugram, Haryana 122001',
    city: 'New Delhi',
    languages: ['Hindi', 'English']
  },
  {
    name: 'Dr. Neha Kapoor',
    email: 'neha.kapoor@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43219', gender: 'Female' },
    specialization: 'Gynecologist',
    bio: 'Dr. Neha Kapoor is a trusted Obstetrician and Gynecologist specializing in high-risk pregnancies, PCOS treatment, and routine wellness.',
    experience: 12,
    pricePerConsultation: 1300,
    rating: 4.8,
    reviewsCount: 140,
    hospitalName: 'Fortis La Femme',
    hospitalAddress: 'Greater Kailash, New Delhi, Delhi 110048',
    city: 'New Delhi',
    languages: ['Hindi', 'English']
  },
  {
    name: 'Dr. Sandeep Mehta',
    email: 'sandeep.mehta@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43220', gender: 'Male' },
    specialization: 'Orthopedic',
    bio: 'Dr. Sandeep Mehta treats joint replacement surgeries, sports injuries, fracture recovery, and general bone arthritis management.',
    experience: 13,
    pricePerConsultation: 1400,
    rating: 4.7,
    reviewsCount: 95,
    hospitalName: 'Kokilaben Dhirubhai Ambani Hospital',
    hospitalAddress: 'Andheri West, Mumbai, Maharashtra 400053',
    city: 'Mumbai',
    languages: ['Gujarati', 'Hindi', 'English', 'Marathi']
  },
  {
    name: 'Dr. Pooja Reddy',
    email: 'pooja.reddy@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43221', gender: 'Female' },
    specialization: 'Psychiatrist',
    bio: 'Dr. Pooja Reddy provides clinical mental health care, focusing on anxiety relief, depression control, stress diagnostics, and therapy.',
    experience: 9,
    pricePerConsultation: 1000,
    rating: 4.9,
    reviewsCount: 78,
    hospitalName: 'NIMHANS Outpatient Clinic',
    hospitalAddress: 'Hosur Road, Bengaluru, Karnataka 560029',
    city: 'Bengaluru',
    languages: ['Telugu', 'Kannada', 'English']
  },
  {
    name: 'Dr. Suresh Nair',
    email: 'suresh.nair@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43216', gender: 'Male' },
    specialization: 'ENT Specialist',
    bio: 'Dr. Suresh Nair is an experienced Ear, Nose & Throat Specialist focusing on sinus treatments, hearing evaluations, and pediatric ENT care.',
    experience: 14,
    pricePerConsultation: 900,
    rating: 4.9,
    reviewsCount: 130,
    hospitalName: 'Aster Medcity',
    hospitalAddress: 'Cheranelloor, Kochi, Kerala 682027',
    city: 'Kochi',
    languages: ['Malayalam', 'English']
  },
  {
    name: 'Dr. Manoj Gupta',
    email: 'manoj.gupta@telemed.com',
    password: 'password123',
    role: 'doctor',
    profile: { phone: '98765 43218', gender: 'Male' },
    specialization: 'Oncologist',
    bio: 'Dr. Manoj Gupta is a senior Medical Oncologist specializing in cancer screening, early diagnostics, and personalized chemotherapy guidance.',
    experience: 16,
    pricePerConsultation: 1800,
    rating: 4.9,
    reviewsCount: 104,
    hospitalName: 'AMRI Hospital',
    hospitalAddress: 'Salt Lake, Kolkata, West Bengal 700098',
    city: 'Kolkata',
    languages: ['Bengali', 'Hindi', 'English']
  }
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
        city: doc.city,
        languages: doc.languages,
      });
    }
    console.log(`Seeded ${doctorsData.length} doctor accounts!`);

    // Seed Admin account (if it doesn't already exist)
    const adminExists = await User.findOne({ email: 'admin@telemed.com' });
    if (!adminExists) {
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
    }

    console.log('Database successfully seeded with 10 distinct category doctors!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
