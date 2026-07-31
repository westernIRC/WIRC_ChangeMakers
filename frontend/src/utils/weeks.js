// Mirrors backend/src/utils/weeks.js. Weeks run Monday -> Sunday in the organization's
// timezone, and a week is identified by the UTC midnight of that Monday's calendar date.
// If you change the boundary here, change it there too - a mismatch makes the dashboard
// disagree with the server about whether this week has been submitted.

const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE || "America/Toronto";

const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getCivilDateParts(date) {
  const parts = {};
  for (const part of civilDateFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts;
}

export function getWeekStart(date = new Date()) {
  const { year, month, day } = getCivilDateParts(date);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

export function isCurrentWeek(date) {
  return new Date(date).getTime() === getWeekStart().getTime();
}

// Week starts are UTC midnights standing in for a calendar date, not real instants. Reading
// them in the viewer's local zone shows the previous day anywhere west of UTC, so pin the
// format to UTC.
export function formatWeekStart(value) {
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
