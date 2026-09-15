import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const port=4173;
const host='127.0.0.1';
const mime={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon',
  '.md':'text/markdown; charset=utf-8'
};

function safePath(urlPath){
  let p=decodeURIComponent(urlPath.split('?')[0]);
  if(p==='/'||p.endsWith('/'))p+='index.html';
  const full=path.resolve(root,`.${p}`);
  if(full!==root&&!full.startsWith(root+path.sep))return null;
  return full;
}

const server=http.createServer((req,res)=>{
  const u=new URL(req.url||'/',`http://${host}:${port}`);
  const file=safePath(u.pathname);
  if(!file){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found');return;}
    const headers={
      'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    };
    // The old-worker fixture intentionally lives under qc/ but must temporarily
    // control the root scope so the harness can simulate an installed PWA upgrade.
    if(u.pathname==='/qc/fixtures/old-sw.js')headers['service-worker-allowed']='/';
    res.writeHead(200,headers);
    if(req.method==='HEAD'){res.end();return;}
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(port,host,()=>console.log(`Thalify TWA QC server listening on http://${host}:${port}`));
