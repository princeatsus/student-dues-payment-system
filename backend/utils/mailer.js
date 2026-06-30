const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Sends an email using the Brevo (formerly Sendinblue) transactional email API.
 * Falls back to console simulation if BREVO_API_KEY is not defined.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || '0324080147@htu.edu.gh';

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
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'COMPSSA HTU',
          email: senderEmail
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        htmlContent: html,
        textContent: text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Brevo HTTP error ${response.status}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
