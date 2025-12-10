# BACKEND.md - Plan de Conexion Backend Real

## Objetivo
Conectar el frontend con el backend real de PostgreSQL, restaurando autenticacion y persistencia de datos.

## Estado: Fases 1-3.5 COMPLETADAS

---

## Fase 1: Infraestructura de API en Frontend - COMPLETADA

### 1.1 Servicio de API centralizado
**Archivo:** `natalia-frontend/src/services/api.js`

- [x] axios con baseURL configurable
- [x] Interceptor para JWT token en headers
- [x] Interceptor para errores 401 (logout automatico)
- [x] Fallback a localhost:5001 si no hay .env

### 1.2 Configuracion de Vite
**Archivo:** `natalia-frontend/vite.config.js`

- [x] Configuracion limpia (sin bloque define problematico)
- [x] Vite maneja VITE_API_URL automaticamente

---

## Fase 2: Autenticacion Real - COMPLETADA

### 2.1 AuthContext refactorizado
**Archivo:** `natalia-frontend/src/context/AuthContext.jsx`

- [x] login() con POST /api/auth/login
- [x] register() con POST /api/auth/register
- [x] JWT guardado en localStorage
- [x] Verificacion de token al cargar (GET /api/users/me)
- [x] logout() limpia token y redirige

### 2.2 Paginas de Login/Register
- [x] Login.jsx conectado con API
- [x] Register.jsx conectado con API
- [x] Manejo de errores del servidor

### 2.3 Rutas protegidas
**Archivo:** `natalia-frontend/src/App.jsx`

- [x] ProtectedRoute implementado
- [x] PublicRoute para login/register
- [x] Rutas protegidas funcionando

---

## Fase 3: Predicciones - COMPLETADA

### 3.1 Nuevas Tablas en PostgreSQL

```sql
-- Predicciones de repechajes
CREATE TABLE playoff_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    playoff_id VARCHAR(20) NOT NULL,
    semifinal_winner_1 VARCHAR(50),
    semifinal_winner_2 VARCHAR(50),
    final_winner VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, playoff_id)
);

-- Predicciones de terceros lugares
CREATE TABLE third_place_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    selected_groups VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Predicciones de eliminatorias
CREATE TABLE knockout_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    match_key VARCHAR(20) NOT NULL,
    winner_team_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_key)
);
```

### 3.2 Nuevos Endpoints en Backend

**Archivo:** `natalia-backend/routes/predictions.js`

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/predictions/my` | Predicciones de grupos y partidos (legacy) |
| POST | `/predictions/groups` | Guardar prediccion de grupos |
| POST | `/predictions/match` | Guardar prediccion de partido (legacy) |
| GET | `/predictions/playoffs` | Obtener predicciones de repechajes |
| POST | `/predictions/playoffs` | Guardar predicciones de repechajes |
| GET | `/predictions/third-places` | Obtener predicciones de terceros |
| POST | `/predictions/third-places` | Guardar predicciones de terceros |
| GET | `/predictions/knockout` | Obtener predicciones de eliminatorias |
| POST | `/predictions/knockout` | Guardar predicciones de eliminatorias |
| GET | `/predictions/all` | Obtener TODAS las predicciones |

### 3.3 Paginas Frontend Conectadas

| Pagina | Endpoint GET | Endpoint POST | Estado |
|--------|--------------|---------------|--------|
| Predictions.jsx | /predictions/my | /predictions/groups | COMPLETADO |
| Playoffs.jsx | /predictions/playoffs | /predictions/playoffs | COMPLETADO |
| ThirdPlaces.jsx | /predictions/third-places | /predictions/third-places | COMPLETADO |
| Knockout.jsx | /predictions/knockout | /predictions/knockout | COMPLETADO |
| MyPredictions.jsx | /predictions/all | - | COMPLETADO |

### 3.4 Patron de Guardado
Todas las paginas siguen el mismo patron:
1. Al cargar: API primero, fallback a localStorage
2. Al guardar: localStorage primero, luego API
3. Graceful degradation si API falla
4. Estados visuales: saving, error

---

## Fase 3.5: Multiples Predicciones - COMPLETADA

### 3.5.1 Nueva Tabla para Sets de Predicciones

```sql
CREATE TABLE prediction_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Columnas agregadas a tablas existentes
ALTER TABLE group_predictions ADD COLUMN prediction_set_id INTEGER REFERENCES prediction_sets(id);
ALTER TABLE playoff_predictions ADD COLUMN prediction_set_id INTEGER REFERENCES prediction_sets(id);
ALTER TABLE third_place_predictions ADD COLUMN prediction_set_id INTEGER REFERENCES prediction_sets(id);
ALTER TABLE knockout_predictions ADD COLUMN prediction_set_id INTEGER REFERENCES prediction_sets(id);
```

### 3.5.2 Nuevos Endpoints para Prediction Sets

**Archivo:** `natalia-backend/routes/predictionSets.js` (NUEVO)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/prediction-sets` | Lista todos los sets del usuario |
| GET | `/prediction-sets/:id` | Detalle de un set con todas sus predicciones |
| POST | `/prediction-sets` | Crear nuevo set |
| PUT | `/prediction-sets/:id` | Renombrar set |
| DELETE | `/prediction-sets/:id` | Eliminar set (y todas sus predicciones) |
| POST | `/prediction-sets/:id/duplicate` | Duplicar un set completo |

