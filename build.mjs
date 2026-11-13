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
async function copyAssets(relative='assets'){
  for(const entry of await readdir(join(root,relative),{withFileTypes:true})){
    const path=join(relative,entry.name);
    if(entry.isDirectory()){await mkdir(join(out,path),{recursive:true});await copyAssets(path);}
    else if(entry.isFile()&&/\.(png|jpe?g|wav|svg|webp|ogg|mp3)$/i.test(entry.name)){
      await copyFile(join(root,path),join(out,path));count++;
    }
  }
}
await copyAssets();
console.log(`Static build ready: ${count} files in dist/`);
