# SESSION.md - Estado Actual del Proyecto

## Ultima Actualizacion: 2025-12-10

---

## COMPLETADO: Sistema de Multiples Predicciones

**Nueva funcionalidad:** Los usuarios pueden crear multiples predicciones con nombres personalizados.

### Estado de las Fases
- [x] Fase 1: Infraestructura API (api.js, vite.config)
- [x] Fase 2: Autenticacion (AuthContext, Login, Register, ProtectedRoute)
- [x] Fase 3: Predicciones (TODAS conectadas con API)
- [x] **Fase 3.5: Multiples Predicciones (NUEVO)**
- [ ] Fase 4: Leaderboard
- [ ] Fase 5: Grupos privados
- [ ] Fase 6: Ajustes backend (parcialmente completado)

---

## Nueva Funcionalidad: Prediction Sets

### Tabla Principal
```sql
CREATE TABLE prediction_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tablas Modificadas
Agregada columna `prediction_set_id` a:
- `group_predictions`
- `playoff_predictions`
- `third_place_predictions`
- `knockout_predictions`

### Nuevos Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/prediction-sets` | Lista todos los sets del usuario |
| GET | `/api/prediction-sets/:id` | Detalle de un set con todas sus predicciones |
| POST | `/api/prediction-sets` | Crear nuevo set |
| PUT | `/api/prediction-sets/:id` | Renombrar set |
| DELETE | `/api/prediction-sets/:id` | Eliminar set |
| POST | `/api/prediction-sets/:id/duplicate` | Duplicar un set |

### Endpoints de Predicciones Actualizados
Todos los endpoints de `/api/predictions/*` ahora aceptan `setId` como parametro opcional:
- Query param para GET: `?setId=X`
- Body param para POST: `{ ..., setId: X }`

---

## Nuevas Paginas Frontend

### MyPredictions.jsx (reescrita completamente)
- Lista todas las predicciones del usuario
- Muestra progreso de cada prediccion (repechajes, grupos, terceros, bracket)
- Botones: Ver, Editar, Duplicar, Renombrar, Eliminar
- Dialog para crear nueva prediccion con nombre

### PredictionDetail.jsx (NUEVA)
- Ruta: `/prediccion/:id`
- Muestra detalle completo de una prediccion especifica
- Campeon, grupos, terceros, eliminatorias

---

## Flujo de Usuario Actualizado

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

/repechajes?setId=X
     |
     v
/grupos?setId=X
     |
     v
/terceros?setId=X
     |
     v
/eliminatorias?setId=X
     |
     +-> "Finalizar" -> /prediccion/X (o /mis-predicciones si no hay setId)
```

---

## Archivos Creados/Modificados (Sesion Actual)

### Backend
| Archivo | Cambio |
|---------|--------|
| `routes/predictionSets.js` | NUEVO - 6 endpoints para manejar sets |
| `routes/predictions.js` | Actualizado - Todos los endpoints soportan setId |
| `server.js` | Agregada ruta /api/prediction-sets |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `src/services/api.js` | Agregado predictionSetsAPI + actualizado predictionsAPI con setId |
| `src/pages/MyPredictions.jsx` | REESCRITO - Lista de prediction sets |
| `src/pages/PredictionDetail.jsx` | NUEVO - Detalle de una prediccion |
| `src/pages/Playoffs.jsx` | Actualizado - Lee/guarda con setId |
| `src/pages/Predictions.jsx` | Actualizado - Lee/guarda con setId |
| `src/pages/ThirdPlaces.jsx` | Actualizado - Lee/guarda con setId |
| `src/pages/Knockout.jsx` | Actualizado - Lee/guarda con setId |
| `src/App.jsx` | Nueva ruta /prediccion/:id |

---

## URLs y Puertos

### Desarrollo Local
- **Frontend:** http://localhost:5174
- **Backend:** http://localhost:5001

### Produccion
- **Frontend (Vercel):** https://mundalia.vercel.app
- **Backend (Railway):** https://mundalia-production.up.railway.app

---

## Base de Datos (Railway PostgreSQL)

### Tablas
| Tabla | Estado | Descripcion |
|-------|--------|-------------|
| `users` | OK | Usuarios registrados |
| `teams` | OK | 48 equipos del Mundial |
| `prediction_sets` | NUEVA | Sets de predicciones con nombre |
| `group_predictions` | OK + prediction_set_id | Predicciones de grupos |
| `playoff_predictions` | OK + prediction_set_id | Predicciones de repechajes |
| `third_place_predictions` | OK + prediction_set_id | Predicciones de terceros lugares |
| `knockout_predictions` | OK + prediction_set_id | Predicciones de eliminatorias |
| `matches` | Vacia | Partidos (no necesaria actualmente) |
| `match_predictions` | OK | Predicciones de partidos (legacy) |
| `private_groups` | OK | Grupos privados |
| `private_group_members` | OK | Miembros de grupos |
| `user_scores` | OK | Puntuaciones |
| `settings` | OK | Configuracion (deadlines) |

---

## Comportamiento de Guardado

Todas las paginas siguen el mismo patron:
1. **Al cargar:** Intenta API primero (con setId si existe), fallback a localStorage
2. **Al guardar:** Guarda en localStorage primero, luego intenta API (con setId)
3. **Si API falla:** Muestra error pero continua (graceful degradation)
4. **Navegacion:** Mantiene setId en query params entre pasos del wizard

---

## TODO Pendiente

### Completado
- [x] Fase 1: Infraestructura API
- [x] Fase 2: Autenticacion
- [x] Fase 3: Predicciones (todas las paginas)
- [x] Fase 3.5: Multiples predicciones

### Pendiente (Media Prioridad)
- [ ] Fase 4: Leaderboard funcional (GET /api/leaderboard)
- [ ] Fase 5: Grupos privados (crear, unirse, ver ranking)
- [ ] Panel admin para cargar resultados reales

### Pendiente (Baja Prioridad)
- [ ] Deploy a produccion con cambios actuales
- [ ] Calcular puntuaciones automaticamente
