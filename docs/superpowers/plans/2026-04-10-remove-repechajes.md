# Remove Repechajes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the repechaje prediction step from Mundalia, replacing the 6 placeholder teams with actual winners and simplifying the flow from 4 steps to 3.

**Architecture:** Replace placeholder team entries (is_playoff=true) in frontend data and DB with the actual winning teams. Delete all playoff-related pages, components, API endpoints, and data files. Simplify the prediction flow to Groups → Third Places → Knockout.

**Tech Stack:** React 19 + TypeScript (frontend), Express 5 + PostgreSQL (backend)

**Spec:** `docs/superpowers/specs/2026-04-10-remove-repechajes-design.md`

---

### Task 1: Update team data — replace placeholders with real winners

**Files:**
- Modify: `natalia-frontend/src/data/mockData.ts:4-12,19,23,37,48,66,77`
- Modify: `natalia-backend/database/seed-teams.sql` (full rewrite)
- Modify: `natalia-backend/migrations.sql` (append new migration)

- [ ] **Step 1: Update `mockData.ts` — replace 6 placeholder teams**

In `natalia-frontend/src/data/mockData.ts`, remove `is_playoff` and `playoff_teams` from `MockTeam` interface:

```typescript
export interface MockTeam {
  id: number;
  name: string;
  code: string;
  group_letter: string;
  flag_url: string;
}
```

Then replace these 6 entries (keep same IDs):

```typescript
// Line 19 — Group A, id 4
{ id: 4, name: 'Rep. Checa', code: 'CZE', group_letter: 'A', flag_url: 'https://flagcdn.com/w80/cz.png' },

// Line 23 — Group B, id 6
{ id: 6, name: 'Bosnia', code: 'BIH', group_letter: 'B', flag_url: 'https://flagcdn.com/w80/ba.png' },

// Line 37 — Group D, id 16
{ id: 16, name: 'Turquia', code: 'TUR', group_letter: 'D', flag_url: 'https://flagcdn.com/w80/tr.png' },

// Line 48 — Group F, id 23
{ id: 23, name: 'Suecia', code: 'SWE', group_letter: 'F', flag_url: 'https://flagcdn.com/w80/se.png' },

// Line 66 — Group I, id 35
{ id: 35, name: 'Irak', code: 'IRQ', group_letter: 'I', flag_url: 'https://flagcdn.com/w80/iq.png' },

// Line 77 — Group K, id 42
{ id: 42, name: 'RD Congo', code: 'COD', group_letter: 'K', flag_url: 'https://flagcdn.com/w80/cd.png' },
```

Also update the group comments to reflect real team names (e.g., "Group A: Mexico, South Africa, Korea Republic, Czechia").

- [ ] **Step 2: Add database migration to `migrations.sql`**

Append to end of `natalia-backend/migrations.sql`:

```sql
-- ============================================
-- MIGRACION 009: Eliminar repechajes - equipos finales confirmados
-- Fecha: 2026-04-10
-- ============================================

-- Eliminar datos de predicciones de repechajes
DELETE FROM playoff_predictions;
DELETE FROM real_playoff_results;

-- Eliminar tablas de repechajes
DROP TABLE IF EXISTS playoff_predictions;
DROP TABLE IF EXISTS real_playoff_results;

-- Actualizar equipos placeholder con ganadores reales
UPDATE teams SET name = 'Rep. Checa', code = 'CZE', flag_url = 'https://flagcdn.com/w80/cz.png', is_playoff = false WHERE id = 4;
UPDATE teams SET name = 'Bosnia', code = 'BIH', flag_url = 'https://flagcdn.com/w80/ba.png', is_playoff = false WHERE id = 6;
UPDATE teams SET name = 'Turquia', code = 'TUR', flag_url = 'https://flagcdn.com/w80/tr.png', is_playoff = false WHERE id = 16;
UPDATE teams SET name = 'Suecia', code = 'SWE', flag_url = 'https://flagcdn.com/w80/se.png', is_playoff = false WHERE id = 23;
UPDATE teams SET name = 'Irak', code = 'IRQ', flag_url = 'https://flagcdn.com/w80/iq.png', is_playoff = false WHERE id = 35;
UPDATE teams SET name = 'RD Congo', code = 'COD', flag_url = 'https://flagcdn.com/w80/cd.png', is_playoff = false WHERE id = 42;
```

- [ ] **Step 3: Update `seed-teams.sql` for fresh installs**

