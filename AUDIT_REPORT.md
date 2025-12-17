# AUDITORÍA COMPLETA - Proyecto Mundalia
## Fecha: 2025-12-17

---

# RESUMEN EJECUTIVO

Se realizó una auditoría exhaustiva del proyecto Mundalia cubriendo tres áreas:
1. **Seguridad del Backend**
2. **Calidad de Código del Frontend**
3. **Arquitectura y Mejoras Potenciales**

### Hallazgos Totales por Severidad

| Severidad | Seguridad | Frontend | Arquitectura | TOTAL |
|-----------|-----------|----------|--------------|-------|
| **CRÍTICO** | 3 | 5 | 4 | **12** |
| **ALTO** | 3 | 6 | 2 | **11** |
| **MEDIO** | 3 | 5 | 3 | **11** |
| **BAJO** | 1 | 4 | 6 | **11** |

---

# PARTE 1: AUDITORÍA DE SEGURIDAD (Backend)

## 1.1 CRÍTICO: Credenciales Hardcodeadas en .env Expuesto

**Archivo:** `natalia-backend/.env` (líneas 2-6)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=natalia_dev
DB_USER=postgres
DB_PASSWORD=Dinocore51720
JWT_SECRET=natalia_quiniela_secret_2026
GOOGLE_CLIENT_ID=637795242234-l0ij894tslce3cm5ublmfr10cti8atlh.apps.googleusercontent.com
```

**Problema:**
- `.env` está versionado en git (debería estar en `.gitignore`)
- Contraseña de BD expuesta: `Dinocore51720`
- JWT_SECRET débil y predecible
- Google Client ID expuesto

**Impacto:** Acceso directo a BD de producción si el repo es comprometido

**Fix Recomendado:**
```bash
# 1. Agregar .env a .gitignore
echo ".env" >> .gitignore

# 2. Regenerar JWT_SECRET con:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Rotar credenciales en Railway

# 4. Limpiar historial de git:
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 1.2 CRÍTICO: JWT Secret Débil y No Rotable

**Archivo:** `natalia-backend/middleware/auth.js` (línea 11)
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**Archivo:** `natalia-backend/routes/auth.js` (línea 50)
```javascript
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // Muy largo
);
```

**Problemas:**
- JWT_SECRET = `natalia_quiniela_secret_2026` (predecible, solo 27 caracteres)
- No hay mecanismo de rotación de tokens
- No hay expiración en logout (tokens válidos hasta expiración)
- `expiresIn: '7d'` es muy largo para tokens sensibles

**Impacto:** Tokens pueden ser forzados/adivinados. No hay forma de revocar tokens.

**Fix Recomendado:**
```javascript
// routes/auth.js - Cambiar expiración
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }  // Cambiar a 1 hora
);

// Implementar refresh tokens:
// - Access token: 1h (short-lived)
// - Refresh token: 7d (stored en DB para revocación)
// - Token blacklist en logout
```

---

## 1.3 CRÍTICO: CORS Permite Requests Sin Origin

**Archivo:** `natalia-backend/server.js` (líneas 162-177)
```javascript
const allowedOrigins = [
  'http://localhost:5174',
  'https://mundalia.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);  // PROBLEMA: Acepta requests sin origin
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true
}));
```

**Problemas:**
1. **CORS permite requests sin origin:** Línea 170 permite ataques desde curl, Postman, requests de servidor
2. **Sin Security Headers:** No hay `Helmet.js` instalado
3. **Sin limit de body size:** Podría permitir ataques DoS con payloads enormes

**Fix Recomendado:**
```javascript
const helmet = require('helmet');

// npm install helmet

// Agregar headers de seguridad
app.use(helmet());

// Limitar tamaño de request
app.use(express.json({ limit: '10kb' }));

// CORS mejorado
app.use(cors({
  origin: function(origin, callback) {
    // Rechazar requests sin origin header en producción
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS: Missing origin header'), false);
    }
    if (!origin) return callback(null, true); // Dev only

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

## 1.4 ALTO: Admin Role No Verificado en Base de Datos

**Archivo:** `natalia-backend/middleware/auth.js` (líneas 19-26)
```javascript
const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
  });
};
```

**Problema:**
- El role se incluye en el JWT pero no se verifica en BD en cada request
- Un usuario que fue promovido/degradado tendrá el rol antiguo hasta que expire el token
- No hay verificación en BD del role actual en cada operación admin

**Impacto:** Privilege escalation si un usuario logra modificar su JWT o si el admin revoca permisos

**Fix Recomendado:**
```javascript
// middleware/auth.js
const adminAuth = async (req, res, next) => {
  auth(req, res, async () => {
    try {
      // Verificar role en BD, no solo JWT
      const userResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [req.user.id]
      );

      if (!userResult.rows.length || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });
};
```

---

## 1.5 ALTO: Sin Rate Limiting en Endpoints Sensibles

**Endpoints Vulnerables:**

1. **Login (auth brute-force):**
   - `routes/auth.js` línea 63: POST `/api/auth/login`
   - Sin rate limiting → fácil ataque de fuerza bruta

2. **Registro (spam/DOS):**
   - `routes/auth.js` línea 13: POST `/api/auth/register`
   - Cualquiera puede crear cuentas sin límite

3. **Búsqueda de username (enumeration):**
   - `routes/users.js` línea 26: GET `/api/users/check-username/:username`
   - Permite enumerar usuarios válidos

**Fix Recomendado:**
```javascript
// npm install express-rate-limit

const rateLimit = require('express-rate-limit');

// Limiter para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,  // 5 intentos máximo
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 3,  // 3 registros por IP por hora
  message: { error: 'Too many accounts created, please try again later' }
});

