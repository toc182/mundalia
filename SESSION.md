# SESSION.md - Estado Actual del Proyecto

## Ultima Actualizacion: 2025-12-23 (PRODUCTION FIXES)

---

## PRODUCTION FIXES - 2025-12-23

Después de la migración a TypeScript, producción dejó de funcionar. Se aplicaron los siguientes fixes:

### Fixes Aplicados

| Fix | Archivo | Problema | Solución |
|-----|---------|----------|----------|
| SSL | `config/db.ts` | Railway rechazaba conexiones con `rejectUnauthorized: true` | Cambiar a `rejectUnauthorized: false` |
| CORS | `server.ts` | Requests sin header Origin eran rechazados | Permitir requests sin origin (health checks, server-to-server) |
| Google OAuth | `.env.production` | Faltaba `VITE_GOOGLE_CLIENT_ID` | Agregar client ID al archivo |
| COOP Header | `vercel.json` | Google popup no podía comunicarse con ventana principal | Agregar `Cross-Origin-Opener-Policy: same-origin-allow-popups` |

---

## RESUELTO: Error de Google Sign-In en consola - 2025-12-24

### Problema Original

Al cargar las páginas de Login/Register aparecía este error en la consola:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
Failed to load resource: the server responded with a status of 403
```

### Solución Aplicada

Migración a flujo OAuth server-side redirect (elimina errores de consola completamente).

**Cambios:**
- Frontend ya no usa `@react-oauth/google` (eliminada dependencia)
- Click en "Google" redirige a `/api/auth/google/redirect`
- Backend maneja todo el flujo OAuth con Google
- Backend redirige de vuelta al frontend con JWT token

**Nuevos endpoints backend:**
- `GET /auth/google/redirect` - Inicia flujo OAuth
- `GET /auth/google/callback` - Recibe código de Google, crea/vincula usuario, redirige con token

**Variables de entorno Railway:**
- `GOOGLE_CLIENT_ID` - Client ID de OAuth
- `GOOGLE_CLIENT_SECRET` - Client Secret de OAuth (nuevo, requerido para server-side flow)

### Orígenes Autorizados en Google Cloud Console

Para que funcione en desarrollo y producción:
- `http://localhost:5174`
- `https://mundalia.vercel.app`

### Estado

✅ Login con Google funciona en desarrollo
✅ Login con Google funciona en producción (verificado 2025-12-24)

---

## CI/CD FIXES - 2025-12-23

El CI estaba fallando porque migrations.sql no tenía todas las tablas necesarias para tests en BD limpia.

### Backend - migrations.sql corregido

| Cambio | Descripción |
|--------|-------------|
| `teams.id` | Cambiado de `INTEGER` a `SERIAL` (auto-increment) |
| `teams.playoff_id` | Columna agregada |
| `matches` | Tabla nueva para partidos |
| `match_predictions` | Tabla nueva para predicciones de partidos |
| `private_groups` | Tabla nueva para grupos privados |
| `private_group_members` | Tabla nueva para miembros de grupos |
| `score_predictions.match_index` | Renombrado a `match_number` |
| `tiebreaker_decisions.team_order` | Reemplazado por `tied_team_ids` + `resolved_order` (arrays) |
| `group_predictions` | Agregado UNIQUE constraint |

### Backend - Tests corregidos

- `__tests__/predictions.test.ts`: Playoff IDs cambiados a mayúsculas (`UEFA_A` en vez de `uefa_a`)

### Frontend - Tests agregados

- `src/__tests__/setup.ts` - Archivo de configuración de vitest
- `src/App.test.tsx` - Test placeholder (vitest falla con código 1 si no hay tests)

### Resultado

✅ CI pasa: Backend Tests (51s) + Frontend Tests & Build (17s)

---

## CORRECCIÓN DE INCONSISTENCIAS FRONTEND-BACKEND - 2025-12-23

Se realizó una auditoría completa para encontrar y corregir inconsistencias entre los tipos del frontend y las respuestas reales del backend. Estos problemas causaban bugs en runtime donde el frontend esperaba propiedades que no existían.

### Problemas Detectados y Corregidos

| Problema | Severidad | Archivo(s) | Descripción |
|----------|-----------|------------|-------------|
| Leaderboard response | ALTA | `api.ts`, `types/index.ts` | Frontend esperaba `{entries, total}`, backend retorna array |
| Predictions /all | ALTA | `api.ts` | Propiedades `groups`, `knockout` vs `groupPredictions`, `knockoutPredictions` |
| has-subsequent-data | ALTA | `api.ts` | Frontend esperaba `{hasData, phases}`, backend retorna `{hasGroups, hasThirds, hasKnockout}` |
| PredictionSet counts | MEDIA | `types/index.ts`, `MyPredictions.tsx` | `groups_count` vs `group_count`, `has_thirds` vs `third_places` |
| Team.group | MEDIA | `types/index.ts` | Frontend usaba `group`, backend retorna `group_letter` |
| Score Predictions | MEDIA | `api.ts` | Frontend esperaba array, backend retorna nested object |
| Tiebreaker response | MEDIA | `api.ts` | Tipo incorrecto `Record<string, number[]>` vs `{tiedTeamIds, resolvedOrder}` |
| AdminStats | BAJA | `types/index.ts` | Campo `complete_predictions` no existe en backend |
| LeaderboardEntry | BAJA | `types/index.ts` | Campo `rank` no existe, `user_name` vs `username` |

### Archivos Modificados

**Frontend Types (`types/index.ts`):**
- `Team.group` → `Team.group_letter`
- `PredictionSet`: `groups_count`→`group_count`, `playoffs_count`→`playoff_count`, `has_thirds`→`third_places`
- `LeaderboardEntry`: Actualizado con campos correctos del backend
- `AdminStats`: Eliminado `complete_predictions`
- `ScorePrediction`: Convertido a comentario (es nested object, no interface)

**Frontend API (`api.ts`):**
- `leaderboardAPI.getGlobal`: Retorna `LeaderboardEntry[]` en vez de `{entries, total}`
- `predictionsAPI.getAll`: Usa `groupPredictions`, `knockoutPredictions`, `thirdPlaces`
- `predictionsAPI.hasSubsequentData`: Retorna `{hasGroups, hasThirds, hasKnockout}`
- `predictionsAPI.getScores`: Retorna `Record<string, Record<number, {a,b}>>`
- `predictionsAPI.saveScores`: Acepta nested object
- `predictionsAPI.getTiebreaker`: Retorna `Record<string, {tiedTeamIds, resolvedOrder}>`
- `predictionsAPI.saveTiebreaker`: Usa `group` en vez de `groupLetter`

