const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const toIco = require('to-ico');

const logoCroppedPath = path.join(__dirname, 'assets', 'logo-cropped.png');
const iconPngPath = path.join(__dirname, 'assets', 'icon.png');
const iconIcoPath = path.join(__dirname, 'assets', 'icon.ico');

const srcData = fs.readFileSync(logoCroppedPath);
const srcPng = PNG.sync.read(srcData);

// We will create a 256x256 icon
const SIZE = 256;
const destPng = new PNG({ width: SIZE, height: SIZE });

// Calculate scaling to fit nicely inside 256x256 with 24px padding on each side
const padding = 20;
const availW = SIZE - padding * 2;
const availH = SIZE - padding * 2;
const scale = Math.min(availW / srcPng.width, availH / srcPng.height);

const targetW = Math.round(srcPng.width * scale);
const targetH = Math.round(srcPng.height * scale);

const startX = Math.round((SIZE - targetW) / 2);
const startY = Math.round((SIZE - targetH) / 2);

// Fill with rounded white background badge so the red and grey logo contrasts beautifully
const cornerRadius = 40;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;

    // Check if inside rounded square [padding/2 .. SIZE - padding/2]
    const bPad = 6;
    const bLeft = bPad;
    const bTop = bPad;
    const bRight = SIZE - bPad;
    const bBottom = SIZE - bPad;

    let inBadge = false;
    if (x >= bLeft && x < bRight && y >= bTop && y < bBottom) {
      const dx = Math.max(bLeft + cornerRadius - x, 0, x - (bRight - cornerRadius));
      const dy = Math.max(bTop + cornerRadius - y, 0, y - (bBottom - cornerRadius));
      if (dx * dx + dy * dy <= cornerRadius * cornerRadius) {
        inBadge = true;
      }
    }

    if (inBadge) {
      // Clean white background with very subtle red border
      const isBorder = (
        (x <= bLeft + 3 || x >= bRight - 4 || y <= bTop + 3 || y >= bBottom - 4)
      );

      if (isBorder) {
        destPng.data[idx] = 220;     // R (Red accent #DC2626)
        destPng.data[idx + 1] = 38;  // G
        destPng.data[idx + 2] = 38;  // B
        destPng.data[idx + 3] = 255; // A
      } else {
        destPng.data[idx] = 255;     // White
        destPng.data[idx + 1] = 255;
        destPng.data[idx + 2] = 255;
        destPng.data[idx + 3] = 255;
      }
    } else {
      // Transparent outside badge
      destPng.data[idx] = 0;
      destPng.data[idx + 1] = 0;
      destPng.data[idx + 2] = 0;
      destPng.data[idx + 3] = 0;
    }
  }
}

// Draw the scaled logo onto the badge
for (let ty = 0; ty < targetH; ty++) {
  const sy = Math.floor(ty / scale);
  if (sy >= srcPng.height) continue;

  for (let tx = 0; tx < targetW; tx++) {
    const sx = Math.floor(tx / scale);
    if (sx >= srcPng.width) continue;

    const srcIdx = (sy * srcPng.width + sx) * 4;
    const sR = srcPng.data[srcIdx];
    const sG = srcPng.data[srcIdx + 1];
    const sB = srcPng.data[srcIdx + 2];
    const sA = srcPng.data[srcIdx + 3];

    if (sA > 0) {
      const dx = startX + tx;
      const dy = startY + ty;
      if (dx >= 0 && dx < SIZE && dy >= 0 && dy < SIZE) {
        const destIdx = (dy * SIZE + dx) * 4;
        const alpha = sA / 255;

        // Alpha blend over existing badge color
        destPng.data[destIdx] = Math.round(sR * alpha + destPng.data[destIdx] * (1 - alpha));
        destPng.data[destIdx + 1] = Math.round(sG * alpha + destPng.data[destIdx + 1] * (1 - alpha));
        destPng.data[destIdx + 2] = Math.round(sB * alpha + destPng.data[destIdx + 2] * (1 - alpha));
        destPng.data[destIdx + 3] = Math.max(destPng.data[destIdx + 3], sA);
      }
    }
  }
}

const outPngBuf = PNG.sync.write(destPng);
fs.writeFileSync(iconPngPath, outPngBuf);
console.log('Saved 256x256 icon.png');

// Convert to multi-size Windows icon (.ico)
toIco([outPngBuf], {
  sizes: [16, 24, 32, 48, 64, 128, 256],
  resize: true
}).then(icoBuf => {
  fs.writeFileSync(iconIcoPath, icoBuf);
  console.log('Successfully generated Windows icon.ico with all sizes!');
}).catch(err => {
  console.error('Failed to generate ico:', err);
});