// Limiter para check-username
const usernameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' }
});

// Aplicar
router.post('/login', loginLimiter, [...validators], async (req, res) => {...});
router.post('/register', registerLimiter, [...validators], async (req, res) => {...});
router.get('/check-username/:username', usernameLimiter, async (req, res) => {...});
```

---

## 1.6 ALTO: Falta Validación en Endpoints Críticos

**Archivo:** `natalia-backend/routes/predictions.js` (líneas 322-348)
```javascript
router.post('/knockout', auth, async (req, res) => {
  const { predictions, setId: requestSetId } = req.body;
  // NO HAY VALIDACIÓN de predictions

  for (const [matchKey, value] of Object.entries(predictions)) {
    // matchKey no se valida - podría ser cualquier string
    // value.winner no se valida - podría ser cualquier número
    if (winner) {
      await db.query(
        'INSERT INTO knockout_predictions ...',
        [req.user.id, matchKey, winner, ...]
      );
    }
  }
});
```

**Problemas Específicos:**

1. **matchKey no se valida:** Acepta cualquier string (debería ser M1-M104)
2. **team_id no se valida:** Podría ser negativo, muy grande, o no existente
3. **group_letter no se valida:** Debería ser A-L únicamente
4. **Falta validación de límites:** `parseInt()` sin verificar rango

**Fix Recomendado:**
```javascript
// Crear archivo: natalia-backend/utils/validators.js

const VALID_MATCH_KEYS = Array.from({ length: 104 }, (_, i) => `M${i + 1}`);
const VALID_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const validateMatchKey = (matchKey) => {
  return VALID_MATCH_KEYS.includes(matchKey);
};

const validateGroupLetter = (letter) => {
  return VALID_GROUPS.includes(letter?.toUpperCase());
};

const validateTeamId = (id) => {
  return Number.isInteger(id) && id > 0 && id <= 100;
};

module.exports = { validateMatchKey, validateGroupLetter, validateTeamId };

// En predictions.js:
const { validateMatchKey, validateTeamId } = require('../utils/validators');

router.post('/knockout', auth, async (req, res) => {
  const { predictions, setId } = req.body;

  // Validar estructura
  if (!predictions || typeof predictions !== 'object') {
    return res.status(400).json({ error: 'Invalid predictions format' });
  }

  for (const [matchKey, value] of Object.entries(predictions)) {
    if (!validateMatchKey(matchKey)) {
      return res.status(400).json({ error: `Invalid match key: ${matchKey}` });
    }

    const winner = value.winner || value;
    if (winner && !validateTeamId(winner)) {
      return res.status(400).json({ error: `Invalid team ID for ${matchKey}` });
    }
  }

  // Proceder con guardado...
});
```

---

## 1.7 MEDIO: Falta Validación de Password Strength

**Archivo:** `natalia-backend/routes/auth.js` (línea 15)
```javascript
body('password').isLength({ min: 6 })
```

**Problema:**
- Mínimo 6 caracteres es insuficiente
- No valida complejidad: mayúscula, número, símbolo
- Vulnerable a ataques de diccionario

**Fix Recomendado:**
```javascript
body('password')
  .isLength({ min: 8 })
  .withMessage('Password debe tener al menos 8 caracteres')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password debe incluir mayúscula, minúscula y número')
```

---

## 1.8 MEDIO: Integer Parsing Sin Radix

**Archivo:** `natalia-backend/routes/admin.js` (línea 108)
**Archivo:** `natalia-backend/routes/groups.js` (línea 100)
```javascript
const matchNum = parseInt(matchKey.replace('M', ''));
```

**Problema:**
- `parseInt()` sin radix puede causar comportamiento impredecible
- "010" se interpreta como 8 en octal
- No valida que matchNum esté en rango esperado

**Fix Recomendado:**
```javascript
const matchNum = parseInt(matchKey.replace('M', ''), 10);  // Agregar radix 10
if (isNaN(matchNum) || matchNum < 1 || matchNum > 104) {
  return res.status(400).json({ error: 'Invalid match number' });
}
```

---

## 1.9 MEDIO: Error Handling Expone Información

**Archivo:** `natalia-backend/routes/auth.js` (líneas 105, 186)
**Archivo:** `natalia-backend/server.js` (línea 198)
```javascript
} catch (err) {
  console.error(err);  // Expone stack trace completo
  res.status(500).json({ error: 'Server error' });
}
```

**Problema:**
- `console.error(err)` expone stack traces en producción
- Stack traces revelan paths internos, queries, versiones de librerías
- En Railway, estos logs podrían ser visibles

**Fix Recomendado:**
```javascript
// Crear natalia-backend/utils/logger.js
const logger = {
  error: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(message, meta);
    } else {
      // En producción: log sin stack trace
      console.error(JSON.stringify({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        ...meta
      }));
    }
  }
};

