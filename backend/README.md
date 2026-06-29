# Backend de PULSO

API REST construida con NestJS 11, TypeORM y PostgreSQL. Implementa autenticacion JWT, validacion de entradas y las reglas de negocio para usuarios, clientes, proyectos y tareas. Tambien resuelve los datos del dashboard, la planificacion de tareas y la bitacora de cada proyecto.

## Configuracion

Crear un archivo `.env` a partir de `.env.example`. Es posible conectarse mediante `DATABASE_URL` a una base alojada o utilizar las variables `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB_NAME` para desarrollo local.

```bash
npm install
npm run start:dev
```

La API se inicia en `http://localhost:3000/api/v1`.

## Dashboard y planificacion

La API expone `GET /api/v1/proyectos/dashboard/resumen` para alimentar el dashboard general. El resumen incluye conteos de proyectos, distribucion de pulso, estado global de tareas, tareas vencidas, tareas proximas a vencer, tareas de prioridad alta y proyectos en riesgo.

Las tareas admiten dos campos de planificacion:

- `prioridad`: `ALTA`, `MEDIA` o `BAJA`;
- `fechaVencimiento`: fecha opcional en formato `YYYY-MM-DD`.

Estos campos se usan tanto en el tablero Kanban como en los indicadores del dashboard.

En bases existentes, aplicar `scripts/migrate-task-planning-fields.ps1` antes de desplegar el backend con estas columnas.

## Bitacora de proyectos

La extension agrega el endpoint autenticado `GET /api/v1/proyectos/:id/bitacora`. Devuelve un `BitacoraProyectoDTO` con el identificador y nombre del proyecto, mas una lista de eventos ordenados desde la actividad mas reciente.

Cada evento incluye:

- `tipo`: `PROYECTO`, `CLIENTE`, `TAREA` o `PULSO`;
- `titulo` y `detalle`: descripcion legible para mostrar en la interfaz;
- `fecha`: momento asociado al evento;
- `impacto`: `ALTO`, `MEDIO`, `BAJO` o `NEUTRO`.

Los eventos se calculan a partir de la creacion y actualizacion del proyecto, el cliente asociado, las tareas relacionadas y el diagnostico de pulso actual. No requiere una tabla adicional ni persiste registros historicos independientes.

## Comandos

```bash
npm run start:dev   # servidor con recarga
npm run build       # compilacion de produccion
npm run start:prod  # ejecucion del build
```

`synchronize` permanece desactivado para proteger el esquema y los datos. Las credenciales reales deben administrarse mediante variables de entorno y nunca incorporarse al repositorio.

Para ejecutar el build con PM2 y publicarlo detras de nginx, consultar la [guia de despliegue](../docs/despliegue-nginx-pm2.md).

Para conocer el alcance funcional, la arquitectura y el equipo, consultar el [README principal](../README.md).
