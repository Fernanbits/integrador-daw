# Frontend de PULSO

Aplicacion Angular 21 responsable de la experiencia de usuario de PULSO. Incluye autenticacion, gestion de proyectos y clientes, busqueda avanzada, exportacion CSV, metricas y tablero Kanban de tareas.

## Desarrollo

```bash
npm install
npm start
```

La aplicacion se inicia en `http://localhost:4200` y, durante el desarrollo, redirige `/api` a `http://localhost:3000` mediante `src/proxy.conf.json`.

## Comandos

```bash
npm start       # servidor de desarrollo
npm run build   # build de produccion
npm test        # pruebas del frontend
```

La configuracion de produccion se encuentra en `vercel.json`. Para conocer el alcance funcional, la arquitectura y el equipo, consultar el [README principal](../README.md).