**Frontend Pages:**
- `MyPredictions.tsx`: Usa `group_count`, `playoff_count`, `third_places` correctamente

### Bugs Corregidos en Sesión Anterior (mismo día)

| Bug | Causa | Solución |
|-----|-------|----------|
| Playoffs no se guardaban (400 Invalid playoff_id) | validators.ts usaba minúsculas (`uefa_a`) | Cambiar a mayúsculas (`UEFA_A`) |
| Grupos no se guardaban (duplicate key constraint) | Transacción usando pool.query() en vez de client dedicado | Usar `pool.connect()` para transacción |
| Grupos no cargaban en Knockout | `getMy` retorna objeto, código esperaba array | Usar `getGroups` que retorna array |
| Terceros no cargaban en Knockout | `selected_groups` vs `selectedGroups` | Corregir a camelCase |
| Playoffs no cargaban en Knockout | Formato `{semifinal_winner_1}` vs `{semi1}` | Usar formato del backend directamente |

### Verificación

Los cambios fueron aplicados y el frontend compila correctamente con HMR. La aplicación está lista para testing.

---

## MIGRACIÓN FRONTEND A TYPESCRIPT - 2025-12-22

El frontend ha sido migrado completamente a TypeScript.

### Archivos Migrados

**Configuración:**
- `tsconfig.json`, `tsconfig.node.json`, `vite-env.d.ts`

**Core:**
- `main.tsx`, `App.tsx`, `vite.config.ts`
- `context/AuthContext.tsx`
- `services/api.ts`, `services/predictions.ts`
- `lib/utils.ts`
- `types/index.ts`

**Datos (con interfaces):**
- `data/mockData.ts` - Team, MockTeam interfaces
- `data/knockoutBracket.ts` - RoundOf32Match, KnockoutMatchStructure, etc.
- `data/playoffsData.ts` - Playoff, PlayoffTeam, UEFABracket, FIFABracket
- `data/groupMatches.ts` - GroupMatch, MatchTeams interfaces
- `data/thirdPlaceCombinations.ts` - ThirdPlaceCombination, ThirdPlaceAssignments

**Utils:**
- `utils/fifaTiebreaker.ts` - TeamStats, MatchScore, GroupStandingsResult, etc.
- `utils/predictionHelpers.ts` - PlayoffWinnerTeam, PlayoffSelections

**Componentes UI (10):**
- `components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`
- `components/ui/select.tsx`, `table.tsx`, `textarea.tsx`, `alert.tsx`, `badge.tsx`

**Componentes Custom (7):**
- `components/TopBar.tsx`, `ErrorBoundary.tsx`, `MatchBox.tsx`
- `components/GroupStandingsTable.tsx`, `MatchScoreRow.tsx`
- `components/GroupScoreInput.tsx`, `TiebreakerModal.tsx`

**Páginas (14):**
- `pages/Home.tsx`, `pages/Login.tsx`, `pages/Register.tsx`, `pages/Account.tsx`
- `pages/Groups.tsx`, `pages/Playoffs.tsx`, `pages/Predictions.tsx`, `pages/ThirdPlaces.tsx`
- `pages/Knockout.tsx`, `pages/PredictionsScores.tsx`, `pages/PredictionDetail.tsx`
- `pages/MyPredictions.tsx`, `pages/Leaderboard.tsx`, `pages/Admin.tsx`

### Archivos Eliminados

- Todos los `.jsx` convertidos a `.tsx`
- `utils/fifaTiebreaker.js`, `utils/predictionHelpers.js`, `services/predictions.js`

### Verificación

| Check | Estado |
|-------|--------|
| Build (`npm run build`) | ✓ Sin errores |
| Módulos transformados | 1870 |
| Bundle size | 367kb (main) + lazy chunks |

### Archivos Restantes en .js

Solo archivos de test (pueden permanecer en .js):
- `__tests__/setup.js`
- `__tests__/predictionHelpers.test.js`

---

## AUDITORÍA INTEGRAL v3 - 2025-12-22

Nueva auditoría completa del proyecto. Ver `AUDIT.md` para detalles.

### Correcciones Realizadas

| Corrección | Archivo | Descripción |
|------------|---------|-------------|
| Puntos knockout | `knockoutBracket.ts` | Sincronizado con scoring.ts (R32:1, R16:2, QF:4, SF:6, 3ro:8, Final:15) |
| Tabla puntos Home | `Home.tsx` | Agregado Dieciseisavos, separado en secciones, clarificado descripciones |
| Descripción 3er puesto | `Home.tsx` | "Acertar Finalista" → "Ganador 3er Puesto" |
| Frontend TypeScript | Todo el src/ | Migración completa a TypeScript con interfaces |

### Pendiente (según AUDIT.md)

**Críticos:**
- [x] Frontend en JavaScript (migrar a TypeScript) - COMPLETADO
- [ ] Componentes monolíticos (Knockout.tsx 1589 líneas) - 1-2 días
- [ ] N+1 queries en predictionSets.ts - 4 horas
- [ ] Leaderboard LIMIT 500 - 30 min

**Importantes:**
- [ ] Transacciones incompletas en predictions.ts - 1 hora
- [ ] Admin role query en cada request - 2 horas
- [ ] Falta useMemo en cálculos knockout - 2 horas
- [ ] Código duplicado en páginas - 4 horas

**Nuevas Features (B2B):**
- [ ] Config modos predicción (admin elige: Ganadores/Marcadores/Ambos) - 1 día
- [ ] Timer countdown al Mundial - 2-4 horas
- [ ] Cierre automático de predicciones - 4-8 horas

---

## AUDITORÍA INTEGRAL v2 - 2025-12-20 (ANTERIOR)

Se realizó una auditoría completa del proyecto con implementación de correcciones.

### Hallazgos y Correcciones

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| ALTO | 1 | ✅ Corregido |
| MEDIO | 5 | ✅ Corregidos |
| BAJO | 7 | Pendientes (opcionales) |

### Fase 1: Backend (6 correcciones)

| Corrección | Archivo | Descripción |
|------------|---------|-------------|
| API consistente | `routes/matches.ts` | Migrado a usar helpers de response.ts |
| API consistente | `routes/teams.ts` | Migrado a usar helpers de response.ts |
| Validar password Google | `routes/auth.ts:154` | Mensaje claro para usuarios Google OAuth |
| Transacción ACID | `routes/predictions.ts` | BEGIN/COMMIT/ROLLBACK en DELETE+INSERT |
| Validar JWT_SECRET | `server.ts` | Validación en startup, exit si falta |
| Validadores | `routes/predictions.ts` | Ya implementados (verificado) |

### Fase 2: Frontend (7 archivos corregidos)

**Problema:** setTimeout sin cleanup causaba memory leaks potenciales.

