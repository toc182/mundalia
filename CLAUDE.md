# CLAUDE.md - Instrucciones para Claude

## Proyecto: Mundalia - Quiniela Mundial 2026

### Stack Tecnologico
- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4.x + shadcn/ui
- **Backend:** Express 5 + Node.js
- **Base de datos:** PostgreSQL (pg 8.x)
- **Auth:** JWT + bcryptjs
- **Deploy:** Frontend en Vercel, Backend + DB en Railway

---

## Estructura del Proyecto

```
Natalia/
├── CLAUDE.md              # Instrucciones tecnicas (este archivo)
├── SESSION.md             # Estado actual y TODO list
├── natalia-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   └── TopBar.jsx         # Logo Mundalia + menus
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # JWT auth + user state
│   │   ├── data/
│   │   │   ├── mockData.js        # 48 equipos en 12 grupos
│   │   │   ├── playoffsData.js    # 6 playoffs (4 UEFA + 2 FIFA)
│   │   │   ├── knockoutBracket.js # Estructura eliminatorias
│   │   │   └── thirdPlaceCombinations.js # 495 combinaciones FIFA
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Playoffs.jsx       # Paso 1: Repechajes
│   │   │   ├── Predictions.jsx    # Paso 2: Grupos
│   │   │   ├── ThirdPlaces.jsx    # Paso 3: Terceros lugares
│   │   │   ├── Knockout.jsx       # Paso 4: Eliminatorias
│   │   │   ├── MyPredictions.jsx  # Lista de predicciones
│   │   │   ├── PredictionDetail.jsx # Ver prediccion completa
│   │   │   └── Account.jsx        # Pagina de cuenta
│   │   ├── services/
│   │   │   └── api.js             # Axios config + endpoints
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── natalia-backend/
    ├── config/
    │   └── db.js                  # PostgreSQL pool (dev/prod conditional)
    ├── middleware/
    │   └── auth.js                # JWT verification
    ├── routes/
    │   ├── auth.js                # login, register
    │   ├── users.js               # me, update profile
    │   ├── predictions.js         # groups, playoffs, thirds, knockout
    │   └── predictionSets.js      # CRUD prediction sets
    ├── .env
    ├── package.json
    └── server.js

```

---

## Puertos (FIJOS - NUNCA CAMBIAR)
- **Frontend:** 5174
- **Backend:** 5001

### URLs de Desarrollo
- Frontend: http://localhost:5174
- Backend API: http://localhost:5001/api

### URLs de Produccion
- Frontend: https://mundalia.vercel.app
- Backend: https://mundalia-production.up.railway.app/api

---

## Dependencias Instaladas

### Frontend (natalia-frontend/package.json)
```
react: 19.2.0
react-dom: 19.2.0
react-router-dom: 7.10.1
axios: 1.13.2
tailwindcss: 4.1.17
@tailwindcss/vite: 4.1.17
vite: 7.2.4
lucide-react: 0.556.0
class-variance-authority, clsx, tailwind-merge
@radix-ui/react-dialog, react-label, react-select, react-slot
```

### Backend (natalia-backend/package.json)
```
express: 5.2.1
pg: 8.16.3
jsonwebtoken: 9.0.3
bcryptjs: 3.0.3
cors: 2.8.5
dotenv: 17.2.3
express-validator: 7.3.1
nodemon: 3.1.11 (dev)
```

### Componentes shadcn/ui instalados
alert, badge, button, card, dialog, input, label, select, table, textarea

---

## Reglas de Trabajo
1. SIEMPRE preguntar antes de implementar cambios significativos
2. NUNCA usar !important en CSS
3. Usar solo componentes shadcn/ui + clases Tailwind
4. NO crear archivos CSS adicionales (solo index.css)
5. Actualizar SESSION.md con cada cambio significativo
6. Los datos mock estan en src/data/
7. **MIGRACIONES:** Si haces cambios de BD, agregarlos a `migrations.sql`

---

## Migraciones de Base de Datos (IMPORTANTE)

**Problema:** Git solo sube codigo, NO cambios de base de datos. Si agregas columnas o tablas en desarrollo, debes aplicarlas manualmente en produccion.

**Archivo:** `natalia-backend/migrations.sql`

**Proceso al hacer cambios de BD:**

1. Ejecutar el SQL en tu BD local
2. Agregar el SQL al final de `migrations.sql` con fecha y descripcion
3. Hacer commit y push
4. **IMPORTANTE:** Ejecutar el nuevo SQL en Railway:
   - Railway Dashboard → PostgreSQL → Data/Query
   - Pegar y ejecutar solo las nuevas migraciones

**Ejemplo de migracion:**
```sql
-- ============================================
-- MIGRACION XXX: Descripcion del cambio
-- Fecha: YYYY-MM-DD
-- ============================================

ALTER TABLE tabla ADD COLUMN IF NOT EXISTS columna TIPO DEFAULT valor;
```

---

## Comandos

```bash
# Frontend
cd natalia-frontend
npm run dev      # Inicia en puerto 5174

# Backend
cd natalia-backend
npm run dev      # Inicia en puerto 5001 (nodemon)
npm start        # Produccion
```

---

## Modelo de Datos

### Tablas PostgreSQL
- **users**: id, name, email, password_hash, created_at
- **teams**: id, name, code, group_letter, flag_url, is_playoff
- **prediction_sets**: id, user_id, name, is_active, created_at
- **playoff_predictions**: id, user_id, prediction_set_id, playoff_id, winner_team_id
- **group_predictions**: id, user_id, prediction_set_id, group_letter, team_id, predicted_position
- **third_place_predictions**: id, user_id, prediction_set_id, selected_groups, combination_key
- **knockout_predictions**: id, user_id, prediction_set_id, match_key, winner_team_id

