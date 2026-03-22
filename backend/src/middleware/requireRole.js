/**
 * Middleware factory to restrict a route to a specific role.
 * Usage: router.post('/route', authenticate, requireRole('teacher'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires role: ${role}` });
    }
    next();
  };
}

module.exports = requireRole;