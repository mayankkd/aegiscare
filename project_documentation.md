# AegisCare Telemedicine Platform - Comprehensive Project Documentation

Welcome to the technical documentation for **AegisCare**, a complete, functional Telemedicine Platform built using the MERN stack (MongoDB, Express, React, Node.js). 

This guide details the system architecture, file structure, API design, database schemas, frontend state flows, styling specifications, testing harness, and run instructions.

---

## 🏛️ System Architecture

AegisCare uses a decoupled client-server architecture. The frontend React client communicates with the backend Node/Express API server over HTTP via JSON, securing access using JSON Web Tokens (JWT).

```
  ┌──────────────────────────────────────────────────────────┐
  │                   React Frontend Client                  │
  │  (React Router, Axios Clients, Auth Context, Toast Ctx)   │
  └────────────────────────────┬─────────────────────────────┘
                               │
                      HTTP REST Requests
                               │
  ┌────────────────────────────▼─────────────────────────────┐
  │                     Node Express Server                  │
  │  (JWT Protect, express-validator, Controllers, Routing)  │
  └────────────────────────────┬─────────────────────────────┘
                               │
                         Mongoose ODM
                               │
  ┌────────────────────────────▼─────────────────────────────┐
  │                 MongoDB Community Edition                │
  │                 (Appointments, Profiles, Users)          │
  └──────────────────────────────────────────────────────────┘
```

---

## 📁 Project Directory Structure

```
telecom/
├── backend/                        # Node.js + Express backend server
│   ├── config/
│   │   └── db.js                   # Mongoose database connection setup
│   ├── controllers/                # Controllers implementing API logic
│   │   ├── appointmentController.js# Appointment CRUD & prescription controllers
│   │   ├── authController.js       # Register, login, and user profile controllers
│   │   └── doctorController.js     # Listings & dynamic availability controllers
│   ├── middleware/                 # Express middleware layers
│   │   ├── auth.js                 # JWT verification & role authorization
│   │   └── validation.js           # express-validator result validator
│   ├── models/                     # Mongoose Schemas & DB Models
│   │   ├── Appointment.js          # Appointment schedules & prescriptions schema
│   │   ├── DoctorProfile.js        # Doctor credentials & weekly slots template
│   │   └── User.js                 # General user schema (hash hooks & passwords)
│   ├── routes/                     # Router namespaces
│   │   ├── appointments.js         # protected consultation booking routes
│   │   ├── auth.js                 # login, register, and session profiles
│   │   └── doctors.js              # doctor listings & slot search
│   ├── scripts/                    # Script utilities
│   │   ├── seed.js                 # Database localized seeding script
│   │   └── test_integration.js     # API integration validation test runner
│   ├── .env                        # Local configuration env parameters
│   ├── .env.example                # Example configuration reference
│   ├── package.json                # Server dependency packages
│   └── server.js                   # Main application entry point
│
└── frontend/                       # React client application (Vite-powered)
    ├── public/                     # Static browser assets
    ├── src/
    │   ├── components/             # Reusable UI components
    │   │   ├── Footer.jsx          # Simple HIPAA disclaimer footer
    │   │   ├── Navbar.jsx          # Header navigation showing auth details
    │   │   └── BookingModal.jsx    # Date & time slot scheduling modal
    │   ├── context/                # Global React Context providers
    │   │   ├── AuthContext.jsx     # Auth state, login/logout, Axios headers sync
    │   │   └── ToastContext.jsx    # Auto-dismissing pop-up toast alerts
    │   ├── pages/                  # Screen views
    │   │   ├── Home.jsx            # Directory of providers with specialization filters
    │   │   ├── Login.jsx           # Clean authentication log in form
    │   │   ├── Register.jsx        # SignUp form with dynamic doctor panels
    │   │   ├── PatientDashboard.jsx# Upcoming visits, cancellations, and prescriptions
    │   │   └── DoctorDashboard.jsx # Provider slots, patient info, and diagnostics
    │   ├── App.css                 # Empty default stylesheet
    │   ├── App.jsx                 # Routing logic & Protected Route wrappers
    │   ├── index.css               # Simplified light theme "student-made" CSS
    │   └── main.jsx                # DOM root rendering entry point
    ├── index.html                  # Browser HTML layout wrapper
    ├── package.json                # Frontend packages (React 19, Axios, Router)
    └── vite.config.js              # Vite server settings
```

