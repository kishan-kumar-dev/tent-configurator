
import type { TentConfiguration } from "../types/configurator";

export type PriceBreakdown = {
  basePrice: number;
  panelCustomization: number;
  logoPrinting: number;
  textPrinting: number;
  total: number;
  currency: "INR";
};

// Demo base prices
const tentBasePrices: Record<string, number> = {
  "5x5": 12000,
  "6.5x6.5": 16500,
  "8x8": 22000,
};

// Customization charges
const CUSTOM_PANEL_CHARGE = 300;
const LOGO_PRINTING_CHARGE = 700;
const TEXT_PRINTING_CHARGE = 300;

/**
 * Mock pricing service.
 * Replace with a real backend API when integrating Shopify.
 */
export async function getTentPricing(
  configuration: TentConfiguration,
): Promise<PriceBreakdown> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Validate tent size
  const basePrice = tentBasePrices[configuration.size];

  if (basePrice === undefined) {
    throw new Error("Unsupported tent size.");
  }

  // Validate panel colors
  const panels = [
    configuration.panelColors.roof,
    configuration.panelColors.front,
    configuration.panelColors.back,
    configuration.panelColors.left,
    configuration.panelColors.right,
  ];

  if (panels.some((color) => typeof color !== "string" || !color.trim())) {
    throw new Error("Please select valid colors for all tent panels.");
  }

  // Calculate custom panel charges
  const customPanelCount = panels.filter(
    (color) => color.toUpperCase() !== "#FFFFFF",
  ).length;

  const panelCustomization =
    customPanelCount * CUSTOM_PANEL_CHARGE;

  // Calculate artwork charges
  const logoPrinting = configuration.artwork.logo
    ? LOGO_PRINTING_CHARGE
    : 0;

  const textPrinting = configuration.artwork.text.trim()
    ? TEXT_PRINTING_CHARGE
    : 0;

  // Calculate total
  const total =
    basePrice +
    panelCustomization +
    logoPrinting +
    textPrinting;

  return {
    basePrice,
    panelCustomization,
    logoPrinting,
    textPrinting,
    total,
    currency: "INR",
  };
}