Rewrite `natalia-backend/database/seed-teams.sql` with all 48 real teams matching `mockData.ts` (names, codes, group_letters, flag_urls). Use `INSERT INTO teams (name, code, group_letter, flag_url) VALUES ...` grouped by group letter.

- [ ] **Step 4: Run migration on local DB**

Run:
```bash
PGPASSWORD=Dinocore51720 "/c/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -d natalia_dev -c "
DELETE FROM playoff_predictions;
DELETE FROM real_playoff_results;
DROP TABLE IF EXISTS playoff_predictions;
DROP TABLE IF EXISTS real_playoff_results;
UPDATE teams SET name = 'Rep. Checa', code = 'CZE', flag_url = 'https://flagcdn.com/w80/cz.png', is_playoff = false WHERE id = 4;
UPDATE teams SET name = 'Bosnia', code = 'BIH', flag_url = 'https://flagcdn.com/w80/ba.png', is_playoff = false WHERE id = 6;
UPDATE teams SET name = 'Turquia', code = 'TUR', flag_url = 'https://flagcdn.com/w80/tr.png', is_playoff = false WHERE id = 16;
UPDATE teams SET name = 'Suecia', code = 'SWE', flag_url = 'https://flagcdn.com/w80/se.png', is_playoff = false WHERE id = 23;
UPDATE teams SET name = 'Irak', code = 'IRQ', flag_url = 'https://flagcdn.com/w80/iq.png', is_playoff = false WHERE id = 35;
UPDATE teams SET name = 'RD Congo', code = 'COD', flag_url = 'https://flagcdn.com/w80/cd.png', is_playoff = false WHERE id = 42;
"
```

Expected: `DELETE 0`, `DELETE 0`, `DROP TABLE` (x2), `UPDATE 1` (x6)

- [ ] **Step 5: Commit**

```bash
git add natalia-frontend/src/data/mockData.ts natalia-backend/migrations.sql natalia-backend/database/seed-teams.sql
git commit -m "feat: replace playoff placeholders with real World Cup 2026 teams

Bosnia, Sweden, Turkey, Czechia, DR Congo, Iraq replace the 6 playoff
placeholder entries. Migration drops playoff_predictions and
real_playoff_results tables."
```

---

### Task 2: Delete playoff frontend files

**Files:**
- Delete: `natalia-frontend/src/pages/Playoffs.tsx`
- Delete: `natalia-frontend/src/data/playoffsData.ts`
- Delete: `natalia-frontend/src/components/admin/PlayoffsTab.tsx`

- [ ] **Step 1: Delete the 3 playoff files**

```bash
rm natalia-frontend/src/pages/Playoffs.tsx
rm natalia-frontend/src/data/playoffsData.ts
rm natalia-frontend/src/components/admin/PlayoffsTab.tsx
```

- [ ] **Step 2: Update admin component barrel export**

Check if `natalia-frontend/src/components/admin/index.ts` exports `PlayoffsTab` and remove it.

```bash
grep -n "PlayoffsTab" natalia-frontend/src/components/admin/index.ts
```

Remove the `PlayoffsTab` export line.

- [ ] **Step 3: Commit**

```bash
git add -A natalia-frontend/src/pages/Playoffs.tsx natalia-frontend/src/data/playoffsData.ts natalia-frontend/src/components/admin/PlayoffsTab.tsx natalia-frontend/src/components/admin/index.ts
git commit -m "feat: delete Playoffs page, playoffsData, and PlayoffsTab component"
```

---

### Task 3: Simplify `predictionHelpers.ts`

**Files:**
- Modify: `natalia-frontend/src/utils/predictionHelpers.ts`

- [ ] **Step 1: Rewrite `predictionHelpers.ts`**

Replace entire file with:

```typescript
/**
 * Centralized prediction helper functions
 */

import { mockTeams, type Team } from '@/data/mockData';

/**
 * Get all teams
 */
export const getAllTeams = (): Team[] => mockTeams;

/**
 * Get team by ID — simple direct lookup
 */
export const getTeamById = (
  id: number | string | null | undefined
): Team | null => {
  if (!id) return null;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return mockTeams.find(t => t.id === numId) ?? null;
};

/**
 * Deep comparison to detect real changes between two objects
 */
export const hasRealChanges = <T>(original: T, current: T): boolean => {
  return JSON.stringify(original) !== JSON.stringify(current);
};
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/utils/predictionHelpers.ts
git commit -m "refactor: simplify predictionHelpers — remove playoff resolution logic"
```

---

