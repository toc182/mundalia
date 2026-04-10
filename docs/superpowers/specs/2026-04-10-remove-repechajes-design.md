# Design: Remove Repechajes from Mundalia

**Date:** 2026-04-10
**Status:** Approved

## Context

The 6 World Cup 2026 repechajes (pre-tournament qualification playoffs) have been played. The winners are now known. The repechaje prediction step is no longer needed and should be removed entirely from the app. The prediction flow changes from 4 steps to 3.

### Repechaje Winners

| Repechaje | Winner | Group | Team ID in mockData |
|-----------|--------|-------|---------------------|
| UEFA A | Bosnia (BIH) | B | 6 |
| UEFA B | Sweden (SWE) | F | 23 |
| UEFA C | Turkey (TUR) | D | 16 |
| UEFA D | Czechia (CZE) | A | 4 |
| FIFA 1 | DR Congo (COD) | K | 42 |
| FIFA 2 | Iraq (IRQ) | I | 35 |

## Changes

### 1. Data Layer — Replace placeholders with real teams

#### Frontend: `mockData.ts`

Replace 6 placeholder entries with actual winning teams. Keep the same team IDs (4, 6, 16, 23, 35, 42) so existing knockout bracket references remain valid.

| ID | Old | New Name | New Code | New Flag |
|----|-----|----------|----------|----------|
| 4 | Playoff Europa D (PED) | Rep. Checa | CZE | `flagcdn.com/w80/cz.png` |
| 6 | Playoff Europa A (PEA) | Bosnia | BIH | `flagcdn.com/w80/ba.png` |
| 16 | Playoff Europa C (PEC) | Turquia | TUR | `flagcdn.com/w80/tr.png` |
| 23 | Playoff Europa B (PEB) | Suecia | SWE | `flagcdn.com/w80/se.png` |
| 35 | Playoff FIFA 2 (PF2) | Irak | IRQ | `flagcdn.com/w80/iq.png` |
| 42 | Playoff FIFA 1 (PF1) | RD Congo | COD | `flagcdn.com/w80/cd.png` |

Remove `is_playoff` and `playoff_teams` fields from the `MockTeam` interface.

#### Database: `teams` table

Run UPDATE statements to replace the 6 placeholder rows with real team data. Remove the `is_playoff` and `playoff_id` columns (or just leave them — they become unused).

Add a new migration to `migrations.sql`.

### 2. Frontend — Delete playoff files

**Delete entirely:**
- `src/pages/Playoffs.tsx` — the repechaje prediction page
- `src/data/playoffsData.ts` — playoff bracket definitions
- `src/components/admin/PlayoffsTab.tsx` — admin panel for entering real playoff results

### 3. Frontend — Simplify `predictionHelpers.ts`

Remove all playoff resolution logic:
- `PLAYOFF_TO_TEAM_ID` mapping
- `PlayoffWinnerTeam` interface
- `PlayoffSelection` / `PlayoffSelections` types
- `getAllTeams()` — becomes a simple re-export of `mockTeams`
- `getPlayoffWinner()` — delete
- `getTeamById()` — simplify to direct lookup (no placeholder resolution)
- `getPlayoffIdByTeamId()` — delete
- `isPlayoffTeam()` — delete

Keep `hasRealChanges()` — still used elsewhere.

### 4. Frontend — Update prediction flow (4 steps to 3)

Every page that defines the step navigation array removes `/repechajes`:

**Before:**
```
['/repechajes', '/grupos', '/terceros', '/eliminatorias']  // 4 steps
```

**After:**
```
['/grupos', '/terceros', '/eliminatorias']  // 3 steps
```

Step labels change: "1 de 3", "2 de 3", "3 de 3".

### 5. Frontend — Update navigation entry points

- `Home.tsx`: "New prediction" navigates to `/grupos?setId=...` instead of `/repechajes?setId=...`
- `MyPredictions.tsx`: same change for create/edit links
- `PredictionDetail.tsx`: edit link goes to `/grupos`, remove playoff display section

### 6. Frontend — Remove playoff data loading from pages

- `Predictions.tsx` (Groups page): remove `getPlayoffs(setId)` call, remove playoff validation, remove `playoffSelections` state
- `ThirdPlaces.tsx`: remove playoff data loading
- `Knockout.tsx` / `useKnockoutData.ts`: remove playoff data loading, remove `playoffSelections` parameter — teams are now resolved directly from mockData
- `usePredictionsScores.ts`: remove playoff loading
- `Admin.tsx`: remove playoffs tab

### 7. Frontend — Update `api.ts`

Remove endpoints:
- `getPlayoffs(setId)`
- `savePlayoffs(predictions, setId)`
- `resetFromPlayoffs(setId)`
- `adminAPI.getPlayoffs()`
- `adminAPI.savePlayoff()`
- `adminAPI.deletePlayoff()`

### 8. Frontend — Update `App.tsx`

- Remove `/repechajes` route
- Remove `Playoffs` lazy import

### 9. Frontend — Update i18n (all 6 language files)