**Solución:** useRef + useEffect cleanup en cada componente.

| Archivo | Timer(s) Corregido(s) |
|---------|----------------------|
| `Account.jsx` | savedTimerRef |
| `Admin.jsx` | successTimerRef |
| `Groups.jsx` | messageTimerRef, copyTimerRef |
| `Knockout.jsx` | savedTimerRef, navTimerRef |
| `Playoffs.jsx` | navTimerRef |
| `Predictions.jsx` | navTimerRef |
| `ThirdPlaces.jsx` | navTimerRef |

### Verificaciones

| Check | Estado |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Sin errores |
| ESLint | ✅ Solo warnings de imports |
| Tests | ✅ 174 pasando |

### Pendiente (Fase 3 - Opcional)

- [ ] Consolidar tipos UserRow en `types/index.ts`
- [ ] Agregar tests para matches/teams routes
- [ ] Agregar useCallback a Predictions.jsx
- [ ] Migración a HttpOnly cookies (largo plazo)

Ver `AUDIT_PLAN.md` para detalles completos.

---

## MIGRACIÓN COMPLETA A TYPESCRIPT - 2025-12-19

El backend ha sido migrado completamente a TypeScript, eliminando todos los archivos JavaScript duplicados.

### Cambios Realizados

| Categoría | Detalle |
|-----------|---------|
| **Archivos .ts** | server.ts, config/db.ts, middleware/auth.ts, routes/*.ts (10), utils/*.ts (3), types/index.ts |
| **Tests .ts** | 8 archivos de test convertidos a TypeScript con ES modules |
| **Archivos .js eliminados** | 16 archivos duplicados removidos |
| **Cobertura** | 76.6% (174 tests pasando) |

### Nuevos Tests Agregados

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `scoring.test.ts` | 32 | Sistema de puntos completo (POINTS, getMatchPoints, getGroupPoints) |
| `admin.test.ts` | 21 | Rutas admin (auth, stats, playoffs, knockout, groups) |
| `predictions.test.ts` | 57 | Edge cases (scores mode, tiebreaker, reset, validation) |

### Configuración TypeScript

**tsconfig.json** - Configuración estricta para código fuente:
- `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- Compila a `dist/` con ES2022

**tsconfig.test.json** - Configuración relajada para tests:
- `strict: false`, `noImplicitAny: false`
- Permite tests sin tipado explícito

**jest.config.js** - Usa ts-jest:
- `preset: 'ts-jest'`
- `testMatch: ['**/__tests__/**/*.test.ts']`

### Scripts Actualizados (package.json)

```bash
npm run dev        # nodemon --exec ts-node server.ts
npm run build      # tsc → genera dist/
npm start          # node dist/server.js (producción)
npm test           # jest con ts-jest
npm run typecheck  # tsc --noEmit
```

### Tipos Definidos (types/index.ts)

- `User`, `JwtPayload`, `AuthenticatedRequest`
- `Team`, `PredictionSet`, `GroupPrediction`
- `PlayoffPrediction`, `KnockoutPrediction`
- `POINTS` configuration interface

### Verificaciones Completadas

| Check | Estado |
|-------|--------|
| TypeCheck (`tsc --noEmit`) | ✓ Sin errores |
| Tests (174) | ✓ Todos pasan |
| Dev server | ✓ Inicia con ts-node |
| Build | ✓ Compila a dist/ |
| Cobertura | ✓ 76.6% |

---

## AUDITORÍA COMPLETA DE CÓDIGO - 2025-12-18

Se realizó una auditoría exhaustiva del proyecto cubriendo seguridad, testing, performance y calidad de código. Ver `AUDIT_PLAN.md` para el plan detallado.

### Fase 1: Seguridad (7/7 items)
| Fix | Archivo | Descripción |
|-----|---------|-------------|
| Credenciales removidas | CLAUDE.md | Password local reemplazado con placeholder |
| SSL fix | config/db.js | `rejectUnauthorized: true` en producción |
| Validación inputs | predictions.js | Validación de group_letter, position, team_id, matchKey |
| Transacciones | predictionSets.js | BEGIN/COMMIT/ROLLBACK en duplicate |
| Transacciones | admin.js | Transacciones en POST /groups |
| JWT seguro | Railway | Verificado que prod usa secret diferente |
| validators.js | utils/validators.js | Funciones de validación centralizadas |

### Fase 2: Testing y CI/CD (5/5 items)
| Mejora | Archivo | Descripción |
|--------|---------|-------------|
| PostgreSQL en CI | ci.yml | Service postgres:15 con health checks |
| Tests predictions | predictions.test.js | 20+ tests para endpoints de predicciones |
| Tests admin | admin.test.js | Tests de autenticación y validación |
| npm audit | ci.yml | Security scanning en frontend y backend |
| Coverage thresholds | jest.config.js | 30% statements, 20% branches/functions |

### Fase 3: Performance (4/4 items)
| Mejora | Archivo | Descripción |
|--------|---------|-------------|
| N+1 fix groups.js | groups.js | Batch queries con ANY() en calculateUserBestScore |
| Índices BD | migrations.sql | 5 índices compuestos para leaderboard queries |
| React.memo | Predictions.jsx | GroupCard memoizado para evitar re-renders |
| Promise.all | predictions.js | 4 endpoints con INSERTs paralelos |

### Fase 4: Calidad de Código (3/4 items)
| Mejora | Archivo | Descripción |
|--------|---------|-------------|
| Centralizar POINTS | utils/scoring.js | Sistema de puntos unificado |
| Código muerto | Navbar.jsx | Componente no usado eliminado |
| Extraer MatchBox | components/MatchBox.jsx | Componente unificado con 3 modos: click, scores, readonly |
| ~~Estandarizar responses~~ | - | Pendiente (cambio invasivo) |

### MatchBox Componente Unificado (2025-12-19)
Se creó componente reutilizable `MatchBox.jsx` que unifica la visualización de partidos:
- **Modo click**: Seleccionar ganador con click (Repechajes, Knockout posiciones)
- **Modo scores**: Inputs de marcador + ganador derivado (Knockout marcadores)
- **Modo readonly**: Solo visualización con checkmark (Ver Predicción)

**Archivos actualizados:**
- `src/components/MatchBox.jsx` - Componente nuevo centralizado
- `src/pages/Playoffs.jsx` - Usa MatchBox importado
- `src/pages/Knockout.jsx` - MobileMatchBox y DesktopBracketMatch usan MatchBox
- `src/pages/PredictionDetail.jsx` - ReadonlyMatchBox wrapper usa MatchBox