### Task 4: Update `App.tsx` — remove route and import

**Files:**
- Modify: `natalia-frontend/src/App.tsx:14,92`

- [ ] **Step 1: Remove Playoffs import and route**

In `natalia-frontend/src/App.tsx`:

Remove line 14:
```typescript
const Playoffs = lazy(() => import('@/pages/Playoffs'));
```

Remove line 92:
```typescript
<Route path="/repechajes" element={<ProtectedRoute><Playoffs /></ProtectedRoute>} />
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/App.tsx
git commit -m "feat: remove /repechajes route from App.tsx"
```

---

### Task 5: Update navigation entry points — Home, MyPredictions

**Files:**
- Modify: `natalia-frontend/src/pages/Home.tsx:80`
- Modify: `natalia-frontend/src/pages/MyPredictions.tsx:98,241-244,284`

- [ ] **Step 1: Update Home.tsx**

In `natalia-frontend/src/pages/Home.tsx`, line 80, change:
```typescript
navigate(`/repechajes?setId=${response.data.public_id}`);
```
to:
```typescript
navigate(`/grupos?setId=${response.data.public_id}`);
```

- [ ] **Step 2: Update MyPredictions.tsx — create navigation**

In `natalia-frontend/src/pages/MyPredictions.tsx`, line 98, change:
```typescript
navigate(`/repechajes?setId=${response.data.public_id}`);
```
to:
```typescript
navigate(`/grupos?setId=${response.data.public_id}`);
```

- [ ] **Step 3: Update MyPredictions.tsx — remove playoff progress indicator**

Lines 240-245, remove the entire playoff progress div:
```tsx
<div className="flex items-center gap-1">
  <span className={parseInt(String(set.playoff_count || 0)) >= 6 ? 'text-green-600' : 'text-gray-400'}>
    {parseInt(String(set.playoff_count || 0)) >= 6 ? '✓' : '○'}
  </span>
  <span>{t('playoffs.title')}: {set.playoff_count || 0}/6</span>
</div>
```

Change the grid from `grid-cols-2` to `grid-cols-3` (3 remaining indicators: groups, thirds, bracket).

- [ ] **Step 4: Update MyPredictions.tsx — edit link**

Line 284, change:
```tsx
<Link to={`/repechajes?setId=${set.public_id}`}>
```
to:
```tsx
<Link to={`/grupos?setId=${set.public_id}`}>
```

- [ ] **Step 5: Commit**

```bash
git add natalia-frontend/src/pages/Home.tsx natalia-frontend/src/pages/MyPredictions.tsx
git commit -m "feat: update navigation to start at /grupos instead of /repechajes"
```

---

### Task 6: Update Predictions.tsx (Groups page) — remove playoff loading

**Files:**
- Modify: `natalia-frontend/src/pages/Predictions.tsx:18,25-31,51,127-134,148-151,166`

- [ ] **Step 1: Remove playoff imports and types**

Remove the local `PlayoffSelections` interface (lines 25-31):
```typescript
interface PlayoffSelections {
  [playoffId: string]: {
    semi1?: number;
    semi2?: number;
    final?: number;
  };
}
```

Remove the import of `getTeamById as getTeamByIdHelper` from predictionHelpers (line 18):
```typescript
import { getTeamById as getTeamByIdHelper } from '@/utils/predictionHelpers';
```

Replace with:
```typescript
import { getTeamById } from '@/utils/predictionHelpers';
```

- [ ] **Step 2: Remove playoff state and loading**

Remove line 51:
```typescript
const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
```

Remove lines 127-134 (loading playoff predictions from API):
```typescript
try {
  const playoffsResponse = await predictionsAPI.getPlayoffs(setId);
  if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
    setPlayoffSelections(playoffsResponse.data);
  }
} catch (err) {
  console.error('Error loading playoffs:', err);
}
```

Remove lines 148-151 (loading from localStorage):
```typescript
const savedPlayoffs = localStorage.getItem('natalia_playoffs');
if (savedPlayoffs) {
  setPlayoffSelections(JSON.parse(savedPlayoffs));
}
```

- [ ] **Step 3: Simplify getTeamById**

Replace line 166:
```typescript
const getTeamById = (id: number): Team | null => getTeamByIdHelper(id, playoffSelections);
```
with:
```typescript
// getTeamById imported directly from predictionHelpers
```

Update any calls to `getTeamById(id)` in the render — they should continue to work since `getTeamById` from predictionHelpers now takes `(id)` without the second argument.

