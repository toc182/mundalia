# Prediction-level group association — Design

Date: 2026-06-08
Status: Approved

## Problem

Private groups currently associate at the **user** level: joining a group creates a
`private_group_members` row, and the group leaderboard scores each member by their
single best-scoring prediction set (`calculateUserBestScore`). There is no way to
choose which prediction represents you in a group, link an existing prediction to a
group, or compete with more than one of your predictions.

## Goals

- Association is at the **prediction** level, not the user level.
- A dedicated group details page (route) showing the ranking.
- From a group, start a new prediction that is linked to that group.
- Link an existing prediction to a group.

## Decisions (from brainstorming)

- **Cardinality:** full many-to-many. A prediction can be linked to multiple groups,
  and a user can link multiple of their own predictions to the same group (so they may
  appear multiple times in one ranking — intended).
- **Access model:** keep join-by-code membership as the access layer. You must be a
  member of a group to link a prediction to it.
- **Existing data:** start empty. No backfill — existing group rankings are empty until
  members link predictions.

## Data model

Keep `private_group_members` unchanged (access/membership).

New join table:

```sql
CREATE TABLE IF NOT EXISTS group_prediction_links (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES private_groups(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, prediction_set_id)
);
CREATE INDEX IF NOT EXISTS idx_gpl_group ON group_prediction_links(group_id);
CREATE INDEX IF NOT EXISTS idx_gpl_set ON group_prediction_links(prediction_set_id);
```

Deleting a prediction set or a group cascades and removes its links.
Added to both `server.ts` auto-migrations and `migrations.sql` (migration 013).

## Scoring

Extract `calculateSetScore(setId)` from the existing per-set logic inside
`calculateUserBestScore` in `routes/groups.ts`. The group leaderboard scores each
**linked prediction set** instead of each user's best set. Incomplete sets (no champion
pick at match M104) score 0 but can still be linked.

`calculateUserBestScore` and the global leaderboard (`routes/leaderboard.ts`) are left
unchanged — out of scope.

## Backend endpoints

All require the caller to be a member of the group.

- `GET /api/groups/:id` — `{ id, name, code, member_count, is_owner }`
- `GET /api/groups/:id/leaderboard` — one row per linked prediction:
  `{ public_id, prediction_name, owner_name, total_points, is_mine }`, sorted by points desc.
- `GET /api/groups/:id/linkable` — the caller's prediction sets with an `is_linked` flag,
  for the "link existing" dialog.
- `POST /api/groups/:id/predictions { predictionSetId }` — link. Verifies membership,
  that the caller owns the set, and that it is not already linked (409 otherwise).
- `DELETE /api/groups/:id/predictions/:predictionSetId` — unlink. Verifies the caller
  owns the set. Does not delete the prediction itself.

## Frontend

- New route `/mis-grupos/:id` → `GroupDetail.tsx`.
- `Groups.tsx`: clicking a group card navigates to the detail page (replaces the current
  leaderboard modal). Create/join dialogs stay on the list page.
- `GroupDetail.tsx`:
  - Header: name, copyable code, member count.
  - Ranking: one row per linked prediction (owner name + prediction name + points), the
    caller's own rows highlighted.
  - Actions:
    - **Create prediction for this group** → name/mode dialog → create set, link it,
      navigate to `/grupos?setId=<public_id>` (existing edit flow).
    - **Link existing prediction** → dialog listing the caller's unlinked sets → link.
    - Unlink button on the caller's own ranking rows.
- i18n keys added for all 6 languages (ES, EN, PT, FR, DE, ZH).

## Edge cases

- Linking an already-linked set → 409, ignored client-side.
- Incomplete predictions: linkable, shown with 0 points until they have a champion pick.
- Unlink removes the row from the ranking but keeps the prediction.
- Deleting a prediction set or group cascades and removes links automatically.

## Out of scope

- Global leaderboard scoring (`routes/leaderboard.ts`).
- Changing `calculateUserBestScore` callers.
- Per-group prediction limits.
