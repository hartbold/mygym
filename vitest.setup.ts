import "fake-indexeddb/auto";

// Data-layer tests assume Europe/Madrid local time (DST boundaries, "avui"
// grouping). Set it explicitly rather than relying on the machine's TZ.
process.env.TZ = "Europe/Madrid";

const offsetMinutes = -new Date(2026, 0, 15).getTimezoneOffset();
if (offsetMinutes !== 60 && offsetMinutes !== 120) {
  throw new Error(
    `TZ=Europe/Madrid did not take effect (offset ${offsetMinutes}min) — date/DST tests would be meaningless.`,
  );
}