---

## 🗄️ Database Schemas (Mongoose)

### 1. User Schema (`backend/models/User.js`)
Stores authentication metadata and profile parameters for all individuals.
- **Fields**:
  - `name`: String, required.
  - `email`: String, unique, lowercase, regex-validated.
  - `password`: String, required, hidden by default (`select: false`).
  - `role`: String, enum: `['patient', 'doctor']`, defaults to `'patient'`.
  - `profile`: Object containing `phone` (String), `gender` (String, enum: `['Male', 'Female', 'Other', '']`), and `dateOfBirth` (Date).
- **Hooks**:
  - `pre('save')`: Hashing password strings using `bcryptjs` with salt round 10.
- **Methods**:
  - `matchPassword(enteredPassword)`: Compares candidate text to hashed database password.

### 2. Doctor Profile Schema (`backend/models/DoctorProfile.js`)
Extends the User schema for Doctors, containing clinical credentials and availability.
- **Fields**:
  - `user`: ObjectId, reference to User schema, unique.
  - `specialization`: String, required.
  - `bio`: String, required, max 1000 characters.
  - `experience`: Number, required (minimum 0).
  - `pricePerConsultation`: Number, required (minimum 0).
  - `rating`: Number, default 4.8 (1 to 5 scale).
  - `reviewsCount`: Number, default 12.
  - `weeklySlots`: Array of objects containing `day` (String enum of weekdays) and `timeSlots` (Array of Strings representing general booking slots, e.g., `'10:00 AM'`).

### 3. Appointment Schema (`backend/models/Appointment.js`)
Tracks the scheduling log, reported symptoms, and doctor diagnoses.
- **Fields**:
  - `patient`: ObjectId, reference to Patient User.
  - `doctor`: ObjectId, reference to Doctor User.
  - `date`: Date, representing the booking date.
  - `slot`: String, representing the time slot (e.g. `'09:00 AM'`).
  - `status`: String, enum: `['pending', 'confirmed', 'completed', 'cancelled']`, defaults to `'confirmed'`.
  - `symptoms`: String, patient comments.
  - `prescription`: String, clinical notes and medicine.
- **Indexes**:
  - Unique composite index `{ doctor: 1, date: 1, slot: 1 }` with a partial expression `{ status: { $ne: 'cancelled' } }`. This prevents two patients from booking the exact same time slot with the same provider on the same day, while ignoring cancelled bookings.

---

## 📡 Backend API Reference

All requests require headers `Content-Type: application/json`. Protected endpoints require authentication header format: `Authorization: Bearer <JWT_Token>`.

### Authentication Endpoints

#### `POST /api/auth/register`
Creates a new account. If registering as a doctor, it automatically instantiates a default `DoctorProfile` alongside the user.
- **Payload**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "password": "password123",
    "role": "patient", // "patient" or "doctor"
    "phone": "98765 43210",
    "gender": "Male",
    "dateOfBirth": "1995-10-12"
  }
  ```
- **Response (201)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "_id": "6a5...", "name": "Aarav Sharma", "email": "aarav.sharma@example.com", "role": "patient", "profile": { ... } }
  }
  ```

#### `POST /api/auth/login`
Authenticates a user and returns a token.
- **Payload**:
  ```json
  {
    "email": "aarav.sharma@example.com",
    "password": "password123"
  }
  ```

#### `GET /api/auth/me` (Protected)
Retrieves the logged-in user profile session. If user role is `doctor`, automatically attaches their `DoctorProfile` credentials to the response.