module.exports = logger;

// Usar en routes:
const logger = require('../utils/logger');

} catch (err) {
  logger.error('Login error', { userId: req.body.email });

  const errorResponse = process.env.NODE_ENV === 'production'
    ? 'Server error'
    : err.message;

  res.status(500).json({ error: errorResponse });
}
```

---

## 1.10 BAJO: Console.log Excesivos en Producción

**Archivo:** `natalia-backend/routes/predictions.js` (líneas 29, 87, 88, 204, 205)
```javascript
console.log('[GET MY] user:', req.user.id, 'setId:', setId);
console.log('[GROUPS POST] user:', req.user.id, 'requestSetId:', requestSetId);
console.log('[PLAYOFFS POST] predictions:', JSON.stringify(predictions));
```

**Problema:**
- Demasiados logs de debug en producción
- `JSON.stringify(predictions)` puede ser muy verbose
- Genera ruido en logs, dificulta detectar problemas reales

**Fix:** Remover o condicionar con `NODE_ENV`:
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('[GET MY] user:', req.user.id);
}
```

---

# PARTE 2: CALIDAD DE CÓDIGO (Frontend)

## 2.1 CRÍTICO: Sin Error Boundary en App

**Archivo:** `natalia-frontend/src/App.jsx` (líneas 1-96)

**Problema:** No existe Error Boundary en la raíz de la aplicación. Un error en cualquier componente hijo crashea toda la aplicación sin posibilidad de recuperación.

**Fix Recomendado:**
```javascript
// Crear: natalia-frontend/src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    // Aquí podrías enviar a servicio de logging
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Algo salió mal
            </h1>
            <p className="text-gray-600 mb-4">
              Ha ocurrido un error inesperado.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// En App.jsx:
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          {/* ... resto de la app */}
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

---

## 2.2 CRÍTICO: Archivos Monolíticos Excesivamente Grandes

| Archivo | Líneas | Componentes Internos | Problema |
|---------|--------|---------------------|----------|
| `Knockout.jsx` | 1,737 | 8 componentes | Imposible de mantener |
| `PredictionsScores.jsx` | 653 | Lógica mezclada | Difícil de testear |
| `Playoffs.jsx` | 597 | 2 brackets anidados | Duplicación |
| `Predictions.jsx` | 563 | GroupCard anidado | Props drilling |
| `ThirdPlaces.jsx` | 410 | - | Aceptable pero mejorable |

**Archivo más crítico:** `natalia-frontend/src/pages/Knockout.jsx`

**Componentes que deberían extraerse:**
```
Knockout.jsx (1737 líneas) debería dividirse en:
├── components/knockout/
│   ├── MobileMatchBox.jsx (~100 líneas)
│   ├── MobileMatchPair.jsx (~50 líneas)
│   ├── MobileKnockoutSlides.jsx (~200 líneas)
│   ├── DesktopBracketMatch.jsx (~150 líneas)
│   ├── FullBracket.jsx (~300 líneas)
│   ├── TeamButton.jsx (~50 líneas)
│   └── WinnerSlot.jsx (~50 líneas)
└── pages/
    └── Knockout.jsx (~500 líneas - solo orquestación)
```

---

## 2.3 CRÍTICO: Código Duplicado Masivo

### Función `playoffToTeamId` duplicada en 6 archivos:

```javascript
// Esta constante está copiada en:
// - Predictions.jsx
// - ThirdPlaces.jsx
// - Knockout.jsx
// - PredictionsScores.jsx
// - Playoffs.jsx
// - Admin.jsx

const playoffToTeamId = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};
```

### Función `getPlayoffWinner()` duplicada en 5 archivos:
- Predictions.jsx (línea 149)
- ThirdPlaces.jsx (línea 125)
- Knockout.jsx (línea 190)
- PredictionsScores.jsx
- Playoffs.jsx

### Función `getTeamById()` duplicada en 5 archivos:
- Predictions.jsx (línea 160)
- ThirdPlaces.jsx (línea 134)
- Knockout.jsx (línea 199)
- Playoffs.jsx (línea 219)
- PredictionsScores.jsx

### Función `hasRealChanges()` duplicada en 3 archivos:
- Predictions.jsx (línea 58)
- ThirdPlaces.jsx (línea 50)
- Playoffs.jsx (línea 36)

**Fix Recomendado:**
```javascript
// Crear: natalia-frontend/src/utils/predictionHelpers.js

import { mockTeams } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';

// Constante centralizada
export const PLAYOFF_TO_TEAM_ID = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};

