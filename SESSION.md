# SESSION.md - Estado Actual del Proyecto

## Ultima Actualizacion: 2025-12-16

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

### Pendiente (Prioridad Media)
| Feature | Descripcion |
|---------|-------------|
| Leaderboard | Ranking global funcional con puntuaciones |
| Grupos privados | Crear grupos, compartir codigo, ranking interno |
| Panel admin | Cargar resultados reales de partidos |

---

## Resumen Tecnico

### Fases Completadas
- [x] Fase 1: Infraestructura API
- [x] Fase 2: Autenticacion
- [x] Fase 3: Predicciones completas
- [x] Fase 3.5-3.18: Mejoras UX y fixes
- [x] Fase 3.19: Branding Mundalia + tema azul
- [x] Fase 6: Deploy produccion

### Fases Pendientes
- [ ] Fase 4: Leaderboard funcional
- [ ] Fase 5: Grupos privados
- [ ] Fase 7: Panel admin

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

### Inconsistencia al Regresar a Fases Anteriores (Modo Posiciones)
**Problema:** En el modo "Posiciones" (escoger ganadores sin marcadores), si el usuario:
1. Completa todas las fases (Repechajes → Grupos → Terceros → Eliminatorias)
2. Regresa a una fase anterior (ej: Grupos)
3. Hace cambios que afectan fases futuras (ej: cambia quien queda 1ro/2do)
4. Los picks de eliminatorias quedan inconsistentes - el equipo seleccionado como ganador ya no existe en ese partido

**Ejemplo:**
- Usuario puso Argentina 1ro en Grupo A, avanza a R32, lo elige ganador de M73
- Usuario regresa a Grupos, pone Argentina 2do (ahora va a otro partido)
- M73 sigue mostrando Argentina como ganador pero Argentina ya no esta en ese partido

**Soluciones posibles:**
1. **Detectar cambios y resetear:** Al guardar cambios en una fase, detectar si afectan fases futuras y resetear esas predicciones (como ya hacemos en modo Marcadores para el bracket)
2. **Bloquear edicion:** Una vez completada una prediccion, no permitir editar fases anteriores
3. **Warning modal:** Mostrar advertencia "Estos cambios afectaran tus picks de eliminatorias. Continuar?"
4. **Validacion al finalizar:** Al intentar finalizar, validar que todos los picks son consistentes

**Archivos afectados:** Playoffs.jsx, Predictions.jsx, ThirdPlaces.jsx, Knockout.jsx

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
| Tarea | Descripcion | Archivos |
|-------|-------------|----------|
| Inconsistencia modo Posiciones | Al regresar a fases anteriores y hacer cambios, los picks de eliminatorias quedan invalidos | Playoffs.jsx, Predictions.jsx, ThirdPlaces.jsx, Knockout.jsx |

### Prioridad Media (Features)
| Feature | Descripcion |
|---------|-------------|
| Leaderboard | Ranking global funcional con puntuaciones reales |
| Grupos privados | Crear grupos, compartir codigo de invitacion, ranking interno |
| Panel admin | Cargar resultados reales de partidos jugados |

### Prioridad Baja (Nice to have)
| Mejora | Descripcion |
|--------|-------------|
| Tab navigation mejorada | Tab entre inputs de score (actualmente funciona pero podria ser mas fluido) |