- [ ] **Step 4: Verify build compiles**

Run: `cd natalia-frontend && npx tsc --noEmit`

Fix any remaining references to `playoffSelections` or old `getTeamByIdHelper`.

- [ ] **Step 5: Commit**

```bash
git add natalia-frontend/src/pages/Predictions.tsx
git commit -m "refactor: remove playoff loading from Groups prediction page"
```

---

### Task 7: Update `useKnockoutData.ts` — remove playoff loading

**Files:**
- Modify: `natalia-frontend/src/hooks/useKnockoutData.ts:4-7,33-34,88,129-133,179-181,208-210,279,514-515`

- [ ] **Step 1: Remove playoff imports**

Lines 4-7, change:
```typescript
import {
  getTeamById as getTeamByIdHelper,
  type PlayoffSelections,
} from '@/utils/predictionHelpers';
```
to:
```typescript
import { getTeamById as getTeamByIdHelper } from '@/utils/predictionHelpers';
```

- [ ] **Step 2: Remove PlayoffSelections from return type and state**

In the `UseKnockoutDataReturn` interface (line 33-34), remove:
```typescript
playoffSelections: PlayoffSelections;
```

Remove state declaration (line 88):
```typescript
const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
```

- [ ] **Step 3: Remove playoff loading from API and localStorage**

Remove lines 129-133 (API loading):
```typescript
// Load playoff predictions
const playoffsResponse = await predictionsAPI.getPlayoffs(setId);
if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
  setPlayoffSelections(playoffsResponse.data as PlayoffSelections);
}
```

Remove lines 179-181 (localStorage):
```typescript
const savedPlayoffs = localStorage.getItem('natalia_playoffs');
if (savedPlayoffs) {
  setPlayoffSelections(JSON.parse(savedPlayoffs));
}
```

- [ ] **Step 4: Simplify getTeamById callback**

Line 208-210, change:
```typescript
const getTeamById = useCallback((id: number): PlayoffWinnerTeam | null => {
  return getTeamByIdHelper(id, playoffSelections) as PlayoffWinnerTeam | null;
}, [playoffSelections]);
```
to:
```typescript
const getTeamById = useCallback((id: number): PlayoffWinnerTeam | null => {
  return getTeamByIdHelper(id) as PlayoffWinnerTeam | null;
}, []);
```

- [ ] **Step 5: Remove playoffSelections from r32Matches dependency array**

Line 279, change:
```typescript
}, [predictions, playoffSelections, bestThirdPlaces, knockoutPredictions, thirdPlaceAssignments, getTeamByPosition]);
```
to:
```typescript
}, [predictions, bestThirdPlaces, knockoutPredictions, thirdPlaceAssignments, getTeamByPosition]);
```

- [ ] **Step 6: Remove playoffSelections from return object**

Lines 514-515, remove:
```typescript
playoffSelections,
```

- [ ] **Step 7: Update `PlayoffWinnerTeam` type usage**

Check `natalia-frontend/src/types/knockout.ts` for `PlayoffWinnerTeam` — it may still reference the old type from predictionHelpers. Update it to use `Team` from mockData instead, since there are no more playoff winner fields.

- [ ] **Step 8: Commit**

```bash
git add natalia-frontend/src/hooks/useKnockoutData.ts natalia-frontend/src/types/knockout.ts
git commit -m "refactor: remove playoff loading from useKnockoutData hook"
```

---

### Task 8: Update PredictionDetail.tsx — remove playoff display

**Files:**
- Modify: `natalia-frontend/src/pages/PredictionDetail.tsx:12,14,28-33,46,67,101-104,127-132,202,275,304-354`

- [ ] **Step 1: Remove playoff imports**

Remove line 12:
```typescript
import { playoffs, type Playoff } from '@/data/playoffsData';
```

Lines 28-33, change imports from predictionHelpers:
```typescript
import {
  getTeamById as getTeamByIdHelper,
  getPlayoffWinner as getPlayoffWinnerHelper,
  type PlayoffWinnerTeam,
  type PlayoffSelections,
} from '@/utils/predictionHelpers';
```
to:
```typescript
import { getTeamById as getTeamByIdHelper } from '@/utils/predictionHelpers';
```

- [ ] **Step 2: Remove playoff state and loading**

Remove from `PredictionSetResponse` interface (line 46):
```typescript
playoffPredictions?: PlayoffSelections;
```

Remove state (line 67):
```typescript
const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
```