---

### Doctor Endpoints

#### `GET /api/doctors`
Returns list of all active doctors.
- **Query Params**:
  - `search` (Optional): String filter matching doctor names (case-insensitive).
  - `specialization` (Optional): String filter matching medical specialization (e.g. `'Neurologist'`).

#### `GET /api/doctors/:id`
Retrieves a single doctor's profiles.
- **Query Params**:
  - `date` (Optional, format `YYYY-MM-DD`): Returns dynamic available slots for this date by fetching the doctor's weekly schedule template for that day of the week and filtering out slots already taken by non-cancelled appointments.
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": { ... },
    "availableSlots": [ "10:00 AM", "02:00 PM" ]
  }
  ```

---

### Appointment Endpoints

#### `POST /api/appointments` (Protected - Patients Only)
Books a slot with a doctor.
- **Payload**:
  ```json
  {
    "doctorUserId": "6a59f2a862d7...",
    "date": "2026-07-20",
    "slot": "09:00 AM",
    "symptoms": "Headache and dry throat"
  }
  ```

#### `GET /api/appointments` (Protected)
Retrieves appointments for the logged-in user.
- **Behavior**:
  - Patients see their booked consultations, populated with doctor names and specializations.
  - Doctors see their clinical schedules, populated with patient profiles (age, gender, and contact phone).

#### `PUT /api/appointments/:id` (Protected)
Updates status:
- Patients can update status to `'cancelled'` only for their own appointments.
- Doctors can update status to `'cancelled'` or `'completed'`.

#### `POST /api/appointments/:id/prescription` (Protected - Doctors Only)
Attaches diagnostic notes/prescriptions. Automatically sets the appointment status to `'completed'`.
- **Payload**:
  ```json
  {
    "prescription": "Paracetamol 500mg - 3 times daily. Rest for 2 days."
  }
  ```

---

## 🎨 UI/UX Design System ("Student Web Project" Theme)

The styles defined in `frontend/src/index.css` emulate a clean, hand-coded university project.

- **Color Palette**:
  - Background: Solid Light Grey (`#f8f9fa`)
  - Primary Theme: Classic Navy Blue (`#0056b3`) and clean royal blue accents
  - Text: Dark Charcoal (`#333333`) and Slate Grey (`#6c757d`)
  - Cards & Background Panels: Clean solid white background (`#ffffff`)
  - Borders: Thin grey borders (`#dee2e6`)
- **Visual Presentation**:
  - Navigation: Solid white header with thin blue border lines, clear links, and user profiles wrapped in simple badges.
  - Cards: Uniform rectangular layouts with standard borders and slight box shadows. Hovering causes a subtle scale uplift.
  - Buttons: Standard sharp corner buttons (4px border-radius) that swap to primary colors on hover.
  - Modal: Solid white overlay container with a dark transparency overlay.
  - Toasts: Simple status banners fixed to the top right with colored border bars (Green for success, Red for errors).

---

## 🚀 Running & Verification Instructions

Both services run on standard Node environments. MongoDB must be active locally.

### Environment variables (`backend/.env`)
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/telemedicine
JWT_SECRET=telemedicine_jwt_super_secret_key_change_me_in_production
```

### Server Seeding Command
Resets database and populates 5 localized Indian specialist profiles (e.g. Dr. Rajesh Kumar, Dr. Priya Sharma):
```bash
cd backend
npm run seed
```

### Dev Server Command (Backend)
Starts Express on port `5001` (utilizes nodemon for auto-reload):
```bash
cd backend
npm run dev
```

### Client Server Command (Frontend)
Starts Vite dev server on port `5174` (or fallback `5173`):
```bash
cd frontend
npm run dev
```

### Testing verification suite
Launches the automated validation harness executing registration, lookup, availability query, slot booking, dashboard log verification, and prescription attachments:
```bash
node backend/scripts/test_integration.js
```
