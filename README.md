# Codeyard Custom

Custom Frappe v16 app for Code Yard Private Limited.

## Features

- **Meeting Room Booking** — Calendar-based room booking at `/app/room-booking`
  - FullCalendar.js TimeGrid view (week/day)
  - Click on empty slot to book instantly
  - Room color coding and conflict detection
  - Cancel bookings from calendar view

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
