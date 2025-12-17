const jwt = require('jsonwebtoken');
const db = require('../config/db');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin auth verifica el role en la BD para cada request
// Esto previene que usuarios degradados mantengan acceso admin
const adminAuth = async (req, res, next) => {
  auth(req, res, async () => {
    try {
      // Verificar role actual en BD (no confiar solo en JWT)
      const result = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found.' });
      }

      const currentRole = result.rows[0].role;
      if (currentRole !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }

      // Actualizar req.user con role actual de BD
      req.user.role = currentRole;
      next();
    } catch (err) {
      console.error('[ADMIN AUTH] Error checking role:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
};

module.exports = { auth, adminAuth };
