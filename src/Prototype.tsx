import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  Cross2Icon,
  DownloadIcon,
  ReloadIcon,
  Share2Icon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { Carousel, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";

type TextColor = "#ffffff" | "#252525";

type BackgroundChoice = {
  id: string;
  label: string;
  src: string;
};

const OUTPUT_WIDTH = 1448;
const OUTPUT_HEIGHT = 1086;
const PREVIEW_WIDTH = 960;
const PREVIEW_HEIGHT = 720;
const FONT_FAMILY = '"Some Time Later", "Arial Rounded MT Bold", sans-serif';

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string) {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

  imageCache.set(src, pending);
  return pending;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > canvasRatio) {
    sourceWidth = image.naturalHeight * canvasRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / canvasRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  color: TextColor,
  width: number,
  height: number,
) {
  const safeText = text.trim() || "One month later...";
  const maxWidth = width * 0.82;
  let fontSize = width * 0.105;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.shadowColor = color === "#ffffff" ? "rgba(4, 37, 73, 0.16)" : "rgba(255, 255, 255, 0.12)";
  context.shadowBlur = width * 0.009;
  context.shadowOffsetY = width * 0.004;

  while (fontSize > width * 0.046) {
    context.font = `${fontSize}px ${FONT_FAMILY}`;
    if (context.measureText(safeText).width <= maxWidth) break;
    fontSize -= 3;
  }

  context.fillText(safeText, width / 2, height / 2);
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
}

async function renderCard(
  canvas: HTMLCanvasElement,
  backgroundSrc: string,
  hue: number,
  text: string,
  textColor: TextColor,
  width: number,
  height: number,
) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: false });
  if (!context) return;

  const [image] = await Promise.all([
    loadImage(backgroundSrc),
    document.fonts?.load(`72px ${FONT_FAMILY}`).catch(() => undefined),
  ]);

  context.clearRect(0, 0, width, height);
  context.save();
  context.filter = `hue-rotate(${hue}deg)`;
  drawCover(context, image, width, height);
  context.restore();
  drawFittedText(context, text, textColor, width, height);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the PNG."));
    }, "image/png");
  });
}

function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "later-card";
}