### 3.5.3 Endpoints de Predicciones Actualizados

Todos los endpoints en `/api/predictions/*` ahora aceptan `setId` como parametro opcional:
- Query param para GET: `?setId=X`
- Body param para POST: `{ ..., setId: X }`

Si no se pasa `setId`, se usa/crea un set por defecto (backward compatibility).

### 3.5.4 Frontend - Nuevas Paginas

| Pagina | Ruta | Descripcion |
|--------|------|-------------|
| MyPredictions.jsx | `/mis-predicciones` | REESCRITA - Lista de prediction sets con CRUD |
| PredictionDetail.jsx | `/prediccion/:id` | NUEVA - Detalle completo de un set |

### 3.5.5 Frontend - Flujo de Usuario

```
/mis-predicciones
     |
     +-> "Nueva Prediccion" -> Dialog nombre
     |         |
     |         +-> "Crear y Comenzar" -> /repechajes?setId=X
     |
     +-> Card de prediccion existente
             |
             +-> "Ver" -> /prediccion/X
             +-> "Editar" -> /repechajes?setId=X
             +-> "Duplicar" -> Crea copia
             +-> "Renombrar" -> Dialog
             +-> "Eliminar" -> Confirmacion
```

### 3.5.6 Archivos Modificados

**Backend:**
| Archivo | Cambio |
|---------|--------|
| routes/predictionSets.js | NUEVO - 6 endpoints CRUD |
| routes/predictions.js | Todos los endpoints soportan setId opcional |
| server.js | Agregada ruta /api/prediction-sets |

**Frontend:**
| Archivo | Cambio |
|---------|--------|
| src/services/api.js | Agregado predictionSetsAPI + setId en predictionsAPI |
| src/pages/MyPredictions.jsx | REESCRITO - Lista y gestion de sets |
| src/pages/PredictionDetail.jsx | NUEVO - Vista detalle de prediccion |
| src/pages/Playoffs.jsx | Lee/guarda con setId desde URL |
| src/pages/Predictions.jsx | Lee/guarda con setId desde URL |
| src/pages/ThirdPlaces.jsx | Lee/guarda con setId desde URL |
| src/pages/Knockout.jsx | Lee/guarda con setId desde URL |
| src/App.jsx | Nueva ruta /prediccion/:id |

---

## Fase 4: Leaderboard - PENDIENTE

