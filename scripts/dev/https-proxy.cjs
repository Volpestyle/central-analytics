const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const configPath = path.join(__dirname, '..', '.domain.config');
let config = {};

if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  configContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }
  });
}

const LOCAL_DOMAIN = config.LOCAL_DOMAIN || 'dev.ilikeyacut.com';
const FRONTEND_PORT = parseInt(config.FRONTEND_PORT || '4321');
const BACKEND_HTTP_PORT = parseInt(config.BACKEND_HTTP_PORT || '8080');
const BACKEND_HTTPS_PORT = parseInt(config.BACKEND_HTTPS_PORT || '3000');

const options = {
  key: fs.readFileSync(path.join(__dirname, '..', '..', 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', '..', 'certs', 'cert.pem'))
};

const server = https.createServer(options, (req, res) => {
  const isApiRequest = req.url.startsWith('/api');
  const targetPort = isApiRequest ? BACKEND_HTTP_PORT : FRONTEND_PORT;

  const proxyOptions = {
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`
    }
  };

  const proxy = http.request(proxyOptions, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy);
});

server.listen(BACKEND_HTTPS_PORT, '0.0.0.0', () => {
  console.log(`🔐 HTTPS Proxy running at https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT}`);
  console.log(`   Frontend (/) -> http://localhost:${FRONTEND_PORT}`);
  console.log(`   Backend (/api) -> http://localhost:${BACKEND_HTTP_PORT}`);
});
