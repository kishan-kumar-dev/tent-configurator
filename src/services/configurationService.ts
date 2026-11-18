
import type {
  TentConfiguration,
  SavedConfiguration,
} from "../types/configurator";

const STORAGE_KEY = "tent-configurator-design";

const isValidConfiguration = (
  value: unknown,
): value is TentConfiguration => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const config = value as Partial<TentConfiguration>;

  if (
    typeof config.productId !== "string" ||
    typeof config.productName !== "string" ||
    typeof config.size !== "string" ||
    !config.panelColors ||
    !config.artwork
  ) {
    return false;
  }

  const panels = [
    config.panelColors.roof,
    config.panelColors.front,
    config.panelColors.back,
    config.panelColors.left,
    config.panelColors.right,
  ];

  return (
    panels.every(
      (color) => typeof color === "string" && color.trim() !== "",
    ) &&
    (config.artwork.logo === null ||
      typeof config.artwork.logo === "string") &&
    typeof config.artwork.text === "string" &&
    typeof config.artwork.textColor === "string" &&
    typeof config.artwork.logoX === "number" &&
    typeof config.artwork.logoY === "number" &&
    typeof config.artwork.textX === "number" &&
    typeof config.artwork.textY === "number"
  );
};

// SAVE CONFIGURATION
export function saveConfiguration(
  configuration: TentConfiguration,
): boolean {
  try {
    if (!isValidConfiguration(configuration)) {
      throw new Error("Invalid tent configuration.");
    }

    const savedData: SavedConfiguration = {
      version: 1,
      savedAt: new Date().toISOString(),
      configuration,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(savedData),
    );

    return true;
  } catch (error) {
    console.error("Unable to save configuration:", error);
    return false;
  }
}

// LOAD CONFIGURATION
export function loadConfiguration(): TentConfiguration | null {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);

    if (!storedData) {
      return null;
    }

    const parsedData: unknown = JSON.parse(storedData);

    if (!parsedData || typeof parsedData !== "object") {
      return null;
    }

    const savedData = parsedData as Partial<SavedConfiguration>;

    if (
      savedData.version !== 1 ||
      !isValidConfiguration(savedData.configuration)
    ) {
      return null;
    }

    return savedData.configuration;
  } catch (error) {
    console.error("Unable to load configuration:", error);
    return null;
  }
}

// DELETE CONFIGURATION
export function deleteSavedConfiguration(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to delete configuration:", error);
  }
}
