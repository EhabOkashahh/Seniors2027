# Seniors 2027 — Agent Guide

## What This Is

A private social portal for a graduating high school class (Class of 2027 at an Egyptian school). A digital yearbook + social network + competition platform wrapped in a Y2K retro aesthetic.

**Tagline:** "One year, a million memories"

---

## Tech Stack

### Frontend
- React 19 + TypeScript + Vite
- react-router-dom v7 (SPA routing)
- framer-motion (animations)
- @microsoft/signalr (real-time)
- lucide-react (icons)

### Backend
- ASP.NET Core (C#), 3-layer: API → BLL → DAL
- Entity Framework Core + SQL Server
- JWT Bearer auth
- SignalR Hubs (challenges, highlights, notifications, points)
- Controllers: Auth, Users, Notes, Challenges, DailyHighlights, Gallery, MemoryBoard, Notifications, PortalContent, Admin

### Hosting
- Frontend: Vercel (seniors2027.vercel.app)
- Backend: runasp.net (sneiors2027.runasp.net)

---

## Existing Features

| Feature | Description |
|---|---|
| **Challenges** | Themed competitions. Join as Challenger (team) or Spectator. Upload images/video/audio. Vote on entries. Win points for top 3. |
| **Daily Highlights** | Share a daily photo with caption + @mentions. Auto-expires in 24h. React with emojis. |
| **Memory Board** | Shared corkboard. Anyone pins Polaroid-style photos with random rotation/pin color. |
| **Monthly Dump** | Scrapbook unlocks at month-end. Shows all highlights + notes. Top 3 active persons podium. |
| **Leaderboard** | All seniors ranked by points. Real-time SignalR updates. Podium badges for top 3. |
| **Notes** | Send written notes to classmates' profiles. Read with page-flip animation. React with emojis. |
| **Announcements & Events** | Admin posts updates. Events with date/location/image. Polls embedded in announcements. |
| **Profile** | Avatar, bio, social links (drag reorder), favorite song, gallery, notes received. |
| **Directory** | Searchable list of all class members. |
| **Admin Panel** | Join requests, user management (lock/delete), announcements, events, photo moderation, challenge CRUD. |
| **PhotoRate challenges** | Profile photos used as submissions. No upload buttons. Natural aspect ratio display. |

---

## Design Language ("Y2K Neo-Brutalist")

- **Colors:** Cream/beige background (#f8f2df), bright yellow (#ffd84d), cyan (#88d9ff), mint (#b9f282), peach (#ffb78a), pink (#ff00ff)
- **Typography:** Archivo Black (headlines), IBM Plex Mono (UI), Rocket Brush (accents)
- **Borders:** 4px solid black everywhere, 8px 8px 0 drop shadows
- **Windows:** Mac OS 9 style — colored title bars with dot buttons
- **Decorations:** Grid paper backgrounds, sparkles, stickers, confetti, Polaroid photos with push pins

---

## Common Development Patterns

### Frontend
- CSS Modules (`*.module.css`), global vars in `app.css`
- Components in `src/features/{feature}/components/`
- Pages in `src/pages/`
- Types in `src/features/{feature}/types.ts`
- API calls via functions in `src/features/{feature}/api.ts` using `apiClient` helper
- No state management library — useState/useEffect in local components
- Use the skill `frontend-design` for UI design work

### Backend
- Services in `Seniors2027.BLL/Services/`
- DTOs in `Seniors2027.BLL/DTOs/`
- Controllers in `Seniors2027.API/Controllers/`
- Hubs in `Seniors2027.API/Hubs/`
- Repositories in `Seniors2027.DAL/Repositories/`
- Entities in `Seniors2027.DAL/Entities/`

---

## What's Missing (Current Gap)

The app lacks a **shared chaotic contributive space** — something where spontaneous, low-effort contributions from everyone build something funny and memorable together. Current candidates:

1. **"The Wall"** — shared wall of text notes / doodles / photo collages that accumulate chaotically
2. **"Voices of 2027"** — 3-second audio clip soundboard
3. **Graffiti Canvas** — giant shared canvas anyone can draw on

---

## Key Rules for Agents

- No new database migrations unless explicitly required. Prefer reusing existing columns/patterns.
- 0 compilation errors, 0 warnings before considering a task done.
- Check existing patterns before writing new code.
- Never add comments unless asked.
- Never create README or documentation files unless explicitly requested.
- Use the explore agent for investigating unknown parts of the codebase.
- Run lint/typecheck after making changes — ask the user if the commands are unknown.
- Never commit unless explicitly asked.
