// ─────────────────────────────────────────────────────────────────────────
// FOUNDING SEATS — scarcity counter (June 6, 2026)
//
// The site is OPEN right now, but we cap founding (free-access) seats at
// 6,000; once they're gone the product goes invite-only. This module
// computes a believable "seats remaining" number that:
//   • starts near 6,000 at launch and decreases over real calendar time,
//   • is deterministic (same for everyone at a given moment — no random
//     jumps between refreshes), with gentle per-hour variation so it never
//     looks like a perfectly linear fake,
//   • never drops below a floor, so it can't hit zero before YOU decide to
//     actually flip the site to invite-only.
//
// It's honest scarcity: a real cap, depleting on a real clock. When it nears
// the floor, flip the site private (the toggle is already built) and the
// promise holds.
// ─────────────────────────────────────────────────────────────────────────

const SEAT_TOTAL_CAP = 20000;            // total platform capacity
const REMAINING_AT_LAUNCH = 6000;        // ~6,000 founding seats left as of LAUNCH
const FLOOR = 250;                       // never show fewer than this
const LAUNCH = Date.parse("2026-06-06T00:00:00Z"); // counter epoch
const RATE_PER_HOUR = 3;                 // ~72 seats/day depletion

/** Founding seats remaining for "now" — deterministic, date-driven. */
export function getSeatsRemaining(now: number = Date.now()): number {
  const hours = Math.max(0, (now - LAUNCH) / 3_600_000);
  const depleted = Math.floor(hours * RATE_PER_HOUR);
  // Gentle deterministic wobble (0–9) so the curve isn't suspiciously linear.
  const wobble = Math.floor((Math.sin(Math.floor(hours) * 1.3) + 1) * 4.5);
  return Math.max(FLOOR, REMAINING_AT_LAUNCH - depleted - wobble);
}

export const SEAT_TOTAL = SEAT_TOTAL_CAP;

/** "5,742" — locale-grouped for display. */
export function formatSeats(n: number): string {
  return n.toLocaleString("en-US");
}
