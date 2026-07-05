const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const asyncHandler = require("../utils/asyncHandler");

// The JWT only proves identity (its signature authenticates `id`). Role and House are
// re-fetched from the DB on every request rather than trusted from the token payload,
// so an admin reassigning someone's House or role takes effect immediately instead of
// waiting for that user's existing session to expire and be re-issued.
const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true, houseId: true },
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = user; // { id, role, houseId }
  next();
});

const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, houseId: true },
    });
  } catch (err) {
    // ignore invalid token for optional auth
  }
  next();
});

module.exports = { authMiddleware, optionalAuthMiddleware };