### 4.1 Actualizar Leaderboard.jsx
- [ ] GET /api/leaderboard para ranking global
- [ ] Mostrar posicion del usuario actual
- [ ] Manejar estado de carga y errores

---

## Fase 5: Grupos Privados - PENDIENTE

### 5.1 Actualizar Groups.jsx
- [ ] Crear grupo: POST /api/groups
- [ ] Unirse: POST /api/groups/join
- [ ] Listar mis grupos: GET /api/groups
- [ ] Ver leaderboard del grupo: GET /api/groups/:id/leaderboard

---

## Fase 6: Ajustes de Backend - PARCIALMENTE COMPLETADA

### 6.1 Endpoints disponibles (todos funcionando)

**Auth:**
- POST /api/auth/register
- POST /api/auth/login

**Users:**
- GET /api/users/me

**Teams:**
- GET /api/teams
- GET /api/teams/group/:letter

**Predictions:** (todos soportan ?setId=X opcional)
- GET /api/predictions/my
- POST /api/predictions/groups
- POST /api/predictions/match
- GET /api/predictions/playoffs
- POST /api/predictions/playoffs
- GET /api/predictions/third-places
- POST /api/predictions/third-places
- GET /api/predictions/knockout
- POST /api/predictions/knockout
- GET /api/predictions/all

**Prediction Sets:** (NUEVOS)
- GET /api/prediction-sets
- GET /api/prediction-sets/:id
- POST /api/prediction-sets
- PUT /api/prediction-sets/:id
- DELETE /api/prediction-sets/:id
- POST /api/prediction-sets/:id/duplicate

**Groups:**
- GET /api/groups
- POST /api/groups
- POST /api/groups/join

**Leaderboard:**
- GET /api/leaderboard

### 6.2 Pendiente
- [ ] Seed de partidos en tabla matches (si se necesita)
- [ ] Calcular puntuaciones automaticamente

---

## Archivos Modificados (Resumen Completo)

### Frontend
| Archivo | Cambio |
|---------|--------|
| src/services/api.js | NUEVO - Cliente axios + todos los endpoints |
| src/services/predictions.js | NUEVO - Helpers para grupos |
| src/context/AuthContext.jsx | Refactorizado para JWT |
| src/pages/Login.jsx | Conectado API |
| src/pages/Register.jsx | Conectado API |
| src/pages/Home.jsx | Header + logout |
| src/pages/Predictions.jsx | Conectado API |
| src/pages/Playoffs.jsx | Conectado API |
| src/pages/ThirdPlaces.jsx | Conectado API |
| src/pages/Knockout.jsx | Conectado API |
| src/pages/MyPredictions.jsx | Conectado API |
| src/App.jsx | ProtectedRoute + PublicRoute |
| vite.config.js | Limpiado |

### Backend
| Archivo | Cambio |
|---------|--------|
| routes/predictions.js | +7 nuevos endpoints, soporte setId |
| routes/predictionSets.js | NUEVO - 6 endpoints CRUD |
| server.js | Ruta /api/prediction-sets agregada |

### Base de Datos
| Cambio | Estado |
|--------|--------|
| Tabla playoff_predictions | CREADA + prediction_set_id |
| Tabla third_place_predictions | CREADA + prediction_set_id |
| Tabla knockout_predictions | CREADA + prediction_set_id |
| Tabla prediction_sets | CREADA |
| Columna prediction_set_id en group_predictions | AGREGADA |

---

## Progreso General

- [x] Fase 1: Infraestructura API
- [x] Fase 2: Autenticacion
- [x] Fase 3: Predicciones
- [x] Fase 3.5: Multiples Predicciones
- [ ] Fase 4: Leaderboard
- [ ] Fase 5: Grupos privados
- [x] Fase 6: Ajustes backend (endpoints creados)

**Proximos pasos:**
1. Fase 4: Conectar Leaderboard.jsx con API
2. Fase 5: Conectar Groups.jsx con API
3. Deploy a produccion con cambios