export default function Prototype() {
  const keyboard = useKeyboard();
  const base = import.meta.env.BASE_URL;
  const presets = useMemo<BackgroundChoice[]>(
    () => [
      {
        id: "vivid",
        label: "Vivid blue",
        src: `${base}assets/later-card/master-vivid-blue.png`,
      },
      {
        id: "pastel",
        label: "Pastel blue",
        src: `${base}assets/later-card/master-pastel-blue.png`,
      },
    ],
    [base],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedUrlRef = useRef<string | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundChoice>(presets[0]);
  const [text, setText] = useState("One month later...");
  const [hue, setHue] = useState(0);
  const [textColor, setTextColor] = useState<TextColor>("#ffffff");
  const [status, setStatus] = useState("");
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderCard(
      canvas,
      selectedBackground.src,
      hue,
      text,
      textColor,
      PREVIEW_WIDTH,
      PREVIEW_HEIGHT,
    )
      .then(() => {
        if (active) setRenderError("");
      })
      .catch(() => {
        if (active) setRenderError("This image could not be opened. Try another file.");
      });

    return () => {
      active = false;
    };
  }, [hue, selectedBackground.src, text, textColor]);

  useEffect(
    () => () => {
      if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
    },
    [],
  );

  const createPng = async () => {
    const exportCanvas = document.createElement("canvas");
    await renderCard(
      exportCanvas,
      selectedBackground.src,
      hue,
      text,
      textColor,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT,
    );
    return canvasToBlob(exportCanvas);
  };

  const downloadPng = async () => {
    try {
      const blob = await createPng();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugify(text)}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("PNG saved.");
    } catch {
      setStatus("PNG could not be saved. Please try again.");
    }
  };

  const sharePng = async () => {
    try {
      const blob = await createPng();
      const file = new File([blob], `${slugify(text)}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Later Card",
          text,
        });
        setStatus("Card shared.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("Sharing is not available here, so the PNG was saved instead.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("The card could not be shared. Please try again.");
    }
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }

    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
    const src = URL.createObjectURL(file);
    uploadedUrlRef.current = src;
    imageCache.delete(src);
    setSelectedBackground({ id: "upload", label: "My photo", src });
    setHue(0);
    setStatus("Photo added.");
  };

  return (
    <MobileScroll className="app-screen later-card-scroll">
      <main className="later-card-main" aria-labelledby="later-card-title">
        <header className="app-header">
          <p className="app-kicker">COLOR YOUR TIME</p>
          <h1 id="later-card-title">Later Card</h1>
        </header>

        <section className="preview-section" aria-label="Card preview">
          <div className="card-preview-frame">
            <canvas
              ref={canvasRef}
              className="card-preview"
              data-testid="card-canvas"
              aria-label={`Preview with ${selectedBackground.label} background`}
            />
            {renderError && <p className="preview-error">{renderError}</p>}
          </div>

          <div className="hue-control">
            <div className="control-heading">
              <label htmlFor="hue-range">Hue</label>
              <button
                className="reset-button"
                type="button"
                onClick={() => setHue(0)}
                disabled={hue === 0}
              >
                <ReloadIcon aria-hidden="true" />
                Reset
              </button>
            </div>
            <div className="hue-slider-row">
              <input
                id="hue-range"
                aria-label="Background hue"
                type="range"
                min="-180"
                max="180"
                step="1"
                value={hue}
                onChange={(event) => setHue(Number(event.target.value))}
              />
              <output htmlFor="hue-range">{hue > 0 ? "+" : ""}{hue}°</output>
            </div>
          </div>
        </section>

        <section className="editor-section" aria-labelledby="phrase-label">
          <div className="section-heading-row">
            <label id="phrase-label" htmlFor="phrase-input">Phrase</label>
            <div className="color-choice" role="group" aria-label="Text color">
              <button
                type="button"
                className="color-option"
                aria-pressed={textColor === "#ffffff"}
                onClick={() => setTextColor("#ffffff")}
              >
                <span className="color-dot color-dot-white" aria-hidden="true" />
                White
              </button>
              <button
                type="button"
                className="color-option"
                aria-pressed={textColor === "#252525"}
                onClick={() => setTextColor("#252525")}
              >
                <span className="color-dot color-dot-charcoal" aria-hidden="true" />
                Charcoal
              </button>
            </div>
          </div>

          <div className="phrase-input-wrap">
            <KeyboardInput
              id="phrase-input"
              value={text}
              maxLength={70}
              spellCheck="true"
              aria-describedby="phrase-help"
              onChange={(event) => setText(event.target.value)}
              onBlur={() => keyboard.hide()}
            />
            {text && (
              <button
                className="clear-button"
                type="button"
                aria-label="Clear phrase"
                onClick={() => setText("")}
              >
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
          </div>
          <p id="phrase-help" className="field-help">{text.length}/70</p>
        </section>

        <section className="background-section" aria-labelledby="background-title">
          <div className="section-heading-row background-heading">
            <h2 id="background-title">Background</h2>
            <span>{selectedBackground.label}</span>
          </div>

          <Carousel
            className="background-carousel"
            contentClassName="background-track"
            ariaLabel="Background choices"
          >
            <button
              className={`background-choice upload-choice${selectedBackground.id === "upload" ? " is-selected" : ""}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload my photo"
              aria-pressed={selectedBackground.id === "upload"}
            >
              <span className="background-circle upload-circle">
                <UploadIcon aria-hidden="true" />
              </span>
              <span>Upload</span>
            </button>

            {presets.map((preset) => {
              const selected = selectedBackground.id === preset.id;
              return (
                <button
                  key={preset.id}
                  className={`background-choice${selected ? " is-selected" : ""}`}
                  type="button"
                  aria-label={`Use ${preset.label} background`}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedBackground(preset);
                    setHue(0);
                  }}
                >
                  <span className="background-circle">
                    <img src={preset.src} alt="" />
                    {selected && (
                      <span className="selection-check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    )}
                  </span>
                  <span>{preset.id === "vivid" ? "Vivid" : "Pastel"}</span>
                </button>
              );
            })}

            {[1, 2, 3].map((slot) => (
              <div className="background-choice empty-choice" aria-label={`Empty preset slot ${slot}`} key={slot}>
                <span className="background-circle empty-circle" aria-hidden="true" />
                <span>Empty</span>
              </div>
            ))}
          </Carousel>

          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept="image/*"
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
        </section>

        <section className="action-section" aria-label="Export actions">
          <button className="primary-action" type="button" onClick={downloadPng}>
            <DownloadIcon aria-hidden="true" />
            Save PNG
          </button>
          <button className="secondary-action" type="button" onClick={sharePng}>
            <Share2Icon aria-hidden="true" />
            Share
          </button>
          <p className="status-message" role="status" aria-live="polite">{status}</p>
        </section>
      </main>
    </MobileScroll>
  );
}
