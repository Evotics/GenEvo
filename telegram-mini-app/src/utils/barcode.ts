import bwipjs from "bwip-js";

/**
 * Builds the barcode value from EAN + price.
 * Reused from the original Discord bot's utils/barcode.js.
 */
function pad(n: string, l: number): string {
  return n.padStart(l, "0");
}

function checkDigit(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += parseInt(s[s.length - 1 - i], 10) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function buildBarcodeValue(rawEan: string, pricePence: number): string {
  let digits = rawEan.replace(/\D/g, "");
  if (digits.length === 14) digits = digits.slice(0, -1);
  digits = pad(digits, 13);
  const base = "91" + digits + pad(String(pricePence), 6);
  return base + checkDigit(base);
}

export function formatPriceLabel(pence: number): string {
  if (pence < 100) return `${pence}p`;
  if (pence % 100 === 0) return `£${pence / 100}`;
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Renders a barcode image to a canvas, matching the original Discord bot's layout.
 * Uses bwip-js for Code128 generation and canvas 2D for the full image with branding.
 */
export function renderBarcodeImage(
  canvas: HTMLCanvasElement,
  barcodeValue: string,
  priceLabel: string,
  userIdLabel: string,
): void {
  // Generate the barcode PNG via bwip-js
  const barcodeCanvas = document.createElement("canvas");
  bwipjs.toCanvas(barcodeCanvas, {
    bcid: "code128",
    text: barcodeValue,
    scale: 2,
    height: 20,
    includetext: false,
    backgroundcolor: "ffffff",
    paddingwidth: 8,
    paddingheight: 4,
  });

  const W = 400;
  const PAD = 16;
  const bcW = 360;
  const bcH = Math.round(barcodeCanvas.height * (bcW / barcodeCanvas.width));
  const headerH = 34;
  const pillArea = 54;
  const rebornH = 30;
  const footerH = 22;
  const H = PAD + headerH + pillArea + bcH + rebornH + footerH + PAD;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Divider line under header
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, PAD + headerH - 4);
  ctx.lineTo(W - PAD, PAD + headerH - 4);
  ctx.stroke();

  // User ID
  ctx.fillStyle = "#333333";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`ID: ${userIdLabel}`, W / 2, PAD + headerH / 2);

  // Price pill
  let y = PAD + headerH + 4;
  y += drawPill(ctx, priceLabel, W, y);

  // Barcode
  ctx.drawImage(barcodeCanvas, (W - bcW) / 2, y, bcW, bcH);
  y += bcH + 12;

  // REBORN text
  ctx.fillStyle = "#000000";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("REBORN", W / 2, y + rebornH / 2);

  // Footer
  ctx.fillStyle = "#999999";
  ctx.font = "600 10px sans-serif";
  ctx.fillText("Made by Sains Reborn", W / 2, H - PAD - footerH / 2);
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, canvasWidth: number, yTop: number): number {
  const pillH = 38;
  ctx.font = "bold 22px sans-serif";
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
  ctx.fillStyle = "#f47738";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvasWidth / 2, py + pillH / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return pillH + 16;
}

export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}
