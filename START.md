# START.md - Inicio Rapido

## Para Claude (Nueva Sesion)

Si es una nueva sesion o hubo un crash:

1. **Leer documentacion:**
   - `CLAUDE.md` - Instrucciones tecnicas, estructura, reglas
   - `SESSION.md` - Estado actual, que esta completo, que falta

2. **NO hacer auditoria del codigo** - La documentacion ya tiene todo

3. **Preguntar al usuario** que quiere hacer en esta sesion

---

## Para Desarrollador (Arrancar Servidores)

### Opcion A: Solo Frontend (Modo Mock)
```bash
cd natalia-frontend
npm run dev
```
Abre http://localhost:5174

### Opcion B: Frontend + Backend
Terminal 1:
```bash
cd natalia-frontend
npm run dev
```

Terminal 2:
```bash
cd natalia-backend
npm run dev
```

- Frontend: http://localhost:5174
- Backend: http://localhost:5000/api

---

## Credenciales de Prueba (Modo Mock)

Cualquier email/password funciona en modo mock.
Los datos se guardan en localStorage del navegador.

---

## Estado Actual

- **Frontend**: Funcional con datos mock
- **Backend**: Estructura lista, sin conexion a PostgreSQL

Ver `SESSION.md` para detalles completos.