### Esquema BD sincronizado
Se agregaron a `migrations.sql` las tablas y columnas faltantes para que CI funcione:
- Tabla `settings` para deadline checking
- Tablas `real_*` para resultados admin
- Columna `password` (era password_hash)
- Columna `role` en users

---

## AUDITORÍA DE SEGURIDAD COMPLETADA - 2025-12-17

Se realizó una auditoría completa del proyecto cubriendo seguridad, calidad de código y arquitectura. Ver `AUDIT_REPORT.md` para el reporte completo.

### Fixes de Seguridad Implementados (Semana 1)

| Fix | Archivo | Descripción |
|-----|---------|-------------|
| Helmet.js | server.js | Security headers (XSS, clickjacking, etc.) |
| Body limit | server.js | Límite 10kb para prevenir DoS |
| CORS mejorado | server.js | Rechaza requests sin origin en producción |
| Error handler seguro | server.js | No expone stack traces en producción |
| Rate limiting login | auth.js | 5 intentos / 15 min |
| Rate limiting register | auth.js | 3 registros / hora |
| Rate limiting Google | auth.js | 10 intentos / 15 min |
| Rate limiting username check | users.js | 10 checks / min |
| JWT expiración | auth.js | Mantenido en 7 días (apropiado para app de predicciones) |
| Password requirements | auth.js | Mín 8 chars + mayús + minús + número |
| Admin role verificado en BD | middleware/auth.js | Verifica role actual en cada request admin |
| Validators | utils/validators.js | Funciones para validar matchKey, groupLetter, teamId |

### Packages de Seguridad Instalados
- `helmet@8.1.0` - Security headers
- `express-rate-limit@7.6.0` - Rate limiting

### Archivos Modificados
```
natalia-backend/
├── server.js               # Helmet, CORS, error handler
├── middleware/auth.js      # Admin role verification en BD
├── routes/auth.js          # Rate limiting + password validation
├── routes/users.js         # Rate limiting en check-username
└── utils/validators.js     # Nuevo - funciones de validación
```

### Mejoras Semana 2 Implementadas

| Mejora | Archivo | Descripción |
|--------|---------|-------------|
| ErrorBoundary | components/ErrorBoundary.jsx | Atrapa errores de React, muestra UI amigable |
| Connection Pool | config/db.js | Max 20 conexiones, timeouts configurados |
| N+1 Queries Fix | routes/leaderboard.js | De 2N+2 queries a solo 5 queries |
| Caching | routes/leaderboard.js | Cache de 5 minutos para leaderboard |

### Mejoras Semana 3 Implementadas (2025-12-18)

| Mejora | Archivo(s) | Descripción |
|--------|------------|-------------|
| predictionHelpers.js | utils/predictionHelpers.js | Funciones centralizadas: PLAYOFF_TO_TEAM_ID, getPlayoffWinner, getTeamById |
| Eliminación código duplicado | 7 archivos actualizados | Removido playoffToTeamId duplicado de Predictions, ThirdPlaces, Knockout, PredictionsScores, Admin, PredictionDetail |
| Code splitting | App.jsx | React.lazy para 11 páginas, bundle principal de 574kb a 366kb (-36%) |
| Console.logs revisados | Frontend/Backend | Solo console.error en catch blocks (apropiado) |

### Mejoras Semana 4 Implementadas (2025-12-18)

