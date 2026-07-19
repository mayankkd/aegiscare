require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Connect to database
connectDB();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render)
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://aegiscare-frontend.onrender.com'],
    methods: ['GET', 'POST'],
  },
});

// Set io in express app context
app.set('io', io);

// Track active doctor sockets mapping socket.id -> doctorUserId
const doctorSockets = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Room binding for user ID targeted events
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined socket room.`);
  });

  socket.on('doctor:online', async (doctorUserId) => {
    socket.join(doctorUserId);
    doctorSockets.set(socket.id, doctorUserId);
    console.log(`Doctor ${doctorUserId} is live online via socket.`);
    
    const DoctorProfile = require('./models/DoctorProfile');
    try {
      const doc = await DoctorProfile.findOne({ user: doctorUserId });
      if (doc && doc.status === 'Offline') {
        doc.status = 'Online';
        await doc.save();
        io.emit('doctor:status-updated', {
          doctorId: doctorUserId,
          status: 'Online',
        });
      }
    } catch (err) {
      console.error('Socket doctor:online error:', err.message);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (doctorSockets.has(socket.id)) {
      const doctorUserId = doctorSockets.get(socket.id);
      doctorSockets.delete(socket.id);
      
      const DoctorProfile = require('./models/DoctorProfile');
      try {
        const doc = await DoctorProfile.findOne({ user: doctorUserId });
        if (doc) {
          doc.status = 'Offline';
          await doc.save();
          io.emit('doctor:status-updated', {
            doctorId: doctorUserId,
            status: 'Offline',
          });
          console.log(`Doctor ${doctorUserId} automatically set to Offline due to socket disconnect.`);
        }
      } catch (err) {
        console.error('Socket disconnect doctor status offline toggle error:', err.message);
      }
    }
  });
});

// Middlewares
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false })); // HTTP Headers protection without CSP conflicts

// Custom NoSQL Injection sanitizer compatible with Express 5
const mongoSanitizeCustom = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      for (const key in obj) {
        if (/^\$|\./.test(key)) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  if (req.headers) sanitize(req.headers);
  next();
};
app.use(mongoSanitizeCustom);

// Request rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300, // Limit to 300 requests per IP per window
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
  }
});
app.use('/api', limiter);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ehr', require('./routes/ehr'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/sos', require('./routes/sos'));

// Base Route
app.get('/', (req, res) => {
  res.send('Telemedicine API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Server error. Please try again later.',
  });
});

const PORT = process.env.PORT || 5001;

// Use server.listen instead of app.listen to support Socket.io
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

  // Start background pill reminder checker
  const Reminder = require('./models/Reminder');
  const emailService = require('./utils/emailService');

  setInterval(async () => {
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${hh}:${mm}`;

      const activeReminders = await Reminder.find({
        isActive: true,
        time: currentTimeString,
      }).populate('patient', 'name email');

      for (const reminder of activeReminders) {
        if (!reminder.patient) continue;

        // 1. Dispatch Email Reminder
        emailService.sendMedicineReminderEmail(
          reminder.patient.email,
          reminder.patient.name,
          reminder.medicineName,
          reminder.dosage
        ).catch((err) => console.error('Pill reminder email error:', err.message));

        // 2. Broadcast realtime Socket.io notification if online
        if (io) {
          io.to(reminder.patient._id.toString()).emit('notification', {
            title: '💊 Pill Reminder Alert',
            message: `It's time to take your medicine: ${reminder.medicineName} (${reminder.dosage})`,
            timestamp: new Date(),
          });
        }
        console.log(`[Reminder Scheduler] Dispatched reminder alerts for ${reminder.patient.name} - ${reminder.medicineName}`);
      }
    } catch (err) {
      console.error('Background reminder scheduler error:', err.message);
    }
  }, 60000); // Check once every 60 seconds
  });
}

module.exports = { app, server };
