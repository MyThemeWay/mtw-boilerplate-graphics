/*! MTW-BOILERPLATE-GRAPHICS: PRO.CONFIG.JS
 * 
 * Author: sitdisch
 * Source: https://github.com/mythemeway
 * License: MIT
 * Copyright © 2022 sitdisch
 */

const { argv } = require('process');
const { build, analyzeMetafile } = require('esbuild');
const glslxPlugin = require('@sitdisch/esbuild-plugin-glslx');
const canvas = require('./canvas.config.js');
const { spawnSync } = require('child_process');
const { mkdir, stat } = require('fs');
const { basename } = require('path');

console.log("[\x1b[90mesbuild\x1b[0m]: starting `\x1b[36mproduction-mode\x1b[0m`...")

build({
  entryPoints: [`${canvas.p2c}/main.js`],
  outfile: './dist/canvas.bundle.min.js',
  logLevel: 'info',
  bundle: true,
  write: ((!(argv[2])) ? true : false),
  minify: true,
  metafile: true,
  
  plugins: [
    glslxPlugin({
      preprocess: canvas.prepr
    })
  ],
  
}).then(result => {
  analyzeMetafile(result.metafile).then(msg =>
    console.log(msg+"\n[\x1b[90mesbuild\x1b[0m]: `\x1b[36mproduction-mode\x1b[0m` \x1b[1;32m[finished]\x1b[0m\n")
  );
  
  if (argv[2]) {
    const outputPath = Object.keys(result.metafile.outputs)[0];
    
    mkdir('./dist', { recursive: true }, err => {
      if (err) throw err;
      
      console.log("[\x1b[90mterser\x1b[0m]: Starting further `\x1b[36mminification-process\x1b[0m`...\n")
      
      const cp = spawnSync('npx', ['terser', '-m', '-c', '-o', outputPath], {
        input: result.outputFiles[0].text
      });

      if (!(cp.status))
        stat(outputPath, (err, outputStats) => {
          if (err) throw err;
          
          const percent = Math.round((outputStats.size/result.metafile['outputs'][outputPath].bytes-1)*100);
          var logTxt = '';
          
          if (percent < 0) {
            logTxt = '\x1b[1;32m'+percent+'%\x1b[0m)\x1b[1;33m [minimized]';
          } else if (percent === 0) {
            logTxt = '\x1b[1;90m'+percent+'%\x1b[0m)\x1b[1;90m [unchanged]';
          } else {
            logTxt = '\x1b[1;31m+'+percent+'%\x1b[0m)\x1b[1;31m [ENLARGED]';
          };
          
          console.log('  '+basename(outputPath)+'  \x1b[36m'+Math.round(outputStats.size/100)/10+'kb\x1b[0m (size: '+logTxt+' \x1b[0m\n\n[\x1b[90mterser\x1b[0m]: `\x1b[36mminification-process\x1b[0m` \x1b[1;32m[finished]\x1b[0m\n');
          
        })
      else
        console.log("\x1b[1;31m[ERROR]\x1b[0m => \x1b[0m[\x1b[90mterser\x1b[0m]: `\x1b[36mminification-process\x1b[0m` \x1b[1;31m[failed]\x1b[0m", Error(cp.stderr));
    });
  };
});
