import { useEffect, useRef, useState } from "react";
import type { ArtworkDesign } from "../types/configurator";

type ArtworkEditorProps = {
  design: ArtworkDesign;
  onDesignChange: (design: ArtworkDesign) => void;
};

type DragTarget = "logo" | "text" | null;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 360;

function ArtworkEditor({ design, onDesignChange }: ArtworkEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const dragTargetRef = useRef<DragTarget>(null);

  const [selectedTarget, setSelectedTarget] = useState<DragTarget>(null);

  const [uploadError, setUploadError] = useState("");

  // -------------------------------------------
  // DRAW ARTWORK CANVAS
  // -------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Front panel background
    context.fillStyle = "#f5f7fa";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Panel border
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 3;
    context.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);

    // Inner dashed guide
    context.save();
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 1;
    context.setLineDash([6, 5]);
    context.strokeRect(20, 20, 560, 320);
    context.restore();

    // Draw logo
    if (design.logo) {
      const image = new Image();

      image.onload = () => {
        if (canvasRef.current !== canvas) return;

        const maxWidth = 150;
        const maxHeight = 100;

        const scale = Math.min(
          maxWidth / image.width,
          maxHeight / image.height,
          1,
        );

        const width = image.width * scale;
        const height = image.height * scale;

        const x = (design.logoX / 100) * CANVAS_WIDTH;

        const y = (design.logoY / 100) * CANVAS_HEIGHT;

        context.drawImage(image, x - width / 2, y - height / 2, width, height);

        if (selectedTarget === "logo") {
          context.save();
          context.strokeStyle = "#2563eb";
          context.lineWidth = 2;
          context.setLineDash([5, 4]);
          context.strokeRect(
            x - width / 2 - 5,
            y - height / 2 - 5,
            width + 10,
            height + 10,
          );
          context.restore();
        }
      };

      image.onerror = () => {
        console.warn("Unable to load artwork logo.");
      };

      image.src = design.logo;
      logoImageRef.current = image;
    }

    // Draw brand text
    if (design.text.trim()) {
      const x = (design.textX / 100) * CANVAS_WIDTH;

      const y = (design.textY / 100) * CANVAS_HEIGHT;

      context.save();
      context.fillStyle = design.textColor;
      context.font = "bold 30px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";

      context.fillText(design.text, x, y, CANVAS_WIDTH - 50);

      if (selectedTarget === "text") {
        const textWidth = Math.min(
          context.measureText(design.text).width,
          CANVAS_WIDTH - 50,
        );

        context.strokeStyle = "#2563eb";
        context.lineWidth = 2;
        context.setLineDash([5, 4]);

        context.strokeRect(x - textWidth / 2 - 8, y - 22, textWidth + 16, 44);
      }

      context.restore();
    }
  }, [design, selectedTarget]);

  // -------------------------------------------
  // UPLOAD LOGO
  // -------------------------------------------

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Please upload a PNG, JPG, or WebP image.");

      event.target.value = "";
      return;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      setUploadError("Image size must be less than 2 MB.");

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      onDesignChange({
        ...design,
        logo: reader.result,
      });
    };

    reader.onerror = () => {
      setUploadError("Unable to read this image.");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  // -------------------------------------------
  // REMOVE LOGO
  // -------------------------------------------

  const handleRemoveLogo = () => {
    onDesignChange({
      ...design,
      logo: null,
    });

    if (selectedTarget === "logo") {
      setSelectedTarget(null);
    }
  };

  // -------------------------------------------
  // CANVAS POINTER POSITION
  // -------------------------------------------

  const getCanvasPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,

      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  // -------------------------------------------
  // DETECT WHICH ELEMENT WAS SELECTED
  // -------------------------------------------

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const position = getCanvasPosition(event);

    const logoX = (design.logoX / 100) * CANVAS_WIDTH;

    const logoY = (design.logoY / 100) * CANVAS_HEIGHT;

    const textX = (design.textX / 100) * CANVAS_WIDTH;

    const textY = (design.textY / 100) * CANVAS_HEIGHT;

    const context = canvasRef.current?.getContext("2d");

    let textWidth = 120;

    if (context && design.text) {
      context.font = "bold 30px Arial";

      textWidth = Math.min(
        context.measureText(design.text).width,
        CANVAS_WIDTH - 50,
      );
    }

    const nearLogo =
      Boolean(design.logo) &&
      Math.abs(position.x - logoX) < 85 &&
      Math.abs(position.y - logoY) < 65;

    const nearText =
      Boolean(design.text.trim()) &&
      Math.abs(position.x - textX) < textWidth / 2 + 15 &&
      Math.abs(position.y - textY) < 30;

    let target: DragTarget = null;

    if (nearLogo && nearText) {
      const logoDistance = Math.hypot(position.x - logoX, position.y - logoY);

      const textDistance = Math.hypot(position.x - textX, position.y - textY);

      target = logoDistance < textDistance ? "logo" : "text";
    } else if (nearLogo) {
      target = "logo";
    } else if (nearText) {
      target = "text";
    }

    dragTargetRef.current = target;
    setSelectedTarget(target);

    if (target) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  // -------------------------------------------
  // DRAG SELECTED ELEMENT
  // -------------------------------------------

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const target = dragTargetRef.current;

    if (!target) return;

    const position = getCanvasPosition(event);

    const x = Math.max(0, Math.min(100, (position.x / CANVAS_WIDTH) * 100));

    const y = Math.max(0, Math.min(100, (position.y / CANVAS_HEIGHT) * 100));

    if (target === "logo") {
      onDesignChange({
        ...design,
        logoX: x,
        logoY: y,
      });
    }

    if (target === "text") {
      onDesignChange({
        ...design,
        textX: x,
        textY: y,
      });
    }
  };

  const handlePointerUp = () => {
    dragTargetRef.current = null;
  };

  // -------------------------------------------
  // UPDATE TEXT
  // -------------------------------------------

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDesignChange({
      ...design,
      text: event.target.value,
    });
  };

  // -------------------------------------------
  // UPDATE TEXT COLOR
  // -------------------------------------------

  const handleTextColorChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onDesignChange({
      ...design,
      textColor: event.target.value,
    });
  };

  // -------------------------------------------
  // RESET POSITIONS
  // -------------------------------------------

  const handleResetPositions = () => {
    onDesignChange({
      ...design,
      logoX: 50,
      logoY: 35,
      textX: 50,
      textY: 75,
    });

    setSelectedTarget(null);
  };

  // -------------------------------------------
  // RENDER
  // -------------------------------------------

  return (
    <div className="artwork-editor">
      <div className="artwork-editor-heading">
        <h3>2D Artwork Editor</h3>

        <p>Upload your logo and drag elements on the canvas.</p>
      </div>

      {/* CANVAS */}

      <div className="artwork-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="artwork-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            cursor: dragTargetRef.current ? "grabbing" : "grab",
          }}
        />
      </div>

      <p className="artwork-hint">
        Select the logo or text and drag it to reposition.
      </p>

      {/* LOGO UPLOAD */}

      <div className="artwork-control">
        <label htmlFor="artwork-logo">Upload Logo</label>

        <input
          id="artwork-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleLogoUpload}
        />

        {design.logo && (
          <button
            type="button"
            className="text-button"
            onClick={handleRemoveLogo}
          >
            Remove Logo
          </button>
        )}

        {uploadError && <p className="artwork-error">{uploadError}</p>}
      </div>

      {/* BRAND TEXT */}

      <div className="artwork-control">
        <label htmlFor="brand-text">Brand Text</label>

        <input
          id="brand-text"
          type="text"
          maxLength={40}
          value={design.text}
          onChange={handleTextChange}
          placeholder="Enter your brand name"
        />

        <small>{design.text.length}/40 characters</small>
      </div>

      {/* TEXT COLOR */}

      <div className="artwork-control">
        <label htmlFor="brand-text-color">Text Color</label>

        <input
          id="brand-text-color"
          type="color"
          value={design.textColor}
          onChange={handleTextColorChange}
        />
      </div>

      {/* SELECTED ELEMENT */}

      <div className="artwork-selection-info">
        <span>Selected element</span>

        <strong>
          {selectedTarget
            ? selectedTarget === "logo"
              ? "Logo"
              : "Brand Text"
            : "None"}
        </strong>
      </div>

      {/* RESET */}

      <button
        type="button"
        className="secondary-button"
        onClick={handleResetPositions}
      >
        Reset Artwork Positions
      </button>
    </div>
  );
}

export default ArtworkEditor;
