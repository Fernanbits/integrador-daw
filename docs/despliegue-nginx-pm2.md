# Despliegue con nginx y PM2

Esta guia describe una instalacion tradicional de PULSO en un servidor Linux. nginx sirve el build estatico de Angular y funciona como proxy inverso para la API NestJS, ejecutada y supervisada por PM2.

## 1. Preparar la aplicacion

Desde la raiz del repositorio:

```bash
npm install
npm run install:all
npm run build
```

El build del frontend queda en `frontend/dist/frontend/browser` y el del backend en `backend/dist`.

## 2. Configurar el backend

Crear `backend/.env` a partir de `backend/.env.example` y completar `DATABASE_URL`, `JWT_SECRET` y las opciones de conexion. El archivo `.env` no debe incorporarse a Git.

Iniciar la API desde la carpeta `backend`:

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

PM2 ejecuta NestJS en `127.0.0.1:4000`. El proceso no necesita exponerse directamente a internet porque nginx recibe las solicitudes publicas.

Comandos utiles:

```bash
pm2 status
pm2 logs pulso-api
pm2 restart pulso-api
```

## 3. Publicar Angular

Copiar el contenido compilado al directorio publico:

```bash
sudo mkdir -p /var/www/pulso
sudo cp -r frontend/dist/frontend/browser/. /var/www/pulso/
```

## 4. Configurar nginx

Instalar el sitio incluido en el repositorio:

```bash
sudo cp deploy/nginx/pulso.conf /etc/nginx/sites-available/pulso
sudo ln -s /etc/nginx/sites-available/pulso /etc/nginx/sites-enabled/pulso
sudo nginx -t
sudo systemctl reload nginx
```

La directiva `try_files` permite navegar las rutas de Angular sin obtener errores 404. El bloque `/api/` conserva la URL y la envia al proceso NestJS administrado por PM2.

## 5. HTTPS

En un servidor publico debe configurarse un dominio y un certificado TLS. Por ejemplo, Certbot puede ampliar el bloque de nginx para escuchar en el puerto 443 y redirigir HTTP a HTTPS.

## Verificacion

```bash
curl -I http://localhost/
curl -i http://localhost/api/v1/proyectos
pm2 status
```

La primera solicitud debe responder con el frontend. La segunda debe alcanzar la API y responder `401 Unauthorized` cuando no se envia un token, confirmando que el proxy y el guard de autenticacion funcionan.
