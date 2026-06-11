# Codeyard Custom

Custom Frappe v16 app for Code Yard Private Limited.

## Features

- **Meeting Room Booking** — Calendar-based room booking at `/app/room-booking`
  - FullCalendar.js TimeGrid view (week/day)
  - Click on empty slot to book instantly
  - Room color coding and conflict detection
  - Cancel bookings from calendar view

## Requirements

Meeting Room Booking links its `room` field to a **`Meeting room`** master DocType
(holding the rooms, e.g. `3A`, `3B`). This master is expected to already exist on
the site — it is **not** shipped with this app. Create it (or seed at least one room)
before using the booking page, otherwise the required `room` field cannot be filled.
FullCalendar is loaded from Frappe v16's bundled copy (`frappe.FullCalendar`); no
external CDN is required.

## Installation

```bash
bench get-app https://github.com/chinmaybhatk/codeyard_custom
bench --site your-site install-app codeyard_custom
bench --site your-site migrate
```

## Frappe Cloud

1. Go to your bench dashboard
2. Apps → Add App → GitHub URL: `https://github.com/chinmaybhatk/codeyard_custom`
3. Branch: `main`
4. Install on your site

## License

MIT
