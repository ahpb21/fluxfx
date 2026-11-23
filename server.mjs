import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const types={html:'text/html',js:'text/javascript',css:'text/css',png:'image/png'};
const root=new URL('./',import.meta.url);
const port=Number(process.env.PORT||4180);
createServer(async (request,response)=>{
  try{
    const path=new URL(request.url,'http://localhost').pathname;
    const name=path==='/'?'index.html':path.slice(1);
    if(!/^[a-z0-9-]+\.(html|js|css|png)$/.test(name))throw Error();
    const bytes=await readFile(new URL(name,root));
    response.writeHead(200,{'Content-Type':types[extname(name).slice(1)],'Cache-Control':'no-cache'}).end(bytes);
  }catch{response.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log('FluxFX Original http://127.0.0.1:'+port));
