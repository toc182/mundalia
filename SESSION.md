# SESSION.md - Estado Actual del Proyecto

## Ultima Actualizacion: 2025-12-11 (23:30 UTC)

---

## PRODUCCION FUNCIONANDO

- **Login/Registro:** Funcionando
- **Predicciones:** Sistema de multiples predicciones funcional
- **Deploy:** Frontend en Vercel, Backend en Railway

### Estado de las Fases
- [x] Fase 1: Infraestructura API (api.js, vite.config)
- [x] Fase 2: Autenticacion (AuthContext, Login, Register, ProtectedRoute)
- [x] Fase 3: Predicciones (TODAS conectadas con API)
- [x] **Fase 3.5: Multiples Predicciones**
- [x] **Fase 3.6: Sin Auto-Relleno**
- [x] **Fase 3.7: Fix boton Comenzar**
- [x] **Fase 3.8: Fix Database Constraints**
- [x] **Fase 3.9: Fix breadcrumbs perdian setId**
- [x] **Fase 3.10: Fix tipos string/number en playoffs**
- [x] **Fase 3.11: UX Grupos - pre-llenado + drag&drop tactil**
- [x] **Fase 3.12: Fix combinaciones de terceros lugares (495/495)**
- [x] **Fase 3.13: Rediseno UI - TopBar fijo + layout mejorado**
- [x] **Fase 3.14: Mejoras UX - Knockout botones, PredictionDetail fixes**
- [x] **Fase 3.15: Pagina Cuenta + mejoras vista predicciones**
- [ ] Fase 4: Leaderboard
- [ ] Fase 5: Grupos privados
- [x] Fase 6: Deploy a produccion

---

## Problemas Resueltos (2025-12-11)

### 1. CORS Error en Produccion
- **Problema:** Frontend en Vercel no podia conectar con Backend en Railway
- **Error:** `Access-Control-Allow-Origin header has value 'http://localhost:5174'`
- **Solucion:** Actualizado `server.js` para permitir multiples origenes:
  ```js
  const allowedOrigins = ['http://localhost:5174', 'https://mundalia.vercel.app'];
  ```

### 2. API URL no configurada en Produccion
- **Problema:** Frontend en produccion usaba `http://localhost:5001/api`
- **Solucion:** Creado `.env.production` con `VITE_API_URL=https://mundalia-production.up.railway.app/api`

### 3. Vercel 404 en rutas directas
- **Problema:** Acceder directamente a `/login` daba 404
- **Solucion:** Creado `vercel.json` con rewrites para SPA routing

### 4. Predicciones cargando datos de sets anteriores
- **Problema:** Queries SQL incluian `OR prediction_set_id IS NULL` que cargaba datos legacy
- **Solucion:** Eliminado fallback a `IS NULL` en todas las queries de predictions.js

### 5. Boton "Comenzar" cargaba datos de localStorage
- **Problema:** Boton "Comenzar" en Home iba a `/repechajes` sin `setId`, cargando localStorage
- **Solucion:** Cambiado para crear prediction set automaticamente antes de navegar

### 6. Breadcrumbs perdian setId
- **Problema:** Los links de navegacion (Paso 1, Paso 2, etc) no incluian `?setId=X`
- **Solucion:** Actualizados todos los breadcrumbs en Predictions.jsx, ThirdPlaces.jsx, Knockout.jsx

### 7. Playoffs no se mostraban correctamente (string vs number)
- **Problema:** La DB devolvia team IDs como strings ("101") pero el frontend esperaba numeros (101)
- **Solucion:** Agregado `toNumberIfPossible()` en el endpoint GET /playoffs para convertir

### 9. UX Grupos - Drag & Drop tactil
- **Problema:** Drag & drop nativo no funciona en movil
- **Solucion:** Implementado touch events (onTouchStart/Move/End) + botones ▲▼ como alternativa
- **Commits:** c31cacd, f6a79a3, bf84f2f

---

## PROBLEMA RESUELTO - Combinaciones de Terceros Lugares (2025-12-11)

### Sintoma original
Al seleccionar 8 terceros lugares, algunas combinaciones mostraban "Combinacion no valida"

### Solucion
- El CSV fuente (`combinations.csv`) tenia las 495 combinaciones correctas
- El archivo JS (`thirdPlaceCombinations.js`) se regenero desde el CSV
- **Commit:** `1aa620e` - Fix: Regenerate thirdPlaceCombinations.js from official FIFA CSV
- **Verificacion:** 495/495 combinaciones, 0 faltantes, 0 extra, asignaciones identicas al CSV