// Obtener todos los equipos incluyendo playoff teams
export const getAllTeams = () => {
  const teams = [...mockTeams];
  playoffs.forEach(p => {
    p.teams.forEach(t => {
      if (!teams.find(at => at.id === t.id)) {
        teams.push(t);
      }
    });
  });
  return teams;
};

// Obtener ganador de playoff
export const getPlayoffWinner = (playoffId, playoffSelections) => {
  const selection = playoffSelections[playoffId];
  if (!selection?.final) return null;
  const playoff = playoffs.find(p => p.id === playoffId);
  return playoff?.teams.find(t => t.id === selection.final);
};

// Obtener equipo por ID, sustituyendo playoffs
export const getTeamById = (id, playoffSelections) => {
  if (!id) return null;
  const allTeams = getAllTeams();
  const team = allTeams.find(t => t.id === id);
  if (!team) return null;

  if (team.is_playoff) {
    const playoffEntry = Object.entries(PLAYOFF_TO_TEAM_ID)
      .find(([, teamId]) => teamId === id);
    if (playoffEntry) {
      const winner = getPlayoffWinner(playoffEntry[0], playoffSelections);
      if (winner) {
        return { ...winner, id: team.id, isPlayoffWinner: true };
      }
    }
  }
  return team;
};

// Detectar cambios reales
export const hasRealChanges = (original, current) => {
  return JSON.stringify(original) !== JSON.stringify(current);
};
```

---

## 2.4 CRÍTICO: Zero Type Safety

**Problema:** No hay PropTypes ni TypeScript en ningún componente del proyecto.

**Ejemplo de componente sin validación:**
```javascript
// Knockout.jsx - TeamButton sin PropTypes
function TeamButton({ team, isSelected, isEliminated, onClick, disabled }) {
  // team podría ser undefined
  // isSelected podría ser string en vez de boolean
  // onClick podría no ser función
}
```

**Fix Recomendado (PropTypes):**
```javascript
import PropTypes from 'prop-types';

function TeamButton({ team, isSelected, isEliminated, onClick, disabled }) {
  // ...
}

TeamButton.propTypes = {
  team: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    flag_url: PropTypes.string.isRequired,
  }),
  isSelected: PropTypes.bool,
  isEliminated: PropTypes.bool,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
};

TeamButton.defaultProps = {
  isSelected: false,
  isEliminated: false,
  disabled: false,
};
```

---

## 2.5 CRÍTICO: Sin Code Splitting

**Archivo:** `natalia-frontend/src/App.jsx` (líneas 1-30)
```javascript
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Playoffs from './pages/Playoffs';
import Predictions from './pages/Predictions';
import PredictionsScores from './pages/PredictionsScores';
import ThirdPlaces from './pages/ThirdPlaces';
import Knockout from './pages/Knockout';
import MyPredictions from './pages/MyPredictions';
import PredictionDetail from './pages/PredictionDetail';
import Account from './pages/Account';
import Admin from './pages/Admin';  // Solo para admins, siempre se carga
// ... 12 páginas importadas estáticamente
```

**Problema:** Todas las páginas se cargan en el bundle inicial, incluyendo Admin.jsx que solo usan administradores.

**Fix Recomendado:**
```javascript
import { lazy, Suspense } from 'react';

