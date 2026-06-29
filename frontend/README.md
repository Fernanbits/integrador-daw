# Frontend de PULSO

Aplicacion Angular 21 responsable de la interfaz de PULSO. Desde aca se gestionan proyectos, clientes y tareas, con autenticacion, busqueda, exportacion CSV, dashboard, tablero Kanban, bitacora y reporte imprimible.

## Desarrollo

```bash
npm install
npm start
```

La aplicacion se inicia en `http://localhost:4200` y, durante el desarrollo, redirige `/api` a `http://localhost:3000` mediante `src/proxy.conf.json`.

## Bitacora de proyectos

Desde el listado de proyectos, el boton con icono de historial abre un dialogo con la linea de tiempo del proyecto seleccionado. La vista consume `GET /api/v1/proyectos/:id/bitacora` y presenta eventos de proyecto, cliente, tareas y pulso actual con fecha, detalle e impacto visual.

## Tablero de tareas

Cada proyecto tiene un tablero Kanban con columnas para `Pendiente`, `En progreso` y `Finalizada`. Las tareas muestran prioridad y fecha de vencimiento, se pueden editar desde el modal y tambien mover entre estados con botones o arrastrando la tarjeta.

## Dashboard y reporte

La ruta `/dashboard` muestra el estado general del portfolio: proyectos, tareas, avance global, vencimientos, prioridad alta, distribucion de pulso y proyectos en riesgo. Desde esa pantalla se puede generar un reporte imprimible y guardarlo como PDF desde el navegador.

## Comandos

```bash
npm start       # servidor de desarrollo
npm run build   # build de produccion
npm test        # pruebas del frontend
```

La configuracion de produccion se encuentra en `vercel.json`. Para conocer el alcance funcional, la arquitectura y el equipo, consultar el [README principal](../README.md).
