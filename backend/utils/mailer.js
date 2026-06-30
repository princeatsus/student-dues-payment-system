const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Sends an email using the Resend API.
 * Falls back to console simulation if RESEND_API_KEY is not defined.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.includes('placeholder')) {
    console.log('--- [SIMULATED EMAIL SENT] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Text): ${text || 'N/A'}`);
    console.log(`Body (HTML): ${html || 'N/A'}`);
    console.log('------------------------------');
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'COMPSSA Dues <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html,
        text: text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Resend HTTP error ${response.status}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