### Archivos
- `combinations.csv` - Fuente oficial FIFA (495 filas)
- `generate-combinations.js` - Script para regenerar el JS desde CSV
- `natalia-frontend/src/data/thirdPlaceCombinations.js` - Archivo corregido

---

## COMPLETADO - Fase 3.13: Rediseno UI

### Completado (primera ronda)
- [x] TopBar fijo con logo "Natalia" centrado
- [x] Eliminados breadcrumbs de todas las paginas
- [x] Botones Atras/Siguiente en header y footer
- [x] Predictions.jsx muestra todos los grupos juntos

### Completado (segunda ronda)
- [x] **TopBar mejorado**
   - Icono de menu hamburguesa a la IZQUIERDA con opciones: Nueva prediccion, Ver predicciones, Ranking, Grupos
   - Logo "Natalia" en el CENTRO
   - Icono de usuario a la DERECHA con menu dropdown: Cuenta, Salir
   - Menus solo visibles para usuarios logueados

- [x] **Home.jsx limpiado**
   - Eliminado "Hola, [nombre]"
   - Eliminado boton "Salir" (ahora esta en TopBar)

- [x] **Layout de botones navegacion**
   - Botones Atras/Siguiente en LINEA SEPARADA debajo del titulo
   - Atras pegado a la izquierda, Siguiente pegado a la derecha
   - Sin scroll horizontal en ninguna pagina

- [x] **Scroll to top**
   - Al hacer click en Siguiente o Atras, la pagina carga desde arriba
   - Implementado window.scrollTo(0, 0) en todas las navegaciones

---

## COMPLETADO - Fase 3.14: Mejoras UX

### Knockout.jsx
- [x] Boton "Siguiente" en rondas R32, R16, Cuartos, Semis
- [x] Boton "Finalizar" solo visible en la ronda Final
- [x] Ambos botones (top y bottom) respetan esta logica

### ThirdPlaces.jsx
- [x] Eliminado mensaje "Combinacion valida (Option X)"
- [x] Solo se muestra alerta cuando la combinacion NO es valida
- [x] Eliminada seccion de "Emparejamientos Round of 32" (se ve en Eliminatorias)

### PredictionDetail.jsx
- [x] Eliminado mensaje "Combinacion valida" en terceros lugares
- [x] Fix: Campeon muestra nombre real (ej: Italia) en vez de placeholder (Playoff Europa A)
- [x] Fix: Manejo de string vs number en IDs de equipos de repechaje
- [x] Ganadores de repechajes se muestran correctamente en la seccion de Repechajes

---

## COMPLETADO - Fase 3.15: Pagina Cuenta + Vista Predicciones

### Pagina Cuenta (NUEVA)
- [x] Ruta: `/cuenta`
- [x] Accesible desde TopBar (menu usuario → Cuenta)
- [x] Editar nombre de usuario
- [x] Ver email (no editable) y fecha de registro
- [x] Boton "Cerrar Sesion"
- [x] Backend: PUT /api/users/me actualiza nombre
- [x] AuthContext: `updateUser()` actualiza estado + localStorage

### PredictionDetail.jsx - Eliminatorias Reordenadas
- [x] Orden correcto: Dieciseisavos → Octavos → Cuartos → Semifinal → Ganador 3er Puesto → Campeon → Podio
- [x] Semifinal muestra solo los GANADORES (no los 4 semifinalistas)
- [x] Podio movido al final de la seccion

### Breadcrumbs Eliminados
- [x] Eliminado de PredictionDetail.jsx (loading state y main return)
- [x] Eliminado de MyPredictions.jsx (loading state y main return)

---

### 10. Repechajes no se guardaban (UNIQUE constraint violation)
- **Problema:** Al guardar repechajes, el backend daba error "duplicate key violates unique constraint"
- **Causa:** Los UNIQUE constraints en las tablas de predicciones NO incluian `prediction_set_id`
  - `playoff_predictions` tenia `UNIQUE (user_id, playoff_id)` - solo 1 prediccion por usuario
  - `group_predictions` tenia `UNIQUE (user_id, group_letter, team_id)`
  - `third_place_predictions` tenia `UNIQUE (user_id)`
  - `knockout_predictions` tenia `UNIQUE (user_id, match_key)`
- **Solucion:** Actualizados todos los constraints para incluir `prediction_set_id`:
  ```sql
  -- playoff_predictions: UNIQUE (user_id, prediction_set_id, playoff_id)
  -- group_predictions: UNIQUE (user_id, prediction_set_id, group_letter, predicted_position)
  -- third_place_predictions: UNIQUE (user_id, prediction_set_id)
  -- knockout_predictions: UNIQUE (user_id, prediction_set_id, match_key)
  ```
