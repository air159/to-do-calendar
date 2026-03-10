# To-Do Calendar (Web App MVP)

This repository now contains a **mobile-friendly web app** for your to-do calendar idea.

## Why web app first?
A web app is the fastest free path to run on both:
- **Phone** (mobile browser, optionally install to home screen as a PWA later)
- **Laptop** (desktop browser)

Compared with native Android first, this keeps development simpler and avoids app store setup while validating your UX and features.

## Included features
- Month calendar view with daily progress bars and motivation colors:
  - White: untouched day
  - Red: low completion
  - Yellow: partial completion
  - Green: fully complete
- Click a day to open/edit that day's tasks.
- Task urgency sorting by priority: `critical`, `high`, `medium`, `low`.
- Recurring tasks that only reset **after check-off**:
  - Daily, weekly, monthly, or custom every N days.
- General backlog tasks with no strict date.
- One-click move between backlog and selected day.
- Edit, reschedule, complete/uncomplete, and delete tasks.
- Completed tasks remain visible.
- Data persistence in browser `localStorage`.

## Run locally
No dependencies required.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Next recommended upgrades
1. Add user accounts and sync (Supabase/Firebase free tier) for multi-device data sync.
2. Add true PWA install/offline support.
3. Add filters: “only non-negotiables”, “overdue”, “this week”.
4. Add drag-and-drop rescheduling and better recurrence handling.
