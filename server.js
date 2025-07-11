const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// Lead Schema
const leadSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  phoneExt: String,
  textNumber: String,
  businessName: String,
  businessPhone: String,
  businessPhoneExt: String,
  businessEmail: String,
  businessServices: String,
  billingAddress: {
    street: String,
    aptUnit: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: "USA" }
  },
  preferredContact: {
    type: String,
    enum: ["phone", "email", "text", "businessPhone", "businessEmail"],
    required: true
  },
  serviceDesired: {
    type: String,
    enum: ["Web Development", "App Development"],
    required: true
  },
  hasWebsite: String,
  websiteAddress: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model("Lead", leadSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Email functions
function createEmailTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendEmails(leadData) {
  const transporter = createEmailTransporter();
  
  // Send admin notification with ALL form data
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New ${leadData.serviceDesired} inquiry from ${leadData.firstName} ${leadData.lastName}`,
    html: `
      <h2>New Lead Submission</h2>
      
      <h3>Personal Information</h3>
      <p><strong>Name:</strong> ${leadData.firstName} ${leadData.lastName}</p>
      <p><strong>Email:</strong> ${leadData.email}</p>
      <p><strong>Phone:</strong> ${leadData.phone}${leadData.phoneExt ? ' ext. ' + leadData.phoneExt : ''}</p>
      ${leadData.textNumber ? `<p><strong>Text Number:</strong> ${leadData.textNumber}</p>` : ''}
      
      <h3>Business Information</h3>
      ${leadData.businessName ? `<p><strong>Business Name:</strong> ${leadData.businessName}</p>` : ''}
      ${leadData.businessPhone ? `<p><strong>Business Phone:</strong> ${leadData.businessPhone}${leadData.businessPhoneExt ? ' ext. ' + leadData.businessPhoneExt : ''}</p>` : ''}
      ${leadData.businessEmail ? `<p><strong>Business Email:</strong> ${leadData.businessEmail}</p>` : ''}
      ${leadData.businessServices ? `<p><strong>Business Services:</strong> ${leadData.businessServices}</p>` : ''}
      
      <h3>Billing Address</h3>
      ${leadData.billingAddress ? `
        <p><strong>Street:</strong> ${leadData.billingAddress.street || 'Not provided'}</p>
        ${leadData.billingAddress.aptUnit ? `<p><strong>Apt/Unit:</strong> ${leadData.billingAddress.aptUnit}</p>` : ''}
        <p><strong>City:</strong> ${leadData.billingAddress.city || 'Not provided'}</p>
        <p><strong>State:</strong> ${leadData.billingAddress.state || 'Not provided'}</p>
        <p><strong>ZIP Code:</strong> ${leadData.billingAddress.zipCode || 'Not provided'}</p>
        <p><strong>Country:</strong> ${leadData.billingAddress.country || 'USA'}</p>
      ` : '<p>No billing address provided</p>'}
      
      <h3>Service Details</h3>
      <p><strong>Service Requested:</strong> ${leadData.serviceDesired}</p>
      <p><strong>Preferred Contact Method:</strong> ${leadData.preferredContact}</p>
      ${leadData.hasWebsite ? `<p><strong>Has Website:</strong> ${leadData.hasWebsite}</p>` : ''}
      ${leadData.websiteAddress ? `<p><strong>Website Address:</strong> ${leadData.websiteAddress}</p>` : ''}
      
      <h3>Additional Information</h3>
      <p><strong>Message:</strong> ${leadData.message || 'None provided'}</p>
      
      <hr>
      <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
    `,
  });

  // Send user confirmation 
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: leadData.email,
    subject: `Thank you for your ${leadData.serviceDesired} inquiry`,
    html: `
      <h2>Thank you, ${leadData.firstName}!</h2>
      <p>We received your ${leadData.serviceDesired} inquiry and will contact you soon.</p>
    `,
  });
}

// Middleware
app.use(express.json());
app.use(cors()); // Allow all origins

// Routes
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.post("/api/form/submit", async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    
    // Send emails (don't fail if emails fail)
    try {
      await sendEmails(req.body);
    } catch (emailError) {
      console.error("Email failed:", emailError);
    }

    res.json({ message: "Form submitted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error submitting form" });
  }
});

// View submissions
app.get("/api/leads", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(50);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Forms service running on port ${PORT}`);
});