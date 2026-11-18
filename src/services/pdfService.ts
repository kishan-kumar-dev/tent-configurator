
import { jsPDF } from "jspdf";

import type { TentConfiguration } from "../types/configurator";
import type { PriceBreakdown } from "./pricingService";

const formatPrice = (amount: number): string =>
  `Rs. ${amount.toLocaleString("en-IN")}`;

const formatColor = (color: string): string => color.toUpperCase();

export function generateConfigurationPDF(
  configuration: TentConfiguration,
  pricing: PriceBreakdown,
  previewImage?: string | null,
): void {
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let y = 20;

  // Page boundary helper
  const checkPageSpace = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 18) {
      pdf.addPage();
      y = 20;
    }
  };

  // Text helper for long content
  const addWrappedText = (
    text: string,
    x: number,
    maxWidth: number,
    lineHeight = 6,
  ) => {
    const lines = pdf.splitTextToSize(text, maxWidth);

    checkPageSpace(lines.length * lineHeight);

    pdf.text(lines, x, y);
    y += lines.length * lineHeight;
  };

  // HEADER
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(25, 45, 75);
  pdf.text("TENTIFY", margin, y);

  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(90, 90, 90);
  pdf.text("Custom Tent Configuration", margin, y);

  y += 12;

  pdf.setDrawColor(210, 215, 225);
  pdf.line(margin, y, pageWidth - margin, y);

  // CONFIGURATION DETAILS
  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(30, 30, 30);
  pdf.text("Configuration Details", margin, y);

  y += 9;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  addWrappedText(`Product: ${configuration.productName}`, margin, contentWidth);

  pdf.text(
    `Tent size: ${configuration.size.replace("x", " x ")}`,
    margin,
    y,
  );

  y += 7;

  pdf.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    margin,
    y,
  );

  y += 11;

  // FABRIC COLORS
  checkPageSpace(55);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Fabric Colors", margin, y);

  y += 9;

  const panels = [
    ["Roof", configuration.panelColors.roof],
    ["Front Panel", configuration.panelColors.front],
    ["Back Panel", configuration.panelColors.back],
    ["Left Panel", configuration.panelColors.left],
    ["Right Panel", configuration.panelColors.right],
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  panels.forEach(([name, color]) => {
    checkPageSpace(8);

    pdf.text(`${name}: ${formatColor(color)}`, margin, y);

    const hex = color.replace("#", "");

    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      const red = parseInt(hex.substring(0, 2), 16);
      const green = parseInt(hex.substring(2, 4), 16);
      const blue = parseInt(hex.substring(4, 6), 16);

      pdf.setFillColor(red, green, blue);

      pdf.rect(
        pageWidth - margin - 12,
        y - 4,
        8,
        5,
        "F",
      );
    }

    y += 7;
  });

  // ARTWORK
  y += 5;

  checkPageSpace(35);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Logo & Artwork", margin, y);

  y += 9;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text(
    `Logo uploaded: ${configuration.artwork.logo ? "Yes" : "No"}`,
    margin,
    y,
  );

  y += 7;

  addWrappedText(
    `Brand text: ${configuration.artwork.text || "Not added"}`,
    margin,
    contentWidth,
  );

  pdf.text(
    `Text color: ${configuration.artwork.textColor}`,
    margin,
    y,
  );

  y += 10;

  // 3D PREVIEW
  if (previewImage) {
    checkPageSpace(75);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("3D Tent Preview", margin, y);

    y += 7;

    try {
      const imageFormat = previewImage.startsWith("data:image/jpeg")
        ? "JPEG"
        : "PNG";

      const imageWidth = contentWidth;
      const imageHeight = 65;

      pdf.addImage(
        previewImage,
        imageFormat,
        margin,
        y,
        imageWidth,
        imageHeight,
        undefined,
        "FAST",
      );

      y += imageHeight + 8;
    } catch (error) {
      console.error("Could not add preview image:", error);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Preview image could not be added.", margin, y);

      y += 10;
    }
  }

  // PRICE SUMMARY
  checkPageSpace(75);

  y += 5;

  pdf.setDrawColor(210, 215, 225);
  pdf.line(margin, y, pageWidth - margin, y);

  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(30, 30, 30);
  pdf.text("Price Summary", margin, y);

  y += 10;

  const priceRows: [string, number][] = [
    ["Base Price", pricing.basePrice],
    ["Panel Customization", pricing.panelCustomization],
    ["Logo Printing", pricing.logoPrinting],
    ["Text Printing", pricing.textPrinting],
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  priceRows.forEach(([label, amount]) => {
    checkPageSpace(9);

    pdf.text(label, margin, y);

    pdf.text(
      formatPrice(amount),
      pageWidth - margin,
      y,
      { align: "right" },
    );

    y += 8;
  });

  checkPageSpace(25);

  pdf.setDrawColor(100, 110, 125);
  pdf.line(margin, y, pageWidth - margin, y);

  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(25, 45, 75);

  pdf.text("Total Price", margin, y);

  pdf.text(
    formatPrice(pricing.total),
    pageWidth - margin,
    y,
    { align: "right" },
  );

  y += 15;

  checkPageSpace(10);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(110, 110, 110);

  pdf.text(
    "Indicative demo pricing. Final supplier pricing must be confirmed.",
    margin,
    y,
  );

  // DOWNLOAD PDF
  pdf.save(
    `tentify-${configuration.size}-configuration.pdf`,
  );
}
