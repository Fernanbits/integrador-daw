# Backend de PULSO

API REST construida con NestJS 11, TypeORM y PostgreSQL. Implementa autenticacion JWT, validacion de entradas y las reglas de negocio para usuarios, clientes, proyectos y tareas.

## Configuracion

Crear un archivo `.env` a partir de `.env.example`. Es posible conectarse mediante `DATABASE_URL` a una base alojada o utilizar las variables `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB_NAME` para desarrollo local.

```bash
npm install
npm run start:dev
```

La API se inicia en `http://localhost:3000/api/v1`.

## Comandos

```bash
npm run start:dev   # servidor con recarga
npm run build       # compilacion de produccion
npm run start:prod  # ejecucion del build
```

`synchronize` permanece desactivado para proteger el esquema y los datos. Las credenciales reales deben administrarse mediante variables de entorno y nunca incorporarse al repositorio.

Para ejecutar el build con PM2 y publicarlo detras de nginx, consultar la [guia de despliegue](../docs/despliegue-nginx-pm2.md).

Para conocer el alcance funcional, la arquitectura y el equipo, consultar el [README principal](../README.md).
