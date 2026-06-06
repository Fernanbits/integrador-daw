module.exports = {
  apps: [
    {
      name: 'gestor-de-proyectos',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'admin_controlfluido',
        DB_PASSWORD: 'IntegradorAM',
        DB_NAME: 'gestor_de_proyectos',
        DB_LOGGING: 'false',
        SWAGGER_HABILITADO: false,
        JWT_SECRET: "ControlFluido_SecretKey_2026"
      },
      time: true,
    },
  ],
};