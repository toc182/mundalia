# AUDIT.md - Auditoria Integral de Mundalia

**Fecha:** 2025-12-20
**Version:** 1.0
**Autor:** Claude Code (Auditoría automatizada)

---

## Resumen Ejecutivo

El proyecto **Mundalia** es una quiniela del Mundial 2026 con stack moderno (React 19, Express 5, TypeScript, PostgreSQL). La seguridad es **excelente**, la funcionalidad core está completa, pero hay **problemas arquitectónicos** que afectarán escalabilidad y mantenibilidad.

| Area | Calificacion | Notas |
|------|--------------|-------|
| **Seguridad** | A (Excelente) | JWT, bcrypt, rate limiting, parameterized queries |
| **Backend** | B (Bueno) | TypeScript, tests, pero N+1 queries y transacciones incompletas |
| **Frontend** | C (Regular) | Funcional pero monolitico, falta memoization |
| **Datos FIFA** | B+ (Bueno) | Sorteo actualizado, pero puntos knockout inconsistentes |
| **UX/Accesibilidad** | C (Regular) | Falta aria-labels, focus management |

---

## Problemas Criticos

### 0. Frontend en JavaScript (no TypeScript)

**Estado actual:**
- Backend: 100% TypeScript (estricto, tipos definidos)
- Frontend: 100% JavaScript (solo PropTypes parciales)

**Por que es un problema:**

1. **Inconsistencia:** Dos paradigmas diferentes en el mismo proyecto
2. **Sin type safety:** Errores de tipos solo se detectan en runtime
3. **Props sin validar:** Solo 3 componentes tienen PropTypes
4. **Refactoring peligroso:** Cambiar estructuras puede romper silenciosamente
5. **Componentes complejos:** Knockout.jsx (1589 lineas) maneja objetos sin tipos:
   ```javascript
   // Actualmente - sin tipos
   const match = { teamA: {...}, teamB: {...}, winner: null }
   selectWinner(matchId, teamId)  // teamId: number? string?

   // Con TypeScript
   interface KnockoutMatch {
     teamA: Team | null;
     teamB: Team | null;
     winner: number | null;
     scoreA?: number;
     scoreB?: number;
   }
   const selectWinner = (matchId: string, teamId: number) => {...}
   ```

6. **Logica FIFA compleja:** fifaTiebreaker.js, thirdPlaceCombinations.js tienen estructuras que se beneficiarian de tipos

**Archivos a migrar (14 paginas + 25 componentes):**
```
src/
├── pages/           # 14 archivos .jsx -> .tsx
├── components/      # ~15 archivos .jsx -> .tsx
├── context/         # 1 archivo
├── services/        # 1 archivo
├── utils/           # 3 archivos
└── data/            # 5 archivos (tipos para datos)
```

**Esfuerzo estimado:** 2-3 dias

**Prioridad:** Media (no bloquea produccion, pero mejora mantenibilidad)

**Beneficios post-migracion:**
- Autocompletado en IDE
- Errores detectados en build time
- Documentacion implicita
- Refactoring seguro
- Consistencia con backend

---

### 1. ~~Inconsistencia en Sistema de Puntos~~ ✅ RESUELTO

**Estado:** Verificado 2025-12-24 - Los puntos en Home.tsx coinciden con scoring.ts.

| Predicción | Frontend | Backend | ¿Coincide? |
|------------|----------|---------|------------|
| Posición exacta grupo | 3 pts | 3 | ✓ |
| Equipo clasifica | 1 pt | 1 | ✓ |
| Dieciseisavos | 1 pt | 1 | ✓ |
| Octavos | 2 pts | 2 | ✓ |
| Cuartos | 4 pts | 4 | ✓ |
| Semifinal | 6 pts | 6 | ✓ |
| 3er Puesto | 8 pts | 8 | ✓ |
| Campeón | 15 pts | 15 | ✓ |

---

### 2. Componentes Monoliticos en Frontend

**Archivos afectados:**
- `natalia-frontend/src/pages/Knockout.jsx` - **1,589 lineas**
- `natalia-frontend/src/pages/Predictions.jsx` - **523 lineas**
- `natalia-frontend/src/pages/Admin.jsx` - **800+ lineas**
- `natalia-frontend/src/pages/PredictionsScores.jsx` - **600+ lineas**

