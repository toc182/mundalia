# Mundalia - Quiniela Mundial 2026

Aplicación web para predecir resultados del Mundial de Fútbol 2026 (USA, México, Canadá).

## Demo

- **Frontend:** https://mundalia.vercel.app
- **Backend:** https://mundalia-production.up.railway.app/api

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui |
| Backend | Express 5, Node.js |
| Base de datos | PostgreSQL |
| Auth | JWT + bcryptjs |
| Deploy | Vercel (frontend), Railway (backend + DB) |

## Características

- Predicción de repechajes (6 playoffs)
- Predicción de posiciones en grupos (12 grupos, drag & drop)
- Selección de mejores terceros (495 combinaciones FIFA)
- Bracket de eliminatorias completo (R32 a Final)
- Múltiples predicciones por usuario
- Grupos privados con código de invitación
- Leaderboard global
- Panel de administración

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd Natalia

# Backend
cd natalia-backend
npm install
cp .env.example .env  # Configurar variables
npm run dev           # Puerto 5001

# Frontend (nueva terminal)
cd natalia-frontend
npm install
npm run dev           # Puerto 5174
```

## Variables de Entorno

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mundalia
DB_USER=postgres
DB_PASSWORD=<tu-password>
JWT_SECRET=<secreto-aleatorio-32-chars>
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001/api
```

## Scripts

### Backend
```bash
npm run dev    # Desarrollo con nodemon
npm start      # Producción
npm test       # Ejecutar tests
```

### Frontend
```bash
npm run dev    # Desarrollo
npm run build  # Build producción
npm run lint   # Linter
```

## Estructura del Proyecto

```
Natalia/
├── natalia-frontend/     # React SPA
│   ├── src/
│   │   ├── components/   # Componentes UI
│   │   ├── context/      # AuthContext
│   │   ├── data/         # Datos estáticos (equipos, grupos)
│   │   ├── pages/        # Páginas/rutas
│   │   └── services/     # API client
│   └── ...
├── natalia-backend/      # Express API
│   ├── config/           # Configuración BD
│   ├── middleware/       # Auth middleware
│   ├── routes/           # Endpoints API
│   ├── utils/            # Helpers
│   └── __tests__/        # Tests
├── CLAUDE.md             # Documentación técnica
└── SESSION.md            # Estado del proyecto
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Login con Google

### Predicciones
- `GET/POST /api/predictions/groups` - Grupos
- `GET/POST /api/predictions/playoffs` - Repechajes
- `GET/POST /api/predictions/third-places` - Terceros
- `GET/POST /api/predictions/knockout` - Eliminatorias

### Prediction Sets
- `GET/POST /api/prediction-sets` - CRUD sets
- `POST /api/prediction-sets/:id/duplicate` - Duplicar

### Leaderboard
- `GET /api/leaderboard` - Ranking global
- `GET /api/groups/:id/leaderboard` - Ranking grupo privado

## Sistema de Puntos

| Predicción | Puntos |
|------------|--------|
| Posición exacta en grupo | 3 |
| Equipo que clasifica (top 2) | 1 |
| Ganador Dieciseisavos | 1 |
| Ganador Octavos | 2 |
| Ganador Cuartos | 4 |
| Ganador Semifinal | 6 |
| Finalista | 8 |
| Campeón | 15 |

## Licencia

MIT
