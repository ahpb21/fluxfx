#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSpriteSheet, effects } from '../index.js';
import { encodePng } from './png.mjs';

const numeric={fps:'fps',width:'width',height:'height','origin-x':'originX','origin-y':'originY',columns:'columns',seed:'seed'};
const usage='Usage: fluxfx <effect> [--out <directory>] [--fps <number>] [--width <px>] [--height <px>]\n'+
  '       [--origin-x <px>] [--origin-y <px>] [--columns <number>] [--seed <number>] [--layers]\n'+
  '       fluxfx --list';

async function run([id,...args]) {
  if (id==='--list') {console.log(Object.keys(effects).join('\n'));return;}
  if (!id || id==='--help' || id==='-h') {console.log(usage);return;}
  if (!Object.hasOwn(effects,id)) throw new Error('Unknown effect: '+id+' (use --list)');
  const options={name:id};
  let directory='exports';
  for (let i=0;i<args.length;i++) {
    const flag=args[i];
    if (flag==='--layers') {options.layers=true;continue;}
    const key=flag.startsWith('--')?flag.slice(2):'';
    if (key!=='out' && !Object.hasOwn(numeric,key)) throw new Error('Unknown option: '+flag);
    const value=args[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for '+flag);
    if (key==='out') {directory=value;continue;}
    if (!Number.isFinite(Number(value))) throw new Error('Invalid number for '+flag);
    options[numeric[key]]=Number(value);
  }
  const sheet=createSpriteSheet(effects[id],options);
  const output=resolve(directory);
  await mkdir(output,{recursive:true});
  const save=(name,bytes)=>writeFile(resolve(output,name),bytes);
  await save(id+'.png',encodePng(sheet.width,sheet.height,sheet.data));
  for (const [layer,data] of Object.entries(sheet.layers??{})) {
    await save(id+'-'+layer+'.png',encodePng(sheet.width,sheet.height,data));
  }
  await save(id+'.json',JSON.stringify(sheet.metadata,null,2)+'\n');
  console.log(id+' · '+sheet.metadata.frames.length+' frames · '+output);
}

try {await run(process.argv.slice(2));}
catch (error) {console.error(error.message);process.exitCode=1;}
