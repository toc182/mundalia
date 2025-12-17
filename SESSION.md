# SESSION.md - Estado Actual del Proyecto

## Ultima Actualizacion: 2025-12-17

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

### Backend (natalia-backend/)
```
├── config/
│   └── db.js            # PostgreSQL pool (dev/prod conditional)
├── middleware/
│   └── auth.js          # JWT verification
├── routes/
│   ├── auth.js          # login, register
│   ├── users.js         # me, update profile
│   ├── predictions.js   # groups, playoffs, thirds, knockout
│   └── predictionSets.js # CRUD prediction sets
└── server.js            # Express + CORS
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
DB_PASSWORD=Dinocore51720
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
*Ninguna pendiente* - Todas las tareas de alta prioridad han sido completadas.

### Prioridad Media (Features)
*Ninguna pendiente* - El sistema está 100% funcional.

### Prioridad Baja (Nice to have)
| Feature | Descripcion |
|---------|-------------|
| Puntos en grupos privados | Mostrar desglose de puntos en ranking de grupos |

---

## Tareas Completadas Recientemente

| Fecha | Tarea | Descripcion |
|-------|-------|-------------|
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
