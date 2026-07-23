module.exports = {
  apps: [
    {
      name: 'costeos',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: 'C:\\Proyectos\\Costeos',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      out_file: 'C:\\Proyectos\\Costeos\\logs\\out.log',
      error_file: 'C:\\Proyectos\\Costeos\\logs\\err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}

/**
 * INSTRUCCIONES DE DESPLIEGUE EN IIS (Windows Server)
 * ====================================================
 *
 * 1. PREREQUISITOS (una sola vez en el servidor):
 *    - Instalar Node.js LTS: https://nodejs.org
 *    - Instalar PM2: npm install -g pm2
 *    - Instalar IIS Module "URL Rewrite": https://www.iis.net/downloads/microsoft/url-rewrite
 *    - Instalar IIS Module "ARR" (Application Request Routing): https://www.iis.net/downloads/microsoft/application-request-routing
 *
 * 2. HABILITAR ARR PROXY EN IIS:
 *    - Abrir IIS Manager → Application Request Routing Cache
 *    - Click en "Server Proxy Settings"
 *    - Habilitar "Enable proxy" → Apply
 *
 * 3. CREAR SITIO IIS:
 *    - Crear nuevo sitio IIS apuntando a cualquier carpeta (ej. C:\inetpub\wwwroot\costeos-placeholder)
 *    - Puerto: 80 (o 443 con SSL)
 *    - Agregar archivo web.config:
 *
 * web.config para IIS (guardar en la carpeta del sitio IIS):
 * <?xml version="1.0" encoding="utf-8"?>
 * <configuration>
 *   <system.webServer>
 *     <rewrite>
 *       <rules>
 *         <rule name="Reverse Proxy to Next.js" stopProcessing="true">
 *           <match url="(.*)" />
 *           <action type="Rewrite" url="http://localhost:3000/{R:1}" />
 *         </rule>
 *       </rules>
 *     </rewrite>
 *   </system.webServer>
 * </configuration>
 *
 * 4. DESPLEGAR LA APP:
 *    - npm run build       (en el servidor, dentro de C:\Proyectos\Costeos)
 *    - Crear carpeta logs: mkdir C:\Proyectos\Costeos\logs
 *    - pm2 start ecosystem.config.js
 *    - pm2 save            (para que arranque automático con Windows)
 *    - pm2 startup         (seguir las instrucciones que muestra)
 *
 * 5. COMANDOS ÚTILES:
 *    - pm2 status          → ver estado
 *    - pm2 logs costeos    → ver logs en tiempo real
 *    - pm2 restart costeos → reiniciar (ej. después de cambiar .env)
 *    - pm2 stop costeos    → detener
 */
