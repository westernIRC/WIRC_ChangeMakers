const asyncHandler = require("../utils/asyncHandler");

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Allows overall_admin unconditionally, or vp_admin only when acting on their own houseId.
// `getHouseId` extracts the target houseId from the request (params/body/loaded resource).
function requireHouseScope(getHouseId) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user || !["vp_admin", "overall_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role === "overall_admin") return next();

    const targetHouseId = await getHouseId(req);
    if (!targetHouseId || targetHouseId !== req.user.houseId) {
      return res.status(403).json({ error: "Forbidden: outside your House scope" });
    }
    next();
  });
}

module.exports = { requireRole, requireHouseScope };
