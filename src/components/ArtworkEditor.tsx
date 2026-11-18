import { useEffect, useRef, useState } from "react";
import type { ArtworkDesign } from "../types/configurator";

type ArtworkEditorProps = {
  design: ArtworkDesign;
  onDesignChange: (design: ArtworkDesign) => void;
};

type DragTarget = "logo" | "text" | null;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 360;

const LOGO_MAX_WIDTH = 150;
const LOGO_MAX_HEIGHT = 100;

function ArtworkEditor({ design, onDesignChange }: ArtworkEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragTargetRef = useRef<DragTarget>(null);
  const designRef = useRef(design);

  const [selectedTarget, setSelectedTarget] = useState<DragTarget>(null);

  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    designRef.current = design;
  }, [design]);

  // Load the logo separately so the canvas always draws
  // the logo before the brand text.
  useEffect(() => {
    if (!design.logo) {
      imageRef.current = null;
      return;
    }

    const image = new Image();

    image.onload = () => {
      imageRef.current = image;
      drawCanvas();
    };

    image.onerror = () => {
      imageRef.current = null;
      drawCanvas();
    };

    image.src = design.logo;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [design.logo]);

  // Draw canvas.
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const current = designRef.current;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = "#f5f7fa";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 3;
    context.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);

    context.save();
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 1;
    context.setLineDash([6, 5]);
    context.strokeRect(20, 20, 560, 320);
    context.restore();

    // Draw logo.
    const image = imageRef.current;

    if (image && image.complete && image.naturalWidth > 0) {
      const scale = Math.min(
        LOGO_MAX_WIDTH / image.width,
        LOGO_MAX_HEIGHT / image.height,
        1,
      );

      const width = image.width * scale;
      const height = image.height * scale;

      const x = (current.logoX / 100) * CANVAS_WIDTH;
      const y = (current.logoY / 100) * CANVAS_HEIGHT;

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
    }

    // Draw text.
    if (current.text.trim()) {
      const x = (current.textX / 100) * CANVAS_WIDTH;
      const y = (current.textY / 100) * CANVAS_HEIGHT;

      context.save();
      context.fillStyle = current.textColor;
      context.font = "bold 30px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";

      context.fillText(current.text, x, y, CANVAS_WIDTH - 50);

      if (selectedTarget === "text") {
        const width = Math.min(
          context.measureText(current.text).width,
          CANVAS_WIDTH - 50,
        );

        context.strokeStyle = "#2563eb";
        context.lineWidth = 2;
        context.setLineDash([5, 4]);

        context.strokeRect(x - width / 2 - 8, y - 22, width + 16, 44);
      }

      context.restore();
    }
  };

  // Redraw when design or selection changes.
  useEffect(() => {
    drawCanvas();
  }, [design, selectedTarget]);

  // Convert pointer position into canvas coordinates.
  const getCanvasPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  // Detect selected element.
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const position = getCanvasPosition(event);

    const current = designRef.current;

    const logoX = (current.logoX / 100) * CANVAS_WIDTH;
    const logoY = (current.logoY / 100) * CANVAS_HEIGHT;

    const textX = (current.textX / 100) * CANVAS_WIDTH;
    const textY = (current.textY / 100) * CANVAS_HEIGHT;

    const context = canvasRef.current?.getContext("2d");

    let textWidth = 120;

    if (context && current.text.trim()) {
      context.font = "bold 30px Arial";
      textWidth = Math.min(
        context.measureText(current.text).width,
        CANVAS_WIDTH - 50,
      );
    }

    const nearLogo =
      Boolean(current.logo) &&
      Math.abs(position.x - logoX) < 85 &&
      Math.abs(position.y - logoY) < 65;

    const nearText =
      Boolean(current.text.trim()) &&
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

  // Drag selected element.
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const target = dragTargetRef.current;

    if (!target) return;

    const position = getCanvasPosition(event);

    const x = Math.max(0, Math.min(100, (position.x / CANVAS_WIDTH) * 100));

    const y = Math.max(0, Math.min(100, (position.y / CANVAS_HEIGHT) * 100));

    const current = designRef.current;

    const updated: ArtworkDesign =
      target === "logo"
        ? { ...current, logoX: x, logoY: y }
        : { ...current, textX: x, textY: y };

    designRef.current = updated;
    onDesignChange(updated);
  };

  const handlePointerUp = () => {
    dragTargetRef.current = null;
  };

  // Upload logo.
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

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image size must be less than 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      onDesignChange({
        ...designRef.current,
        logo: reader.result,
      });
    };

    reader.onerror = () => {
      setUploadError("Unable to read this image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // Remove logo.
  const handleRemoveLogo = () => {
    imageRef.current = null;

    onDesignChange({
      ...designRef.current,
      logo: null,
    });

    setSelectedTarget(null);
  };

  // Update text.
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDesignChange({
      ...designRef.current,
      text: event.target.value,
    });
  };

  // Update text color.
  const handleTextColorChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onDesignChange({
      ...designRef.current,
      textColor: event.target.value,
    });
  };

  // Reset positions.
  const handleResetPositions = () => {
    onDesignChange({
      ...designRef.current,
      logoX: 50,
      logoY: 35,
      textX: 50,
      textY: 75,
    });

    setSelectedTarget(null);
  };

  return (
    <div className="artwork-editor">
      <div className="artwork-editor-heading">
        <h3>2D Artwork Editor</h3>
        <p>Upload your logo and drag elements on the canvas.</p>
      </div>

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
            touchAction: "none",
          }}
        />
      </div>

      <p className="artwork-hint">
        Select the logo or text and drag it to reposition.
      </p>

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

      <div className="artwork-control">
        <label htmlFor="brand-text-color">Text Color</label>

        <input
          id="brand-text-color"
          type="color"
          value={design.textColor}
          onChange={handleTextColorChange}
        />
      </div>

      <div className="artwork-selection-info">
        <span>Selected element</span>

        <strong>
          {selectedTarget === "logo"
            ? "Logo"
            : selectedTarget === "text"
              ? "Brand Text"
              : "None"}
        </strong>
      </div>

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