Remove loading (lines 101-104):
```typescript
// Playoff predictions
if (data.playoffPredictions) {
  setPlayoffSelections(data.playoffPredictions);
}
```

- [ ] **Step 3: Simplify getTeamById and remove getPlayoffWinner**

Replace lines 127-132:
```typescript
const getTeamById = (teamId: number | string | null | undefined): PlayoffWinnerTeam | null =>
  getTeamByIdHelper(teamId, playoffSelections);

const getPlayoffWinner = (playoffId: string): Team | null =>
  getPlayoffWinnerHelper(playoffId, playoffSelections);
```
with:
```typescript
const getTeamById = (teamId: number | string | null | undefined) =>
  getTeamByIdHelper(teamId);
```

- [ ] **Step 4: Remove completedPlayoffs counter**

Remove line 202:
```typescript
const completedPlayoffs = playoffs.filter(p => playoffSelections[p.id]?.final).length;
```

- [ ] **Step 5: Update edit link**

Line 275, change:
```tsx
<Link to={`/repechajes?setId=${publicId}`}>{t('common.edit')}</Link>
```
to:
```tsx
<Link to={`/grupos?setId=${publicId}`}>{t('common.edit')}</Link>
```

- [ ] **Step 6: Remove Repechajes progress badge and section**

Remove from progress summary (lines 304-307):
```tsx
<Badge variant={completedPlayoffs === 6 ? 'default' : 'secondary'}>
  Repechajes: {completedPlayoffs}/6
</Badge>
```

Remove entire Repechajes Section card (lines 319-354):
```tsx
{/* Repechajes Section */}
<Card className="mb-6">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg">Repechajes Intercontinentales</CardTitle>
  </CardHeader>
  ...
</Card>
```

- [ ] **Step 7: Commit**

```bash
git add natalia-frontend/src/pages/PredictionDetail.tsx
git commit -m "refactor: remove playoff display from PredictionDetail page"
```

---

### Task 9: Update Admin.tsx — remove playoffs tab

**Files:**
- Modify: `natalia-frontend/src/pages/Admin.tsx:7-8,10,21,35,41,69-74,140-147`

- [ ] **Step 1: Remove playoff imports and state**

Line 7, remove `Trophy` if only used for playoffs (check if knockout tab also uses it — it does at line 73, so keep it).

Line 8, change:
```typescript
import { StatsTab, PlayoffsTab, GroupsTab, KnockoutTab } from '@/components/admin';
```
to:
```typescript
import { StatsTab, GroupsTab, KnockoutTab } from '@/components/admin';
```

Line 10, remove `RealPlayoffResult` from type import:
```typescript
import type { TabItem, RealPlayoffResult, RealGroupMatch, RealGroupStanding, RealKnockoutResult } from '@/types/admin';
```
to:
```typescript
import type { TabItem, RealGroupMatch, RealGroupStanding, RealKnockoutResult } from '@/types/admin';
```

- [ ] **Step 2: Remove playoff state and loading**

Remove line 21:
```typescript
const [realPlayoffs, setRealPlayoffs] = useState<RealPlayoffResult[]>([]);
```

In `loadData` (line 33-41), remove `adminAPI.getPlayoffs()` from Promise.all and `setRealPlayoffs(playoffsRes.data)`:

Change:
```typescript
const [statsRes, playoffsRes, matchesRes, standingsRes, knockoutRes] = await Promise.all([
  adminAPI.getStats(),
  adminAPI.getPlayoffs(),
  adminAPI.getGroupMatches(),
  adminAPI.getGroupStandings(),
  adminAPI.getKnockout()
]);
setStats(statsRes.data);
setRealPlayoffs(playoffsRes.data);
```
to:
```typescript
const [statsRes, matchesRes, standingsRes, knockoutRes] = await Promise.all([
  adminAPI.getStats(),
  adminAPI.getGroupMatches(),
  adminAPI.getGroupStandings(),
  adminAPI.getKnockout()
]);
setStats(statsRes.data);
```

- [ ] **Step 3: Remove playoffs tab definition**

Lines 69-74, remove from tabs array:
```typescript
{ id: 'playoffs', label: 'Repechajes', icon: Trophy },
```

- [ ] **Step 4: Remove playoffs tab content**

Remove lines 140-147:
```tsx
{activeTab === 'playoffs' && (
  <PlayoffsTab
    realPlayoffs={realPlayoffs}
    onSave={loadData}
    showSuccess={showSuccess}
    setError={setError}
  />
)}
```