**Problema:** Componentes gigantes con multiples responsabilidades:
- Estado (12+ useState en Knockout.jsx)
- Fetch de datos
- Logica de negocio (buildR32Matches, buildR16Matches, etc.)
- Rendering desktop Y mobile
- Sub-componentes definidos inline

**Impacto:**
- Imposible de testear unitariamente
- Re-renders innecesarios (sin useMemo)
- Dificil de debuggear
- Codigo duplicado entre archivos

**Solucion:** Refactorizar en componentes mas pequenos:
```
Knockout.jsx (1589 lineas) ->
  ├── components/knockout/MobileKnockout.jsx
  ├── components/knockout/DesktopBracket.jsx
  ├── components/knockout/MatchBox.jsx (ya existe)
  ├── hooks/useKnockoutData.js
  └── utils/knockoutHelpers.js
```

---

### 3. ~~N+1 Queries en Prediction Sets~~ ✅ RESUELTO

**Estado:** Resuelto 2025-12-29

**Solución implementada:** Índices de base de datos
- `idx_group_predictions_set` en `group_predictions(prediction_set_id)`
- `idx_playoff_predictions_set` en `playoff_predictions(prediction_set_id)`
- `idx_knockout_predictions_set` en `knockout_predictions(prediction_set_id)`
- `idx_third_place_predictions_set` en `third_place_predictions(prediction_set_id)`
- `idx_score_predictions_set` en `score_predictions(prediction_set_id)`
- `idx_tiebreaker_decisions_set` en `tiebreaker_decisions(prediction_set_id)`
- Índices compuestos adicionales para queries de leaderboard

Los subqueries ahora usan index scans en lugar de sequential scans.

---

### 4. ~~Leaderboard Truncado~~ ✅ RESUELTO

**Estado:** Resuelto 2025-12-24

**Solución implementada:** Paginación completa
- Backend: Quitado LIMIT 500, implementada paginación con cache
- Endpoint: `GET /leaderboard?mode=positions&page=1&limit=100`
- Respuesta incluye: `entries`, `total`, `page`, `totalPages`, `userPosition`, `userPage`
- Frontend: Controles de paginación arriba y abajo de la tabla
- Auto-navega a la página donde está el usuario logueado
- Nuevo middleware `optionalAuth` para detectar usuario sin requerir login

---

## Problemas Importantes

### 5. ~~Transacciones Incompletas~~ ✅ RESUELTO

**Estado:** Resuelto 2025-12-29

**Solución implementada:** Todas las operaciones DELETE+INSERT ahora usan transacciones con `pool.connect()`, `BEGIN`, `COMMIT`, y `ROLLBACK` en caso de error.

**Endpoints corregidos:**
- POST /playoffs - transacción agregada
- POST /third-places - transacción agregada
- POST /knockout - transacción agregada
- POST /scores - transacción agregada
- DELETE /reset-from-playoffs - transacción agregada
- DELETE /reset-from-groups - transacción agregada

POST /groups ya tenía transacción implementada correctamente.

---

### 6. Admin Role Query en Cada Request

**Archivo:** `natalia-backend/middleware/auth.ts` (lineas 25-55)

**Problema:** El middleware `adminAuth` hace query a BD en cada request:
```typescript
const result = await db.query('SELECT role FROM users WHERE id = $1', [authReq.user.id]);
```

**Impacto:** Latencia adicional en todos los endpoints de admin.

**Solucion:** Cachear role en JWT:
```typescript
// Al crear token, incluir role
const token = jwt.sign({ id: user.id, role: user.role }, secret);

// En adminAuth, verificar desde token
if (authReq.user.role !== 'admin') {
  return res.status(403).json({ error: 'Admin required' });
}
```

---

### 7. Falta useMemo en Calculos Costosos

**Archivo:** `natalia-frontend/src/pages/Knockout.jsx` (lineas 355-360)

**Problema:**
```javascript
// Se recalcula en CADA render
const r32Matches = buildR32Matches();
const r16Matches = buildR16Matches();
const qfMatches = buildQFMatches();
const sfMatches = buildSFMatches();
```

**Impacto:** Lag en mobile, especialmente al escribir scores.

