/*! MTW-BOILERPLATE-GRAPHICS: DEV.CONFIG.JS
 * 
 * Author: sitdisch
 * Source: https://github.com/mythemeway
 * License: MIT
 * Copyright © 2022 sitdisch
 */

const { build, analyzeMetafile } = require('esbuild');
const glslxPlugin = require('@sitdisch/esbuild-plugin-glslx');
const { get, createServer } = require('http');

console.log("[\x1b[90mesbuild\x1b[0m]: starting `\x1b[36mdevelopment-mode\x1b[0m`...\n");

var canvas = require('./canvas.config.js');
var canvasBundle, address, servLog = '';

const clients = [];
const addErrDiv = `
  document.getElementById('mtw-canvas').style.display = 'none';
  document.body.innerHTML += '<div style="margin:30vh 10px;text-align:center;color:white;font-size:45px;">❌ <b>[ERROR]</b> Hm... something went wrong<br><br>Check your terminal for more information about the &#128027;</div>';
`;

async function buildCmd() {
  return build({
    entryPoints: [`${canvas.path}/main.js`],
    outfile: './canvas.bundle.js',
    logLevel: 'info',
    bundle: true,
    write: false,
    metafile: true,
    define: { MTW_CANVAS_ID: '"mtw-canvas"' },
    
    plugins: [
      glslxPlugin({
        renaming: 'none',
        disableRewriting: true,
        prettyPrint: true,
        preprocess: canvas.prepr
      }),
    ],
    
    watch: {
      onRebuild(err, result) {
        if (!(err)) buildThen(result)
        else {
          toClients(addErrDiv);
          console.log(servLog);
        }
      },
    },
  });
}

async function buildThen(result) {
  buildResult = result;
  analyzeMetafile(result.metafile).then(msg =>
    console.log(msg+servLog)
  );
  toClients(result.outputFiles[0].text)
}

function toClients(data) {
  get(address, () => {
    canvasBundle = data;
  }).end();

  clients.forEach(res => res.end("data: reload\n\n"));
  clients.length = 0;
}

async function setListen(tryPort) {
  const tryServer = createServer().listen(tryPort, () =>
    tryServer.close().on('close', () => server.listen(tryPort)))
      .on('error', err => {
        if (err.code === 'EADDRINUSE') {
          tryServer.close().on('close', () => setListen(tryPort+1));
          return;
        } else throw err;
      })
};

const server = createServer((req, res) => {
  req.on('error', err => {
    if (err.code != 'ECONNRESET') {
      console.error(err);
      res.statusCode = 400;
      res.end('400: Bad Request');
      return;
    }
  });
  
  res.on('error', err => console.error(err));
  
  switch (req.url) {
    case '/':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="shortcut icon" href="#">
            <title>mtw-boilerplate-graphics</title>
            <style>
              body {
                margin: 0;
                background: black;
              }
              canvas {
                position: fixed;
                left: 0;
                top: 0;
                width: 100vw;
                height: 100vh;
              }
            </style>
          </head>
          <body>
            <canvas id="mtw-canvas"></canvas>
            <script src="/canvas.bundle.js"></script>
            <script>
              var evtSource = new EventSource("/events");
              evtSource.onerror = () => window.location.reload();
              evtSource.onmessage = () => window.location.reload();
              window.addEventListener("beforeunload", () => evtSource.close());
            </script>
          </body>
        </html>
      `)
      break;
      
    case '/canvas.bundle.js':
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
      });
      res.end(canvasBundle);
      break;
      
    case '/events':
      clients.push(
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        })
      );
      break;
      
    default:
      res.statusCode = 404;
      res.end('404: Resource Not Found');
  };
});

setListen(8080);

var buildResult = buildCmd();

server.on('listening', () => {
  address ='http://localhost:'+server.address().port+'/';
  servLog = "\n  server: \x1b[1;36m"+address+"\x1b[0m\n    exit: \x1b[35mctrl-c\x1b[0m\n";
  buildResult.then(result => buildThen(result));
});

build({
  entryPoints: ['./canvas.config.js'],
  write: false,
  watch: {
    onRebuild() {
      buildResult.stop();
      delete require.cache[require.resolve('./canvas.config.js')];
      
      try {
        canvas = require('./canvas.config.js');
      } catch (err) {
        toClients(addErrDiv);
        throw err;
      }
      
      console.log('[watch] build started (change: "canvas.config.js")');
      buildCmd().then(result => buildThen(result));
    },
  },
});
