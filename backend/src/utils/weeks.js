// Weeks run Monday -> Sunday in the organization's local timezone (APP_TIMEZONE, default
// America/Toronto). A week's identity is still the UTC midnight of that Monday's calendar
// date, which is what's stored in WeeklyEntry.weekStartDate.
//
// The distinction matters: deriving the week from UTC directly would roll the week over at
// Sunday 8pm Toronto time (EDT) / 7pm (EST), so a member submitting Sunday evening would be
// credited to the *following* week and appear to have skipped one. Anchoring to the local
// civil date keeps the boundary at local Monday midnight, where members expect it.
//
// Storage format is unchanged, so no data migration is needed - only which Monday a given
// instant maps to near the boundary.

const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Toronto";

const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// The wall-clock year/month/day in APP_TIMEZONE at the given instant.
function getCivilDateParts(date) {
  const parts = {};
  for (const part of civilDateFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts;
}

function getWeekStart(date = new Date()) {
  const { year, month, day } = getCivilDateParts(date);
  // Rebuild the local civil date as a UTC midnight so the weekday maths below is free of
  // any offset, then walk back to Monday.
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

// Safe to stay in UTC: week keys are always UTC midnights, so adding whole days never
// crosses a DST seam.
function addWeeks(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d;
}

function weeksBetween(from, to) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerWeek);
}

function getPeriodStart(period) {
  const currentWeekStart = getWeekStart(new Date());
  switch (period) {
    case "week":
      return currentWeekStart;
    case "month":
      return addWeeks(currentWeekStart, -4);
    case "rolling3mo":
      return addWeeks(currentWeekStart, -13);
    case "all":
    default:
      return null;
  }
}

module.exports = { getWeekStart, addWeeks, weeksBetween, getPeriodStart, APP_TIMEZONE };
