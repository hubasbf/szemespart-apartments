# Szemespart Apartments

Static multilingual apartment collection site for Apartments 7, 8, and 34 in Szemespart II, Balatonszemes.

## Availability calendars

Cloudflare Pages Functions and the local preview server read Google Calendar ICS URLs from environment variables.

Current fallback:

```text
GOOGLE_CALENDAR_ICS_URL
```

Future per-apartment variables:

```text
APARTMENT_7_ICS_URL
APARTMENT_8_ICS_URL
APARTMENT_34_ICS_URL
```

If an apartment-specific variable is missing, the function falls back to `GOOGLE_CALENDAR_ICS_URL`.

The production site calls:

```text
/api/availability?apartment=34
```
