const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 19876;
const HTTPS_PORT = 19877;

// ===== Sessions Directory =====
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ===== Server-side API Key =====
const CONFIG_PATH = path.join(__dirname, 'config.json');
let serverApiKey = '';
try {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  serverApiKey = cfg.apiKey || '';
} catch { /* no config yet */ }

// ===== Request handler =====
function handleRequest(req, res) {
  // ===== Save API Key to server config =====
  if (req.method === 'POST' && req.url === '/api/save-key') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { apiKey } = JSON.parse(body);
        if (apiKey && apiKey.startsWith('sk-')) {
          serverApiKey = apiKey;
          fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '無效的 API Key' }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '格式錯誤' }));
      }
    });
    return;
  }

  // ===== Check if API key is configured =====
  if (req.method === 'GET' && req.url === '/api/has-key') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hasKey: !!serverApiKey }));
    return;
  }

  // ===== Anthropic API Proxy =====
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { apiKey, messages, system } = JSON.parse(body);
        const key = apiKey || serverApiKey;
        if (!key) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '請先設定 API Key' }));
          return;
        }

        const payload = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: system || '',
          messages: messages || [],
        });

        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(payload),
          },
        };

        const apiReq = https.request(options, (apiRes) => {
          res.writeHead(apiRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          apiRes.pipe(res);
        });

        apiReq.on('error', (err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });

        apiReq.write(payload);
        apiReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '請求格式錯誤' }));
      }
    });
    return;
  }

  // ===== Download SSL Certificate (for iOS trust) =====
  if (req.method === 'GET' && req.url === '/cert.pem') {
    const cp = path.join(__dirname, 'cert.pem');
    if (fs.existsSync(cp)) {
      const data = fs.readFileSync(cp);
      res.writeHead(200, {
        'Content-Type': 'application/x-pem-file',
        'Content-Disposition': 'attachment; filename="LiveTranslate.pem"',
        'Content-Length': data.length,
      });
      res.end(data);
    } else {
      res.writeHead(404); res.end('No certificate');
    }
    return;
  }

  // ===== Download certificate as .mobileconfig for iOS =====
  if (req.method === 'GET' && req.url === '/install-cert') {
    const cp = path.join(__dirname, 'cert.pem');
    if (!fs.existsSync(cp)) { res.writeHead(404); res.end('No certificate'); return; }
    const certData = fs.readFileSync(cp, 'utf8');
    // Extract base64 content between BEGIN/END markers
    const b64 = certData.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s/g, '');
    const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadCertificateFileName</key>
      <string>LiveTranslate.cer</string>
      <key>PayloadContent</key>
      <data>${b64}</data>
      <key>PayloadDescription</key>
      <string>LiveTranslate 本地開發憑證</string>
      <key>PayloadDisplayName</key>
      <string>LiveTranslate CA</string>
      <key>PayloadIdentifier</key>
      <string>com.livetranslate.cert</string>
      <key>PayloadType</key>
      <string>com.apple.security.root</string>
      <key>PayloadUUID</key>
      <string>A1B2C3D4-E5F6-7890-ABCD-EF1234567890</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>安裝 LiveTranslate 本地 HTTPS 憑證以啟用麥克風</string>
  <key>PayloadDisplayName</key>
  <string>LiveTranslate 憑證</string>
  <key>PayloadIdentifier</key>
  <string>com.livetranslate.profile</string>
  <key>PayloadOrganization</key>
  <string>LiveTranslate</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>F1E2D3C4-B5A6-7890-1234-567890ABCDEF</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;
    res.writeHead(200, {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'attachment; filename="LiveTranslate.mobileconfig"',
    });
    res.end(mobileconfig);
    return;
  }

  // ===== Session API: Save =====
  if (req.method === 'POST' && req.url === '/api/sessions/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const session = JSON.parse(body);
        if (!session.id || !/^\d+$/.test(String(session.id))) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Invalid session id' }));
          return;
        }
        const fp = path.join(SESSIONS_DIR, `${session.id}.json`);
        fs.writeFileSync(fp, JSON.stringify(session, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, id: session.id }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ===== Session API: List =====
  if (req.method === 'GET' && req.url === '/api/sessions') {
    try {
      const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
            return {
              id: data.id,
              date: data.date,
              entryCount: data.entryCount || 0,
              noteCount: data.noteCount || 0,
              duration: data.duration || '00:00',
              meetingTopic: data.meetingTopic || '',
            };
          } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => b.id - a.id);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(files));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ===== Session API: Get / Delete by ID =====
  if (req.url.startsWith('/api/sessions/')) {
    const id = req.url.split('/api/sessions/')[1];
    if (!/^\d+$/.test(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Invalid session id' }));
      return;
    }
    const fp = path.join(SESSIONS_DIR, `${id}.json`);

    if (req.method === 'GET') {
      if (fs.existsSync(fp)) {
        const data = fs.readFileSync(fp, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Session not found' }));
      }
      return;
    }

    if (req.method === 'DELETE') {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Session not found' }));
      }
      return;
    }
  }

  // ===== CORS preflight =====
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ===== Static Files =====
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': (mimeTypes[ext] || 'text/plain') + '; charset=utf-8' });
    res.end(data);
  });
}

// ===== HTTP Server =====
const httpServer = http.createServer(handleRequest);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`LiveTranslate HTTP  → http://127.0.0.1:${PORT}`);
});

// ===== HTTPS Server =====
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsServer = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }, handleRequest);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`LiveTranslate HTTPS → https://127.0.0.1:${HTTPS_PORT}`);
  });
}

process.on('SIGTERM', () => { httpServer.close(); process.exit(0); });
process.on('SIGINT', () => { httpServer.close(); process.exit(0); });