| Mejora | Archivo(s) | Descripción |
|--------|------------|-------------|
| CI/CD | .github/workflows/ci.yml | GitHub Actions para tests automáticos en push/PR |
| Jest Backend | __tests__/auth.test.js | 9 tests para auth (register, login, health) |
| Vitest Frontend | src/__tests__/*.test.js | 21 tests para predictionHelpers |
| PropTypes | ErrorBoundary, GroupScoreInput, TiebreakerModal | Validación de props en componentes críticos |
| ESLint Config | eslint.config.js | Configurado para Vitest globals y reglas ajustadas |
| TiebreakerModal Fix | TiebreakerModal.jsx | Refactorizado useEffect a useMemo pattern |

### Packages de Testing Instalados
- **Backend:** jest@30.2.0, supertest@7.1.4
- **Frontend:** vitest@4.0.16, @testing-library/react@16.3.1, happy-dom@20.0.11, prop-types@15.x

### Comandos de Test
```bash
# Backend (requiere PostgreSQL local)
cd natalia-backend && npm test          # Corre todos los tests
cd natalia-backend && npm run test:watch  # Watch mode

# Frontend
cd natalia-frontend && npm test         # Corre todos los tests
cd natalia-frontend && npm run test:watch  # Watch mode
```

### Cobertura Actual
- **Backend auth.js:** 64% líneas cubiertas
- **Frontend predictionHelpers:** 100% funciones probadas

### CI/CD Pipeline
- **Backend:** Verifica instalación + linting (tests requieren DB, se corren localmente)
- **Frontend:** Tests + Lint + Build + Upload artifacts
- **Deploy Status:** Notificación cuando todo pasa

### Plan Completado
Se completaron las 4 semanas del plan de mejoras de AUDIT_REPORT.md:
- Semana 1: Seguridad (Helmet, rate limiting, validaciones)
- Semana 2: Estabilidad (ErrorBoundary, connection pool, caching)
- Semana 3: Calidad de código (refactoring, code splitting)
- Semana 4: Testing y CI/CD (Jest, Vitest, GitHub Actions, PropTypes)

---

## PRIMERA ETAPA COMPLETADA - MVP Predicciones

La primera etapa del proyecto Mundalia esta 100% funcional en produccion.

### Funcionalidades Completadas

| Feature | Estado | Descripcion |
|---------|--------|-------------|
| Registro/Login | OK | JWT + bcrypt, persistencia en PostgreSQL |
| Prediccion Repechajes | OK | 6 playoffs (4 UEFA + 2 FIFA) |
| Prediccion Grupos | OK | 12 grupos, drag & drop + botones tactiles |
| Prediccion Terceros | OK | 495 combinaciones FIFA validas |
| Prediccion Eliminatorias | OK | Bracket completo R32 a Final |
| Multiples Predicciones | OK | Crear, ver, editar, eliminar |
| Pagina Cuenta | OK | Editar nombre, ver info |
| Branding | OK | "Mundalia" + tema azul mundial |
| Deploy | OK | Vercel (frontend) + Railway (backend + DB) |

### URLs de Produccion
- **Frontend:** https://mundalia.vercel.app
- **Backend:** https://mundalia-production.up.railway.app
- **Repositorio:** https://github.com/toc182/mundalia

---

## SEGUNDA ETAPA - Modo Marcadores Exactos (IMPLEMENTADO)

### Fase 4: Modo Marcadores Exactos - COMPLETADO
Modo alternativo de prediccion donde el usuario ingresa marcadores exactos para cada partido de grupo (72 partidos total), y el sistema calcula automaticamente las posiciones usando los criterios oficiales FIFA de desempate.

**Criterios FIFA implementados (en orden):**
1. Puntos en enfrentamientos directos entre equipos empatados
2. Diferencia de goles en enfrentamientos directos
3. Goles a favor en enfrentamientos directos
4. Si persiste empate: reaplicar a-c solo entre equipos aun empatados (recursivo)
5. Si aun hay empate: diferencia de goles general
6. Goles a favor general
7. Si persiste empate → Usuario decide orden manualmente via modal

### Archivos Creados

**Frontend:**
- `src/pages/PredictionsScores.jsx` - Pagina principal modo marcadores
- `src/components/GroupScoreInput.jsx` - Card de grupo con 6 inputs + tabla
- `src/components/MatchScoreRow.jsx` - Input individual de partido
- `src/components/GroupStandingsTable.jsx` - Tabla de posiciones calculada
- `src/components/TiebreakerModal.jsx` - Modal drag & drop para desempates manuales
- `src/utils/fifaTiebreaker.js` - Algoritmo FIFA completo con recursion
- `src/data/groupMatches.js` - Estructura 6 partidos por grupo (Round Robin)

**Backend:**
- Nuevos endpoints en `predictions.js`:
  - GET/POST `/predictions/scores` - Marcadores exactos
  - GET/POST `/predictions/tiebreaker` - Decisiones de desempate

**Base de Datos:**
- `score_predictions` - Almacena marcadores exactos por partido
- `tiebreaker_decisions` - Almacena decisiones de desempate del usuario
- Campo `mode` en `prediction_sets` ('positions' | 'scores')

### Flujo del Usuario

1. En MyPredictions → "Nueva Prediccion" muestra selector de modo
2. Usuario elige "Marcadores Exactos"
3. Repechajes → igual que antes
4. Grupos-Marcadores → nueva pagina con inputs de score
5. Sistema calcula posiciones en tiempo real
6. Si hay empate irresolvable → modal de desempate
7. Terceros se calculan automaticamente
8. Knockout → igual que antes

### COMPLETADO: Mejoras UX Modo Marcadores - 2025-12-15

#### Fase de Grupos (PredictionsScores.jsx)

**Problema resuelto:** Al navegar atras/adelante, el bracket de eliminatorias se reseteaba siempre, aunque no hubiera cambios.

**Solucion implementada:**

1. **Botones en pagina de grupos:**
   - Icono de reset (RotateCcw) en cada grupo - Limpia los marcadores de ese grupo
   - "Guardar" - Guarda progreso parcial (no requiere completar todo)
   - "Siguiente" - Siempre habilitado, valida antes de continuar

2. **Validacion al hacer click en "Siguiente":**
   - Si faltan resultados: mostrar error + resaltar grupos incompletos (borde rojo)
   - Si todo completo: guardar y continuar

3. **Deteccion de cambios:**
   - Al cargar, se guarda snapshot de posiciones guardadas
   - Al hacer click en Siguiente, se compara con snapshot actual
   - Solo detecta cambios si las posiciones realmente cambiaron

4. **Reset condicional del bracket:**
   - Solo se muestra modal si hay cambios reales Y existe bracket previo guardado
   - Modal: "Has realizado cambios en la fase de grupos. Si decides continuar, se reseteara el bracket de eliminatorias."
   - Usuario confirma con "Continuar y Resetear" o cancela

#### Eliminatorias (Knockout.jsx)

**Nuevo:** Boton "Guardar" para guardar progreso parcial del bracket
- Desktop: Boton con texto "Guardar" + icono
- Mobile: Solo icono de diskette
- Permite guardar sin completar todo el bracket
- Necesario para que la deteccion de cambios en grupos funcione

**Navegacion mejorada:**
- "Siguiente" siempre habilitado, avanza a siguiente ronda
- En ronda final: "Finalizar" (solo habilitado cuando bracket completo)
- "Atras" va a ronda anterior de knockout (no a grupos)
- Solo R32 tiene "Atras" que va a grupos/terceros

#### Repechajes (Playoffs.jsx)

**Rediseño visual completo:** Mismo estilo que Knockout
- Match boxes con dos equipos apilados verticalmente
- Click para seleccionar ganador (resaltado verde)
- Perdedor con estilo atenuado (gris)
- Lineas SVG conectoras calculadas dinamicamente (pegan exacto a los cuadros)
- Labels en fila separada arriba del bracket
- Constantes calculadas igual que Knockout: `MATCH_H=64`, `GAP=4`, `SVG_W=20`

**UEFA Playoffs (4 paths):**
- Dos semifinales apiladas → convergen en Final
- Estructura: Semi1 + Semi2 → SVG → Final

**FIFA Playoffs (2 brackets):**
- Cuadro superior: Cabeza de serie (RD Congo / Irak) con "-" abajo (no juegan Ronda 1)
- Cuadro inferior: Partido de Ronda 1 (seleccionable)
- Ambos convergen en Final
- Mismo layout visual que UEFA

**Datos actualizados:** Emparejamientos oficiales del sorteo FIFA/UEFA (Dic 2025)
- Fuente: https://www.foxsports.com/stories/soccer/2026-world-cup-playoffs-schedule-bracket-teams
- UEFA Path A: Italia vs Irlanda del Norte, Gales vs Bosnia
- UEFA Path B: Ucrania vs Suecia, Polonia vs Albania
- UEFA Path C: Turquia vs Rumania, Eslovaquia vs Kosovo
- UEFA Path D: Dinamarca vs Macedonia del Norte, Rep. Checa vs Irlanda
- FIFA 1: Nueva Caledonia vs Jamaica → RD Congo espera
- FIFA 2: Bolivia vs Surinam → Irak espera

#### Bug Fixes

1. **Input de marcadores permitia decimales:**
   - Cambiado `type="number"` a `type="text"` con `inputMode="numeric"`
   - Agregado filtro `value.replace(/[^0-9]/g, '')` para solo permitir digitos

2. **Tabla mostraba "011" en vez de "11" (concatenacion de strings):**
   - Problema: cuando `score.a` era string vacio `""`, JavaScript concatenaba
   - Solucion: Agregado check `score.a === ''` para saltar partidos incompletos
   - Agregado `Number(score.a) || 0` para conversion explicita a numero
   - Arreglado en `calculateTeamStats()` y `calculateHeadToHead()`

#### Nuevo Endpoint Backend

- `GET /predictions/groups` - Obtener predicciones de grupos guardadas
- Necesario para cargar snapshot de posiciones al entrar a la pagina

### COMPLETADO: Knockout Scores para Modo Marcadores - 2025-12-15

Inputs de marcadores en eliminatorias **solo** para modo "Marcadores Exactos".

**Logica implementada:**
- Si los scores son diferentes: el ganador se determina automaticamente
- Si hay empate: el usuario hace click para seleccionar quien avanza (penales)
- El modo "Posiciones" sigue funcionando igual (solo click para elegir ganador)

**Base de Datos:**
```sql
ALTER TABLE knockout_predictions
ADD COLUMN IF NOT EXISTS score_a INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_b INTEGER DEFAULT NULL;
```

**Backend (predictions.js):**
- GET `/knockout`: Si mode='scores', retorna `{ 'M73': { winner, scoreA, scoreB }, ... }`
- POST `/knockout`: Acepta ambos formatos segun el mode

**Frontend (Knockout.jsx):**
- Nuevo estado: `knockoutScores` - `{ matchId: { a: score, b: score } }`
- Funcion `handleScoreChange` - Auto-deriva ganador si no hay empate, limpia dependientes si cambia
- `selectWinner` modificado - Solo permite click cuando hay empate en modo scores
- **Mobile (MobileMatchBox):** Inputs de score a la derecha de cada equipo, indicador de empate
- **Desktop (FullBracket > BracketMatch):** Misma logica, dimensiones ajustadas (MATCH_WIDTH 180px en scores mode)

**UX:**
- Input type="text" con inputMode="numeric" (evita decimales)
- Indicador amarillo: "Empate - click para elegir ganador" cuando hay tie
- Ganador auto-seleccionado se resalta en verde
- Cascada: cambiar score limpia partidos dependientes

### COMPLETADO: Leaderboard Global - 2025-12-17

**Ranking funcional** con predicciones reales de usuarios.

**Características:**
- Dos tabs: "Escoger Ganadores" y "Marcadores Exactos" (separados por modo)
- Solo muestra predicciones COMPLETAS (con final M104 predicha)
- Cada prediction_set es una entrada individual (no agrupado por usuario)
- Muestra: posición, bandera del país (imagen), username, nombre de predicción, puntos
- Card inferior muestra tus predicciones en el ranking actual

**Backend (`routes/leaderboard.js`):**
- `GET /leaderboard?mode=positions|scores` - Lista predicciones completas por modo
- `GET /leaderboard/counts` - Contadores por modo

**Frontend (`pages/Leaderboard.jsx`):**
- Tabs con contadores
- Banderas usando flagcdn.com (Windows no soporta emoji flags)
- Estado vacío con mensaje apropiado

### COMPLETADO: Google OAuth Login - 2025-12-17

**Login con Google** implementado.

**Backend:**
- Agregada columna `google_id` a users
- Password ahora nullable (para usuarios que solo usan Google)
- Endpoint `POST /auth/google` que verifica token con Google y crea/vincula usuario

**Frontend:**
- `@react-oauth/google` instalado
- `GoogleOAuthProvider` en main.jsx
- Botón de Google en Login.jsx y Register.jsx
- `loginWithGoogle` en AuthContext

**Variables de entorno:**
- Backend: `GOOGLE_CLIENT_ID` en .env
- Frontend: `VITE_GOOGLE_CLIENT_ID` en .env

### COMPLETADO: Perfil de Usuario Mejorado - 2025-12-17

**Nuevos campos en Account:**
- **Username único** (3-20 caracteres, letras/números/_)
  - Validación en tiempo real de disponibilidad
  - Indicador visual (✓ verde disponible, ✗ rojo tomado)
  - Se muestra en leaderboard
- **País** (dropdown con ~195 países, ordenados alfabéticamente en español)
  - Bandera se muestra en leaderboard
- **Fecha de nacimiento** (date picker que abre al click)

**Backend:**
- Columna `username` con índice único
- Columnas `country` y `birth_date`
- Endpoint `GET /users/check-username/:username`
- Migraciones automáticas en server.js

### COMPLETADO: Renombrado de Modos - 2025-12-17

- "Posiciones" → "Escoger Ganadores"
- Descripción actualizada: "Arrastra equipos para ordenar su posición final de grupo. Escoge ganadores de la fase de eliminación directa."
- Actualizado en: Home.jsx, MyPredictions.jsx, Leaderboard.jsx

### COMPLETADO: Grupos Privados - 2025-12-17

**Funcionalidad completa** de grupos privados para competir con amigos y familia.

**Características:**
- Crear grupo con nombre personalizado
- Código de 6 caracteres para invitar amigos
- Unirse a grupo con código
- Ver ranking interno del grupo (lista de miembros)
- Copiar código con feedback visual

**Backend (`routes/groups.js`):**
- `GET /groups` - Obtener grupos del usuario
- `POST /groups` - Crear nuevo grupo
- `POST /groups/join` - Unirse con código
- `GET /groups/:id/leaderboard` - Ranking del grupo

**Frontend (`pages/Groups.jsx`):**
- Cards para cada grupo con nombre, creador, miembros
- Botón de copiar código con icono Check verde
- Modal para ver ranking del grupo
- Diálogos para crear y unirse a grupos

**Base de datos:**
- `private_groups` - id, name, code, owner_id, created_at
- `private_group_members` - group_id, user_id, joined_at

**Habilitado en UI:**
- Home.jsx - Card "Mis Grupos" activo con link
- TopBar.jsx - Menu "Grupos" activo sin badge "Pronto"

### COMPLETADO: Script de Seed para Desarrollo - 2025-12-17

**Script:** `natalia-backend/seed-dev.js`

Pobla la base de datos de desarrollo con datos de prueba:
- 40 usuarios con nombres hispanos, usernames, países y fechas de nacimiento
- ~76 prediction sets (70% completos)
- 5 grupos privados con miembros aleatorios
- Password para todos: `test123`
- Emails: `nombre.apellido#@test.com`

**Ejecutar:** `node seed-dev.js`

### COMPLETADO: Mejoras UI Leaderboard - 2025-12-17

**Tabla más compacta:**
- Filas con menos padding (py-1.5 px-2)
- Badges de posición más pequeños (24x24)
- Nombre y predicción en una línea
- Predicción oculta en móvil
- Colores diferenciados: oro (1°), plata (2°), bronce (3°), slate claro (4+)

**Sección "Tus posiciones":**
- Cambiado a chips horizontales
- Diseño más compacto

### COMPLETADO: Panel Admin - 2025-12-17

**Panel completo** para cargar resultados reales del mundial.

**Secciones:**

1. **Dashboard** - Estadísticas generales (usuarios, predicciones, progreso)

2. **Repechajes** - Seleccionar ganador de cada playoff
   - Click para marcar ganador
   - Muestra equipos clasificados

3. **Grupos** - Entrada de marcadores de fase de grupos
   - Todos los grupos expandidos (sin collapse)
   - Inputs de marcadores por partido
   - Tabla de posiciones calculada automáticamente con reglas FIFA
   - Modal de desempate para empates irresolubles
   - Botón "Guardar Todo" (arriba y abajo)
   - Progreso: X/72 partidos

4. **Eliminatorias** - Bracket visual completo
   - Muestra equipos basados en resultados de grupos
   - Inputs de marcadores por partido
   - Ganador automático según marcador
   - Click para elegir ganador en empates (penales)
   - Bracket con líneas conectoras SVG
   - Campeón destacado con trofeo
   - Progreso: X/32 partidos

**Bug fix:** Corregido `score_a || null` → `score_a ?? null` en backend para que marcador 0 no se guarde como null.

### Pendiente (Prioridad Baja)
| Feature | Descripcion |
|---------|-------------|
| Puntos en grupos privados | Mostrar desglose de puntos en ranking de grupos |

---

## Resumen Tecnico

### Fases Completadas
- [x] Fase 1: Infraestructura API
- [x] Fase 2: Autenticacion (incluye Google OAuth)
- [x] Fase 3: Predicciones completas
- [x] Fase 3.5-3.18: Mejoras UX y fixes
- [x] Fase 3.19: Branding Mundalia + tema azul
- [x] Fase 4: Leaderboard funcional
- [x] Fase 6: Deploy produccion

### Fases Pendientes
- [x] Fase 5: Grupos privados (COMPLETADO 2025-12-17)
- [x] Fase 7: Panel admin (COMPLETADO 2025-12-17)
- [x] Fase 8: Cálculo de puntos (YA IMPLEMENTADO - se activa automáticamente con resultados reales)

---

## Arquitectura Actual

### Frontend (natalia-frontend/)
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── TopBar.jsx       # Logo Mundalia + menus
├── context/
│   └── AuthContext.jsx  # JWT auth + user state
├── data/
│   ├── mockData.js      # 48 equipos
│   ├── playoffsData.js  # 6 playoffs
│   ├── knockoutBracket.js # Estructura eliminatorias
│   └── thirdPlaceCombinations.js # 495 combinaciones
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx / Register.jsx
│   ├── Playoffs.jsx     # Paso 1: Repechajes
│   ├── Predictions.jsx  # Paso 2: Grupos
│   ├── ThirdPlaces.jsx  # Paso 3: Terceros
│   ├── Knockout.jsx     # Paso 4: Eliminatorias
│   ├── MyPredictions.jsx
│   ├── PredictionDetail.jsx
│   └── Account.jsx
├── services/
│   └── api.js           # Axios config + endpoints
└── App.jsx              # Routes
```

### Backend (natalia-backend/) - 100% TypeScript
```
├── config/
│   └── db.ts            # PostgreSQL pool (dev/prod conditional)
├── middleware/
│   └── auth.ts          # JWT verification + admin role check
├── routes/
│   ├── admin.ts         # Panel admin (resultados reales)
│   ├── auth.ts          # login, register, Google OAuth
│   ├── groups.ts        # Grupos privados
│   ├── leaderboard.ts   # Rankings globales
│   ├── matches.ts       # Info de partidos
│   ├── predictions.ts   # groups, playoffs, thirds, knockout, scores
│   ├── predictionSets.ts # CRUD prediction sets
│   ├── teams.ts         # Info de equipos
│   └── users.ts         # me, update profile, check-username
├── types/
│   └── index.ts         # Tipos compartidos
├── utils/
│   ├── response.ts      # Funciones de respuesta estandarizadas
│   ├── scoring.ts       # Sistema de puntos centralizado
│   └── validators.ts    # Validadores de entrada
├── __tests__/
│   ├── admin.test.ts    # 21 tests
│   ├── auth.test.ts     # 9 tests
│   ├── groups.test.ts   # 16 tests
│   ├── leaderboard.test.ts # 11 tests
│   ├── predictions.test.ts # 57 tests
│   ├── predictionSets.test.ts # 13 tests
│   ├── scoring.test.ts  # 32 tests
│   ├── users.test.ts    # 15 tests
│   └── setup.ts         # Jest setup
├── server.ts            # Express + CORS + migrations
├── tsconfig.json        # Config estricta
└── tsconfig.test.json   # Config relajada para tests
```

### Base de Datos (PostgreSQL)
| Tabla | Descripcion |
|-------|-------------|
| users | Usuarios registrados |
| teams | 48 equipos del Mundial |
| prediction_sets | Sets de predicciones con nombre |
| playoff_predictions | Predicciones repechajes |
| group_predictions | Predicciones grupos |
| third_place_predictions | Predicciones terceros |
| knockout_predictions | Predicciones eliminatorias |

---

## Configuracion de Desarrollo

### Puertos
- Frontend: 5174
- Backend: 5001

### Base de Datos Local
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natalia_dev
DB_USER=postgres
DB_PASSWORD=<tu-password-local>
```

### Comandos
```bash
# Frontend
cd natalia-frontend && npm run dev

# Backend
cd natalia-backend && npm run dev
```

---

## Commits Recientes (2025-12-16)

| Commit | Descripcion |
|--------|-------------|
| `1fd2e5b` | Fix knockout score input focus loss - extract components |
| `1019553` | Fix score input focus loss - use onBlur instead of onChange |
| `30b0410` | Add 'Inicio' option to hamburger menu |
| `cb5eea3` | Add Mundalia branding + blue color theme |

---

## Notas Importantes

### PostgreSQL COUNT() devuelve string
- `COUNT(*)` devuelve bigint que se convierte a string en JS
- Usar `parseInt()` antes de comparar: `parseInt(count) >= 6`

### Knockout Bracket Structure
- R32 no es secuencial → ver `knockoutBracket.js` para mapeo correcto
- M73+M75 → M90, M74+M77 → M89, etc.

### CSS Scroll-Snap (Mobile Knockout)
- Hooks deben estar ANTES de cualquier early return
- `scrollContainerRef` + `handleScroll` + `scrollToRound`

### JavaScript String Concatenation Bug
- `0 + ""` = `"0"` (string), no `0` (number)
- `"0" + 1` = `"01"` (string concatenation)
- Siempre usar `Number(value) || 0` al sumar valores que pueden ser strings
- Verificar `value === ''` antes de procesar

---

## PENDIENTE: Problemas UX

### BUG RESUELTO: Modo Marcadores Exactos no funciona en Produccion
**Problema:** Al crear nueva prediccion y elegir "Marcadores Exactos", no lleva a la pagina correcta.

**Causa:** La columna `mode` no existia en la tabla `prediction_sets` de produccion. Git solo sube codigo, no cambios de BD.

**Solucion:** Ejecutar en Railway:
```sql
ALTER TABLE prediction_sets ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'positions';
```

**Prevencion futura:** Creado archivo `natalia-backend/migrations.sql` para trackear todos los cambios de BD. Ver CLAUDE.md para instrucciones.

---

## MIGRACIONES - SISTEMA AUTOMATICO

**Ya no hay que ejecutar SQL manualmente.** El backend ejecuta todas las migraciones automaticamente al iniciar.

Ver `natalia-backend/server.js` → funcion `runMigrations()`

Para agregar nuevas migraciones en el futuro:
1. Agregar el SQL a `migrations.sql` (documentacion)
2. Agregar el query a `runMigrations()` en `server.js`
3. Push a git → Railway redespliega → migraciones se ejecutan solas

---

### RESUELTO: Inconsistencia al Regresar a Fases Anteriores (2025-12-17)

**Problema original:** En el modo "Posiciones", si el usuario regresaba a una fase anterior y hacia cambios, los picks de eliminatorias quedaban inconsistentes.

**Solucion implementada:** Sistema de deteccion de cambios con reset en cascada.

**Backend - Nuevos endpoints:**
- `GET /predictions/has-subsequent-data?setId=X&phase=Y` - Verifica si hay datos en fases siguientes
- `DELETE /predictions/reset-from-playoffs?setId=X` - Borra grupos + terceros + knockout
- `DELETE /predictions/reset-from-groups?setId=X` - Borra terceros + knockout
- `DELETE /predictions/reset-from-thirds?setId=X` - Borra solo knockout

**Frontend - Cambios en cada pagina:**
- `Playoffs.jsx`: Guarda snapshot de selecciones al cargar, compara al guardar
- `Predictions.jsx`: Guarda snapshot del orden de grupos al cargar, compara al guardar
- `ThirdPlaces.jsx`: Guarda snapshot de terceros seleccionados al cargar, compara al guardar

**Flujo de usuario:**
1. Usuario hace cambios en una fase anterior
2. Al hacer click en "Siguiente", se compara con snapshot original
3. Si hay cambios reales Y existen datos en fases siguientes → Modal de advertencia
4. Modal lista las fases que seran borradas
5. Usuario puede "Cancelar" o "Continuar y borrar"
6. Si confirma, se borran las fases afectadas y se guardan los cambios

**Deteccion inteligente:**
- Solo compara lo que afecta downstream (ej: en playoffs solo compara el `final`)
- Si usuario cambia algo y luego lo vuelve a dejar igual, no detecta cambios

---

### RESUELTO: Input Focus Loss en Knockout (2025-12-16)

**Problema original:** Al escribir un digito en los inputs de score de eliminatorias, el input perdia el foco inmediatamente, impidiendo escribir numeros de dos digitos (ej: "11").

**Causa raiz:** Los componentes `MobileMatchBox` y `BracketMatch` estaban definidos dentro del render:
- `MobileMatchBox` dentro de un IIFE `{(() => { ... })()}`
- `BracketMatch` dentro de `FullBracket`

Cada cambio de estado recreaba estos componentes como nuevas funciones, causando que React los tratara como componentes diferentes y desmontara/remontara los inputs.

**Solucion implementada:** Refactorizacion completa de Knockout.jsx
- Extraidos componentes a nivel de modulo (fuera del render):
  - `MobileMatchBox` - Caja de partido movil
  - `MobileMatchPair` - Par de partidos con conector SVG
  - `MobileKnockoutSlides` - Contenedor de slides scroll-snap
  - `DesktopBracketMatch` - Partido del bracket desktop
- Uso de `defaultValue` + `onBlur` en vez de `value` + `onChange`
- Key estable con valor del score incluido

**Commit:** `1fd2e5b` - Fix knockout score input focus loss - extract components

**Estado:** Desplegado en produccion

---

## RESUMEN: Tareas Pendientes

### Prioridad Alta (UX)

| Feature | Descripcion |
|---------|-------------|
| Timer cuenta regresiva | Timer en Home mostrando tiempo restante para inicio del Mundial |
| Cierre de predicciones | Admin puede bloquear entradas. Deadline automático: 1 hora antes del Mundial |

### Prioridad Media (Features)

| Feature | Descripcion |
|---------|-------------|
| Soporte multi-idioma | Cambiar idioma de la página: Español, Inglés, Portugués, Francés, Alemán, Chino |

### Prioridad Baja (Nice to have)

| Feature | Descripcion |
|---------|-------------|
| Puntos en grupos privados | Mostrar desglose de puntos en ranking de grupos |

---

## Tareas Completadas Recientemente

| Fecha | Tarea | Descripcion |
|-------|-------|-------------|
| 2025-12-24 | Leaderboard paginado | Máx 100 por página, controles arriba/abajo, auto-navega a página del usuario |
| 2025-12-24 | Google OAuth server-side | Migrado a flujo redirect, elimina errores de consola GSI_LOGGER |
| 2025-12-24 | Fix Knockout desktop | Botón "Finalizar" siempre visible en pantallas grandes |
| 2025-12-19 | Migración TypeScript | Backend 100% TypeScript, 16 archivos .js eliminados, ts-jest configurado |
| 2025-12-19 | Tests ampliados | 174 tests (scoring, admin, predictions edge cases), 76.6% cobertura |
| 2025-12-18 | CI/CD Pipeline Fix | ESLint config ajustado, TiebreakerModal refactorizado, backend tests skip en CI |
| 2025-12-18 | Semana 3-4 AUDIT | Code centralization, code splitting (-36% bundle), testing, CI/CD |
| 2025-12-17 | Panel Admin completo | Dashboard, grupos con FIFA tiebreaker, knockout bracket visual |
| 2025-12-17 | UI Leaderboard compacta | Tabla más densa, colores diferenciados, chips horizontales |
| 2025-12-17 | Script seed-dev.js | 40 usuarios, 76 predicciones, 5 grupos de prueba |
| 2025-12-17 | Grupos privados | Crear grupos, compartir código, ranking interno |
| 2025-12-17 | Leaderboard funcional | Rankings separados por modo, predicciones completas, banderas, usernames |
| 2025-12-17 | Google OAuth | Login con Google implementado |
| 2025-12-17 | Perfil mejorado | Username único, país con bandera, fecha de nacimiento |
| 2025-12-17 | Renombrado modos | "Posiciones" → "Escoger Ganadores" |
| 2025-12-17 | Tab navigation mejorada | tabIndex calculado en inputs de marcadores |
| 2025-12-17 | Reset en cascada | Al cambiar fases anteriores, resetea fases afectadas |
| 2025-12-16 | Fix input focus loss | Refactorizacion de Knockout.jsx |