- Remove the `playoffs` translation section
- Update step count references from "4" to "3" (e.g., "Step 1 of 4" → "Step 1 of 3")

### 10. Backend — Remove playoff endpoints

**From `routes/predictions.ts`:**
- `GET /predictions/playoffs`
- `POST /predictions/playoffs`
- `DELETE /predictions/reset-from-playoffs`
- Remove `has-subsequent-data` support for `phase=playoffs`

**From `routes/admin.ts`:**
- `GET /admin/playoffs`
- `POST /admin/playoffs`
- `DELETE /admin/playoffs/:playoffId`
- Remove `playoffs_entered` from admin stats

**From `routes/predictionSets.ts`:**
- Remove playoff prediction loading from set detail response

### 11. Backend — Database migration

New migration in `migrations.sql`:

```sql
-- Drop playoff data
DELETE FROM playoff_predictions;
DELETE FROM real_playoff_results;
DROP TABLE IF EXISTS playoff_predictions;
DROP TABLE IF EXISTS real_playoff_results;

-- Update placeholder teams with real winners
UPDATE teams SET name = 'Rep. Checa', code = 'CZE', flag_url = 'https://flagcdn.com/w80/cz.png', is_playoff = false WHERE id = 4;
UPDATE teams SET name = 'Bosnia', code = 'BIH', flag_url = 'https://flagcdn.com/w80/ba.png', is_playoff = false WHERE id = 6;
UPDATE teams SET name = 'Turquia', code = 'TUR', flag_url = 'https://flagcdn.com/w80/tr.png', is_playoff = false WHERE id = 16;
UPDATE teams SET name = 'Suecia', code = 'SWE', flag_url = 'https://flagcdn.com/w80/se.png', is_playoff = false WHERE id = 23;
UPDATE teams SET name = 'Irak', code = 'IRQ', flag_url = 'https://flagcdn.com/w80/iq.png', is_playoff = false WHERE id = 35;
UPDATE teams SET name = 'RD Congo', code = 'COD', flag_url = 'https://flagcdn.com/w80/cd.png', is_playoff = false WHERE id = 42;
```

Also update `seed-teams.sql` and `schema.sql` to reflect the real teams for fresh installs.

### 12. Backend — Update types and validators

- Remove `PlayoffPrediction` interface from `types/index.ts`
- Remove `PlayoffId` type
- Remove `VALID_PLAYOFF_IDS` and `isValidPlayoffId()` from `utils/validators.ts`

### 13. Backend — Simplify cascade logic

- `reset-from-playoffs` endpoint is removed
- `reset-from-groups` becomes the first cascade point (deletes thirds + knockout)
- `has-subsequent-data` no longer supports `phase=playoffs`

### 14. Backend — Update `server.ts`

Remove the migration code that ensures `real_playoff_results` table exists on startup.

### 15. Tests

- Remove playoff test suites from `predictions.test.ts`
- Remove playoff test suites from `admin.test.ts`
- Remove playoff tests from `predictionHelpers.test.ts`
- Update any tests referencing 4-step flow

### 16. Documentation

Update `CLAUDE.md`, `SESSION.md`, `BACKEND.md`:
- Remove repechaje references from structure, routes, flow descriptions
- Update step count from 4 to 3
- Remove `playoffsData.ts` from file tree
- Remove `/repechajes` route
- Remove playoff API endpoints

## Files Affected

### Delete (3 files)
- `natalia-frontend/src/pages/Playoffs.tsx`
- `natalia-frontend/src/data/playoffsData.ts`
- `natalia-frontend/src/components/admin/PlayoffsTab.tsx`

### Modify — Frontend (~20 files)
- `src/data/mockData.ts`
- `src/utils/predictionHelpers.ts`
- `src/hooks/useStepNavigation.ts`
- `src/hooks/useKnockoutData.ts`
- `src/hooks/usePredictionsScores.ts`
- `src/pages/Predictions.tsx`
- `src/pages/ThirdPlaces.tsx`
- `src/pages/Knockout.tsx`
- `src/pages/PredictionDetail.tsx`
- `src/pages/Home.tsx`
- `src/pages/MyPredictions.tsx`
- `src/pages/Admin.tsx`
- `src/services/api.ts`
- `src/App.tsx`
- `src/locales/es.json`, `en.json`, `fr.json`, `pt.json`, `de.json`, `zh.json`

### Modify — Backend (~8 files)
- `routes/predictions.ts`
- `routes/admin.ts`
- `routes/predictionSets.ts`
- `server.ts`
- `types/index.ts`
- `utils/validators.ts`
- `migrations.sql`
- `database/seed-teams.sql`
- `database/schema.sql`
- `seed-dev.js`

### Modify — Tests (~3 files)
- `__tests__/predictions.test.ts`
- `__tests__/admin.test.ts`
- `src/__tests__/predictionHelpers.test.ts`

### Modify — Docs (~3 files)
- `CLAUDE.md`
- `SESSION.md`
- `BACKEND.md`
