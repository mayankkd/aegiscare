const nodemailer = require('nodemailer');

let transporter;

const setupTransporter = () => {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT == 465, // True for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✓ Nodemailer SMTP transporter initialized.');
    } catch (err) {
      console.error('Failed to configure SMTP transport. Mock mode activated.', err.message);
    }
  } else {
    console.warn('SMTP environment variables missing. Email service running in console LOG mode.');
  }
};

setupTransporter();

// Helper to wrap HTML in standard email layout wrapper
const getEmailWrapper = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; color: #333333; margin: 0; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #dee2e6; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: #0056b3; padding: 20px; text-align: center; color: #ffffff; }
    .header h2 { margin: 0; font-size: 22px; }
    .content { padding: 30px; font-size: 15px; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; }
    .btn { display: inline-block; padding: 10px 20px; margin-top: 15px; background: #0056b3; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h2>AegisCare Telemedicine</h2>
    </div>
    <div class="content">
      <h3>${title}</h3>
      ${body}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} AegisCare Portal. Secured Encrypted E-Health System.
    </div>
  </div>
</body>
</html>
`;

// 1. Send Booking Email
exports.sendBookingEmail = async (patientEmail, patientName, doctorName, date, slot) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC' });
  const subject = `Appointment Confirmed - Dr. ${doctorName}`;
  const title = `Consultation Booked Successfully!`;
  const body = `
    <p>Dear ${patientName},</p>
    <p>Your online medical consultation appointment has been successfully scheduled and confirmed.</p>
    <p><strong>Appointment Details:</strong></p>
    <ul>
      <li><strong>Doctor:</strong> Dr. ${doctorName}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time Slot:</strong> ${slot}</li>
    </ul>
    <p>Please log in to your patient dashboard at the scheduled time to connect to your consultation video room.</p>
    <a href="http://localhost:5174/patient-dashboard" class="btn">Go to Patient Dashboard</a>
  `;

  await sendMail(patientEmail, subject, getEmailWrapper(title, body));
};

// 2. Send Cancellation Email
exports.sendCancellationEmail = async (recipientEmail, recipientName, date, slot, doctorName) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC' });
  const subject = `Appointment Cancelled - AegisCare`;
  const title = `Consultation Cancelled`;
  const body = `
    <p>Dear ${recipientName},</p>
    <p>Please be informed that the medical consultation scheduled for <strong>${formattedDate}</strong> at <strong>${slot}</strong> with <strong>Dr. ${doctorName}</strong> has been cancelled.</p>
    <p>If you did not initiate this change, or need to schedule another visit, please visit the portal directory.</p>
    <a href="http://localhost:5174/" class="btn">Find a Doctor</a>
  `;

  await sendMail(recipientEmail, subject, getEmailWrapper(title, body));
};

// 3. Send Prescription Ready Email
exports.sendPrescriptionEmail = async (patientEmail, patientName, doctorName) => {
  const subject = `Prescription Ready - Dr. ${doctorName}`;
  const title = `Your E-Prescription is Ready!`;
  const body = `
    <p>Dear ${patientName},</p>
    <p>Dr. ${doctorName} has completed your consultation and uploaded your clinical prescription notes.</p>
    <p>You can now download the professional prescription PDF sheet and view medical logs directly from your dashboard log.</p>
    <a href="http://localhost:5174/patient-dashboard" class="btn">View Medical Records</a>
  `;

  await sendMail(patientEmail, subject, getEmailWrapper(title, body));
};

// 4. Send Medicine Pill Reminder Email
exports.sendMedicineReminderEmail = async (patientEmail, patientName, medicineName, dosage) => {
  const subject = `Pill Reminder - AegisCare`;
  const title = `⏰ Time to take your Medicine!`;
  const body = `
    <p>Dear ${patientName},</p>
    <p>This is a scheduled reminder to take your clinical dosage on time.</p>
    <p><strong>Medicine Details:</strong></p>
    <ul>
      <li><strong>Medicine Name:</strong> ${medicineName}</li>
      <li><strong>Dosage:</strong> ${dosage}</li>
    </ul>
    <p>Ensure that you follow the directions provided by your attending physician.</p>
    <a href="http://localhost:5174/patient-dashboard" class="btn">View Pill Schedules</a>
  `;

  await sendMail(patientEmail, subject, getEmailWrapper(title, body));
};

// Base Mail Dispatcher helper
exports.sendMail = async (to, subject, html) => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `AegisCare Telemedicine <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`✓ Email dispatched successfully to: ${to} (Subject: "${subject}")`);
    } catch (err) {
      console.error(`✗ Failed to dispatch email to: ${to}. Error:`, err.message);
    }
  } else {
    // Console log fallback mode
    console.log(`
=========================================
[MOCK MAIL DISPATCH]
To: ${to}
Subject: ${subject}
-----------------------------------------
${html.replace(/<[^>]*>/g, '').trim().substring(0, 300)}...
=========================================
    `);
  }
};