Also check if GroupsTab still receives `realPlayoffs` prop (line 151). If so, remove it and update GroupsTab component to not expect it.

- [ ] **Step 5: Commit**

```bash
git add natalia-frontend/src/pages/Admin.tsx
git commit -m "feat: remove playoffs tab from admin panel"
```

---

### Task 10: Update `api.ts` — remove playoff endpoints

**Files:**
- Modify: `natalia-frontend/src/services/api.ts:123-129,148-152,166-173,190-191,249-256`

- [ ] **Step 1: Remove playoff types and endpoints**

Remove `PlayoffPredictionData` interface (lines 123-129):
```typescript
interface PlayoffPredictionData {
  [playoffId: string]: {
    semi1?: number | null;
    semi2?: number | null;
    final?: number | null;
  };
}
```

Remove from `predictionsAPI` (lines 148-152):
```typescript
getPlayoffs: (setId: number | string): Promise<AxiosResponse<PlayoffPredictionData>> =>
  api.get('/predictions/playoffs', { params: { setId } }),

savePlayoffs: (predictions: PlayoffPredictionData, setId: number | string): Promise<AxiosResponse<void>> =>
  api.post('/predictions/playoffs', { predictions, setId }),
```

Remove `resetFromPlayoffs` (lines 190-191):
```typescript
resetFromPlayoffs: (setId: number | string): Promise<AxiosResponse<void>> =>
  api.delete('/predictions/reset-from-playoffs', { params: { setId } }),
```

Remove `playoffPredictions` from `getAll` return type (line 169):
```typescript
playoffPredictions: PlayoffPredictionData;
```

Remove from `adminAPI` (lines 249-256):
```typescript
getPlayoffs: (): Promise<AxiosResponse<Record<string, number>>> =>
  api.get('/admin/playoffs'),

savePlayoff: (playoff_id: string, winner_team_id: number): Promise<AxiosResponse<void>> =>
  api.post('/admin/playoffs', { playoff_id, winner_team_id }),

deletePlayoff: (playoffId: string): Promise<AxiosResponse<void>> =>
  api.delete(`/admin/playoffs/${playoffId}`),
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/services/api.ts
git commit -m "feat: remove playoff API endpoints from frontend"
```

---

### Task 11: Update i18n files — remove playoffs section, update step numbers

**Files:**
- Modify: `natalia-frontend/src/i18n/locales/es.json`
- Modify: `natalia-frontend/src/i18n/locales/en.json`
- Modify: `natalia-frontend/src/i18n/locales/fr.json`
- Modify: `natalia-frontend/src/i18n/locales/de.json`
- Modify: `natalia-frontend/src/i18n/locales/pt.json`
- Modify: `natalia-frontend/src/i18n/locales/zh.json`

- [ ] **Step 1: For each of the 6 locale files, make these changes:**

1. **Remove** the entire `"playoffs"` section (the object starting with `"playoffs": {` through its closing `}`). This is around lines 106-124 in each file.

2. **Update step numbers** — change "X of 4" to "X of 3":
   - `groups.step`: "Step 2 of 4" → "Step 1 of 3" (or language equivalent)
   - `thirdPlaces.step`: "Step 3 of 4" → "Step 2 of 3"
   - `knockout.step`: "Step 4 of 4" → "Step 3 of 3"

3. **Remove** any `"playoffs"` key in the admin section (around line 269): `"playoffs": "Repechajes"` or equivalent.

