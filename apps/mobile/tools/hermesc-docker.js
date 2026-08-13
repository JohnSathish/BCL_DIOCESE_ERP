#!/usr/bin/env node
/**
 * Run Linux hermesc inside Docker so Windows Device Guard cannot block hermesc.exe.
 * Compatible with React Native BundleHermesCTask args:
 *   hermesc -w -emit-binary -max-diagnostic-width=80 -out <out.hbc> <bundle.js> [-O] [-output-source-map]
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const hermescBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'sdks',
  'hermesc',
  'linux64-bin',
  'hermesc'
);

if (!fs.existsSync(hermescBin)) {
  console.error('hermesc-docker: missing Linux hermesc at', hermescBin);
  process.exit(1);
}

const args = process.argv.slice(2);
let outPath = null;
let inPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-out' && args[i + 1]) {
    outPath = path.resolve(args[++i]);
    continue;
  }
  // Input bundle is the last existing file that is not the -out target
  const candidate = path.resolve(args[i]);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    inPath = candidate;
  }
}

if (!outPath || !inPath) {
  console.error('hermesc-docker: need -out <file> and an input bundle. got:', args);
  process.exit(1);
}

const outDir = path.dirname(outPath);
const inDir = path.dirname(inPath);
const outName = path.basename(outPath);
const inName = path.basename(inPath);

const dockerArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-out' && args[i + 1]) {
    dockerArgs.push('-out', `/out/${outName}`);
    i++;
    continue;
  }
  const abs = path.resolve(args[i]);
  if (abs === inPath) {
    dockerArgs.push(`/in/${inName}`);
    continue;
  }
  dockerArgs.push(args[i]);
}

const toDockerPath = (p) => p.replace(/\\/g, '/');

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${toDockerPath(hermescBin)}:/hermesc.bin:ro`,
    '-v',
    `${toDockerPath(inDir)}:/in`,
    '-v',
    `${toDockerPath(outDir)}:/out`,
    'ubuntu:22.04',
    'bash',
    '-lc',
    `cp /hermesc.bin /tmp/hermesc && chmod +x /tmp/hermesc && /tmp/hermesc ${dockerArgs
      .map((a) => (a.includes(' ') ? JSON.stringify(a) : a))
      .join(' ')}`,
  ],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error('hermesc-docker: failed to start docker:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
