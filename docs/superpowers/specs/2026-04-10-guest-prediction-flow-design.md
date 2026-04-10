# Design: Guest Prediction Flow

**Date:** 2026-04-10
**Status:** Approved

## Context

Users want to share a link on WhatsApp so friends can make World Cup predictions without registering first. The guest completes all 3 prediction steps, then can either export their prediction as an image or create an account to save it permanently.

## Overview

- New `/play` public route (optionally `/play?group=XXXX` for group invites)
- Guest predictions stored entirely in localStorage (no backend changes for guest state)
- Full 3-step flow: Groups -> Third Places -> Knockout
- Completion page with "Export Image" and "Create Account to Save" buttons
- On registration, localStorage predictions are automatically claimed and saved to the server

## Detailed Design

### 1. Entry Point: `/play` Route

New public route, not wrapped in `ProtectedRoute`.

**Behavior:**
- If user is already logged in: redirect to Home (`/`)
- If not logged in: set `guest_mode=true` in localStorage, then redirect to `/grupos`
- If URL has `?group=XXXX`: store invite code in localStorage key `guest_group_code` for later use during registration

**WhatsApp sharing:**
- Universal link: `mundalia.vercel.app/play`
- With group invite: `mundalia.vercel.app/play?group=XXXX`

### 2. Guest Mode Flag

A `guest_mode` key in localStorage (value `"true"`) indicates the user is in guest mode. This flag is:
- Set when the user enters via `/play`
- Checked by `ProtectedRoute` to allow unauthenticated access to prediction pages
- Cleared after successful registration + prediction claim
- Cleared if the user navigates to `/login` or `/register` without completing the flow

No changes to `AuthContext` — guest mode is orthogonal to auth state.

### 3. Auth Wall Changes

`ProtectedRoute` in `App.tsx` currently redirects unauthenticated users to `/login`. Modified behavior:

```
if (!isAuthenticated && !isGuestMode) → redirect to /login (current behavior)
if (!isAuthenticated && isGuestMode)  → allow access (guest flow)
if (isAuthenticated)                  → allow access (current behavior)
```

Where `isGuestMode = localStorage.getItem('guest_mode') === 'true'`.

**New public routes (no ProtectedRoute wrapper):**
- `/play` — guest entry point
- `/guest-complete` — guest completion page

**Prediction routes remain wrapped in ProtectedRoute** but the component's logic is updated to allow guest mode.

### 4. Prediction Pages in Guest Mode

The existing prediction pages (Predictions.tsx, ThirdPlaces.tsx, Knockout.tsx) already have localStorage fallback behavior when no `setId` query parameter is present. Guest mode leverages this:

- No `setId` in URL → pages read/write to localStorage keys:
  - `natalia_predictions` (group predictions)
  - `natalia_best_third_places` (third place selections)
  - `natalia_knockout` (knockout predictions)
  - `natalia_knockout_scores` (knockout scores, if applicable)

- Navigation between steps uses paths without `setId`:
  - `/grupos` → Next → `/terceros`
  - `/terceros` → Next → `/eliminatorias`
  - `/eliminatorias` → on save complete → `/guest-complete`

**Changes needed:**
- Knockout page: when in guest mode and prediction is complete, "Save" should navigate to `/guest-complete` instead of just showing a "saved" toast
- Back button on Groups page in guest mode: navigate to `/play` or `/` instead of `/mis-predicciones`

### 5. Guest Completion Page: `/guest-complete`

New page at `/guest-complete`. Public route (no auth required).

**Prerequisites check:** If localStorage has no prediction data (user navigated directly), redirect to `/play`.

**Content:**
- Heading: "Your prediction is ready!" (translated)
- Champion display (if knockout is complete) — same champion card as PredictionDetail
- Summary badges: Groups 12/12, Third Places 8/8, Bracket 32/32

**Two action buttons:**
- **"Export Image"** — uses the existing `exportToCanvas()` utility from `utils/exportCanvas.ts`, reading data from localStorage. Generates PNG, triggers download or Web Share API.
- **"Create Account to Save"** — navigates to `/register?from=guest` (appends `&group=XXXX` if `guest_group_code` exists in localStorage)

**Additional text:** "Without an account, your prediction is only saved in this browser."

### 6. Registration with Prediction Claim

When the user registers via `/register?from=guest`:

**Registration form:** Unchanged — same fields (name, email, password, Google OAuth).

**Post-registration claim flow** (runs client-side after successful registration):

1. Read predictions from localStorage:
   - `natalia_predictions` → group predictions
   - `natalia_best_third_places` → third places
   - `natalia_knockout` → knockout predictions
   - `natalia_knockout_scores` → knockout scores (if present)

2. Create a prediction set: `POST /prediction-sets` with name "Mi Prediccion" (or translated equivalent) and mode "positions"

3. Save predictions sequentially:
   - `POST /predictions/groups` with the group data + new setId
   - `POST /predictions/third-places` with the third places + new setId
   - `POST /predictions/knockout` with the knockout data + new setId

4. If `guest_group_code` exists in localStorage:
   - `POST /groups/join` with the invite code
   - Remove `guest_group_code` from localStorage

5. Clear guest localStorage keys:
   - `guest_mode`
   - `guest_group_code`
   - `natalia_predictions`
   - `natalia_best_third_places`
   - `natalia_knockout`
   - `natalia_knockout_scores`

6. Redirect to `/prediccion/:publicId` (the newly created prediction set)

**Error handling:** If any save step fails, show an error message but still complete registration. The user can redo predictions later.

**If `from=guest` but no localStorage data:** Skip the claim flow, just register normally.

### 7. Mode Restriction

Guest flow only supports "positions" mode (Escoger Ganadores). The "scores" mode (Marcadores Exactos) is more complex and not needed for the viral WhatsApp flow. If admin has restricted to "scores only", the guest flow should still work in positions mode — the mode restriction only applies to logged-in prediction creation.

## Files Affected

### New Files
- `natalia-frontend/src/pages/Play.tsx` — guest entry point
- `natalia-frontend/src/pages/GuestComplete.tsx` — completion page with export + register CTA

### Modified Files
- `natalia-frontend/src/App.tsx` — add /play and /guest-complete routes, update ProtectedRoute
- `natalia-frontend/src/pages/Register.tsx` — add post-registration claim flow
- `natalia-frontend/src/pages/Predictions.tsx` — guest-mode back button behavior
- `natalia-frontend/src/pages/Knockout.tsx` — guest-mode completion redirect
- `natalia-frontend/src/i18n/locales/*.json` (6 files) — translations for guest flow strings

### No Backend Changes
The guest flow uses existing API endpoints. No new backend routes, tables, or migrations needed.

## Out of Scope

- Server-side guest sessions (not needed — localStorage is sufficient)
- Guest flow for "scores" mode
- Analytics/tracking of guest conversions
- Rate limiting guest exports
