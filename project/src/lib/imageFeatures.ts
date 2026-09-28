import type { ImageFeatures } from '@/types';

export async function extractImageFeatures(imageDataUrl: string): Promise<ImageFeatures> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = imageDataUrl;
  });

  const canvas = document.createElement('canvas');
  const maxDim = 200;
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let rSum = 0, gSum = 0, bSum = 0;
  let brightSum = 0;
  let pixelCount = 0;
  const brightnessValues: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    rSum += r;
    gSum += g;
    bSum += b;
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    brightSum += brightness;
    brightnessValues.push(brightness);
    pixelCount++;
  }

  if (pixelCount === 0) {
    return {
      brightness: 0, contrast: 0, warmth: 0, uniformity: 0,
      edgeDensity: 0, symmetryScore: 0, usable: false,
      reason: 'No se pudieron procesar los píxeles de la imagen.',
    };
  }

  const avgR = rSum / pixelCount;
  const avgG = gSum / pixelCount;
  const avgB = bSum / pixelCount;
  const avgBright = brightSum / pixelCount;

  let variance = 0;
  for (const b of brightnessValues) variance += (b - avgBright) ** 2;
  variance /= brightnessValues.length;
  const stdDev = Math.sqrt(variance);

  let uniformity = 1 - Math.min(stdDev / 0.3, 1);

  const half = Math.floor(canvas.width / 2);
  let leftBright = 0, rightBright = 0;
  let leftCount = 0, rightCount = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      if (data[idx + 3] < 128) continue;
      const b = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
      if (x < half) { leftBright += b; leftCount++; }
      else { rightBright += b; rightCount++; }
    }
  }
  const leftAvg = leftCount > 0 ? leftBright / leftCount : 0;
  const rightAvg = rightCount > 0 ? rightBright / rightCount : 0;
  const symmetryScore = 1 - Math.min(Math.abs(leftAvg - rightAvg) / 0.5, 1);

  let edgeCount = 0;
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) { gray.push(0); continue; }
    gray.push((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255);
  }
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = y * canvas.width + x;
      const gx = Math.abs(gray[idx - 1] - gray[idx + 1]);
      const gy = Math.abs(gray[idx - canvas.width] - gray[idx + canvas.width]);
      if (gx + gy > 0.08) edgeCount++;
    }
  }
  const edgeDensity = edgeCount / (canvas.width * canvas.height);

  let usable = true;
  let reason: string | undefined;
  if (avgBright < 0.15) { usable = false; reason = 'La imagen es demasiado oscura para apreciar tu sonrisa.'; }
  else if (avgBright > 0.95) { usable = false; reason = 'La imagen está sobreexpuesta y no permite apreciar detalles.'; }
  else if (stdDev < 0.02) { usable = false; reason = 'La imagen parece demasiado uniforme; podría no mostrar tu sonrisa con claridad.'; }
  else if (edgeDensity < 0.01) { usable = false; reason = 'No se detectan suficientes detalles en la imagen.'; }

  return {
    brightness: avgBright,
    contrast: stdDev,
    warmth: (avgR - avgB) / 255,
    uniformity,
    edgeDensity,
    symmetryScore,
    usable,
    reason,
  };
}
