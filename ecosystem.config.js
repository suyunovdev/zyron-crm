// PM2 jarayon menejeri konfiguratsiyasi.
// Ishga tushirish:  pm2 start ecosystem.config.js
// Reboot'da tiklash: pm2 startup && pm2 save
//
// Bu avto-restart (crash / OOM) va reboot'da tiklanishni ta'minlaydi —
// ilova o'chib qolganda (masalan port timeout) o'zi ko'tariladi.

module.exports = {
  apps: [
    {
      name: 'zyron-academy',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000, // nginx upstream shu portga mos bo'lsin
      },
    },
  ],
};
