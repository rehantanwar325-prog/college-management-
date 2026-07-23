import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =========================================================================
// NOTICE BOARD
// =========================================================================

// List notices matching user role
router.get('/notices', authenticate, async (req, res) => {
  const { role, id } = req.user;
  try {
    const list = await query('SELECT n.*, u.email as creator_email FROM notices n LEFT JOIN users u ON n.created_by = u.id ORDER BY n.created_at DESC');
    
    // Filter notices client-side or server-side.
    // If not superadmin/admin, filter notice by roles:
    const filtered = list.filter(notice => {
      if (role === 'superadmin' || role === 'admin') return true;
      try {
        const roles = JSON.parse(notice.target_roles_json || '[]');
        return roles.includes(role);
      } catch (e) {
        return true; // Fallback
      }
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notice
router.post('/notices', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { title, content, target_roles, target_groups } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const result = await run(`
      INSERT INTO notices (title, content, target_roles_json, target_groups_json, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [
      title, content, 
      target_roles ? JSON.stringify(target_roles) : JSON.stringify(['student', 'faculty', 'parent']),
      target_groups ? JSON.stringify(target_groups) : '[]',
      req.user.id
    ]);

    res.status(201).json({ id: result.id, title, message: 'Notice posted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/notices/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// NOTIFICATION SENDER (SIMULATED SMS / EMAIL GATEWAY)
// =========================================================================
router.post('/send-alert', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { type, recipient, title, message } = req.body;
  if (!type || !recipient || !message) {
    return res.status(400).json({ error: 'Alert Type (sms/email), Recipient contact, and Message content are required' });
  }

  try {
    // Generate simulated notification log
    const simulationPayload = {
      id: Math.floor(Math.random() * 900000) + 100000,
      timestamp: new Date().toISOString(),
      type,
      recipient,
      title: title || 'System Notification',
      message,
      gateway_response: {
        status: 'DELIVERED',
        provider: type === 'sms' ? 'Twilio Gateway Service' : 'SendGrid SMTP Service',
        message_id: `msg_sim_${Math.random().toString(36).substring(2, 10)}`,
        cost: type === 'sms' ? '$0.0075' : '$0.0000'
      }
    };

    // Log to console for debugging
    console.log(`[SIMULATION-NOTIFICATION] [${type.toUpperCase()}] To: ${recipient} | Msg: ${message}`);

    // Insert into audit logs for system tracking
    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)', [
      req.user.id,
      `SEND_NOTIFICATION_${type.toUpperCase()}`,
      'notices',
      JSON.stringify(simulationPayload)
    ]);

    res.json({
      message: `${type.toUpperCase()} alert sent (simulated gateway response)`,
      log: simulationPayload
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
