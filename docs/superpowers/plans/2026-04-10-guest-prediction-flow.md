# Guest Prediction Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow unauthenticated users to complete the full prediction flow via a shareable WhatsApp link, then optionally export as image or register to save.

**Architecture:** Add a `/play` entry point that sets a guest_mode flag in localStorage. Modify ProtectedRoute to allow guest access to prediction pages. Add a `/guest-complete` page with export and registration CTA. Modify Register to claim localStorage predictions after signup.

**Tech Stack:** React 19 + TypeScript, react-router-dom, localStorage, existing exportToCanvas utility

**Spec:** `docs/superpowers/specs/2026-04-10-guest-prediction-flow-design.md`

---

### Task 1: Create `/play` entry point page

**Files:**
- Create: `natalia-frontend/src/pages/Play.tsx`
- Modify: `natalia-frontend/src/App.tsx`

- [ ] **Step 1: Create `Play.tsx`**

```typescript
// natalia-frontend/src/pages/Play.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Play(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    // Store group invite code if present
    const groupCode = searchParams.get('group');
    if (groupCode) {
      localStorage.setItem('guest_group_code', groupCode);
    }

    // Enter guest mode
    localStorage.setItem('guest_mode', 'true');

    // Start prediction flow at Groups
    navigate('/grupos', { replace: true });
  }, [loading, isAuthenticated, navigate, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
```

- [ ] **Step 2: Add routes in `App.tsx`**

In `natalia-frontend/src/App.tsx`:

Add lazy import after line 23:
```typescript
const Play = lazy(() => import('@/pages/Play'));
const GuestComplete = lazy(() => import('@/pages/GuestComplete'));
```

Add routes inside `<Routes>`, after the public routes section (after line 87):
```tsx
{/* Guest flow routes */}
<Route path="/play" element={<Play />} />
<Route path="/guest-complete" element={<GuestComplete />} />
```

- [ ] **Step 3: Commit**

```bash
git add natalia-frontend/src/pages/Play.tsx natalia-frontend/src/App.tsx
git commit -m "feat: add /play entry point for guest prediction flow"
```

---

### Task 2: Update ProtectedRoute to allow guest mode

**Files:**
- Modify: `natalia-frontend/src/App.tsx:42-58`

- [ ] **Step 1: Modify `ProtectedRoute`**

In `natalia-frontend/src/App.tsx`, replace the `ProtectedRoute` function:

```typescript
// Componente para rutas protegidas
function ProtectedRoute({ children }: RouteProps): JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Allow guest mode access to prediction pages
  const isGuestMode = localStorage.getItem('guest_mode') === 'true';
  if (!isAuthenticated && !isGuestMode) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/App.tsx
git commit -m "feat: allow guest mode access through ProtectedRoute"
```

---

### Task 3: Update Knockout page for guest completion redirect

**Files:**
- Modify: `natalia-frontend/src/pages/Knockout.tsx:132-158`

- [ ] **Step 1: Update `handleFinish` in Knockout.tsx**

In `natalia-frontend/src/pages/Knockout.tsx`, modify the `handleFinish` function (around line 132):

```typescript
const handleFinish = async (): Promise<void> => {
  setSaving(true);
  setError(null);

  localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
  if (predictionMode === 'scores') {
    localStorage.setItem('natalia_knockout_scores', JSON.stringify(knockoutScores));
  }

  // Guest mode: redirect to guest completion page
  const isGuestMode = localStorage.getItem('guest_mode') === 'true';
  if (isGuestMode || !setId) {
    setSaving(false);
    setSaved(true);
    window.scrollTo(0, 0);
    navigate('/guest-complete');
    return;
  }

  const nextUrl = `/prediccion/${setId}`;

  try {
    await predictionsAPI.saveKnockout(buildSaveData(), setId!);
    setSaved(true);
    window.scrollTo(0, 0);
    navigate(nextUrl);
  } catch (err) {
    setError(t('errors.savingFailed'));
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      window.scrollTo(0, 0);
      navigate(nextUrl);
    }, 800);
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/pages/Knockout.tsx
git commit -m "feat: redirect guests to /guest-complete after finishing knockout"
```

