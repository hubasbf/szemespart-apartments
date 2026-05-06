# Project Rules

This is the Szemespart Apartments website.

## Deployment Workflow

- Do not push changes immediately after implementation.
- Make changes locally first.
- Verify the change locally when possible.
- Tell Huba what changed and where to review it.
- Wait for explicit approval before committing or pushing.
- Only push when Huba clearly says to push, deploy, or publish the changes.

## Hosting

- Production is deployed from GitHub to Cloudflare Pages.
- The public Cloudflare URL is `https://szemespart-apartments.pages.dev/`.
- Calendar availability is served through the Cloudflare Pages Function at `/api/availability`.

## Availability Calendar

- Internal apartment IDs are `7`, `8`, and `34`.
- Use apartment-specific calendar env vars when available:
  - `APARTMENT_7_ICS_URL`
  - `APARTMENT_8_ICS_URL`
  - `APARTMENT_34_ICS_URL`
- `GOOGLE_CALENDAR_ICS_URL` is only a fallback.

## Design Direction

- Keep the site elegant, calm, and premium.
- Prefer clear apartment-selection UX over decorative interactions.
- Apartment selector cards should select an apartment, not open the gallery.
- The sticky apartment bar should make the current apartment obvious and provide a path to availability.
