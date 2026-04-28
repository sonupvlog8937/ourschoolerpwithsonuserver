// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware =(roles=[])=>{return (req, res, next) => {
    let token = req.header('Authorization');
    
    // Handle both "Bearer token" and direct token formats
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }

    if (!token) {
      console.log('Auth failed: No token provided');
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWTSECRET);
      req.user = decoded; // Attach the decoded token to the request object
      
      console.log('Auth successful:', { userId: decoded.id, role: decoded.role, schoolId: decoded.schoolId });
      
      // Check if the user's role is allowed to access the route
      if (roles.length && !roles.includes(req.user.role)) {
        console.log('Auth failed: Role not allowed', { userRole: req.user.role, allowedRoles: roles });
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      next(); // Call the next middleware or route handler
    } catch (error) {
        console.log("Auth Error", error.message);
      res.status(401).json({ success: false, message: 'Token is not valid' });
    }
  };
}


module.exports = authMiddleware;