---

### Task 4: Update Predictions.tsx back button for guest mode

**Files:**
- Modify: `natalia-frontend/src/pages/Predictions.tsx`

- [ ] **Step 1: Find and update back navigation**

Read `natalia-frontend/src/pages/Predictions.tsx`. Find where the "Back" button navigates (likely to `/mis-predicciones` when no setId). Update it to handle guest mode:

In whatever function handles back navigation, change the fallback:

```typescript
const handleBack = (): void => {
  const isGuestMode = localStorage.getItem('guest_mode') === 'true';
  if (setId) {
    navigate(`/mis-predicciones`);
  } else if (isGuestMode) {
    // Guest entered via /play, going back exits guest mode
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    navigate('/');
  } else {
    navigate('/mis-predicciones');
  }
};
```

If the back button is rendered as a `<Link>` or `<Button asChild><Link>`, convert it to use `onClick` with the above logic. Read the file to find the exact pattern.

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/pages/Predictions.tsx
git commit -m "feat: handle guest mode back navigation in Groups page"
```

---

### Task 5: Create GuestComplete page

**Files:**
- Create: `natalia-frontend/src/pages/GuestComplete.tsx`

- [ ] **Step 1: Create the completion page**

```typescript
// natalia-frontend/src/pages/GuestComplete.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, UserPlus, Share } from 'lucide-react';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { getTeamById } from '@/utils/predictionHelpers';
import { exportToCanvas } from '@/utils/exportCanvas';
import {
  finalMatch,
} from '@/data/knockoutBracket';

