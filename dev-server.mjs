import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler as availabilityHandler } from './netlify/functions/availability.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8888);
const host = process.env.HOST || '127.0.0.1';

await loadLocalEnv();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/.netlify/functions/availability') {
      const result = await availabilityHandler({ httpMethod: req.method, queryStringParameters: Object.fromEntries(url.searchParams) });
      res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
      res.end(result.body || '');
      return;
    }

    const filePath = safeStaticPath(url.pathname);
    if (!filePath || !existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'Internal server error');
  }
});

server.listen(port, host, () => {
  console.log(`Local preview running at http://${host}:${port}`);
  const hasCalendarConfig = process.env.GOOGLE_CALENDAR_ICS_URL || process.env.APARTMENT_7_ICS_URL || process.env.APARTMENT_8_ICS_URL || process.env.APARTMENT_34_ICS_URL;
  console.log(`Availability source: ${hasCalendarConfig ? 'calendar env from local env' : 'missing local calendar env'}`);
});

async function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function safeStaticPath(pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const resolvedPath = path.resolve(__dirname, `.${requestedPath}`);
  return resolvedPath.startsWith(__dirname) ? resolvedPath : null;
}
