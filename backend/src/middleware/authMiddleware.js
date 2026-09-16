const { verifyToken } = require("../utils/jwt");

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  const token = authorization.substring(7);

  try {
    const payload = verifyToken(token);

    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}

module.exports = authenticate;