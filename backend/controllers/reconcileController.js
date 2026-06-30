const pool = require('../config/db');
const { decrypt } = require('../utils/encryption');
const { sendEmail } = require('../utils/mailer');

/**
 * Parses CSV lines into structured row objects.
 * Handles quoted fields containing commas.
 */
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }).filter(line => line.length > 0 && line.some(col => col !== ''));
};

// POST /api/accountant/reconcile/upload - Parse MoMo CSV Statement (US-3.1.1 / US-3.1.2)
const uploadStatement = async (req, res) => {
  try {
    const { csvText } = req.body;
    if (!csvText) {
      return res.status(400).json({ message: 'No CSV statement text provided' });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return res.status(400).json({ message: 'Empty or invalid CSV file' });
    }

    const header = rows[0].map(h => h.toLowerCase());
    
    // Locate critical columns dynamically by scanning header keywords.
    // NFR-MAIN-02: Comments are highly detailed here so future developers can easily adapt column indices.
    const narrationIdx = header.findIndex(h => h.includes('narration') || h.includes('reference') || h.includes('details') || h.includes('info'));
    const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('cash') || h.includes('sum'));
    const dateIdx = header.findIndex(h => h.includes('date') || h.includes('time'));
    const txIdIdx = header.findIndex(h => h.includes('id') || h.includes('txid') || h.includes('transaction'));

    if (narrationIdx === -1 || amountIdx === -1) {
      return res.status(400).json({ 
        message: 'Could not auto-detect Narration or Amount columns. Ensure your CSV has headers containing "Narration" and "Amount".' 
      });
    }

    const matched = [];
    const unmatched = [];

    // Skip header row and loop
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= Math.max(narrationIdx, amountIdx)) continue;

      const narration = row[narrationIdx];
      const amountStr = row[amountIdx].replace(/[^\d.]/g, ''); // strip GHS symbols/commas
      const amount = parseFloat(amountStr);
      const dateStr = dateIdx !== -1 ? row[dateIdx] : new Date().toISOString();
      const txId = txIdIdx !== -1 ? row[txIdIdx] : `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      if (isNaN(amount) || !narration) continue;

      // Regular Expression to find our payment reference format (e.g., HTU-ELE-26-ABCD)
      // Matches both standard reference 'HTU-ELE-26-XXXX' and carryover code patterns
      const refMatch = narration.match(/HTU-ELE-\d{2}-[A-Z0-9]{4}/i);
      const referenceCode = refMatch ? refMatch[0].toUpperCase() : null;

      if (referenceCode) {
        // Query database to see if this pending reference exists
        const txResult = await pool.query(
          `SELECT t.id, t.amount, t.payment_reference, s.full_name, s.index_number 
           FROM transactions t
           JOIN students s ON t.student_id = s.id
           WHERE t.payment_reference = $1 AND t.status = 'PENDING'`,
          [referenceCode]
        );

        if (txResult.rows.length > 0) {
          const transaction = txResult.rows[0];
          matched.push({
            transaction_id: transaction.id,
            index_number: transaction.index_number,
            student_name: transaction.full_name,
            reference: referenceCode,
            amount: amount,
            date: dateStr,
            tx_id: txId,
            matched_amount: parseFloat(transaction.amount) === amount
          });
        } else {
          // Reference exists in text but not found as PENDING in our DB
          unmatched.push({
            raw_row: row.join(', '),
            narration,
            amount,
            date: dateStr,
            tx_id: txId,
            reason: 'Reference code not found in pending list'
          });
        }
      } else {
        // No reference code found in narration string (US-3.1.4)
        unmatched.push({
          raw_row: row.join(', '),
          narration,
          amount,
          date: dateStr,
          tx_id: txId,
          reason: 'No HTU reference code found in narration'
        });
      }
    }

    res.status(200).json({ matched, unmatched });

  } catch (error) {
    console.error('CSV parse error:', error.message);
    res.status(500).json({ message: 'Server error parsing CSV file' });
  }
};

// POST /api/accountant/reconcile/confirm - Commit selected reconciliations (US-3.1.3)
const confirmReconciliation = async (req, res) => {
  try {
    const { payments } = req.body; // Array of { transaction_id, amount, tx_id, date, payment_method }
    const accountantId = req.user.id;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: 'No payments provided for confirmation' });
    }

    // Fetch active session info once
    const sessionResult = await pool.query(
      'SELECT academic_year, semester FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    const sessionInfo = sessionResult.rows.length > 0 ? sessionResult.rows[0] : { academic_year: '2025/2026', semester: 1 };

    let successCount = 0;

    for (const payment of payments) {
      const { transaction_id, amount, tx_id, date, payment_method } = payment;

      // Update transaction details in a single query
      const result = await pool.query(
        `UPDATE transactions 
         SET status = 'RECONCILED', 
             reconciled_by = $1, 
             reconciled_at = CURRENT_TIMESTAMP, 
             payment_method = $2,
             notes = $3
         WHERE id = $4 AND status = 'PENDING'
         RETURNING student_id, payment_reference`,
        [accountantId, payment_method || 'MOMO_MTN', `CSV Reconciled. MoMo TxID: ${tx_id || 'N/A'}. Date: ${date || 'N/A'}`, transaction_id]
      );

      if (result.rows.length > 0) {
        const tx = result.rows[0];
        successCount++;

        // Add append-only audit log entry (NFR-SEC-02 Compliance)
        await pool.query(
          `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            accountantId, 
            'PAYMENT_RECONCILED', 
            'TRANSACTION', 
            transaction_id, 
            JSON.stringify({ 
              student_id: tx.student_id, 
              reference: tx.payment_reference,
              amount: amount, 
              momo_tx_id: tx_id 
            })
          ]
        );

        // Fetch student details and send receipt email asynchronously
        pool.query(
          'SELECT full_name, email FROM students WHERE id = $1',
          [tx.student_id]
        ).then(studentResult => {
          if (studentResult.rows.length > 0) {
            const student = studentResult.rows[0];
            const decryptedEmail = decrypt(student.email);
            const emailText = `Dear ${student.full_name}, your MoMo payment of GHS ${parseFloat(amount).toFixed(2)} with reference ${tx.payment_reference} has been successfully reconciled for the ${sessionInfo.academic_year} academic year, semester ${sessionInfo.semester}.`;
            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                <h2 style="color: #0f9d58; margin-top: 0;">✅ COMPSSA Dues Reconciled Receipt</h2>
                <p>Dear <strong>${student.full_name}</strong>,</p>
                <p>We are pleased to inform you that your mobile money transaction has been successfully matched and reconciled against your dues invoice.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Amount Paid:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-weight: bold; color: #0f9d58;">GHS ${parseFloat(amount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Reference:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-family: monospace;">${tx.payment_reference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">MoMo Trans ID:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-family: monospace;">${tx_id || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Semester:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right;">${sessionInfo.academic_year} - Sem ${sessionInfo.semester}</td>
                  </tr>
                </table>
                <p>You can now download your Department Clearance Certificate from the student portal.</p>
                <div style="margin: 24px 0;">
                  <a href="https://student-dues-payment-system.vercel.app" style="background-color: #0f9d58; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Student Portal</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eaeaea;" />
                <p style="font-size: 12px; color: #64748b;">Ho Technical University · Computer Science Department</p>
              </div>
            `;
            sendEmail({
              to: decryptedEmail,
              subject: '✅ COMPSSA Dues Reconciled Receipt',
              text: emailText,
              html: emailHtml
            }).catch(err => console.error('Failed to send MoMo reconciliation email:', err.message));
          }
        }).catch(err => console.error('Failed to query student info for reconciliation email:', err.message));
      }
    }

    res.status(200).json({ 
      message: `Successfully reconciled and posted ${successCount} out of ${payments.length} transactions.` 
    });

  } catch (error) {
    console.error('Reconciliation confirmation error:', error.message);
    res.status(500).json({ message: 'Server error committing payments' });
  }
};

module.exports = {
  uploadStatement,
  confirmReconciliation
};
