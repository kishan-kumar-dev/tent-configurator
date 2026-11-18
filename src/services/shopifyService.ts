
import type {
  ArtworkDesign,
  PanelColors,
  TentConfiguration,
} from "../types/configurator";

import type { PriceBreakdown } from "./pricingService";

type CartArtwork = Omit<ArtworkDesign, "logo"> & {
  logoIncluded: boolean;
};

type CartConfiguration = Omit<TentConfiguration, "artwork"> & {
  panelColors: PanelColors;
  artwork: CartArtwork;
};

export type ShopifyCartItem = {
  id: string;
  variantId: string;
  productTitle: string;
  quantity: number;
  price: number;
  currency: string;
  properties: Record<string, string>;
  configuration: CartConfiguration;
  priceBreakdown: PriceBreakdown;
  createdAt: string;
};

export type ShopifyMockCart = {
  items: ShopifyCartItem[];
  totalQuantity: number;
  totalPrice: number;
  currency: string;
};

const CART_STORAGE_KEY = "tentify-shopify-mock-cart";

const variantIds: Record<string, string> = {
  "5x5": "MOCK_VARIANT_5X5",
  "6.5x6.5": "MOCK_VARIANT_6_5X6_5",
  "8x8": "MOCK_VARIANT_8X8",
};

// --------------------------------------------------
// CREATE A LIGHTWEIGHT CONFIGURATION
// --------------------------------------------------

function createCartConfiguration(
  configuration: TentConfiguration
): CartConfiguration {
  return {
    productId: configuration.productId,
    productName: configuration.productName,
    size: configuration.size,
    panelColors: { ...configuration.panelColors },
    artwork: {
      text: configuration.artwork.text,
      textColor: configuration.artwork.textColor,
      logoIncluded: Boolean(configuration.artwork.logo),
      logoX: configuration.artwork.logoX,
      logoY: configuration.artwork.logoY,
      textX: configuration.artwork.textX,
      textY: configuration.artwork.textY,
    },
  };
}

// --------------------------------------------------
// CREATE CART ITEM
// --------------------------------------------------

function createCartItem(
  configuration: TentConfiguration,
  pricing: PriceBreakdown,
  quantity: number
): ShopifyCartItem {
  const lightweightConfiguration =
    createCartConfiguration(configuration);

  return {
    id:
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,

    variantId: variantIds[configuration.size],
    productTitle: configuration.productName,
    quantity,
    price: pricing.total,
    currency: pricing.currency,

    properties: {
      "Tent Size": configuration.size,
      "Roof Color": configuration.panelColors.roof,
      "Front Panel Color": configuration.panelColors.front,
      "Back Panel Color": configuration.panelColors.back,
      "Left Panel Color": configuration.panelColors.left,
      "Right Panel Color": configuration.panelColors.right,
      "Brand Text": configuration.artwork.text,
      "Text Color": configuration.artwork.textColor,
      "Logo Included": configuration.artwork.logo
        ? "Yes"
        : "No",
    },

    configuration: lightweightConfiguration,
    priceBreakdown: { ...pricing },
    createdAt: new Date().toISOString(),
  };
}

// --------------------------------------------------
// NORMALIZE OLD CART DATA
// --------------------------------------------------

function normalizeOldCart(
  value: unknown
): ShopifyMockCart {
  const emptyCart: ShopifyMockCart = {
    items: [],
    totalQuantity: 0,
    totalPrice: 0,
    currency: "INR",
  };

  if (
    !value ||
    typeof value !== "object" ||
    !("items" in value) ||
    !Array.isArray(value.items)
  ) {
    return emptyCart;
  }

  const oldCart = value as {
    items: Record<string, any>[];
    currency?: string;
  };

  const items: ShopifyCartItem[] = oldCart.items
    .filter((item) => {
      return (
        item &&
        typeof item.id === "string" &&
        item.configuration &&
        item.priceBreakdown
      );
    })
    .map((item) => {
      const oldConfiguration = item.configuration;

      const oldArtwork = oldConfiguration.artwork ?? {};

      const logoIncluded = Boolean(
        oldArtwork.logo ||
        oldArtwork.logoIncluded ||
        item.properties?.["Logo Included"] === "Yes"
      );

      const configuration: CartConfiguration = {
        productId: oldConfiguration.productId ?? "",
        productName:
          oldConfiguration.productName ??
          item.productTitle ??
          "Custom Tent",
        size: oldConfiguration.size ?? "",
        panelColors: {
          ...oldConfiguration.panelColors,
        },
        artwork: {
          text: oldArtwork.text ?? "",
          textColor: oldArtwork.textColor ?? "#222222",
          logoIncluded,
          logoX: oldArtwork.logoX ?? 50,
          logoY: oldArtwork.logoY ?? 35,
          textX: oldArtwork.textX ?? 50,
          textY: oldArtwork.textY ?? 75,
        },
      };

      const properties = {
        ...(item.properties ?? {}),
      };

      // Remove old full configuration JSON.
      delete properties.Configuration;

      return {
        id: item.id,
        variantId: item.variantId ?? "",
        productTitle:
          item.productTitle ?? "Custom Tent",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        currency: item.currency ?? "INR",
        properties,
        configuration,
        priceBreakdown: item.priceBreakdown,
        createdAt: item.createdAt ?? new Date().toISOString(),
      };
    });

  return {
    items,
    totalQuantity: items.reduce(
      (total, item) => total + item.quantity,
      0
    ),
    totalPrice: items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    ),
    currency: oldCart.currency ?? "INR",
  };
}

// --------------------------------------------------
// GET CART
// --------------------------------------------------

export function getMockCart(): ShopifyMockCart {
  try {
    const storedCart = localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!storedCart) {
      return {
        items: [],
        totalQuantity: 0,
        totalPrice: 0,
        currency: "INR",
      };
    }

    const parsedCart: unknown = JSON.parse(storedCart);

    const normalizedCart = normalizeOldCart(parsedCart);

    // Replace old cart data containing large Base64 images.
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(normalizedCart)
    );

    return normalizedCart;
  } catch (error) {
    console.error("Unable to load mock cart:", error);

    return {
      items: [],
      totalQuantity: 0,
      totalPrice: 0,
      currency: "INR",
    };
  }
}

// --------------------------------------------------
// ADD TO CART
// --------------------------------------------------

export async function addToShopifyCart(
  configuration: TentConfiguration,
  pricing: PriceBreakdown,
  quantity = 1
): Promise<ShopifyMockCart> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (!variantIds[configuration.size]) {
    throw new Error("Invalid tent variant.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  const existingCart = getMockCart();

  const newItem = createCartItem(
    configuration,
    pricing,
    quantity
  );

  const updatedCart: ShopifyMockCart = {
    items: [...existingCart.items, newItem],

    totalQuantity:
      existingCart.totalQuantity + quantity,

    totalPrice:
      existingCart.totalPrice +
      pricing.total * quantity,

    currency: pricing.currency,
  };

  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(updatedCart)
    );
  } catch (error) {
    console.error("Unable to save mock cart:", error);

    throw new Error(
      "Cart storage is full. Please remove old cart items or clear browser storage."
    );
  }

  return updatedCart;
}

// --------------------------------------------------
// CLEAR CART
// --------------------------------------------------

export function clearMockCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
}
