# SESSION.md - Estado Actual del Proyecto Mundalia

## Ultima Actualizacion: 2026-06-09

---

## Cambios - 2026-06-09

### Consolidacion del deadline de predicciones

Existian dos keys de deadline en conflicto. Ahora hay una sola fuente de verdad:
`predictions_deadline` (la que controla el admin y muestra el contador), aplicada a
TODOS los guardados de prediccion. Valor: `2026-06-11T18:50:00Z` (1:50 PM Panama, 10
min antes del primer partido).

- Backend: nuevo `utils/deadline.ts` (`predictionsClosed()`). Se bloquean con
  `403 DEADLINE_PASSED`: guardar grupos (antes 400), terceros, eliminatorias, marcadores,
  desempates, resets, y **duplicar** prediccion. La key vieja `group_predictions_deadline`
  se elimina (migracion 014 en server.ts + migrations.sql; schema.sql actualizado).
- Frontend: banner "predicciones cerradas" + bloqueo de guardado en las 4 paginas de
  prediccion (`PredictionsClosedBanner`); el reclamo de invitado (guestClaim) se bloquea
  tras el cierre y limpia el set vacio. `POST /predictions/match` queda igual (legacy).
- Tests: 199 en verde (nuevos: bloqueo por deadline en saves y en duplicar). Jest ahora
  corre en serie (`maxWorkers: 1`) por compartir BD/estado global.
- Spec/plan: `docs/superpowers/specs/...` + plan de consolidacion.

## Cambios - 2026-06-08

### Asociacion de predicciones a grupos (a nivel de prediccion)

Antes los grupos privados puntuaban por usuario (mejor set automatico). Ahora la
asociacion es a nivel de prediccion (muchos-a-muchos): una prediccion puede vincularse
a varios grupos y un usuario puede vincular varias de sus predicciones al mismo grupo.

- Nueva tabla `group_prediction_links` (migracion 013, auto en server.ts + migrations.sql).
- Backend (`routes/groups.ts`): extraido `calculateScoresForSets`; nuevos endpoints
  `GET /:id`, `GET /:id/linkable`, `POST /:id/predictions`, `DELETE /:id/predictions/:publicId`;
  `GET /:id/leaderboard` ahora devuelve una fila por prediccion vinculada.
- Frontend: nueva pagina `GroupDetail.tsx` en `/mis-grupos/:id` (reemplaza el modal de
  ranking) con vincular existente, crear-para-el-grupo y desvincular. i18n en 6 idiomas.
- Vincular/desvincular se bloquean cuando las predicciones estan cerradas (deadline
  `predictions_deadline`): gate en backend (403 `DEADLINE_PASSED`) y en UI (oculta
  acciones + aviso). El ranking sigue visible en modo lectura.
- Spec: `docs/superpowers/specs/2026-06-08-group-prediction-links-design.md`.

### Fix: eliminar predicciones legadas

Backfill de `public_id` NULL en `prediction_sets` (migracion 012) para que los sets
creados antes de existir la columna se puedan eliminar.

---

## Estado del Proyecto: COMPLETO

El proyecto Mundalia está 100% funcional en producción con todas las features implementadas.

### URLs de Producción
- **Frontend:** https://mundalia.vercel.app
- **Backend:** https://mundalia-production.up.railway.app

---

## Cambios - 2026-04-10

### Guest Prediction Flow (Flujo de Invitado)

New shareable link for WhatsApp: /play (optionally /play?group=XXXX)
- Guests complete full 3-step prediction without registering
- Predictions stored in localStorage
- Export to image available without account
- Auto-claim predictions on registration (email or Google OAuth)
- Group invite codes supported

### Eliminacion de Repechajes

Los repechajes (playoffs de clasificacion pre-torneo) fueron eliminados del flujo de prediccion. Los 6 equipos placeholder fueron reemplazados por los ganadores reales del Mundial 2026: Bosnia, Suecia, Turquia, Chequia, DR Congo, Iraq.

**Cambios principales:**
- Flujo reducido de 4 pasos a 3: Grupos → Terceros → Eliminatorias
- Eliminados: `Playoffs.tsx`, `playoffsData.ts`, `PlayoffsTab.tsx`
- Eliminadas tablas BD: `playoff_predictions`, `real_playoff_results`
- Eliminada ruta frontend: `/repechajes`
- Eliminados endpoints: GET/POST `/predictions/playoffs`, DELETE `/reset-from-playoffs`, GET/POST/DELETE `/admin/playoffs`

---

## Cambios Recientes - 2026-01-06

### Exportar Predicción a Imagen (Canvas)

Implementada funcionalidad completa de exportar predicciones a imagen PNG:

