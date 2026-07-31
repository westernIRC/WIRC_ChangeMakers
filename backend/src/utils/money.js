const { z } = require("zod");

// WeeklyEntry.amount and Settings.weeklyMinimum are Decimal(10,2), so anything at or above
// 100,000,000 overflows the column and Prisma throws a raw error into the 500 handler. Cap
// well below that: this tracks a student fundraising week, and a seven-figure entry is a
// typo (or someone probing) rather than a real submission.
const MAX_AMOUNT = 1_000_000;

// Rejects more than two decimal places. Postgres would silently round a third decimal into
// the stored value, so the number a member typed and the number they're scored on would
// quietly differ.
function hasAtMostTwoDecimals(value) {
  return Number(value.toFixed(2)) === value;
}

const amountSchema = z
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a real number")
  .positive("Amount must be greater than zero")
  .max(MAX_AMOUNT, `Amount must be at most $${MAX_AMOUNT.toLocaleString()}`)
  .refine(hasAtMostTwoDecimals, "Amount can have at most two decimal places");

module.exports = { amountSchema, MAX_AMOUNT };
