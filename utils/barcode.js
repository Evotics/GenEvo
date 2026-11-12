import bwipjs from 'bwip-js';

function pad(n, l) {
  return String(n).padStart(l, '0');
}

function checkDigit(s) {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += parseInt(s[s.length - 1 - i], 10) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function buildBarcodeValue(rawEan, pricePence) {
  let digits = rawEan.replace(/\D/g, '');
  if (digits.length === 14) digits = digits.slice(0, -1);
  digits = pad(digits, 13);
  const base = '91' + digits + pad(pricePence, 6);
  return base + checkDigit(base);
}

export function formatPriceLabel(pence) {
  if (pence < 100) return `${pence}p`;
  if (pence % 100 === 0) return `£${pence / 100}`;
  return `£${(pence / 100).toFixed(2)}`;
}

function drawPill(ctx, text, canvasWidth, yTop) {
  const pillH = 38;
  ctx.font = 'bold 22px DejaVu Sans, Liberation Sans, sans-serif';
  const textW = ctx.measureText(text).width;
  const pillW = Math.max(textW + 40, 80);
  const px = (canvasWidth - pillW) / 2;
  const py = yTop;
  const r = 12;

  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.lineTo(px + pillW - r, py);
  ctx.arcTo(px + pillW, py, px + pillW, py + r, r);
  ctx.lineTo(px + pillW, py + pillH - r);
  ctx.arcTo(px + pillW, py + pillH, px + pillW - r, py + pillH, r);
  ctx.lineTo(px + r, py + pillH);
  ctx.arcTo(px, py + pillH, px, py + pillH - r, r);
  ctx.lineTo(px, py + r);
  ctx.arcTo(px, py, px + r, py, r);
  ctx.closePath();
  ctx.fillStyle = '#f47738';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasWidth / 2, py + pillH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return pillH + 16;
}

export async function generateSecureBarcodeImage(rawEan, pricePence, generatorUserId) {
  const barcodeValue = buildBarcodeValue(rawEan, pricePence);
  const priceLabel = formatPriceLabel(pricePence);

  const barcodePng = await bwipjs.toBuffer({
    bcid: 'code128',
    text: barcodeValue,
    scale: 2,
    height: 20,
    includetext: false,
    backgroundcolor: 'ffffff',
    paddingwidth: 8,
    paddingheight: 4,
  });

  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const barcodeImg = await loadImage(barcodePng);

  const W = 400;
  const PAD = 16;
  const bcW = 360;
  const bcH = Math.round(barcodeImg.height * (bcW / barcodeImg.width));
  const headerH = 34;
  const pillArea = 54;
  const rebornH = 30;
  const footerH = 22;
  const H = PAD + headerH + pillArea + bcH + rebornH + footerH + PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#eeeeee';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, PAD + headerH - 4);
  ctx.lineTo(W - PAD, PAD + headerH - 4);
  ctx.stroke();

  ctx.fillStyle = '#333333';
  ctx.font = 'bold 13px DejaVu Sans, Liberation Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ID: ${generatorUserId}`, W / 2, PAD + headerH / 2);

  let y = PAD + headerH + 4;
  y += drawPill(ctx, priceLabel, W, y);

  ctx.drawImage(barcodeImg, (W - bcW) / 2, y, bcW, bcH);
  y += bcH + 12;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px DejaVu Sans, Liberation Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('REBORN', W / 2, y + rebornH / 2);

  ctx.fillStyle = '#999999';
  ctx.font = '600 10px DejaVu Sans, Liberation Sans, sans-serif';
  ctx.fillText('Made by Sains Reborn', W / 2, H - PAD - footerH / 2);

  return canvas.toBuffer('image/png');
}
