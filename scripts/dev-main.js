const { spawn } = require('child_process');
const { build } = require('vite');
const path = require('path');

let electronProcess = null;
let preloadBuilt = false;

async function startElectron() {
  if (!preloadBuilt) {
    console.log('Waiting for preload to build...');
    return;
  }

  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }

  electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  electronProcess.on('close', (code) => {
    if (code !== null) {
      process.exit(code);
    }
  });
}

async function watchMain() {
  // Build preload first (one-time build to ensure it exists)
  console.log('Building preload...');
  await build({
    configFile: path.resolve(__dirname, '../vite.preload.config.ts'),
    mode: 'development',
  });
  preloadBuilt = true;
  console.log('Preload built successfully');

  // Watch preload for changes
  build({
    configFile: path.resolve(__dirname, '../vite.preload.config.ts'),
    mode: 'development',
    build: {
      watch: {},
    },
    plugins: [
      {
        name: 'preload-rebuild',
        closeBundle() {
          console.log('Preload rebuilt');
        },
      },
    ],
  });

  // Build and watch main
  await build({
    configFile: path.resolve(__dirname, '../vite.main.config.ts'),
    mode: 'development',
    build: {
      watch: {},
    },
    plugins: [
      {
        name: 'electron-restart',
        closeBundle() {
          startElectron();
        },
      },
    ],
  });
}

watchMain();
