import { deflateSync } from 'node:zlib';

const crcTable=Uint32Array.from({length:256},(_,index)=>{
  let crc=index;
  for (let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  return crc;
});

function chunk(type,data) {
  const bytes=Buffer.alloc(data.length+12);
  bytes.writeUInt32BE(data.length,0);
  bytes.write(type,4,'ascii');
  bytes.set(data,8);
  let crc=0xffffffff;
  for (let i=4;i<bytes.length-4;i++) crc=(crc>>>8)^crcTable[(crc^bytes[i])&255];
  bytes.writeUInt32BE((crc^0xffffffff)>>>0,bytes.length-4);
  return bytes;
}

export function encodePng(width,height,pixels) {
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width,0);
  header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6;
  const stride=width*4,raw=Buffer.alloc((stride+1)*height);
  for (let row=0;row<height;row++) {
    const from=row*stride,to=row*(stride+1);
    raw[to]=1;
    for (let col=0;col<stride;col++) raw[to+1+col]=pixels[from+col]-(col>=4?pixels[from+col-4]:0);
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
