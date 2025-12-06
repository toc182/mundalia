# CLAUDE.md - Instrucciones para Claude

## Proyecto: Natalia - Quiniela Mundial 2026

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
├── CLAUDE.md          # Instrucciones tecnicas (este archivo)
├── SESSION.md         # Estado actual y TODO list
├── START.md           # Instrucciones de inicio rapido
├── natalia-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # 10 componentes shadcn/ui
│   │   │   └── Navbar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── data/
│   │   │   ├── mockData.js      # 48 equipos en 12 grupos
│   │   │   └── playoffsData.js  # 6 playoffs (4 UEFA + 2 FIFA)
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Predictions.jsx  # Predicciones de grupos
│   │   │   ├── Playoffs.jsx     # Predicciones de repechajes
│   │   │   ├── Leaderboard.jsx
│   │   │   └── Groups.jsx       # Grupos privados
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── natalia-backend/
    ├── config/
    │   └── db.js
    ├── middleware/
    │   └── auth.js
    ├── routes/
    │   ├── auth.js
    │   ├── users.js
    │   ├── teams.js
    │   ├── matches.js
    │   ├── predictions.js
    │   ├── groups.js
    │   └── leaderboard.js
    ├── database/
    │   ├── schema.sql
    │   └── seed-teams.sql
    ├── .env.example
    ├── package.json
    └── server.js
```

---

## Puertos (FIJOS - NUNCA CAMBIAR)
- **Frontend:** 5174
- **Backend:** 5000

### URLs de Desarrollo
- Frontend: http://localhost:5174
- Backend API: http://localhost:5000/api

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
6. Los datos mock estan en src/data/mockData.js y playoffsData.js

---

## Comandos

```bash
# Frontend
cd natalia-frontend
npm run dev      # Inicia en puerto 5174

# Backend
cd natalia-backend
npm run dev      # Inicia en puerto 5000 (nodemon)
npm start        # Produccion
```

---

## Modelo de Datos

### Tablas PostgreSQL
- **users**: id, name, email, password_hash, role (user/admin)
- **teams**: id, name, code, group_letter, flag_url, is_playoff
- **matches**: id, team_a_id, team_b_id, stage, match_date, winner_id
- **group_predictions**: user_id, group_letter, team_positions (JSON)
- **match_predictions**: user_id, match_id, predicted_winner_id
- **private_groups**: id, name, code, created_by
- **user_groups**: user_id, group_id
- **user_scores**: user_id, total_points, breakdown (JSON)

### Sistema de Puntos
| Prediccion | Puntos |
|------------|--------|
| Posicion exacta en grupo | 3 pts |
| Equipo que clasifica (top 2) | 1 pt |
| Ganador Octavos | 2 pts |
| Ganador Cuartos | 4 pts |
| Ganador Semifinal | 6 pts |
| Finalista | 8 pts |
| Campeon | 15 pts |

---

## Rutas del Frontend

| Ruta | Pagina | Requiere Auth | Descripcion |
|------|--------|---------------|-------------|
| `/` | Home | No | Info del torneo y sistema de puntos |
| `/login` | Login | No | Formulario de inicio de sesion |
| `/register` | Register | No | Formulario de registro |
| `/predictions` | Predictions | Si | Ordenar equipos por grupo (drag & drop) |
| `/playoffs` | Playoffs | Si | Predecir ganadores de repechajes |
| `/leaderboard` | Leaderboard | No | Ranking global de jugadores |
| `/groups` | Groups | Si | Crear/unirse a grupos privados |

---

## Rutas del Backend API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/users/me` | Usuario actual (auth) |
| GET | `/api/teams` | Todos los equipos |
| GET | `/api/teams/group/:letter` | Equipos por grupo |
| GET | `/api/matches` | Todos los partidos |
| GET | `/api/predictions/my` | Mis predicciones (auth) |
| POST | `/api/predictions/groups` | Guardar prediccion grupos (auth) |
| POST | `/api/predictions/match` | Guardar prediccion partido (auth) |
| GET | `/api/groups` | Mis grupos privados (auth) |
| POST | `/api/groups` | Crear grupo (auth) |
| POST | `/api/groups/join` | Unirse a grupo (auth) |
| GET | `/api/leaderboard` | Ranking global |

---

## Almacenamiento Local (Modo Mock)

Mientras no hay backend conectado, todo se guarda en localStorage:
- `natalia_user` - Usuario logueado
- `natalia_predictions` - Predicciones de grupos
- `natalia_playoffs` - Predicciones de repechajes

---

## Datos del Mundial 2026

### Grupos (12 grupos, A-L, 4 equipos cada uno)
Datos actualizados con sorteo oficial del 5 de diciembre 2025.
Ver `src/data/mockData.js` para lista completa.

### Playoffs/Repechajes (6 total)
- **UEFA A-D**: 4 playoffs europeos (4 equipos cada uno, semifinal + final)
- **FIFA 1-2**: 2 playoffs intercontinentales (3 equipos cada uno)
Ver `src/data/playoffsData.js` para detalles.

---

## Funcionalidades MVP

1. [x] Registro/Login de usuarios
2. [x] Prediccion de orden en grupos (antes del torneo)
3. [x] Prediccion de ganadores en playoffs/repechajes
4. [x] Leaderboard global
5. [x] Grupos privados con codigo de invitacion
6. [ ] Panel admin para cargar resultados reales
7. [ ] Conexion con backend real (PostgreSQL)
