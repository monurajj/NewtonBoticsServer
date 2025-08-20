const express = require('express');
const router = express.Router();
const { sendContactAcknowledgement, sendContactNotificationToAdmin } = require('../services/emailService');

// TODO: Implement contact routes
// - POST /api/contact/submit - Submit contact form
// - GET /api/contact/submissions - List contact submissions (admin)
// - GET /api/contact/submissions/:id - Get contact submission details
// - PUT /api/contact/submissions/:id - Update contact submission status
// - DELETE /api/contact/submissions/:id - Delete contact submission

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Contact route - Implementation coming soon!',
    data: {
      endpoints: [
        'POST /api/contact/submit - Submit contact form',
        'GET /api/contact/submissions - List contact submissions',
        'GET /api/contact/submissions/:id - Get submission details',
        'PUT /api/contact/submissions/:id - Update submission',
        'DELETE /api/contact/submissions/:id - Delete submission'
      ]
    }
  });
});

// Example: POST /api/contact/submit (skeleton with emails)
router.post('/submit', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  try {
    await sendContactAcknowledgement({ name, email });
    await sendContactNotificationToAdmin({ subject, name, email, message });
    res.json({ success: true, message: 'Submission received' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to process submission' });
  }
});

module.exports = router;
