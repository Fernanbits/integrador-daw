# Frontend de PULSO

Aplicacion Angular 21 responsable de la experiencia de usuario de PULSO. Incluye autenticacion, gestion de proyectos y clientes, busqueda avanzada, exportacion CSV, metricas, tablero Kanban de tareas y bitacora visual de proyectos.

## Desarrollo

```bash
npm install
npm start
```

La aplicacion se inicia en `http://localhost:4200` y, durante el desarrollo, redirige `/api` a `http://localhost:3000` mediante `src/proxy.conf.json`.

## Bitacora de proyectos

Desde el listado de proyectos, el boton con icono de historial abre un dialogo con la linea de tiempo del proyecto seleccionado. La vista consume `GET /api/v1/proyectos/:id/bitacora` y presenta eventos de proyecto, cliente, tareas y pulso actual con fecha, detalle e impacto visual.

## Comandos

```bash
npm start       # servidor de desarrollo
npm run build   # build de produccion
npm test        # pruebas del frontend
```

La configuracion de produccion se encuentra en `vercel.json`. Para conocer el alcance funcional, la arquitectura y el equipo, consultar el [README principal](../README.md).
