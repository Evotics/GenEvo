import { useState, useRef } from "react";
import { generateBarcode } from "../api/client";
import { renderBarcodeImage, formatPriceLabel, canvasToDataURL } from "../utils/barcode";
import { haptic, hapticNotify } from "../hooks/useTheme";

interface Props {
  initData: string;
  telegramId: number;
  credits: number;
  onCreditsChange: (credits: number) => void;
}

const PRESET_PRICES = [10, 49, 100, 150, 200, 300];

export function GeneratePage({ initData, telegramId, credits, onCreditsChange }: Props) {
  const [ean, setEan] = useState("");
  const [pricePence, setPricePence] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    barcodeValue: string;
    priceLabel: string;
    imageUrl: string;
    creditsRemaining: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canGenerate = ean.replace(/\D/g, "").length >= 8 && pricePence !== null && pricePence > 0 && !loading;

  async function handleGenerate() {
    if (!canGenerate || pricePence === null) return;
    setLoading(true);
    setError(null);
    setResult(null);
    haptic("medium");

    try {
      const res = await generateBarcode(initData, ean, pricePence);
      const priceLabel = formatPriceLabel(pricePence);
      const hiddenCanvas = canvasRef.current!;
      renderBarcodeImage(hiddenCanvas, res.barcodeValue, priceLabel, String(telegramId));
      const imageUrl = canvasToDataURL(hiddenCanvas);

      setResult({
        barcodeValue: res.barcodeValue,
        priceLabel,
        imageUrl,
        creditsRemaining: res.creditsRemaining,
      });
      onCreditsChange(res.creditsRemaining);
      hapticNotify("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate barcode");
      hapticNotify("error");
    } finally {
      setLoading(false);
    }
  }

  function selectPrice(price: number) {
    setPricePence(price);
    setCustomPrice("");
    haptic("light");
  }

  function applyCustomPrice() {
    const val = parseInt(customPrice.replace(/\D/g, ""), 10);
    if (val && val > 0 && val <= 99999) {
      setPricePence(val);
      haptic("light");
    }
  }

  function handleDownload() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result.imageUrl;
    link.download = `sainsburys-barcode-${Date.now()}.png`;
    link.click();
    haptic("light");
  }

  function handleReset() {
    setResult(null);
    setEan("");
    setPricePence(null);
    setCustomPrice("");
    haptic("light");
  }

  return (
    <div className="fade-in">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="page-header">
        <div className="page-title">Generate Barcode</div>
        <div className="page-subtitle">
          {credits > 0 ? `${credits} credits remaining — 1 credit per generation` : "No credits remaining"}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="success-box" style={{ marginBottom: 0 }}>
            Barcode generated — {result.priceLabel} — {result.creditsRemaining} credits left
          </div>
          <div className="barcode-display">
            <img src={result.imageUrl} alt="Generated barcode" />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, fontFamily: "monospace" }}>
            {result.barcodeValue}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleDownload}>
              <span>⬇️</span> Save Image
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              Generate Another
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="input-group">
              <label className="input-label">Product Barcode (EAN)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="Enter 8-13 digit barcode"
                value={ean}
                maxLength={13}
                onChange={(e) => setEan(e.target.value.replace(/\D/g, ""))}
              />
              {ean.length > 0 && ean.length < 8 && (
                <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 4 }}>
                  At least 8 digits required ({ean.length}/8)
                </div>
              )}
            </div>

            <label className="input-label">Select Price</label>
            <div className="price-grid">
              {PRESET_PRICES.map((price) => (
                <button
                  key={price}
                  className={`price-chip ${pricePence === price ? "selected" : ""}`}
                  onClick={() => selectPrice(price)}
                >
                  {formatPriceLabel(price)}
                </button>
              ))}
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Custom Price (pence)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 150 = £1.50"
                  value={customPrice}
                  maxLength={5}
                  onChange={(e) => setCustomPrice(e.target.value.replace(/\D/g, ""))}
                  onBlur={applyCustomPrice}
                />
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "0 20px" }}
                  onClick={applyCustomPrice}
                  disabled={!customPrice}
                >
                  Set
                </button>
              </div>
              {pricePence !== null && (
                <div style={{ fontSize: 13, color: "var(--primary)", marginTop: 8, fontWeight: 600 }}>
                  Selected: {formatPriceLabel(pricePence)}
                </div>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Generating...
              </>
            ) : (
              <>📊 Generate Barcode</>
            )}
          </button>
        </>
      )}
    </div>
  );
}
