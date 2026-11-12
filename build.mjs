import {mkdir, readdir, copyFile, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

// Publish only browser runtime files. Tests, reports and local tooling stay in source.
const root=fileURLToPath(new URL('.',import.meta.url));
const out=join(root,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(join(out,'assets'),{recursive:true});
let count=0;
for(const entry of await readdir(root,{withFileTypes:true})){
  if(entry.isFile()&&(entry.name==='index.html'||/\.(js|css)$/.test(entry.name))){
    await copyFile(join(root,entry.name),join(out,entry.name));count++;
  }
}
for(const entry of await readdir(join(root,'assets'),{withFileTypes:true})){
  if(entry.isFile()&&/\.(png|wav|svg|webp|ogg|mp3)$/.test(entry.name)){
    await copyFile(join(root,'assets',entry.name),join(out,'assets',entry.name));count++;
  }
}
console.log(`Static build ready: ${count} files in dist/`);