### Sistema de Puntos
| Prediccion | Puntos |
|------------|--------|
| Posicion exacta en grupo | 3 pts |
| Equipo que clasifica (top 2) | 1 pt |
| Ganador Dieciseisavos | 1 pt |
| Ganador Octavos | 2 pts |
| Ganador Cuartos | 4 pts |
| Ganador Semifinal | 6 pts |
| Finalista | 8 pts |
| Campeon | 15 pts |

---

## Rutas del Frontend

| Ruta | Pagina | Requiere Auth | Descripcion |
|------|--------|---------------|-------------|
| `/` | Home | No | Info del torneo y acciones principales |
| `/login` | Login | No | Formulario de inicio de sesion |
| `/register` | Register | No | Formulario de registro |
| `/repechajes` | Playoffs | Si | Paso 1: Predecir ganadores repechajes |
| `/grupos` | Predictions | Si | Paso 2: Ordenar equipos por grupo |
| `/terceros` | ThirdPlaces | Si | Paso 3: Seleccionar 8 mejores terceros |
| `/eliminatorias` | Knockout | Si | Paso 4: Bracket completo R32 a Final |
| `/mis-predicciones` | MyPredictions | Si | Lista de predicciones del usuario |
| `/prediccion/:id` | PredictionDetail | Si | Ver prediccion completa |
| `/cuenta` | Account | Si | Editar perfil de usuario |

---

## Rutas del Backend API

### Autenticacion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/users/me` | Usuario actual (auth) |
| PUT | `/api/users/me` | Actualizar perfil (auth) |

### Prediction Sets
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/prediction-sets` | Lista sets del usuario (auth) |
| GET | `/api/prediction-sets/:id` | Detalle de un set (auth) |
| POST | `/api/prediction-sets` | Crear nuevo set (auth) |
| PUT | `/api/prediction-sets/:id` | Renombrar set (auth) |
| DELETE | `/api/prediction-sets/:id` | Eliminar set (auth) |

### Predicciones (todas requieren auth y ?setId=X)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/predictions/playoffs` | Obtener predicciones repechajes |
| POST | `/api/predictions/playoffs` | Guardar predicciones repechajes |
| GET | `/api/predictions/groups` | Obtener predicciones grupos |
| POST | `/api/predictions/groups` | Guardar predicciones grupos |
| GET | `/api/predictions/third-places` | Obtener prediccion terceros |
| POST | `/api/predictions/third-places` | Guardar prediccion terceros |
| GET | `/api/predictions/knockout` | Obtener predicciones eliminatorias |
| POST | `/api/predictions/knockout` | Guardar predicciones eliminatorias |

---

## Configuracion Base de Datos

### Desarrollo Local
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natalia_dev
DB_USER=postgres
DB_PASSWORD=<TU_PASSWORD_LOCAL>
```
**NOTA:** Las credenciales reales están en el archivo `.env` local (no commiteado a git).

### Produccion (Railway)
- `DATABASE_URL` auto-inyectada por Railway
- El archivo `config/db.js` detecta automaticamente cual usar

---

## Datos del Mundial 2026

### Grupos (12 grupos, A-L, 4 equipos cada uno)
Datos actualizados con sorteo oficial del 5 de diciembre 2025.
Ver `src/data/mockData.js` para lista completa.

### Playoffs/Repechajes (6 total)
- **UEFA A-D**: 4 playoffs europeos (4 equipos cada uno, semifinal + final)
- **FIFA 1-2**: 2 playoffs intercontinentales (3 equipos cada uno)
Ver `src/data/playoffsData.js` para detalles.

### Terceros Lugares
- 495 combinaciones validas segun reglas FIFA
- Ver `src/data/thirdPlaceCombinations.js`
- Script regenerador: `generate-combinations.js`

### Eliminatorias (Knockout)
- Estructura completa en `src/data/knockoutBracket.js`
- R32 (16 partidos) → R16 (8) → QF (4) → SF (2) → 3er puesto + Final
- El mapeo NO es secuencial (M73+M75→M90, M74+M77→M89, etc.)

---

## Funcionalidades

### Primera Etapa (COMPLETADA)
1. [x] Registro/Login de usuarios
2. [x] Prediccion de repechajes (6 playoffs)
3. [x] Prediccion de grupos (12 grupos, drag & drop)
4. [x] Prediccion de terceros lugares (495 combinaciones)
5. [x] Prediccion de eliminatorias (bracket completo)
6. [x] Multiples predicciones por usuario
7. [x] Ver/Editar predicciones
8. [x] Pagina de cuenta
9. [x] Deploy a produccion

### Segunda Etapa (COMPLETADA)
1. [x] Leaderboard global funcional
2. [x] Grupos privados con codigo de invitacion
3. [x] Panel admin para cargar resultados reales
4. [x] Calculo automatico de puntuaciones
5. [x] Google OAuth login
6. [x] Modo Marcadores Exactos
7. [x] Timer countdown al Mundial
8. [x] Cierre automatico de predicciones

### Tercera Etapa (PENDIENTE)
1. [ ] Soporte multi-idioma (ES, EN, PT, FR, DE, ZH)
2. [ ] Config modos prediccion (admin elige modos disponibles)
