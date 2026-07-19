require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const EhrRecord = require('../models/EhrRecord');
const Reminder = require('../models/Reminder');
const Appointment = require('../models/Appointment');
const connectDB = require('../config/db');

const cleanupAndSeed = async () => {
  try {
    await connectDB();
    console.log('✓ Connected to database.');

    // 1. Delete all users with "test", "jest", or numbers in their email (excluding legitimate doctors/admin)
    const deletePattern = /test|jest|[0-9]{5,}/i;
    const usersToDelete = await User.find({
      $or: [
        { email: { $regex: deletePattern } },
        { name: { $regex: /jest/i } }
      ],
      role: 'patient'
    });

    console.log(`🧹 Found ${usersToDelete.length} temporary test patient accounts to remove.`);

    for (const user of usersToDelete) {
      // Remove associated records
      await EhrRecord.deleteMany({ patient: user._id });
      await Reminder.deleteMany({ patient: user._id });
      await Appointment.deleteMany({ patient: user._id });
      await User.findByIdAndDelete(user._id);
      console.log(`   - Deleted user: ${user.email}`);
    }

    // 2. Seed realistic distinct Indian patient accounts if database is sparse
    const patientSeedData = [
      { name: 'Rajesh Kumar', email: 'rajesh.kumar@gmail.com', phone: '98765 12345', gender: 'Male', dob: '1985-04-12' },
      { name: 'Sneha Patel', email: 'sneha.patel@yahoo.com', phone: '98123 45678', gender: 'Female', dob: '1992-09-21' },
      { name: 'Rohan Joshi', email: 'rohan.joshi@gmail.com', phone: '99234 56789', gender: 'Male', dob: '1990-11-05' },
      { name: 'Ananya Deshmukh', email: 'ananya.d@gmail.com', phone: '97345 67890', gender: 'Female', dob: '1998-07-19' },
      { name: 'Sandeep Reddy', email: 'sandeep.reddy@outlook.com', phone: '96456 78901', gender: 'Male', dob: '1982-01-30' },
      { name: 'Priya Nair', email: 'priya.nair@gmail.com', phone: '95567 89012', gender: 'Female', dob: '1995-05-15' },
    ];

    for (const patient of patientSeedData) {
      const exists = await User.findOne({ email: patient.email });
      if (!exists) {
        const newUser = await User.create({
          name: patient.name,
          email: patient.email,
          password: 'password123', // Standard hash pre-save hooks handle it
          role: 'patient',
          profile: {
            phone: patient.phone,
            gender: patient.gender,
            dateOfBirth: new Date(patient.dob),
          }
        });
        
        // Seed a basic blank EHR for them
        await EhrRecord.create({
          patient: newUser._id,
          bloodGroup: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
          allergies: ['None'],
          chronicDiseases: ['None'],
          previousSurgeries: ['None'],
          currentMedicines: ['None'],
        });

        console.log(`🌱 Seeded clinical profile for patient: ${patient.name}`);
      }
    }

    console.log('✓ Database cleanup and realistic seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Cleanup/Seeding failed:', error);
    process.exit(1);
  }
};

cleanupAndSeed();
