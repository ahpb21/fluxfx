const utf8=new TextEncoder();

const crcTable=Uint32Array.from({length:256},(_,index)=>{
  let crc=index;
  for (let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  return crc;
});

export function zipFiles(files) {
  const entries=[],directory=[];
  let position=0,directorySize=0;
  for (const [name,bytes] of files) {
    const filename=utf8.encode(name);
    let crc=0xffffffff;
    for (const byte of bytes) crc=(crc>>>8)^crcTable[(crc^byte)&255];
    const value=(crc^0xffffffff)>>>0;
    const local=new Uint8Array(30+filename.length),l=new DataView(local.buffer);
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);
    l.setUint16(12,0x21,true);l.setUint32(14,value,true);l.setUint32(18,bytes.length,true);
    l.setUint32(22,bytes.length,true);l.setUint16(26,filename.length,true);
    local.set(filename,30);
    const entry=new Uint8Array(46+filename.length),d=new DataView(entry.buffer);
    d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);
    d.setUint16(14,0x21,true);d.setUint32(16,value,true);d.setUint32(20,bytes.length,true);
    d.setUint32(24,bytes.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,position,true);
    entry.set(filename,46);
    entries.push(local,bytes);directory.push(entry);
    position+=local.length+bytes.length;directorySize+=entry.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
  v.setUint32(12,directorySize,true);v.setUint32(16,position,true);
  return new Blob([...entries,...directory,end],{type:'application/zip'});
}

export function pixelsToPng(data,width,height) {
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  canvas.getContext('2d').putImageData(new ImageData(data,width,height),0,0);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed'))));
}

export async function spriteSheetZip(sheet,name) {
  const files=[];
  const addPng=async (filename,data)=>{
    const png=await pixelsToPng(data,sheet.width,sheet.height);
    files.push([filename,new Uint8Array(await png.arrayBuffer())]);
  };
  await addPng(name+'.png',sheet.data);
  for (const [layer,data] of Object.entries(sheet.layers??{})) await addPng(name+'-'+layer+'.png',data);
  files.push([name+'.json',utf8.encode(JSON.stringify(sheet.metadata,null,2)+'\n')]);
  return zipFiles(files);
}
