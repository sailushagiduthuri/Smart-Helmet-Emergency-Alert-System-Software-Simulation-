const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function handleRequest(req, res) {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family:sans-serif; text-align:center; padding:3rem; color:#f8fafc; background:#0a0f1d; min-height:100vh;">
          <h1>404 - Page Not Found</h1>
          <p>The requested file <code>${reqPath}</code> does not exist.</p>
          <a href="/index.html" style="color:#38bdf8;">Return to Home</a>
        </div>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function tryPort(port) {
  const server = http.createServer(handleRequest);

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      tryPort(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.once('listening', () => {
    const url = `http://localhost:${port}/index.html`;
    const dashUrl = `http://localhost:${port}/dashboard.html`;

    console.log('\n================================================================');
    console.log('   SMART HELMET EMERGENCY ALERT SYSTEM - LOCAL DEV SERVER');
    console.log('================================================================');
    console.log('\n  🚀 Web Server is running! Click the links below to open:\n');
    console.log(`     👉 Main Landing:   ${url}`);
    console.log(`     👉 Live Dashboard: ${dashUrl}\n`);
    console.log('  Opening your web browser automatically...');
    console.log('  Press Ctrl + C in this terminal to stop the server anytime.');
    console.log('================================================================\n');

    // Auto-open browser on Windows
    exec(`start ${url}`);
  });

  server.listen(port);
}

tryPort(8000);
