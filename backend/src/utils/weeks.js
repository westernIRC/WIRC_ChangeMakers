// Weeks run Monday -> Sunday. All week identity is the UTC date of that week's Monday, at midnight.

function getWeekStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

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

module.exports = { getWeekStart, addWeeks, weeksBetween, getPeriodStart };
