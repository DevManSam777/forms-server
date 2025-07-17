# Forms Server

Simple form handler with email notifications. Just 3 files.

## Files to Create

### 1. **server.js**
```javascript
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
```

### 2. **package.json**
```json
{
  "name": "forms",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "mongoose": "^7.5.0",
    "nodemailer": "^6.9.4",
    "dotenv": "^16.3.1"
  }
}
```

### 3. **.env**

There is an example.env file that you can use for reference

```bash
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.abc123.mongodb.net/forms?retryWrites=true&w=majority
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@yourdomain.com
PORT=3001
```


### 4. **.gitignore**

  Add your .env in this so that it is not included in your version control

  ```bash
  .env
  ```
---

## Setup Instructions

### Step 1: Create Project
```bash
mkdir forms
cd forms
```

### Step 2: Create Files
Create the 3 files above in your `forms` directory.

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Setup Database (MongoDB Atlas)
1. Go to https://cloud.mongodb.com
2. Sign up/login
3. Create new cluster (free tier)
4. Create database user
5. Get connection string
6. Update `MONGODB_URI` in `.env` file

### Step 5: Setup Email (Gmail)
1. Enable 2-factor authentication on Gmail
2. Generate app password: https://myaccount.google.com/apppasswords
3. Update `.env` with your email and app password

### Step 6: Configure .env
Edit `.env` file with your actual values:
```bash
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.abc123.mongodb.net/forms
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your-16-digit-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

### Step 7: Start Server
```bash
npm start
```

### Step 8: Test
```bash
curl http://localhost:3001/health
```

Should return: `{"status":"OK"}`

---

## Integration

### Step 1: Include the Web Component
Add this script tag to your HTML:
```html
<script src="https://raw.githack.com/DevManSam777/web_inquiry_form/main/web-inquiry-form.js" defer></script>
```

### Step 2: Use the Form Component
Point your web component to use the forms service:

**Local testing:**
```html
<web-inquiry-form api-url="http://localhost:3001/api/form/submit"></web-inquiry-form>
```

**Production:**
```html
<web-inquiry-form api-url="https://your-forms-service.onrender.com/api/form/submit"></web-inquiry-form>
```

**With theme options:**
```html
<!-- Light theme -->
<web-inquiry-form api-url="https://your-forms-service.onrender.com/api/form/submit" theme="light"></web-inquiry-form>

<!-- Dark theme -->
<web-inquiry-form api-url="https://your-forms-service.onrender.com/api/form/submit" theme="dark"></web-inquiry-form>

<!-- System preference (default) -->
<web-inquiry-form api-url="https://your-forms-service.onrender.com/api/form/submit"></web-inquiry-form>
```

**Available attributes:**
- `api-url` - Your forms service endpoint (required)
- `theme` - "light", "dark", or leave blank for system preference

### Complete Example
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Contact Us</h1>
    
    <!-- Include the web component -->
    <script src="https://raw.githack.com/DevManSam777/web_inquiry_form/main/web-inquiry-form.js" defer></script>
    
    <!-- Use the form component with dark theme -->
    <web-inquiry-form 
        api-url="https://your-forms-service.onrender.com/api/form/submit" 
        theme="dark">
    </web-inquiry-form>
</body>
</html>
```

---

## Deploy to Render

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/forms.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to https://render.com and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `forms-service`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
  
   _Tip: Render sites on the free tier spin down after 15 minutes of inactivity.  Either use a paid plan, or set up a cron job to send an http request every 14:59 minutes or less.  A good free resource is https://cron-job.org ._

### Step 3: Set Environment Variables
In Render dashboard, add these environment variables:
- `MONGODB_URI` = your Atlas connection string
- `EMAIL_HOST` = `smtp.gmail.com`
- `EMAIL_PORT` = `587`
- `EMAIL_USER` = your Gmail address
- `EMAIL_PASS` = your Gmail app password
- `ADMIN_EMAIL` = admin@yourdomain.com

### Step 4: Deploy
Click "Create Web Service" and wait for deployment to complete.

---

## API Endpoints

### Submit Form
```
POST /api/form/submit
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "phone": "555-123-4567",
  "preferredContact": "email",
  "serviceDesired": "Web Development",
  "message": "Need a website"
}
```

### View Submissions
```
GET /api/leads
```

### Health Check
```
GET /health
```

---

## Troubleshooting

**Server won't start:**
- Check MongoDB connection string
- Verify all environment variables are set

**Emails not sending:**
- Verify Gmail app password (not regular password)
- Check spam folder
- Ensure 2-factor auth is enabled on Gmail

**Form submissions failing:**
- Check CORS settings
- Verify API URL in web component
- Check server logs for errors

**MongoDB connection issues:**
- Verify Atlas cluster is running
- Check whitelist IP addresses in Atlas
- Ensure connection string is correct

---

## View Submissions

Visit `http://localhost:3001/api/leads` to see all form submissions in JSON format.

For production: `https://your-forms-service.onrender.com/api/leads`

## License

[LICENSE](LICENSE)  

Copyright (c) 2025 DevManSam


## Need a Form?

Here is a link to a form web component I created that you can easily add to any site!  

https://github.com/DevManSam777/web_inquiry_form


#### Thanks for stopping by!

