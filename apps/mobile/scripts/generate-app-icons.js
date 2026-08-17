/**
 * Generate Android launcher mipmaps + Expo adaptive icon sources
 * from assets/parishes/sacred-heart/logo.png
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const srcOriginal = path.join(root, 'assets', 'parishes', 'sacred-heart', 'app-icon-source.png');
const src = path.join(root, 'assets', 'parishes', 'sacred-heart', 'logo.png');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

const LAUNCHER = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function roundMask(size) {
  const svg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(svg).png().toBuffer();
}

async function writePng(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const webp = file.replace(/\.png$/i, '.webp');
  if (fs.existsSync(webp)) fs.unlinkSync(webp);
  const tmp = `${file}.tmp.png`;
  await sharp(buf).png().toFile(tmp);
  fs.renameSync(tmp, file);
  console.log('wrote', path.relative(root, file));
}

async function main() {
  const input = fs.existsSync(srcOriginal) ? srcOriginal : src;
  if (!fs.existsSync(input)) throw new Error(`Missing source icon: ${input}`);

  // Master square 1024 for Expo / stores
  const master1024 = await sharp(input)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
  const logoTmp = `${src}.tmp.png`;
  await sharp(master1024).toFile(logoTmp);
  fs.renameSync(logoTmp, src);
  console.log('wrote', path.relative(root, src));

  // Adaptive foreground: pad ~18% so text/border survive Android crop
  const fgPad = Math.round(1024 * 0.18);
  const fgCanvas = 1024 + fgPad * 2;
  const foregroundMaster = await sharp({
    create: {
      width: fgCanvas,
      height: fgCanvas,
      channels: 4,
      background: { r: 122, g: 23, b: 37, alpha: 1 }, // burgundy
    },
  })
    .composite([{ input: master1024, left: fgPad, top: fgPad }])
    .resize(1024, 1024)
    .png()
    .toBuffer();

  const fgOut = path.join(root, 'assets', 'parishes', 'sacred-heart', 'adaptive-foreground.png');
  const fgTmp = `${fgOut}.tmp.png`;
  await sharp(foregroundMaster).toFile(fgTmp);
  fs.renameSync(fgTmp, fgOut);
  console.log('wrote', path.relative(root, fgOut));

  for (const [folder, size] of Object.entries(LAUNCHER)) {
    const dir = path.join(res, folder);
    const square = await sharp(master1024).resize(size, size).png().toBuffer();
    await writePng(path.join(dir, 'ic_launcher.png'), square);

    const mask = await roundMask(size);
    const round = await sharp(square)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    await writePng(path.join(dir, 'ic_launcher_round.png'), round);
  }

  for (const [folder, size] of Object.entries(FOREGROUND)) {
    const dir = path.join(res, folder);
    const fg = await sharp(foregroundMaster).resize(size, size).png().toBuffer();
    await writePng(path.join(dir, 'ic_launcher_foreground.png'), fg);
  }

  console.log('Android launcher icons updated.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
