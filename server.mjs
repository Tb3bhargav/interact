import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

createServer(async (request, response) => {
  let requestPath;
  try {
    requestPath = decodeURIComponent((request.url || '/').split('?')[0]) || '/';
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (requestPath === '/') requestPath = '/index.html';
  const filePath = normalize(join(root, requestPath));
  if (!filePath.startsWith(root)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(PORT, '127.0.0.1', () => console.log(`Sanskrit Heritage is running at http://127.0.0.1:${PORT}`));