- **Datos Legacy:** Se borraron predicciones con `prediction_set_id IS NULL` (48 grupos, 1 terceros, 32 knockout)

---

## Cambios de Esta Sesion

### Backend
| Archivo | Cambio |
|---------|--------|
| `server.js` | CORS permite localhost y vercel.app |
| `routes/predictions.js` | Removido `OR prediction_set_id IS NULL` de todas las queries |
| **Database** | Constraints actualizados para incluir prediction_set_id en todas las tablas |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `.env.production` | NUEVO - VITE_API_URL para produccion |
| `vercel.json` | NUEVO - SPA rewrites |
| `src/context/AuthContext.jsx` | Console logs para debug (temporales) |
| `src/pages/Login.jsx` | Console logs para debug (temporales) |
| `src/pages/Home.jsx` | Boton "Comenzar" ahora crea prediction set antes de navegar |

---

## Flujo Correcto de Usuario

```
Home.jsx
    |
    +-> "Comenzar" -> Crea prediction set -> /repechajes?setId=X (en blanco)
    |
    +-> "Ver Mis Predicciones" -> /mis-predicciones
            |
            +-> "Nueva Prediccion" -> Dialog nombre -> /repechajes?setId=X (en blanco)
            +-> Card existente -> Ver/Editar/Duplicar/Eliminar
```

---

## Deploy a Produccion
- Codigo en GitHub: https://github.com/toc182/mundalia
- Frontend: https://mundalia.vercel.app
- Backend: https://mundalia-production.up.railway.app
- DB: Railway PostgreSQL (maglev.proxy.rlwy.net:32570)

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
     |         +-> "Crear y Comenzar" -> /repechajes?setId=X (en blanco)
     |
     +-> Card de prediccion existente
             |
             +-> "Ver" -> /prediccion/X
             +-> "Editar" -> /repechajes?setId=X (carga datos existentes)
             +-> "Duplicar" -> Crea copia
             +-> "Renombrar" -> Dialog
             +-> "Eliminar" -> Confirmacion

/repechajes?setId=X (empieza en blanco si es nuevo)
     |
     v
/grupos?setId=X (muestra equipos, sin colores hasta interactuar)
     |           (contador X/12 grupos, debe completar todos)
     v
/terceros?setId=X
     |
     v
/eliminatorias?setId=X
     |
     +-> "Finalizar" -> /prediccion/X
```

---

## Archivos Creados/Modificados

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
| `src/pages/Playoffs.jsx` | Sin fallback a localStorage cuando hay setId |
| `src/pages/Predictions.jsx` | Sin auto-relleno, contador X/12, validacion |
| `src/pages/ThirdPlaces.jsx` | Sin fallback a localStorage cuando hay setId |
| `src/pages/Knockout.jsx` | Sin fallback a localStorage cuando hay setId |
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

### Tablas (Verificadas en Produccion)
| Tabla | Estado | Descripcion |
|-------|--------|-------------|
| `users` | OK | Usuarios registrados |
| `teams` | OK | 48 equipos del Mundial |
| `prediction_sets` | OK | Sets de predicciones con nombre |
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
| `group_standings` | OK | Posiciones de grupos |

---

## Comportamiento de Guardado (Actualizado)

### Con setId (nueva prediccion o editando existente):
1. **Al cargar:** Solo carga del servidor para ese setId
2. **Sin fallback:** No usa localStorage (empieza en blanco si no hay datos)
3. **Al guardar:** Guarda en servidor con setId

### Sin setId (modo legacy):
1. **Al cargar:** Intenta localStorage
2. **Al guardar:** Guarda en localStorage

---

## TODO Pendiente

### Completado
- [x] Fase 1: Infraestructura API
- [x] Fase 2: Autenticacion
- [x] Fase 3: Predicciones (todas las paginas)
- [x] Fase 3.5: Multiples predicciones
- [x] Fase 3.6: Sin auto-relleno de localStorage
- [x] Deploy a produccion

### Pendiente (Media Prioridad)
- [ ] Fase 4: Leaderboard funcional (GET /api/leaderboard)
- [ ] Fase 5: Grupos privados (crear, unirse, ver ranking)
- [ ] Panel admin para cargar resultados reales

### Pendiente (Baja Prioridad)
- [ ] Calcular puntuaciones automaticamente