export default function GuestComplete(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  // Load predictions from localStorage
  const predictions: Record<string, number[]> = JSON.parse(
    localStorage.getItem('natalia_predictions') || '{}'
  );
  const bestThirdPlaces: string[] = JSON.parse(
    localStorage.getItem('natalia_best_third_places') || '[]'
  );
  const knockoutPredictions: Record<string, number> = JSON.parse(
    localStorage.getItem('natalia_knockout') || '{}'
  );

  // Redirect if no data
  useEffect(() => {
    if (Object.keys(predictions).length === 0) {
      navigate('/play', { replace: true });
    }
  }, []);

  // Stats
  const completedGroups = getAllGroups().filter(g => predictions[g]?.length === 4).length;
  const totalKnockout = Object.keys(knockoutPredictions).length;

  // Champion
  const championId = knockoutPredictions[finalMatch.matchId];
  const champion = championId ? getTeamById(championId) : null;

  // Check if Web Share API with files is supported
  const canShareFiles = (): boolean => {
    return navigator.share !== undefined && navigator.canShare !== undefined;
  };

  // Convert data URL to Blob
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const dataUrl = await exportToCanvas({
        predictionName: t('guest.predictionName'),
        predictions,
        knockoutPredictions,
        bestThirdPlaces,
        getTeamById,
      });

      const fileName = `mundalia_prediction.png`;

      // Try Web Share API first (iOS)
      if (canShareFiles()) {
        try {
          const blob = dataUrlToBlob(dataUrl);
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Mundalia' });
            return;
          }
        } catch (shareErr) {
          if ((shareErr as Error).name !== 'AbortError') {
            console.log('Share failed, falling back to download');
          }
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleRegister = (): void => {
    const groupCode = localStorage.getItem('guest_group_code');
    const params = new URLSearchParams({ from: 'guest' });
    if (groupCode) params.set('group', groupCode);
    navigate(`/register?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      {/* Champion Display */}
      {champion && (
        <Card className="mb-6 border-yellow-400 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl">🏆</span>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('guest.yourChampion')}</p>
                <div className="flex items-center gap-3">
                  <img
                    src={champion.flag_url}
                    alt={champion.name}
                    className="w-12 h-8 object-cover rounded shadow"
                  />
                  <span className="text-2xl font-bold">{champion.name}</span>
                </div>
              </div>
              <span className="text-4xl">🏆</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('guest.completeTitle')}</CardTitle>
          <p className="text-muted-foreground">{t('guest.completeSubtitle')}</p>
        </CardHeader>
        <CardContent>
          {/* Progress Summary */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Badge variant={completedGroups === 12 ? 'default' : 'secondary'}>
              {t('nav.groups')}: {completedGroups}/12
            </Badge>
            <Badge variant={bestThirdPlaces.length === 8 ? 'default' : 'secondary'}>
              {t('thirdPlaces.title')}: {bestThirdPlaces.length}/8
            </Badge>
            <Badge variant={totalKnockout >= 32 ? 'default' : 'secondary'}>
              Bracket: {totalKnockout}/32
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : canShareFiles() ? (
                <Share className="h-4 w-4 mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {canShareFiles() ? t('export.share') : t('export.button')}
            </Button>

            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={handleRegister}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('guest.createAccount')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('guest.browserWarning')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/pages/GuestComplete.tsx
git commit -m "feat: add guest completion page with export and register CTA"
```

---

### Task 6: Update Register page to claim guest predictions

**Files:**
- Modify: `natalia-frontend/src/pages/Register.tsx`

- [ ] **Step 1: Add guest prediction claim logic**

In `natalia-frontend/src/pages/Register.tsx`, add imports at the top:

```typescript
import { useSearchParams } from 'react-router-dom';
import { predictionSetsAPI, predictionsAPI, groupsAPI } from '@/services/api';
```

Update the component to read `from=guest` param and claim predictions after registration.

Add `useSearchParams` hook:
```typescript
const [searchParams] = useSearchParams();
const isFromGuest = searchParams.get('from') === 'guest';
```

Create a claim function (add before `handleSubmit`):

```typescript
const claimGuestPredictions = async (): Promise<string | null> => {
  try {
    const predictions = localStorage.getItem('natalia_predictions');
    const thirdPlaces = localStorage.getItem('natalia_best_third_places');
    const knockout = localStorage.getItem('natalia_knockout');

    if (!predictions) return null;

    // Create prediction set
    const setResponse = await predictionSetsAPI.create('Mi Prediccion', 'positions');
    const setId = setResponse.data.public_id;

    // Save groups
    const groupPredictions = JSON.parse(predictions);
    const predictionsArray: Array<{ group_letter: string; team_id: number; predicted_position: number }> = [];
    Object.entries(groupPredictions).forEach(([groupLetter, teamIds]) => {
      (teamIds as number[]).forEach((teamId, index) => {
        predictionsArray.push({
          group_letter: groupLetter,
          team_id: teamId,
          predicted_position: index + 1,
        });
      });
    });
    await predictionsAPI.saveGroups(predictionsArray, setId);

    // Save third places
    if (thirdPlaces) {
      const groups = JSON.parse(thirdPlaces) as string[];
      if (groups.length === 8) {
        await predictionsAPI.saveThirdPlaces(groups.join(''), setId);
      }
    }

    // Save knockout
    if (knockout) {
      const knockoutData = JSON.parse(knockout);
      if (Object.keys(knockoutData).length > 0) {
        await predictionsAPI.saveKnockout(knockoutData, setId);
      }
    }

    // Join group if invite code exists
    const groupCode = localStorage.getItem('guest_group_code');
    if (groupCode) {
      try {
        await groupsAPI.join(groupCode);
      } catch {
        // Group join failure is non-critical
        console.error('Failed to join group:', groupCode);
      }
    }

    // Clear guest data
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    localStorage.removeItem('natalia_predictions');
    localStorage.removeItem('natalia_best_third_places');
    localStorage.removeItem('natalia_knockout');
    localStorage.removeItem('natalia_knockout_scores');

    return setId;
  } catch (err) {
    console.error('Error claiming guest predictions:', err);
    // Clear guest mode even on failure — user is now registered
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    return null;
  }
};
```

- [ ] **Step 2: Update `handleSubmit` to claim after registration**

Modify the success path in `handleSubmit`:

```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();
  setError('');

  if (password !== confirmPassword) {
    setError(t('auth.passwordsNoMatch'));
    return;
  }

  if (password.length < 6) {
    setError(t('auth.passwordTooShort'));
    return;
  }

  setLoading(true);

  try {
    const result = await register(name, email, password);
    if (result.success) {
      // Claim guest predictions if coming from guest flow
      if (isFromGuest) {
        const publicId = await claimGuestPredictions();
        if (publicId) {
          navigate(`/prediccion/${publicId}`);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } else {
      setError(result.error || t('auth.registerError'));
    }
  } catch {
    setError(t('auth.registerError'));
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 3: Update Google OAuth to pass guest params**

Modify `handleGoogleLogin` to include `from=guest` state so after OAuth callback, the claim can happen:

```typescript
const handleGoogleLogin = (): void => {
  // Store guest state before redirect (OAuth will lose URL params)
  if (isFromGuest) {
    localStorage.setItem('guest_pending_claim', 'true');
  }
  window.location.href = `${API_URL}/auth/google/redirect`;
};
```

Note: The OAuth callback page (`AuthCallback`) will need to check for `guest_pending_claim` and run the claim flow. This is handled in Task 7.

- [ ] **Step 4: Update PublicRoute to allow guest registration**

In `App.tsx`, the `/register` route is wrapped in `PublicRoute`, which redirects authenticated users to `/`. But after registration, the user IS authenticated. The current flow `register → navigate('/')` works because `navigate` happens before `PublicRoute` re-evaluates. However, to be safe and to allow the `?from=guest` param to reach Register, no change is needed — `PublicRoute` only redirects if already authenticated on page load.

- [ ] **Step 5: Commit**

```bash
git add natalia-frontend/src/pages/Register.tsx
git commit -m "feat: claim guest predictions after registration"
```

---

### Task 7: Handle Google OAuth guest claim

**Files:**
- Modify: `natalia-frontend/src/pages/AuthCallback.tsx`

- [ ] **Step 1: Read AuthCallback.tsx**

Read `natalia-frontend/src/pages/AuthCallback.tsx` to understand how the OAuth callback works. It likely:
1. Extracts token from URL params
2. Stores token in localStorage
3. Sets user in AuthContext
4. Redirects to home

- [ ] **Step 2: Add guest claim logic after OAuth**

After the token is stored and user is set, check for `guest_pending_claim`:

```typescript
// After successful auth setup:
const guestPendingClaim = localStorage.getItem('guest_pending_claim');
if (guestPendingClaim) {
  localStorage.removeItem('guest_pending_claim');
  // Run the same claim logic as Register.tsx
  // Import and call a shared claimGuestPredictions function
}
```

To avoid duplicating the claim logic, extract it to a shared utility. Create `natalia-frontend/src/utils/guestClaim.ts`:

```typescript
import { predictionSetsAPI, predictionsAPI, groupsAPI } from '@/services/api';

export async function claimGuestPredictions(): Promise<string | null> {
  try {
    const predictions = localStorage.getItem('natalia_predictions');
    const thirdPlaces = localStorage.getItem('natalia_best_third_places');
    const knockout = localStorage.getItem('natalia_knockout');

    if (!predictions) return null;

    // Create prediction set
    const setResponse = await predictionSetsAPI.create('Mi Prediccion', 'positions');
    const setId = setResponse.data.public_id;

    // Save groups
    const groupPredictions = JSON.parse(predictions);
    const predictionsArray: Array<{ group_letter: string; team_id: number; predicted_position: number }> = [];
    Object.entries(groupPredictions).forEach(([groupLetter, teamIds]) => {
      (teamIds as number[]).forEach((teamId, index) => {
        predictionsArray.push({
          group_letter: groupLetter,
          team_id: teamId,
          predicted_position: index + 1,
        });
      });
    });
    await predictionsAPI.saveGroups(predictionsArray, setId);

    // Save third places
    if (thirdPlaces) {
      const groups = JSON.parse(thirdPlaces) as string[];
      if (groups.length === 8) {
        await predictionsAPI.saveThirdPlaces(groups.join(''), setId);
      }
    }

    // Save knockout
    if (knockout) {
      const knockoutData = JSON.parse(knockout);
      if (Object.keys(knockoutData).length > 0) {
        await predictionsAPI.saveKnockout(knockoutData, setId);
      }
    }

    // Join group if invite code exists
    const groupCode = localStorage.getItem('guest_group_code');
    if (groupCode) {
      try {
        await groupsAPI.join(groupCode);
      } catch {
        console.error('Failed to join group:', groupCode);
      }
    }

    // Clear guest data
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    localStorage.removeItem('guest_pending_claim');
    localStorage.removeItem('natalia_predictions');
    localStorage.removeItem('natalia_best_third_places');
    localStorage.removeItem('natalia_knockout');
    localStorage.removeItem('natalia_knockout_scores');

    return setId;
  } catch (err) {
    console.error('Error claiming guest predictions:', err);
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    localStorage.removeItem('guest_pending_claim');
    return null;
  }
}
```

- [ ] **Step 3: Update Register.tsx to use shared utility**

Replace the inline `claimGuestPredictions` in Register.tsx with:
```typescript
import { claimGuestPredictions } from '@/utils/guestClaim';
```

Remove the local `claimGuestPredictions` function defined in Task 6.

- [ ] **Step 4: Update AuthCallback.tsx to use shared utility**

After successful authentication, add:
```typescript
import { claimGuestPredictions } from '@/utils/guestClaim';

// After token stored and user set:
const guestPendingClaim = localStorage.getItem('guest_pending_claim');
if (guestPendingClaim) {
  const publicId = await claimGuestPredictions();
  if (publicId) {
    navigate(`/prediccion/${publicId}`);
    return;
  }
}
// Otherwise redirect to home as usual
navigate('/');
```

- [ ] **Step 5: Commit**

```bash
git add natalia-frontend/src/utils/guestClaim.ts natalia-frontend/src/pages/Register.tsx natalia-frontend/src/pages/AuthCallback.tsx
git commit -m "feat: extract shared guest claim utility, use in Register and AuthCallback"
```

---

### Task 8: Add i18n translations for guest flow

**Files:**
- Modify: `natalia-frontend/src/i18n/locales/es.json`
- Modify: `natalia-frontend/src/i18n/locales/en.json`
- Modify: `natalia-frontend/src/i18n/locales/fr.json`
- Modify: `natalia-frontend/src/i18n/locales/de.json`
- Modify: `natalia-frontend/src/i18n/locales/pt.json`
- Modify: `natalia-frontend/src/i18n/locales/zh.json`

- [ ] **Step 1: Add `guest` section to all 6 locale files**

Add this section to each file (translate appropriately):

**en.json:**
```json
"guest": {
  "predictionName": "My Prediction",
  "completeTitle": "Your prediction is ready!",
  "completeSubtitle": "Export it as an image or create an account to save it permanently.",
  "yourChampion": "Your Champion",
  "createAccount": "Create Account to Save",
  "browserWarning": "Without an account, your prediction is only saved in this browser."
}
```

**es.json:**
```json
"guest": {
  "predictionName": "Mi Prediccion",
  "completeTitle": "Tu prediccion esta lista!",
  "completeSubtitle": "Exportala como imagen o crea una cuenta para guardarla.",
  "yourChampion": "Tu Campeon",
  "createAccount": "Crear Cuenta para Guardar",
  "browserWarning": "Sin cuenta, tu prediccion solo esta guardada en este navegador."
}
```

**fr.json:**
```json
"guest": {
  "predictionName": "Ma Prediction",
  "completeTitle": "Votre prediction est prete !",
  "completeSubtitle": "Exportez-la en image ou creez un compte pour la sauvegarder.",
  "yourChampion": "Votre Champion",
  "createAccount": "Creer un compte pour sauvegarder",
  "browserWarning": "Sans compte, votre prediction n'est sauvegardee que dans ce navigateur."
}
```

**de.json:**
```json
"guest": {
  "predictionName": "Meine Vorhersage",
  "completeTitle": "Deine Vorhersage ist fertig!",
  "completeSubtitle": "Exportiere sie als Bild oder erstelle ein Konto, um sie zu speichern.",
  "yourChampion": "Dein Champion",
  "createAccount": "Konto erstellen zum Speichern",
  "browserWarning": "Ohne Konto ist deine Vorhersage nur in diesem Browser gespeichert."
}
```

**pt.json:**
```json
"guest": {
  "predictionName": "Minha Previsao",
  "completeTitle": "Sua previsao esta pronta!",
  "completeSubtitle": "Exporte como imagem ou crie uma conta para salvar.",
  "yourChampion": "Seu Campeao",
  "createAccount": "Criar conta para salvar",
  "browserWarning": "Sem conta, sua previsao so esta salva neste navegador."
}
```

**zh.json:**
```json
"guest": {
  "predictionName": "我的预测",
  "completeTitle": "你的预测已完成！",
  "completeSubtitle": "导出为图片或创建账户保存。",
  "yourChampion": "你的冠军",
  "createAccount": "创建账户保存",
  "browserWarning": "没有账户，你的预测只保存在此浏览器中。"
}
```

- [ ] **Step 2: Commit**

```bash
git add natalia-frontend/src/i18n/locales/
git commit -m "feat: add guest flow i18n translations for all 6 languages"
```

---

### Task 9: Build verification and smoke test

- [ ] **Step 1: TypeScript check**

Run: `cd natalia-frontend && npx tsc --noEmit 2>&1 | grep -v "JSX\|Cannot find namespace" | grep "error TS"`

Fix any new errors introduced by the guest flow.

- [ ] **Step 2: Restart frontend**

Kill and restart the frontend dev server. Verify it compiles without Vite errors.

- [ ] **Step 3: Manual smoke test**

Test the full guest flow:
1. Open http://localhost:5174/play in an incognito/private window
2. Verify it redirects to `/grupos`
3. Verify Groups page loads without auth
4. Navigate through all 3 steps (Groups → Third Places → Knockout)
5. Finish knockout → verify redirect to `/guest-complete`
6. Verify champion is shown, export works
7. Click "Create Account" → verify redirect to `/register?from=guest`
8. Register → verify prediction is claimed and redirects to `/prediccion/:id`

Test logged-in user hitting `/play`:
1. In a window where you're logged in, navigate to http://localhost:5174/play
2. Verify it redirects to `/`

Test group invite:
1. Open http://localhost:5174/play?group=TESTCODE in incognito
2. Verify `guest_group_code` is in localStorage

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve issues found during guest flow smoke test"
```

---

### Task 10: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `SESSION.md`

- [ ] **Step 1: Update CLAUDE.md**

Add to file tree:
```
│   │   ├── pages/
│   │   │   ├── Play.jsx            # Guest entry point (/play)
│   │   │   ├── GuestComplete.jsx   # Guest completion page
```

Add to routes table:
```
| `/play` | Play | No | Guest entry point (sets guest_mode, redirects to /grupos) |
| `/guest-complete` | GuestComplete | No | Guest completion with export + register |
```

Add to utils:
```
│   │   ├── utils/
│   │   │   └── guestClaim.ts       # Claim guest localStorage predictions after registration
```

- [ ] **Step 2: Update SESSION.md**

Add a "Cambios - 2026-04-10" entry for the guest flow:
```
### Guest Prediction Flow
- New /play entry point for WhatsApp sharing
- Guests can complete full 3-step prediction without registering
- Export to image available without account
- Predictions auto-claimed on registration
- Group invite codes supported via /play?group=XXXX
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md SESSION.md
git commit -m "docs: document guest prediction flow"
```