**Solucion:**
```javascript
const r32Matches = useMemo(() => buildR32Matches(), [predictions, playoffSelections, bestThirdPlaces]);
const r16Matches = useMemo(() => buildR16Matches(), [r32Matches, knockoutPredictions]);
// etc.
```

---

### 8. Codigo Duplicado en Paginas

**Archivos afectados:** Predictions.jsx, Knockout.jsx, ThirdPlaces.jsx, Playoffs.jsx

**Patron duplicado - Botones de navegacion:**
```javascript
// Aparece en CADA pagina
const BackButton = ({ size = 'default' }) => (
  <Button variant="outline" onClick={handleBack} size={size}>
    <ChevronLeft className="mr-1 h-4 w-4" />
    Atras
  </Button>
);

const NextButton = ({ size = 'default' }) => (
  <Button onClick={handleContinue} disabled={!isComplete || saving} size={size}>
    {saving ? 'Guardando...' : 'Siguiente'}
    <ChevronRight className="ml-1 h-4 w-4" />
  </Button>
);
```

**Patron duplicado - Carga de datos:**
```javascript
// Aparece en CADA pagina
useEffect(() => {
  const loadData = async () => {
    if (setId) {
      try {
        const response = await predictionsAPI.getX(setId);
        // ...
      } catch (err) {
        setError('Error al cargar');
      } finally {
        setLoading(false);
      }
    }
  };
  loadData();
}, [setId]);
```

**Solucion:** Crear componentes y hooks reutilizables:
```javascript
// components/StepNavigation.jsx
export function StepNavigation({ onBack, onNext, isComplete, saving }) { ... }

// hooks/usePredictionData.js
export function usePredictionData(setId, fetchFn) { ... }
```

---

### 9. Falta de Custom Hooks

**Problema:** Logica repetida sin abstraer.

**Hooks que deberian existir:**
```javascript
// hooks/usePredictionData.js
export function usePredictionData(setId, phase) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Logica comun...
  return { data, setData, loading, error, refetch };
}

// hooks/usePersistentState.js
export function usePersistentState(key, initialValue) {
  // Sincroniza con localStorage automaticamente
}

// hooks/useStepNavigation.js
export function useStepNavigation(steps) {
  // Maneja navegacion entre pasos
}
```

---

### 10. Problemas de Accesibilidad

**Problema 1 - Falta focus management en modales:**
```javascript
// Cuando se abre modal, el foco NO se mueve al input
<Dialog open={showCreateDialog}>
  <Input ... />  // Usuario debe hacer click manualmente
</Dialog>
```

**Problema 2 - Colores como unico indicador:**
```javascript
// Admin.jsx linea 542
<Card className={isComplete ? 'border-green-300' : ''}>
// Daltonicos no pueden distinguir
```

**Problema 3 - Falta aria-labels:**
```javascript
// Knockout.jsx - botones sin descripcion
<button onClick={() => moveUp()}>▲</button>  // Sin aria-label
```

**Problema 4 - Textos pequenos:**
```javascript
// Knockout.jsx linea 1159
<div className="text-[10px] text-muted-foreground">
// 10px es muy pequeno, bajo contraste
```

---

### 11. Sin Graceful Shutdown

**Archivo:** `natalia-backend/server.ts`

**Problema:** No hay handlers para SIGTERM/SIGINT:
```typescript
// Falta:
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await pool.end();  // Cerrar conexiones BD
  process.exit(0);
});
```

**Impacto:** En Railway, las conexiones pueden quedar colgadas al redesplegar.

---

### 12. ~~Indices de BD No Documentados~~ ✅ RESUELTO

**Estado:** Resuelto 2025-12-29

**Solución implementada:** Migraciones 006 y 007 en `migrations.sql`

**Índices agregados:**
- `idx_group_predictions_set` - prediction_set_id lookup
- `idx_playoff_predictions_set` - prediction_set_id lookup
- `idx_knockout_predictions_set` - prediction_set_id lookup
- `idx_third_place_predictions_set` - prediction_set_id lookup
- `idx_score_predictions_set` - prediction_set_id lookup
- `idx_tiebreaker_decisions_set` - prediction_set_id lookup
- `idx_group_predictions_set_group` - compuesto para grupos
- `idx_knockout_predictions_set_match` - compuesto para knockout
- `idx_prediction_sets_user_created` - para listar sets de usuario

