module.exports = {
  apps: [
    {
      name: 'pulso-api',
      cwd: __dirname,
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DB_LOGGING: 'false',
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
