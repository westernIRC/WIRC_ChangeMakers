// Minimal fixed-window rate limiter.
//
// State is per-process and in-memory, which is the right trade for a single-instance deploy
// and no extra infrastructure. If this ever runs on more than one instance the limits become
// per-instance rather than global - at that point move the counters into Postgres or Redis.
function rateLimit({ windowMs, max, keyFn, message }) {
  const hits = new Map();
  let lastSweep = Date.now();

  function sweep(now) {
    if (now - lastSweep < windowMs) return;
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
    lastSweep = now;
  }

  return (req, res, next) => {
    const now = Date.now();
    sweep(now);

    const key = keyFn(req);
    if (key == null) return next();

    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: message || `Too many attempts. Please try again in ${retryAfter} seconds.`,
      });
    }
    next();
  };
}

const ipKey = (req) => req.ip;
const emailKey = (req) => {
  const email = req.body?.email;
  return typeof email === "string" ? `email:${email.trim().toLowerCase()}` : null;
};

module.exports = { rateLimit, ipKey, emailKey };