---

## Fortalezas del Proyecto

### Seguridad (Excelente)

| Aspecto | Implementacion | Estado |
|---------|----------------|--------|
| Autenticacion JWT | 7 dias expiracion, verificacion correcta | OK |
| Passwords | bcryptjs con salt 10 | OK |
| SQL Injection | 100% queries parametrizadas | OK |
| Rate Limiting | Login 5/15min, Register 3/hora | OK |
| CORS | Whitelist con origins especificos | OK |
| Helmet | Headers de seguridad | OK |
| Body Limit | 10kb para prevenir DoS | OK |
| Validacion Inputs | express-validator + validators custom | OK |
| Google OAuth | Verificacion de token con library oficial | OK |
| Admin Auth | Verifica role en BD (aunque podria cachear) | OK |

### Backend (Bueno)

| Aspecto | Implementacion | Estado |
|---------|----------------|--------|
| TypeScript | Estricto, tipos definidos | OK |
| Tests | 174 tests, 76.6% cobertura | OK |
| Connection Pool | Max 20, timeouts configurados | OK |
| Transacciones | Usadas en operaciones criticas | Parcial |
| Error Handling | Try/catch, error handler global | OK |
| API Design | RESTful, respuestas consistentes | OK |

### Datos del Mundial (Actualizado)

| Aspecto | Implementacion | Estado |
|---------|----------------|--------|
| Sorteo | Datos oficiales diciembre 2025 | OK |
| 48 equipos | 12 grupos A-L, 4 equipos c/u | OK |
| Playoffs | 4 UEFA + 2 FIFA correctos | OK |
| Terceros | 495 combinaciones FIFA | OK |
| Knockout | Estructura R32-Final correcta | OK |
| Sistema puntos | Definido en scoring.ts | OK (backend) |

---

## Funcionalidades Propuestas

### Fase 1: Pre-Mundial (Prioridad Alta)

| Feature | Descripcion | Complejidad | Tiempo Est. |
|---------|-------------|-------------|-------------|
| Timer Countdown | Cuenta regresiva en Home hasta inicio Mundial | Baja | 2-4 horas |
| Cierre Automatico | Bloquear predicciones 1 hora antes del primer partido | Media | 4-8 horas |
| Notificaciones Email | Recordatorio antes del cierre | Media | 1-2 dias |
| Comparar Predicciones | Vista lado a lado entre 2 usuarios | Media | 1 dia |
| Estadisticas Prediccion | "70% eligieron Argentina campeon" | Media | 1 dia |

### Fase 2: Durante el Mundial (Prioridad Media)

| Feature | Descripcion | Complejidad | Tiempo Est. |
|---------|-------------|-------------|-------------|
| Live Scores | Integrar API de resultados en tiempo real | Alta | 3-5 dias |
| Puntos en Vivo | Actualizar ranking automaticamente | Alta | 2-3 dias |
| Push Notifications | Alertas cuando cambia posicion | Media | 1-2 dias |
| Historial Posiciones | Grafico de evolucion en ranking | Media | 1 dia |
| Compartir Redes | "Estoy #5 en Mundalia!" con imagen | Baja | 4-8 horas |

### Fase 3: Mejoras UX (Prioridad Media-Alta)

| Feature | Descripcion | Complejidad | Tiempo Est. |
|---------|-------------|-------------|-------------|
| Dark Mode | Tema oscuro | Baja | 4-8 horas |
| Multi-idioma | Espanol, Ingles, Portugues | Media | 2-3 dias |
| PWA Offline | Funcionar sin conexion | Media | 2-3 dias |
| Onboarding Tutorial | Guia para nuevos usuarios | Baja | 4-8 horas |
| Atajos Teclado | Navegacion rapida | Baja | 2-4 horas |

### Fase 4: Social y Gamificacion

| Feature | Descripcion | Complejidad | Tiempo Est. |
|---------|-------------|-------------|-------------|
| Logros/Badges | "Primer lugar en grupo", "Acerto campeon" | Media | 1-2 dias |
| Comentarios | Discusion en predicciones | Alta | 3-5 dias |
| Retos 1v1 | Apostar puntos virtuales contra amigo | Media | 2-3 dias |
| Ligas Publicas | Grupos tematicos abiertos | Media | 1-2 dias |

