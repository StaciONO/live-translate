// Generate a simple app icon using Canvas
const { createCanvas } = require('canvas');
const fs = require('fs');

try {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6c63ff');
  grad.addColorStop(1, '#a78bfa');

  // Rounded rect background
  const r = 200;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fillStyle = grad;
  ctx.fill();

  // Microphone icon (simple)
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 40;
  ctx.lineCap = 'round';

  // Mic body
  const cx = size / 2;
  const cy = size / 2 - 60;
  const mw = 120;
  const mh = 200;

  ctx.beginPath();
  ctx.moveTo(cx - mw, cy);
  ctx.lineTo(cx - mw, cy + mh * 0.3);
  ctx.quadraticCurveTo(cx - mw, cy + mh, cx, cy + mh);
  ctx.quadraticCurveTo(cx + mw, cy + mh, cx + mw, cy + mh * 0.3);
  ctx.lineTo(cx + mw, cy);
  ctx.quadraticCurveTo(cx + mw, cy - mh * 0.6, cx, cy - mh * 0.6);
  ctx.quadraticCurveTo(cx - mw, cy - mh * 0.6, cx - mw, cy);
  ctx.fill();

  // Mic arc
  ctx.beginPath();
  ctx.arc(cx, cy + mh * 0.3, mw + 60, 0, Math.PI);
  ctx.stroke();

  // Mic stand
  ctx.beginPath();
  ctx.moveTo(cx, cy + mh * 0.3 + mw + 60);
  ctx.lineTo(cx, cy + mh * 0.3 + mw + 160);
  ctx.stroke();

  // Base
  ctx.beginPath();
  ctx.moveTo(cx - 80, cy + mh * 0.3 + mw + 160);
  ctx.lineTo(cx + 80, cy + mh * 0.3 + mw + 160);
  ctx.stroke();

  // Translation waves
  ctx.lineWidth = 28;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    const x = cx + 200 + i * 70;
    ctx.beginPath();
    ctx.arc(cx + 180, cy + 50, 140 + i * 70, -0.6, 0.6);
    ctx.stroke();
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('icon.png', buffer);
  console.log('Icon created!');
} catch(e) {
  console.log('Canvas not available, creating simple SVG icon instead');

  // Fallback: create an SVG and note that we need to convert it
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6c63ff"/>
      <stop offset="100%" style="stop-color:#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="200" fill="url(#bg)"/>
  <g transform="translate(512, 400)" fill="white" stroke="white" stroke-width="40" stroke-linecap="round">
    <rect x="-90" y="-180" width="180" height="300" rx="90" fill="white" stroke="none"/>
    <path d="M-180,80 A180,180 0 0,0 180,80" fill="none"/>
    <line x1="0" y1="260" x2="0" y2="380" fill="none"/>
    <line x1="-80" y1="380" x2="80" y2="380" fill="none"/>
  </g>
  <g transform="translate(650, 350)" fill="none" stroke="white" stroke-width="28" stroke-linecap="round" opacity="0.6">
    <path d="M0,-60 A80,80 0 0,1 0,60"/>
    <path d="M30,-90 A120,120 0 0,1 30,90"/>
    <path d="M60,-120 A160,160 0 0,1 60,120"/>
  </g>
</svg>`;
  fs.writeFileSync('icon.svg', svg);
  console.log('SVG icon created at icon.svg');
}
