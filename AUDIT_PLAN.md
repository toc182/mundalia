# AUDIT_PLAN.md - Plan de Auditoría y Mejoras

## Fecha: 2025-12-18

## Resumen Ejecutivo

| Área | Puntuación | Estado |
|------|------------|--------|
| **Seguridad** | 5/10 | Crítico - credenciales expuestas, SSL mal configurado |
| **Frontend** | 7/10 | Bueno - código limpio, algunas mejoras pendientes |
| **Backend** | 6/10 | Funcional - falta validación y transacciones |
| **Testing** | 2/10 | Crítico - solo 30 tests, cobertura <10% |
| **CI/CD** | 4/10 | Incompleto - backend tests skipped |
| **Documentación** | 7/10 | Buena - CLAUDE.md y SESSION.md excelentes |
| **TOTAL** | **5.2/10** | Producción viable pero requiere mejoras urgentes |

---

## FASE 1: SEGURIDAD (Prioridad URGENTE)

### Checklist de Implementación

- [x] **1.1 Remover credenciales de documentación** ✅ (2025-12-18)
  - Archivo: `CLAUDE.md`
  - Acción: Reemplazado password con `<TU_PASSWORD_LOCAL>`

- [x] **1.2 Fix SSL en producción** ✅ (2025-12-18)
  - Archivo: `natalia-backend/config/db.js:18`
  - Cambio: `rejectUnauthorized: true`

- [x] **1.3 validators.js ya completo** ✅
  - Todas las funciones necesarias ya existían

- [x] **1.4 Validación en predictions** ✅ (2025-12-18)
  - Archivo: `natalia-backend/routes/predictions.js`
  - POST /groups: Valida group_letter, predicted_position, team_id
  - POST /knockout: Valida matchKey y winner_team_id

- [x] **1.5 Transacciones en predictionSets** ✅ (2025-12-18)
  - Archivo: `natalia-backend/routes/predictionSets.js`
  - Endpoint: POST /:id/duplicate con BEGIN/COMMIT/ROLLBACK

- [x] **1.6 Transacciones en admin** ✅ (2025-12-18)
  - Archivo: `natalia-backend/routes/admin.js`
  - POST /groups con transacción completa

- [ ] **1.7 Fortalecer JWT (Opcional - Pendiente)**
  - Generar nuevo JWT_SECRET con 32+ chars random
  - Actualizar en Railway environment variables

---

## FASE 2: TESTING Y CI/CD (COMPLETADA)

### Checklist

- [x] **2.1 PostgreSQL en GitHub Actions** ✅ (2025-12-18)
  - Archivo: `.github/workflows/ci.yml`
  - Service postgres:15 con health checks
  - Variables de entorno configuradas

- [x] **2.2 Tests para predictions.js** ✅ (2025-12-18)
  - Creado: `__tests__/predictions.test.js`
  - 20+ tests para groups, knockout, playoffs, thirds

- [x] **2.3 Tests para admin.js** ✅ (2025-12-18)
  - Creado: `__tests__/admin.test.js`
  - Tests de autenticación y validación

- [x] **2.4 npm audit en CI** ✅ (2025-12-18)
  - Agregado en backend y frontend
  - Nivel: high (no falla por low/moderate)

- [x] **2.5 Coverage threshold** ✅ (2025-12-18)
  - Statements: 30%, Branches: 20%, Functions: 20%, Lines: 30%
  - 39 tests pasando, coverage ~33%

---

## FASE 3: PERFORMANCE (Después)

### Checklist

- [ ] **3.1 Optimizar N+1 queries**
  - `leaderboard.js:71` - Usar JOINs
  - `groups.js:111` - Batch queries

- [ ] **3.2 Índices de BD**
  ```sql
  CREATE INDEX idx_group_predictions_user_set ON group_predictions(user_id, prediction_set_id);
  CREATE INDEX idx_knockout_predictions_user_set ON knockout_predictions(user_id, prediction_set_id);
  ```

- [ ] **3.3 React.memo en GroupCard**
  - Archivo: `Predictions.jsx`

- [ ] **3.4 Promise.all en INSERTs**
  - `predictions.js:106-112`

---

## FASE 4: CALIDAD DE CÓDIGO (Después)

### Checklist

- [ ] **4.1 Extraer componente MatchBox**
  - De: `Playoffs.jsx`, `Knockout.jsx`
  - A: `components/MatchBox.jsx`

- [ ] **4.2 Centralizar POINTS**
  - De: `leaderboard.js`, `groups.js`
  - A: `utils/scoring.js`

- [ ] **4.3 Eliminar código muerto**
  - `components/Navbar.jsx` (no usado)

- [ ] **4.4 Estandarizar responses**
  - Formato: `{ data, error, message }`

---

## NUEVAS FUNCIONALIDADES SUGERIDAS

### Prioridad Alta
| Feature | Complejidad | Impacto |
|---------|-------------|---------|
| Modo Oscuro | Baja | Alto |
| Compartir en WhatsApp | Baja | Alto |
| Notificaciones Push | Media | Alto |
| Export PDF | Media | Medio |

### Prioridad Media
| Feature | Complejidad | Impacto |
|---------|-------------|---------|
| Comparar Predicciones | Media | Medio |
| Achievements/Badges | Media | Medio |
| Estadísticas Detalladas | Alta | Medio |

---

## HALLAZGOS CRÍTICOS DETALLADOS

### 1. Credenciales Expuestas
- **Ubicación:** `.env`, `CLAUDE.md:251`
- **Riesgo:** Acceso no autorizado a BD
- **Estado:** PENDIENTE

### 2. SSL Mal Configurado
- **Ubicación:** `config/db.js:18`
- **Riesgo:** Ataques MITM
- **Estado:** PENDIENTE

### 3. Sin Validación
- **Ubicación:** `predictions.js:83-119, 320-327`
- **Riesgo:** Datos inválidos, DoS
- **Estado:** PENDIENTE

### 4. Sin Transacciones
- **Ubicación:** `predictionSets.js:159-216`, `admin.js:78-87`
- **Riesgo:** BD inconsistente
- **Estado:** PENDIENTE

### 5. Tests Skipped
- **Ubicación:** `.github/workflows/ci.yml`
- **Riesgo:** Regresiones no detectadas
- **Estado:** PENDIENTE

---

## ASPECTOS POSITIVOS

- React 19 + Vite 7 + Tailwind 4 (stack moderno)
- Code splitting implementado (-36% bundle)
- 100% queries parametrizadas (no SQL injection)
- Documentación técnica excelente
- Migraciones automáticas funcionando

---

## SEGUIMIENTO

| Fecha | Fase | Items Completados | Notas |
|-------|------|-------------------|-------|
| 2025-12-18 | Auditoría | Plan creado | Iniciando Fase 1 |
| 2025-12-18 | Seguridad | 6/7 items | Credenciales, SSL, validación, transacciones |
| 2025-12-18 | Testing/CI | 5/5 items | PostgreSQL en CI, tests, npm audit, coverage |

---

*Generado por auditoría de código - Claude Code*