Step values per language:
- **es.json**: "Paso 1 de 3", "Paso 2 de 3", "Paso 3 de 3"
- **en.json**: "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"
- **fr.json**: "Étape 1 sur 3", "Étape 2 sur 3", "Étape 3 sur 3"
- **de.json**: "Schritt 1 von 3", "Schritt 2 von 3", "Schritt 3 von 3"
- **pt.json**: "Passo 1 de 3", "Passo 2 de 3", "Passo 3 de 3"
- **zh.json**: "第1步/共3步", "第2步/共3步", "第3步/共3步"

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/i18n/locales/
git commit -m "feat: remove playoffs i18n keys and update step numbers (4→3)"
```

---

### Task 12: Update frontend types — remove playoff types

**Files:**
- Modify: `natalia-frontend/src/types/index.ts`
- Modify: `natalia-frontend/src/types/admin.ts`

- [ ] **Step 1: Remove PlayoffPrediction from `types/index.ts`**

Remove the `PlayoffPrediction` interface and any `playoffs_entered` field from `AdminStats` type.

Also remove `playoff_count` from the `PredictionSet` type if present.

- [ ] **Step 2: Remove RealPlayoffResult from `types/admin.ts`**

Remove the `RealPlayoffResult` interface.

- [ ] **Step 3: Commit**

```bash
git add natalia-frontend/src/types/
git commit -m "refactor: remove playoff types from frontend"
```

---

### Task 13: Backend — remove playoff prediction routes

**Files:**
- Modify: `natalia-backend/routes/predictions.ts`

- [ ] **Step 1: Remove playoff endpoints**

Remove these endpoint handlers:
- `GET /playoffs` (around lines 260-299)
- `POST /playoffs` (around lines 312-385)
- `DELETE /reset-from-playoffs` (around lines 938-975)

- [ ] **Step 2: Update `has-subsequent-data`**

In the `GET /has-subsequent-data` handler (around lines 908-937), remove the `phase === 'playoffs'` case. Only `'groups'` and `'thirds'` phases should remain.

- [ ] **Step 3: Update `GET /predictions/all`**

In the `GET /all` handler (around lines 1053-1089), remove playoff prediction fetching and remove `playoffPredictions` from the returned object.

- [ ] **Step 4: Commit**

```bash
git add natalia-backend/routes/predictions.ts
git commit -m "feat: remove playoff prediction endpoints from backend"
```

---

### Task 14: Backend — remove playoff admin routes

**Files:**
- Modify: `natalia-backend/routes/admin.ts`

- [ ] **Step 1: Remove playoff admin endpoints**

Remove:
- `GET /playoffs` handler
- `POST /playoffs` handler
- `DELETE /playoffs/:playoffId` handler
- Remove `playoffs_entered` from stats query if present

- [ ] **Step 2: Commit**

```bash
git add natalia-backend/routes/admin.ts
git commit -m "feat: remove playoff admin endpoints from backend"
```

---

### Task 15: Backend — remove playoff from predictionSets, server, types, validators

**Files:**
- Modify: `natalia-backend/routes/predictionSets.ts`
- Modify: `natalia-backend/server.ts`
- Modify: `natalia-backend/types/index.ts`
- Modify: `natalia-backend/utils/validators.ts`
- Modify: `natalia-backend/seed-dev.js`

- [ ] **Step 1: Update `predictionSets.ts`**

Remove the `playoff_count` subquery from the prediction sets list query (the `(SELECT COUNT(*) FROM playoff_predictions WHERE prediction_set_id = ps.id) as playoff_count` part).

Remove playoff prediction loading from the set detail endpoint — the query `SELECT * FROM playoff_predictions WHERE prediction_set_id = $1` and the `playoffPredictions` field in the response.

- [ ] **Step 2: Update `server.ts`**

Remove the startup migration code that ensures `real_playoff_results` and `playoff_predictions` tables exist (since they're now dropped).

- [ ] **Step 3: Update `types/index.ts`**

Remove `PlayoffPrediction` interface and `PlayoffId` type.

- [ ] **Step 4: Update `utils/validators.ts`**

Remove `VALID_PLAYOFF_IDS` and `isValidPlayoffId()`.

- [ ] **Step 5: Update `seed-dev.js`**

Remove playoff prediction generation logic.

- [ ] **Step 6: Commit**

```bash
git add natalia-backend/routes/predictionSets.ts natalia-backend/server.ts natalia-backend/types/index.ts natalia-backend/utils/validators.ts natalia-backend/seed-dev.js
git commit -m "refactor: remove all playoff references from backend support files"
```

---

### Task 16: Update `useStepNavigation.ts` example and remaining hooks

**Files:**
- Modify: `natalia-frontend/src/hooks/useStepNavigation.ts:32-37`
- Modify: `natalia-frontend/src/hooks/usePredictionsScores.ts`

- [ ] **Step 1: Update JSDoc example in `useStepNavigation.ts`**

Lines 32-37, change the example:
```typescript
 * const steps = [
 *   { path: '/repechajes', label: 'Repechajes' },
 *   { path: '/grupos', label: 'Grupos' },
 *   { path: '/terceros', label: 'Terceros' },
 *   { path: '/eliminatorias', label: 'Eliminatorias' },
 * ];
```
to:
```typescript
 * const steps = [
 *   { path: '/grupos', label: 'Grupos' },
 *   { path: '/terceros', label: 'Terceros' },
 *   { path: '/eliminatorias', label: 'Eliminatorias' },
 * ];
