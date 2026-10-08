import confetti from 'canvas-confetti';

const PIXEL = 64;
const SHAPE_SCALAR = PIXEL / 10;

let cannon;
let shapes;

function fire(options) {
  if (!cannon) {
    cannon = confetti.create(null, { useWorker: false, resize: true });
  }
  return cannon(options);
}

function bitmapShape(draw) {
  const canvas = new OffscreenCanvas(PIXEL, PIXEL);
  const ctx = canvas.getContext('2d');
  draw(ctx, PIXEL);
  const scale = 1 / SHAPE_SCALAR;
  return {
    type: 'bitmap',
    bitmap: canvas.transferToImageBitmap(),
    matrix: [scale, 0, 0, scale, -(PIXEL * scale) / 2, -(PIXEL * scale) / 2],
  };
}

function drawSnowflake(ctx, size, color) {
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = color;
  const arm = size * 0.44;
  const half = size * 0.075;
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(-half * 0.35, 0);
    ctx.lineTo(half, -arm * 0.42);
    ctx.lineTo(half * 0.2, -arm);
    ctx.lineTo(-half * 0.2, -arm);
    ctx.lineTo(-half, -arm * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -arm * 0.46);
    ctx.lineTo(size * 0.16, -arm * 0.7);
    ctx.lineTo(size * 0.05, -arm * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -arm * 0.46);
    ctx.lineTo(-size * 0.16, -arm * 0.7);
    ctx.lineTo(-size * 0.05, -arm * 0.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawCandyCane(ctx, size) {
  const width = size * 0.2;
  const shaftX = size * 0.3;
  const hookY = size * 0.38;
  const radius = size * 0.2;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(shaftX, size * 0.92);
  ctx.lineTo(shaftX, hookY);
  ctx.arc(shaftX + radius, hookY, radius, Math.PI, 0.7, false);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.strokeStyle = '#e11d48';
  ctx.setLineDash([width * 0.85, width * 0.85]);
  ctx.stroke();
}

function drawOrnament(ctx, size, color) {
  const cx = size * 0.5;
  const cy = size * 0.6;
  const radius = size * 0.28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.35, cy - radius * 0.38, radius * 0.28, radius * 0.16, -0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6d36b';
  ctx.beginPath();
  ctx.roundRect(cx - size * 0.11, cy - radius - size * 0.08, size * 0.22, size * 0.1, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - radius - size * 0.1, size * 0.055, 0, Math.PI * 2);
  ctx.fill();
}

function getShapes() {
  if (shapes) return shapes;
  shapes = {
    snowflakes: [
      bitmapShape((ctx, size) => drawSnowflake(ctx, size, '#ffffff')),
      bitmapShape((ctx, size) => drawSnowflake(ctx, size, '#dbeafe')),
    ],
    candyCanes: [
      bitmapShape((ctx, size) => drawCandyCane(ctx, size)),
    ],
    ornaments: [
      bitmapShape((ctx, size) => drawOrnament(ctx, size, '#dc2626')),
      bitmapShape((ctx, size) => drawOrnament(ctx, size, '#16a34a')),
      bitmapShape((ctx, size) => drawOrnament(ctx, size, '#2563eb')),
      bitmapShape((ctx, size) => drawOrnament(ctx, size, '#fbbf24')),
    ],
  };
  return shapes;
}

function burst({ shapes: pieceShapes, origin, particleCount, angle, spread, scalar }) {
  fire({
    particleCount,
    angle: angle ?? 90,
    spread: spread ?? 80,
    origin,
    startVelocity: 32,
    gravity: 0.72,
    ticks: 260,
    scalar: scalar ?? 2.8,
    shapes: pieceShapes,
    flat: true,
    colors: ['#ffffff'],
  });
}


export function celebrateDraw() {
  const pieces = getShapes();
  const origin = { x: 0.5, y: 0.62 };
  burst({ shapes: pieces.snowflakes, origin, particleCount: 16, spread: 120, scalar: 2.6 });
  burst({ shapes: pieces.candyCanes, origin, particleCount: 10, spread: 100, scalar: 3 });
  burst({ shapes: pieces.ornaments, origin, particleCount: 12, spread: 130, scalar: 2.7 });
}

export function celebrateUnwrap() {
  const pieces = getShapes();
  const origin = { x: 0.5, y: 0.58 };
  burst({ shapes: pieces.snowflakes, origin, particleCount: 18, spread: 120, scalar: 2.6 });
  burst({ shapes: pieces.candyCanes, origin, particleCount: 12, spread: 100, scalar: 3 });
  burst({ shapes: pieces.ornaments, origin, particleCount: 12, spread: 130, scalar: 2.7 });
  window.setTimeout(() => {
    burst({
      shapes: pieces.snowflakes,
      origin: { x: 0.05, y: 0.7 },
      particleCount: 12,
      angle: 60,
      spread: 50,
      scalar: 2.4,
    });
    burst({
      shapes: pieces.ornaments,
      origin: { x: 0.95, y: 0.7 },
      particleCount: 8,
      angle: 120,
      spread: 55,
      scalar: 2.5,
    });
  }, 280);
}
