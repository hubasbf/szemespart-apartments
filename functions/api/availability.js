const calendarTimezone = "Europe/Budapest";
const monthsBeforeCurrent = 1;
const monthsAfterCurrent = 18;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const apartment = normalizeApartment(url.searchParams.get("apartment"));
  const icsUrl = calendarUrlForApartment(apartment, env);
  const calendarWindow = createCalendarWindow(new Date());

  if (!icsUrl) {
    return json({
      source: "missing-config",
      apartment,
      events: [],
      message: `Set APARTMENT_${apartment}_ICS_URL or GOOGLE_CALENDAR_ICS_URL to read live Google Calendar data.`
    }, 503);
  }

  try {
    const response = await fetch(icsUrl);
    if (!response.ok) {
      throw new Error(`Google Calendar ICS returned ${response.status}`);
    }

    const ics = await response.text();
    return json({
      source: "google-calendar",
      apartment,
      window: calendarWindow,
      events: parseIcsEvents(ics, calendarWindow)
    });
  } catch (error) {
    return json({ source: "error", events: [], message: error.message }, 502);
  }
}

function normalizeApartment(apartment) {
  const value = String(apartment || "34").trim();
  return ["7", "8", "34"].includes(value) ? value : "34";
}

function calendarUrlForApartment(apartment, env = {}) {
  return env[`APARTMENT_${apartment}_ICS_URL`] || env.GOOGLE_CALENDAR_ICS_URL;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function parseIcsEvents(ics, calendarWindow) {
  return unfoldIcs(ics)
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((block) => block.split("END:VEVENT")[0])
    .map(parseEventBlock)
    .filter(Boolean)
    .filter((event) => event.end >= calendarWindow.start && event.start <= calendarWindow.end)
    .map(({ status, start, end }) => ({ status, start, end }));
}

function unfoldIcs(ics) {
  return ics.replace(/\r?\n[ \t]/g, "");
}

function parseEventBlock(block) {
  const summary = getField(block, "SUMMARY") || "";
  const dtStart = getDateField(block, "DTSTART");
  const dtEnd = getDateField(block, "DTEND");

  if (!dtStart) return null;

  const status = statusFromSummary(summary);
  const start = dtStart.date;
  const end = normalizeEndDate(dtEnd, dtStart);

  return { status, start, end, summary };
}

function getField(block, fieldName) {
  const line = block
    .split(/\r?\n/)
    .find((row) => row.startsWith(`${fieldName}`));
  if (!line) return "";
  return line.slice(line.indexOf(":") + 1).trim();
}

function getDateField(block, fieldName) {
  const line = block
    .split(/\r?\n/)
    .find((row) => row.startsWith(`${fieldName}`));
  if (!line) return null;

  const value = line.slice(line.indexOf(":") + 1).trim();
  const isDateOnly = line.includes("VALUE=DATE");
  const isUtc = value.endsWith("Z");
  const time = value.length >= 15 ? `${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}` : "00:00:00";
  const date = isUtc ? formatDateInTimezone(parseUtcDateTime(value), calendarTimezone) : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const localTime = isUtc ? formatTimeInTimezone(parseUtcDateTime(value), calendarTimezone) : time;

  return {
    date,
    isDateOnly,
    localTime
  };
}

function normalizeEndDate(dtEnd, dtStart) {
  if (!dtEnd) return dtStart.date;

  if (dtEnd.isDateOnly || dtEnd.localTime === "00:00:00" || dtEnd.localTime === "24:00:00") {
    return addDays(dtEnd.date, -1);
  }

  return dtEnd.date;
}

function statusFromSummary(summary) {
  const normalized = summary.toLowerCase();
  if (normalized.includes("hold") || normalized.includes("pending") || normalized.includes("reserved")) {
    return "reserved";
  }
  return "booked";
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(isoDate, months) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function createCalendarWindow(date) {
  const parts = dateParts(date, calendarTimezone);
  const currentMonthStart = `${parts.year}-${parts.month}-01`;
  const start = addMonths(currentMonthStart, -monthsBeforeCurrent);
  const end = lastDayOfMonth(addMonths(currentMonthStart, monthsAfterCurrent));
  return { start, end };
}

function parseUtcDateTime(value) {
  return new Date(Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(9, 11)),
    Number(value.slice(11, 13)),
    Number(value.slice(13, 15))
  ));
}

function formatDateInTimezone(date, timezone) {
  const parts = dateParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatTimeInTimezone(date, timezone) {
  const parts = dateParts(date, timezone);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function dateParts(date, timezone) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date).map((part) => [part.type, part.value]));
}