### Fase 5: B2B / White Label (Prioridad Alta)

Funcionalidades para vender la plataforma a comercios y empresas.

| Feature | Descripcion | Complejidad | Tiempo Est. |
|---------|-------------|-------------|-------------|
| **Config Modos Prediccion** | Admin elige: solo Ganadores, solo Marcadores, o ambos | Media | 1 dia |
| Branding Personalizable | Logo, colores, nombre de la quiniela configurable | Media | 1-2 dias |
| Dominio Custom | Soporte para subdominios o dominios propios | Alta | 2-3 dias |
| Multi-tenancy | Instancias separadas por cliente B2B | Alta | 1 semana |
| Panel Super-Admin | Gestionar multiples clientes B2B | Alta | 3-5 dias |

#### Detalle: Configuracion de Modos de Prediccion

**Objetivo:** Permitir que cada cliente B2B elija que modos de prediccion ofrecer a sus usuarios.

**Opciones:**
1. **Solo "Escoger Ganadores"** - Modo simplificado, mas rapido
2. **Solo "Marcadores Exactos"** - Para usuarios mas hardcore
3. **Ambos modos** - Como funciona actualmente

**Implementacion requerida:**

1. **Base de datos:**
```sql
-- Tabla settings (ya existe)
INSERT INTO settings (key, value) VALUES
  ('prediction_modes', 'both');  -- 'positions' | 'scores' | 'both'
```

2. **Backend:**
```typescript
// routes/admin.ts - Nuevo endpoint
GET  /api/admin/settings
POST /api/admin/settings  { key: 'prediction_modes', value: 'positions' }

// routes/settings.ts - Endpoint publico (sin auth)
GET  /api/settings/public  // Retorna modos habilitados
```

3. **Frontend - Home.jsx:**
```javascript
// Si solo hay un modo, no mostrar selector
const { enabledModes } = useSettings();

// Si enabledModes === 'positions', ir directo a modo posiciones
// Si enabledModes === 'scores', ir directo a modo marcadores
// Si enabledModes === 'both', mostrar selector como ahora
```

4. **Frontend - Admin.jsx:**
```javascript
// Nueva seccion "Configuracion"
<Card>
  <CardTitle>Modos de Prediccion</CardTitle>
  <RadioGroup value={predictionModes} onChange={setPredictionModes}>
    <RadioItem value="positions">Solo Escoger Ganadores</RadioItem>
    <RadioItem value="scores">Solo Marcadores Exactos</RadioItem>
    <RadioItem value="both">Ambos modos (por defecto)</RadioItem>
  </RadioGroup>
  <Button onClick={saveSettings}>Guardar</Button>
</Card>
```

5. **Cambios en UI cuando solo hay un modo:**
   - Home.jsx: Ocultar selector de modo en dialog de nueva prediccion
   - MyPredictions.jsx: No mostrar badge de modo si solo hay uno
   - Leaderboard.jsx: Ocultar tabs de modo, mostrar solo el activo

**Archivos a modificar:**
- `natalia-backend/routes/admin.ts` - Endpoints settings
- `natalia-backend/routes/settings.ts` - Nuevo archivo
- `natalia-frontend/src/pages/Home.jsx` - Condicional en dialog
- `natalia-frontend/src/pages/Admin.jsx` - Nueva seccion config
- `natalia-frontend/src/pages/MyPredictions.jsx` - Ocultar badge
- `natalia-frontend/src/pages/Leaderboard.jsx` - Ocultar tabs
- `natalia-frontend/src/services/api.js` - Nuevos endpoints
- `natalia-frontend/src/context/SettingsContext.jsx` - Nuevo context

---

## Recomendaciones Prioritarias

### Inmediatas (Esta semana)

1. **Sincronizar puntos knockout**
   - Archivo: `natalia-frontend/src/data/knockoutBracket.js`
   - Cambiar lineas 112-119 para coincidir con `scoring.ts`
   - Tiempo: 15 minutos

2. **Quitar LIMIT 500 del leaderboard**
   - Archivo: `natalia-backend/routes/leaderboard.ts`
   - Quitar linea 95 o implementar paginacion
   - Tiempo: 30 minutos

3. **Agregar indices BD**
   - Archivo: `natalia-backend/migrations.sql`
   - Agregar indices para prediction_set_id, user_id
   - Tiempo: 30 minutos

