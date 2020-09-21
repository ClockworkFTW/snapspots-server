const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET;

const validateToken = (req, res, next) => {
  const authorization = req.get("authorization");

  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.substring(7);
    const pass = jwt.verify(token, jwtSecret);

    if (pass) {
      next();
    } else {
      return res.status(400).json({ error: "invalid token" });
    }
  } else {
    return res.status(400).json({ error: "token missing" });
  }
};

module.exports = { validateToken };