1. **Diseño profesional**
   - Fondo con gradiente sutil (#f8fafc → #f1f5f9)
   - Bordes redondeados en todas las cajas
   - Sombras sutiles para profundidad
   - Fuente moderna Inter

2. **Grupos (12)**
   - Headers con fondo azul diferenciado
   - Banderas + códigos de equipos
   - Colores de fondo: verde (clasificados), amarillo (mejor tercero)

3. **Bracket completo**
   - R32 → R16 → QF → SF → Final
   - Líneas de conexión entre partidos
   - Ganador resaltado con fondo verde

4. **Partido por 3er lugar**
   - Ubicado debajo de la final
   - Muestra perdedores de semifinales

5. **Podio con 3 medallistas**
   - 🥈 Subcampeón (izquierda)
   - 🏆 Campeón (centro, dorado)
   - 🥉 Tercer lugar (derecha)

---

## Cambios - 2026-01-05

### Mejoras UX Fase de Grupos (Modo Escoger Ganadores)

Implementadas mejoras significativas en la experiencia de arrastrar equipos:

1. **Drag and Drop profesional con @dnd-kit**
   - Animaciones suaves al reordenar
   - Icono de agarre (grip) intuitivo
   - Mejor soporte táctil para móviles
   - Soporte de teclado para accesibilidad

2. **UI simplificada**
   - Instrucción clara: "Coloca los equipos en su posicion final en la fase de grupos"
   - Eliminados iconos ✓ y ? de posiciones (colores de fondo indican clasificación)
   - Flechas mejoradas con iconos Lucide (ChevronUp/ChevronDown)

3. **Dependencias agregadas**
   - `@dnd-kit/core`
   - `@dnd-kit/sortable`
   - `@dnd-kit/utilities`

### Configuración de Modos de Predicción

Admin puede configurar qué modos están disponibles para usuarios:
- **Ambos modos** - Usuarios eligen entre "Escoger Ganadores" y "Marcadores Exactos"
- **Solo Escoger Ganadores** - Solo modo de posiciones
- **Solo Marcadores Exactos** - Solo modo de marcadores

Al cambiar a un solo modo, se eliminan las predicciones del modo deshabilitado (con confirmación).

### Info de Cierre de Predicciones

- Eliminado mensaje amarillo "predicciones cierran pronto"
- Agregada info de fecha de cierre debajo del countdown timer en Home

---

## Features Implementadas

### Core
- [x] Registro/Login (JWT + bcrypt + Google OAuth)
- ~~[x] Predicción de Repechajes (6 playoffs)~~ (eliminado - equipos reales integrados directamente)
- [x] Predicción de Grupos (12 grupos, drag & drop) — Paso 1
- [x] Predicción de Terceros (495 combinaciones FIFA) — Paso 2
- [x] Predicción de Eliminatorias (bracket completo) — Paso 3
- [x] Múltiples predicciones por usuario
- [x] Ver/Editar/Eliminar predicciones

### Modos de Predicción
- [x] Modo "Escoger Ganadores" (posiciones)
- [x] Modo "Marcadores Exactos" (scores + FIFA tiebreaker)
- [x] Configuración admin de modos disponibles

### Social
- [x] Leaderboard global paginado
- [x] Grupos privados con código de invitación
- [x] Perfil de usuario (username, país, fecha nacimiento)

### Admin
- [x] Panel admin completo
- [x] Cargar resultados de grupos (con FIFA tiebreaker)
- [x] Cargar resultados de eliminatorias
- [x] Configurar deadline de predicciones
- [x] Configurar modos de predicción

### Internacionalización
- [x] 6 idiomas: ES, EN, PT, FR, DE, ZH
- [x] Selector de idioma en TopBar
- [x] Detección automática del navegador

### UX
- [x] Countdown al Mundial 2026
- [x] Cierre automático de predicciones
- [x] Drag and drop con @dnd-kit
- [x] Diseño responsive (mobile/desktop)
- [x] Exportar predicción a imagen PNG

---

## Stack Tecnológico

### Frontend
- React 19 + Vite 7 + TypeScript
- Tailwind CSS 4.x + shadcn/ui
- react-i18next (i18n)
- @dnd-kit (drag and drop)

### Backend
- Express 5 + Node.js + TypeScript
- PostgreSQL (pg 8.x)
- JWT + bcryptjs

### Deploy
- Frontend: Vercel
- Backend + DB: Railway

---

## Puertos de Desarrollo
- Frontend: 5174
- Backend: 5001

---

## Comandos

```bash
# Frontend
cd natalia-frontend && npm run dev

# Backend
cd natalia-backend && npm run dev

# Tests
cd natalia-backend && npm test
cd natalia-frontend && npm test

# Build
cd natalia-frontend && npm run build
cd natalia-backend && npm run build
```

---

## Pendientes (Nice to Have)

No hay tareas pendientes críticas. El proyecto está completo.

Posibles mejoras futuras:
- [ ] Notificaciones push cuando se publican resultados
- [ ] Historial de cambios en predicciones
- [ ] Estadísticas avanzadas en leaderboard

---

## Notas Técnicas

### PostgreSQL COUNT() devuelve string
- `COUNT(*)` devuelve bigint → string en JS
- Usar `parseInt()` antes de comparar

### Knockout Bracket
- R32 no es secuencial → ver `knockoutBracket.ts`
- M73+M75 → M90, M74+M77 → M89, etc.

### Migraciones BD
- Automáticas al iniciar backend
- Ver `server.ts` → `runMigrations()`

---

## Archivos de Documentación

| Archivo | Descripción |
|---------|-------------|
| CLAUDE.md | Instrucciones técnicas para Claude |
| SESSION.md | Estado actual del proyecto (este archivo) |
| BACKEND.md | Documentación del backend |
| README.md | Descripción general del proyecto |
| START.md | Guía de inicio rápido |