### Corto Plazo (2 semanas)

4. **Refactorizar Knockout.jsx**
   - Separar en 5+ archivos
   - Extraer sub-componentes
   - Crear hooks custom
   - Tiempo: 1-2 dias

5. **Crear custom hooks**
   - `usePredictionData()`
   - `usePersistentState()`
   - `useStepNavigation()`
   - Tiempo: 4-8 horas

6. **Agregar useMemo al bracket**
   - buildR32Matches, buildR16Matches, etc.
   - Tiempo: 1-2 horas

7. **Implementar timer countdown**
   - Componente en Home.jsx
   - Fecha objetivo: 11 junio 2026
   - Tiempo: 2-4 horas

### Mediano Plazo (1 mes)

8. **Error boundaries por ruta**
   - Cada pagina con su propio boundary
   - Tiempo: 2-4 horas

9. **Retry logic en API calls**
   - Exponential backoff
   - Tiempo: 4-8 horas

10. **Cachear role admin en JWT**
    - Evitar query por request
    - Tiempo: 2-4 horas

11. **Tests de frontend**
    - Vitest para componentes criticos
    - Tiempo: 2-3 dias

12. **Cierre automatico de predicciones**
    - Endpoint admin + frontend logic
    - Tiempo: 4-8 horas

---

## Metricas de Calidad

### Actuales

| Metrica | Valor | Objetivo |
|---------|-------|----------|
| Tests Backend | 174 | 200+ |
| Cobertura Backend | 76.6% | 80%+ |
| Tests Frontend | ~21 | 100+ |
| Lighthouse Performance | No medido | 90+ |
| Bundle Size | No medido | <500KB |
| Accesibilidad WCAG | Parcial | AA |
| Tiempo carga inicial | No medido | <3s |

### Comandos para Medir

```bash
# Backend tests
cd natalia-backend && npm test

# Frontend tests
cd natalia-frontend && npm test

# Lighthouse (requiere build)
cd natalia-frontend && npm run build
npx lighthouse http://localhost:5174 --view

# Bundle size
cd natalia-frontend && npm run build
# Ver dist/assets/*.js sizes
```

---

## Archivos Criticos Analizados

### Backend
- `server.ts` - Configuracion Express, Helmet, CORS, migraciones
- `config/db.ts` - Pool PostgreSQL, SSL config
- `middleware/auth.ts` - JWT verification, admin auth
- `routes/auth.ts` - Login, register, Google OAuth, rate limiting
- `routes/predictions.ts` - CRUD predicciones, transacciones
- `routes/predictionSets.ts` - CRUD sets, N+1 queries
- `routes/leaderboard.ts` - Rankings, LIMIT 500
- `routes/admin.ts` - Panel admin, calculos standings
- `utils/scoring.ts` - Sistema de puntos oficial
- `utils/validators.ts` - Validacion inputs
- `types/index.ts` - Tipos TypeScript

### Frontend
- `App.jsx` - Rutas, lazy loading, ErrorBoundary
- `context/AuthContext.jsx` - Estado global auth
- `services/api.js` - Axios config, interceptors
- `pages/Knockout.jsx` - 1589 lineas, refactorizar
- `pages/Predictions.jsx` - 523 lineas
- `pages/Admin.jsx` - Panel admin
- `data/knockoutBracket.js` - Estructura bracket, PUNTOS INCORRECTOS
- `data/thirdPlaceCombinations.js` - 495 combinaciones FIFA
- `data/mockData.js` - 48 equipos sorteo oficial
- `data/playoffsData.js` - 6 playoffs

---

## Conclusion

Mundalia esta **listo para produccion basica** pero requiere trabajo antes del Mundial 2026:

1. **Critico:** Arreglar inconsistencia de puntos (15 min)
2. **Importante:** Implementar timer y cierre automatico (1 dia)
3. **Recomendado:** Refactorizar Knockout.jsx (2 dias)
4. **Nice-to-have:** Comparador de predicciones (1 dia)

El proyecto tiene una base solida de seguridad y funcionalidad. Los problemas identificados son principalmente de arquitectura y mantenibilidad, no de funcionalidad core.

---

*Auditoria generada automaticamente por Claude Code - Diciembre 2025*