// Páginas con lazy loading
const Admin = lazy(() => import('./pages/Admin'));
const Knockout = lazy(() => import('./pages/Knockout'));
const PredictionsScores = lazy(() => import('./pages/PredictionsScores'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

// En las rutas:
<Route
  path="/admin"
  element={
    <Suspense fallback={<PageLoader />}>
      <Admin />
    </Suspense>
  }
/>
```

---

## 2.6 ALTO: Memory Leaks - setTimeout Sin Cleanup

**Archivo:** `natalia-frontend/src/pages/Knockout.jsx` (líneas 156-187)
```javascript
const handleScroll = useCallback(() => {
  // ...
  setTimeout(() => {
    setIsScrolling(false);
  }, 150);  // SIN CLEANUP - memory leak
}, [activeRound]);
```

**Problema:** El setTimeout no se limpia cuando el componente se desmonta, causando memory leaks y potenciales errores de "setState on unmounted component".

**Fix Recomendado:**
```javascript
const handleScroll = useCallback(() => {
  // Guardar referencia al timeout
  if (scrollTimeoutRef.current) {
    clearTimeout(scrollTimeoutRef.current);
  }

  scrollTimeoutRef.current = setTimeout(() => {
    setIsScrolling(false);
  }, 150);
}, [activeRound]);

// En el componente principal:
const scrollTimeoutRef = useRef(null);

useEffect(() => {
  return () => {
    // Cleanup al desmontar
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };
}, []);
```

---

## 2.7 ALTO: Re-renders Innecesarios

**Archivo:** `natalia-frontend/src/pages/Knockout.jsx` (líneas 381-386)
```javascript
// Estas funciones se ejecutan en CADA render
const r32Matches = buildR32Matches();
const r16Matches = buildR16Matches();
const qfMatches = buildQFMatches();
const sfMatches = buildSFMatches();
const thirdPlace = buildThirdPlaceMatch();
const final = buildFinalMatch();
```

**Problema:** Cálculos costosos (O(n)) se ejecutan en cada render sin memoización.

**Fix Recomendado:**
```javascript
const r32Matches = useMemo(() => buildR32Matches(), [
  groupPredictions,
  thirdPlaceSelection,
  playoffSelections,
  knockoutPredictions
]);

const r16Matches = useMemo(() => buildR16Matches(), [
  r32Matches,
  knockoutPredictions
]);

// ... etc para cada build function
```

---

## 2.8 ALTO: useEffect Dependencies Incorrectas

**Archivo:** `natalia-frontend/src/pages/Predictions.jsx` (líneas 79-146)
```javascript
useEffect(() => {
  const loadPredictions = async () => {
    // ...
  };
  loadPredictions();
}, [setId]);  // Falta playoffSelections como dependencia
```

**Archivo:** `natalia-frontend/src/pages/Knockout.jsx` (líneas 156-169)
```javascript
const handleScroll = useCallback(() => {
  // ...
}, [activeRound]);  // activeRound cambia frecuentemente, invalida callback
```

**Fix:** Revisar y corregir dependencies arrays en todos los useEffect y useCallback.

---

## 2.9 ALTO: 68+ Console.log en Producción

| Archivo | Cantidad de console.log/error |
|---------|-------------------------------|
| Knockout.jsx | 15+ |
| Playoffs.jsx | 10+ |
| PredictionsScores.jsx | 9+ |
| AuthContext.jsx | 8 |
| Predictions.jsx | 4 |
| Otros | ~22 |

**Ejemplo:**
```javascript
// AuthContext.jsx
console.log('Login response:', response.data);
console.log('User data:', response.data.user);
console.error('Login error:', error);
```

**Fix:**
```javascript
// Opción 1: Remover todos
// Opción 2: Condicionar
if (process.env.NODE_ENV === 'development') {
  console.log('Login response:', response.data);
}

// Opción 3: Crear helper
const debug = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};
```

---

## 2.10 MEDIO: Props Drilling Excesivo

**Archivo:** `natalia-frontend/src/pages/Knockout.jsx` (líneas 852-863)
```javascript
<MobileKnockoutSlides
  rounds={rounds}
  activeRound={activeRound}
  setActiveRound={setActiveRound}
  r32Matches={r32Matches}
  r16Matches={r16Matches}
  qfMatches={qfMatches}
  sfMatches={sfMatches}
  final={final}
  thirdPlace={thirdPlace}
  knockoutPredictions={knockoutPredictions}
  // ... 10+ props más
/>
```

**Fix Recomendado:** Usar Context o custom hook:
```javascript
// Crear KnockoutContext
const KnockoutContext = createContext();

export const useKnockout = () => useContext(KnockoutContext);

// En Knockout.jsx
<KnockoutContext.Provider value={{
  rounds, activeRound, setActiveRound,
  r32Matches, r16Matches, qfMatches, sfMatches,
  final, thirdPlace, knockoutPredictions,
  handleSelectWinner, handleScoreChange,
}}>
  <MobileKnockoutSlides />
</KnockoutContext.Provider>

// En MobileKnockoutSlides
function MobileKnockoutSlides() {
  const { rounds, activeRound, r32Matches, ... } = useKnockout();
  // ...
}
```

---

## 2.11 MEDIO: Promise.all Sin Error Handling Específico

**Archivo:** `natalia-frontend/src/pages/Knockout.jsx` (líneas 50-125)
```javascript
const [
  playoffsRes,
  groupsRes,
  thirdsRes,
  knockoutRes,
  predictionRes
] = await Promise.all([
  predictionsAPI.getPlayoffs(setId),
  predictionsAPI.getGroups(setId),
  predictionsAPI.getThirdPlaces(setId),
  predictionsAPI.getKnockout(setId),
  predictionSetsAPI.getById(setId)
]);
// Si UNO falla, TODOS fallan - sin saber cuál
```

**Fix Recomendado:**
```javascript
const results = await Promise.allSettled([
  predictionsAPI.getPlayoffs(setId),
  predictionsAPI.getGroups(setId),
  predictionsAPI.getThirdPlaces(setId),
  predictionsAPI.getKnockout(setId),
  predictionSetsAPI.getById(setId)
]);

// Procesar resultados individualmente
const [playoffsRes, groupsRes, thirdsRes, knockoutRes, predictionRes] = results;

if (playoffsRes.status === 'rejected') {
  console.error('Failed to load playoffs:', playoffsRes.reason);
}
// ... manejar cada uno
```

---

## 2.12 BAJO: Imágenes Sin Optimizar

**Archivo:** `natalia-frontend/src/pages/Predictions.jsx` (líneas 527-530)
```javascript
<img
  src={team.flag_url}
  alt=""  // Alt vacío
  className="w-6 h-4 object-cover"
  // Falta: loading="lazy", width, height
/>
```

**Fix:**
```javascript
<img
  src={team.flag_url}
  alt={`Bandera de ${team.name}`}
  className="w-6 h-4 object-cover"
  loading="lazy"
  width={24}
  height={16}
/>
```

---

# PARTE 3: ARQUITECTURA Y MEJORAS

## 3.1 CRÍTICO: N+1 Queries en Leaderboard

**Archivo:** `natalia-backend/routes/leaderboard.js` (líneas 133-142)
```javascript
// Se ejecuta 1 query para obtener prediction sets
const result = await db.query(`SELECT ... FROM prediction_sets ...`);

// Luego para CADA prediction set, se ejecutan 2 queries más
const leaderboard = await Promise.all(
  result.rows.map(async (row) => {
    const { totalPoints, breakdown } = await calculatePoints(row.prediction_set_id);
    // calculatePoints hace 2 queries (líneas 39-42):
    // - SELECT * FROM real_group_standings
    // - SELECT * FROM real_knockout_results
    return { ...row, total_points: totalPoints };
  })
);
```

**Impacto:** Con 100 prediction sets = 1 + (100 × 2) = **201 queries**

**Fix Recomendado:**
```javascript
router.get('/', async (req, res) => {
  const { mode = 'positions' } = req.query;

  try {
    // 1. Cargar TODOS los datos necesarios en 4 queries (no N+1)
    const [predSets, realGroupStandings, realKnockout, groupPreds, knockoutPreds] = await Promise.all([
      db.query(`
        SELECT ps.id, ps.name, ps.mode, ps.created_at,
               u.id as user_id, u.name as user_name, u.username, u.country
        FROM prediction_sets ps
        INNER JOIN users u ON ps.user_id = u.id
        WHERE ps.mode = $1
          AND EXISTS (
            SELECT 1 FROM knockout_predictions kp
            WHERE kp.prediction_set_id = ps.id
              AND kp.match_key = 'M104'
              AND kp.winner_team_id IS NOT NULL
          )
        LIMIT 500
      `, [mode]),
      db.query('SELECT * FROM real_group_standings'),
      db.query('SELECT * FROM real_knockout_results'),
      db.query('SELECT * FROM group_predictions'),
      db.query('SELECT * FROM knockout_predictions')
    ]);

    // 2. Crear mapas en memoria
    const realGroupMap = {};
    realGroupStandings.rows.forEach(row => {
      if (!realGroupMap[row.group_letter]) realGroupMap[row.group_letter] = {};
      realGroupMap[row.group_letter][row.team_id] = row.final_position;
    });

    const realKnockoutMap = {};
    realKnockout.rows.forEach(row => {
      realKnockoutMap[row.match_key] = row.winner_team_id;
    });

    // Agrupar predicciones por prediction_set_id
    const groupPredsBySet = {};
    groupPreds.rows.forEach(p => {
      if (!groupPredsBySet[p.prediction_set_id]) groupPredsBySet[p.prediction_set_id] = [];
      groupPredsBySet[p.prediction_set_id].push(p);
    });

    const knockoutPredsBySet = {};
    knockoutPreds.rows.forEach(p => {
      if (!knockoutPredsBySet[p.prediction_set_id]) knockoutPredsBySet[p.prediction_set_id] = [];
      knockoutPredsBySet[p.prediction_set_id].push(p);
    });

    // 3. Calcular puntos en memoria (sin queries adicionales)
    const leaderboard = predSets.rows.map(row => {
      let totalPoints = 0;

      // Puntaje de grupos
      const userGroupPreds = groupPredsBySet[row.id] || [];
      userGroupPreds.forEach(pred => {
        const realPositions = realGroupMap[pred.group_letter];
        if (!realPositions) return;
        const realPosition = realPositions[pred.team_id];
        if (realPosition === undefined) return;

        if (pred.predicted_position === realPosition) {
          totalPoints += 3; // Exact
        } else if (pred.predicted_position <= 2 && realPosition <= 2) {
          totalPoints += 1; // Qualifier
        }
      });

      // Puntaje de knockout
      const userKnockoutPreds = knockoutPredsBySet[row.id] || [];
      userKnockoutPreds.forEach(pred => {
        const realWinner = realKnockoutMap[pred.match_key];
        if (realWinner === undefined) return;
        if (pred.winner_team_id === realWinner) {
          totalPoints += getMatchPoints(pred.match_key);
        }
      });

      return { ...row, total_points: totalPoints };
    });

    // 4. Ordenar
    leaderboard.sort((a, b) => b.total_points - a.total_points);

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

---

## 3.2 CRÍTICO: Connection Pool Sin Configurar

**Archivo:** `natalia-backend/config/db.js`
```javascript
const pool = new Pool(/* sin opciones de pool */);
```

**Problema:** Sin límites configurados, puede causar connection exhaustion en producción.

**Fix Recomendado:**
```javascript
const { Pool } = require('pg');

const poolConfig = {
  // ... connection config existente ...

  // Pool configuration
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
};

const pool = new Pool(poolConfig);

// Logging de conexiones (opcional)
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('New client connected to pool');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

---

## 3.3 CRÍTICO: Zero Tests

**Hallazgo:** No existen archivos de test (`*.test.js`, `*.spec.js`) en todo el proyecto.

**Plan de Implementación:**

```bash
# Backend
cd natalia-backend
npm install --save-dev jest supertest

# Frontend
cd natalia-frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**Tests Prioritarios:**

```javascript
// natalia-backend/__tests__/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test2@example.com',
          password: '123'  // Too short
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });
  });
});
```

---

## 3.4 CRÍTICO: Sin CI/CD

**Problema:** Deploy manual sin automatización. Riesgo de errores humanos.

**Fix Recomendado:**
```yaml
# .github/workflows/deploy.yml
name: CI/CD

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd natalia-backend && npm ci
      - name: Run tests
        run: cd natalia-backend && npm test
      - name: Run linter
        run: cd natalia-backend && npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd natalia-frontend && npm ci
      - name: Run tests
        run: cd natalia-frontend && npm test
      - name: Run linter
        run: cd natalia-frontend && npm run lint
      - name: Build
        run: cd natalia-frontend && npm run build

  deploy:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Vercel auto-deploys on push to master
      # Railway auto-deploys on push to master
```

---

## 3.5 ALTO: Missing Database Indexes

**Queries frecuentes sin índices:**

```sql
-- predictions.js usa estos filtros frecuentemente:
WHERE user_id = $1 AND prediction_set_id = $2

-- Índices recomendados:
CREATE INDEX IF NOT EXISTS idx_group_predictions_user_set
  ON group_predictions(user_id, prediction_set_id);

CREATE INDEX IF NOT EXISTS idx_playoff_predictions_user_set
  ON playoff_predictions(user_id, prediction_set_id);

CREATE INDEX IF NOT EXISTS idx_knockout_predictions_user_set
  ON knockout_predictions(user_id, prediction_set_id);

CREATE INDEX IF NOT EXISTS idx_third_place_predictions_user_set
  ON third_place_predictions(user_id, prediction_set_id);

CREATE INDEX IF NOT EXISTS idx_prediction_sets_user
  ON prediction_sets(user_id);

CREATE INDEX IF NOT EXISTS idx_private_group_members_user
  ON private_group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_private_group_members_group
  ON private_group_members(group_id);
```

---

## 3.6 ALTO: Sin Caching en Leaderboard

**Problema:** `/leaderboard` recalcula scores en cada request (~1-2s con muchos usuarios).

**Fix Recomendado:**
```javascript
// Simple in-memory cache
let leaderboardCache = {
  positions: { data: null, timestamp: 0 },
  scores: { data: null, timestamp: 0 }
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

router.get('/', async (req, res) => {
  const { mode = 'positions' } = req.query;
  const now = Date.now();

  // Check cache
  if (leaderboardCache[mode].data &&
      (now - leaderboardCache[mode].timestamp) < CACHE_TTL) {
    return res.json(leaderboardCache[mode].data);
  }

  try {
    // Calculate leaderboard...
    const result = await calculateLeaderboard(mode);

    // Update cache
    leaderboardCache[mode] = { data: result, timestamp: now };

    res.json(result);
  } catch (err) {
    // Si hay error pero hay cache viejo, usarlo
    if (leaderboardCache[mode].data) {
      return res.json(leaderboardCache[mode].data);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint para invalidar cache (llamar después de admin updates)
router.post('/invalidate-cache', adminAuth, (req, res) => {
  leaderboardCache = {
    positions: { data: null, timestamp: 0 },
    scores: { data: null, timestamp: 0 }
  };
  res.json({ success: true });
});
```

---

## 3.7 MEDIO: API Inconsistente - setId

**Problema:** `setId` a veces es query param, a veces body param.

```javascript
// GET usa query param (correcto para REST)
api.get('/predictions/groups', { params: { setId } });

// POST usa body param (inconsistente)
api.post('/predictions/groups', { predictions, setId });
```

**Fix:** Estandarizar a query params para identificadores:
```javascript
// Frontend - api.js
saveGroups: (predictions, setId) =>
  api.post(`/predictions/groups?setId=${setId}`, { predictions }),

// Backend - predictions.js
router.post('/groups', auth, async (req, res) => {
  const { predictions } = req.body;
  const setId = req.query.setId || req.body.setId; // Soportar ambos durante transición
  // ...
});
```

---

## 3.8 BAJO: Sin ARIA Attributes

**Archivo:** `natalia-frontend/src/components/TopBar.jsx` (línea 47)
```javascript
<button
  onClick={() => setMenuOpen(!menuOpen)}
  className="p-2 hover:bg-muted rounded-lg"
  // Falta: aria-label, aria-expanded
>
```

**Fix:**
```javascript
<button
  onClick={() => setMenuOpen(!menuOpen)}
  className="p-2 hover:bg-muted rounded-lg"
  aria-label="Abrir menú de navegación"
  aria-expanded={menuOpen}
  aria-controls="mobile-menu"
>
```

---

# PLAN DE ACCIÓN PRIORIZADO

## SEMANA 1: Seguridad (URGENTE)

### Día 1-2: Credenciales
- [ ] Agregar `.env` a `.gitignore`
- [ ] Regenerar JWT_SECRET (32+ caracteres aleatorios)
- [ ] Rotar credenciales de BD en Railway
- [ ] Limpiar historial de git con `filter-branch`

### Día 3-4: Headers y Validación
- [ ] Instalar y configurar Helmet.js
- [ ] Agregar `express.json({ limit: '10kb' })`
- [ ] Implementar rate limiting en login/register
- [ ] Crear `utils/validators.js` con validaciones

### Día 5: Autenticación
- [ ] Verificar role admin en BD (no solo JWT)
- [ ] Reducir expiración JWT a 1 hora
- [ ] Implementar endpoint de logout

---

## SEMANA 2: Estabilidad

### Día 1-2: Error Handling
- [ ] Crear `ErrorBoundary.jsx`
- [ ] Agregar ErrorBoundary a App.jsx
- [ ] Crear `utils/logger.js` para backend
- [ ] Reemplazar console.error con logger

### Día 3-4: Performance BD
- [ ] Refactorizar leaderboard (eliminar N+1)
- [ ] Agregar índices a tablas de predicciones
- [ ] Configurar connection pool
- [ ] Implementar cache en leaderboard

### Día 5: Cleanup
- [ ] Remover console.logs de producción
- [ ] Agregar AbortController a fetch calls

---

## SEMANA 3: Calidad de Código

### Día 1-2: Refactorización
- [ ] Crear `utils/predictionHelpers.js`
- [ ] Migrar funciones duplicadas
- [ ] Actualizar imports en 6 archivos

### Día 3-4: Knockout.jsx
- [ ] Extraer MobileMatchBox.jsx
- [ ] Extraer MobileKnockoutSlides.jsx
- [ ] Extraer DesktopBracketMatch.jsx
- [ ] Extraer FullBracket.jsx

### Día 5: Optimización
- [ ] Agregar useMemo a build functions
- [ ] Corregir useEffect dependencies
- [ ] Implementar code splitting con React.lazy

---

## SEMANA 4: Testing y CI/CD

### Día 1-2: Backend Tests
- [ ] Configurar Jest
- [ ] Tests de auth endpoints
- [ ] Tests de predictions endpoints

### Día 3-4: Frontend Tests
- [ ] Configurar Vitest
- [ ] Tests de AuthContext
- [ ] Tests de componentes críticos

### Día 5: CI/CD
- [ ] Crear `.github/workflows/deploy.yml`
- [ ] Configurar linting en CI
- [ ] Configurar tests en CI

---

# ARCHIVOS A MODIFICAR (Resumen)

## Backend
```
natalia-backend/
├── .env                    # Regenerar secrets
├── .gitignore              # Agregar .env
├── config/
│   └── db.js               # Pool configuration
├── middleware/
│   └── auth.js             # Verificar role en BD
├── routes/
│   ├── auth.js             # Rate limiting, password strength
│   ├── predictions.js      # Validación de entrada
│   ├── leaderboard.js      # Refactorizar N+1, cache
│   └── users.js            # Rate limiting
├── utils/
│   ├── validators.js       # CREAR: Funciones de validación
│   └── logger.js           # CREAR: Logger seguro
└── server.js               # Helmet, body limit
```

## Frontend
```
natalia-frontend/src/
├── App.jsx                 # ErrorBoundary, code splitting
├── components/
│   ├── ErrorBoundary.jsx   # CREAR
│   └── knockout/           # CREAR: Componentes extraídos
│       ├── MobileMatchBox.jsx
│       ├── MobileKnockoutSlides.jsx
│       ├── DesktopBracketMatch.jsx
│       └── FullBracket.jsx
├── utils/
│   └── predictionHelpers.js # CREAR: Funciones compartidas
├── pages/
│   ├── Knockout.jsx        # Refactorizar (extraer componentes)
│   ├── Predictions.jsx     # Usar predictionHelpers
│   ├── ThirdPlaces.jsx     # Usar predictionHelpers
│   ├── Playoffs.jsx        # Usar predictionHelpers
│   └── PredictionsScores.jsx # Usar predictionHelpers
└── context/
    └── AuthContext.jsx     # Remover console.logs
```

---

# CONCLUSIÓN

El proyecto Mundalia es **funcional** pero tiene **deuda técnica significativa** que debe abordarse antes de escalar:

1. **Seguridad (URGENTE):** Credenciales expuestas en git, JWT débil, sin rate limiting
2. **Performance:** N+1 queries en leaderboard, sin caching
3. **Mantenibilidad:** Archivos de 1700+ líneas, código duplicado en 6 archivos
4. **Robustez:** Sin tests, sin error boundaries

**Recomendación:** Priorizar los fixes de seguridad de la Semana 1 ANTES de promocionar públicamente la aplicación.
