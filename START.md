# START.md - Inicio Rapido

## INSTRUCCIONES OBLIGATORIAS PARA CLAUDE

Cuando leas este archivo, DEBES ejecutar AUTOMATICAMENTE los siguientes pasos SIN preguntar:

### Paso 1: Leer documentacion (OBLIGATORIO)
Inmediatamente despues de leer START.md, usa la herramienta Read para leer estos archivos:
- `CLAUDE.md` - Instrucciones tecnicas, estructura, reglas
- `SESSION.md` - Estado actual, que esta completo, que falta

### Paso 2: Arrancar servidores (OBLIGATORIO)
Despues de leer la documentacion, arranca AMBOS servidores automaticamente:

Terminal 1 (Frontend):
```bash
cd natalia-frontend && npm run dev
```

Terminal 2 (Backend):
```bash
cd natalia-backend && npm run dev
```

Ejecuta ambos comandos en background para que sigan corriendo.

### Paso 3: Confirmar y preguntar
Una vez que los servidores esten corriendo, confirma al usuario:
- Que leiste la documentacion
- Que los servidores estan corriendo
- Pregunta que quiere hacer en esta sesion

**IMPORTANTE:** NO hacer auditoria del codigo - La documentacion ya tiene todo

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