```

- [ ] **Step 2: Update `usePredictionsScores.ts`**

Remove any playoff-related state, loading, or imports. Follow the same pattern as Task 6 (Predictions.tsx) — remove `playoffSelections` state, API calls to `getPlayoffs`, localStorage reads of `natalia_playoffs`.

- [ ] **Step 3: Commit**

```bash
git add natalia-frontend/src/hooks/useStepNavigation.ts natalia-frontend/src/hooks/usePredictionsScores.ts
git commit -m "refactor: remove playoff references from hooks"
```

---

### Task 17: Update admin GroupsTab — remove playoff dependency

**Files:**
- Modify: `natalia-frontend/src/components/admin/GroupsTab.tsx`

- [ ] **Step 1: Remove playoff imports and usage**

Remove import of `playoffs` from `playoffsData`. Remove any logic that uses `playoffs.find()` to resolve playoff destination groups — teams are now real teams directly in the data.

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/components/admin/GroupsTab.tsx
git commit -m "refactor: remove playoff dependency from admin GroupsTab"
```

---

### Task 18: Update tests

**Files:**
- Modify: `natalia-backend/__tests__/predictions.test.ts`
- Modify: `natalia-backend/__tests__/admin.test.ts`
- Modify: `natalia-frontend/src/__tests__/predictionHelpers.test.ts`

- [ ] **Step 1: Remove playoff tests from `predictions.test.ts`**

Remove test suites for:
- `POST /api/predictions/playoffs`
- `GET /api/predictions/playoffs`
- `has-subsequent-data?phase=playoffs`
- `DELETE /reset-from-playoffs`

- [ ] **Step 2: Remove playoff tests from `admin.test.ts`**

Remove test suites for:
- `GET /api/admin/playoffs`
- `POST /api/admin/playoffs`
- `DELETE /api/admin/playoffs/:playoffId`
- Remove `playoffs_entered` assertions from stats tests

- [ ] **Step 3: Update `predictionHelpers.test.ts`**

Remove all tests for `PLAYOFF_TO_TEAM_ID`, `getPlayoffWinner`, `getPlayoffIdByTeamId`, `isPlayoffTeam`. Update remaining `getTeamById` tests to use the new simplified signature (no `playoffSelections` parameter).

- [ ] **Step 4: Run tests**

Run: `cd natalia-backend && npm test`
Run: `cd natalia-frontend && npx tsc --noEmit`

Fix any failures.

- [ ] **Step 5: Commit**

```bash
git add natalia-backend/__tests__/ natalia-frontend/src/__tests__/
git commit -m "test: remove playoff test suites and update helpers tests"
```

---

### Task 19: Full build & smoke test

- [ ] **Step 1: TypeScript check**

Run: `cd natalia-frontend && npx tsc --noEmit`

Expected: 0 errors. Fix any remaining playoff references.

- [ ] **Step 2: Backend tests**

Run: `cd natalia-backend && npm test`

Expected: All tests pass.

- [ ] **Step 3: Restart backend**

Kill and restart: `cd natalia-backend && npm run dev`

Expected: "Server running on port 5001", migrations complete, no errors.

- [ ] **Step 4: Restart frontend**

Kill and restart: `cd natalia-frontend && npm run dev`

Expected: Vite starts on port 5174, no compile errors.

- [ ] **Step 5: Smoke test in browser**

Navigate to http://localhost:5174, create a new prediction, verify:
- Navigates to `/grupos` (not `/repechajes`)
- Groups page shows real team names (Bosnia, Sweden, etc.) not placeholders
- Third places and knockout work without errors
- No "Repechajes" in navigation or UI

- [ ] **Step 6: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve remaining playoff references after removal"
```

---

### Task 20: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `SESSION.md`
- Modify: `BACKEND.md` (if exists)

- [ ] **Step 1: Update CLAUDE.md**

- Remove `playoffsData.js` / `Playoffs.jsx` from file tree
- Remove `/repechajes` from routes table
- Remove playoff API endpoints from backend routes table
- Remove `playoff_predictions` and `real_playoff_results` from database tables list
- Update prediction flow description: "3 pasos: Grupos → Terceros → Eliminatorias"
- Update "Primera Etapa" features list

- [ ] **Step 2: Update SESSION.md**

- Update feature list to note repechajes were removed (not just completed)
- Add a "Cambios - 2026-04-10" section documenting the removal
- Update prediction flow description

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md SESSION.md BACKEND.md
git commit -m "docs: update documentation to reflect repechajes removal"
```
