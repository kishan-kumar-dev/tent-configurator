import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import ArtworkEditor from "./components/ArtworkEditor";
import "./App.css";

import type {
  ArtworkDesign,
  PanelColors,
  TentConfiguration,
} from "./types/configurator";

import {
  loadConfiguration,
  saveConfiguration,
} from "./services/configurationService";

import { getTentPricing, type PriceBreakdown } from "./services/pricingService";

import {
  addToShopifyCart,
  clearMockCart,
  getMockCart,
  type ShopifyMockCart,
} from "./services/shopifyService";

import { generateConfigurationPDF } from "./services/pdfService";

const Viewer3D = lazy(() => import("./components/Viewer3D"));

// Available tent sizes.
const tentSizes = [
  {
    size: "5x5",
    label: "5 × 5 ft",
    modelPath: "/models/Tent_5_5.glb",
  },
  {
    size: "6.5x6.5",
    label: "6.5 × 6.5 ft",
    modelPath: "/models/Tent_6_5.glb",
  },
  {
    size: "8x8",
    label: "8 × 8 ft",
    modelPath: "/models/Tent_8_8.glb",
  },
];

// Available fabric colors.
const fabricColors = [
  { name: "White", value: "#FFFFFF" },
  { name: "Red", value: "#E53935" },
  { name: "Blue", value: "#1976D2" },
  { name: "Green", value: "#2E7D32" },
  { name: "Black", value: "#212121" },
  { name: "Yellow", value: "#FDD835" },
];

// Configurator sections.
const sections = [
  { id: "roof", label: "Roof Design" },
  { id: "front", label: "Front Panel" },
  { id: "back", label: "Back Panel" },
  { id: "left", label: "Left Panel" },
  { id: "right", label: "Right Panel" },
  { id: "artwork", label: "Logo & Artwork" },
] as const;

type SectionId = (typeof sections)[number]["id"];

// Default artwork.
const defaultArtwork: ArtworkDesign = {
  logo: null,
  text: "YOUR BRAND",
  textColor: "#222222",
  logoX: 50,
  logoY: 35,
  textX: 50,
  textY: 75,
};

// Default panel colors.
const defaultPanelColors: PanelColors = {
  roof: "#FFFFFF",
  front: "#FFFFFF",
  back: "#FFFFFF",
  left: "#FFFFFF",
  right: "#FFFFFF",
};

// Default configuration.
const defaultConfiguration: TentConfiguration = {
  productId: "tentify-custom-canopy",
  productName: "Custom Canopy Tent",
  size: "5x5",
  panelColors: defaultPanelColors,
  artwork: defaultArtwork,
};

// Empty demo cart.
const EMPTY_CART: ShopifyMockCart = {
  items: [],
  totalQuantity: 0,
  totalPrice: 0,
  currency: "INR",
};

// Load initial configuration.
function getInitialConfiguration(): TentConfiguration {
  try {
    const saved = loadConfiguration();

    if (!saved) {
      return defaultConfiguration;
    }

    return {
      ...defaultConfiguration,
      ...saved,
      panelColors: {
        ...defaultPanelColors,
        ...saved.panelColors,
      },
      artwork: {
        ...defaultArtwork,
        ...saved.artwork,
      },
    };
  } catch (error) {
    console.error("Unable to load configuration:", error);
    return defaultConfiguration;
  }
}

// Load initial cart.
function getInitialCart(): ShopifyMockCart {
  try {
    return getMockCart();
  } catch (error) {
    console.error("Unable to load cart:", error);
    return EMPTY_CART;
  }
}

// Format price in Indian Rupees.
function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function App() {
  const [configuration, setConfiguration] = useState<TentConfiguration>(
    getInitialConfiguration,
  );

  const [activeSection, setActiveSection] = useState<SectionId>("roof");

  const [pricing, setPricing] = useState<PriceBreakdown | null>(null);

  const [cart, setCart] = useState<ShopifyMockCart>(getInitialCart);

  const [isSaved, setIsSaved] = useState(false);

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const [message, setMessage] = useState("");

  const [pricingError, setPricingError] = useState("");

  // Reference to the 3D preview container.
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Get selected tent model.
  const selectedTent = useMemo(
    () =>
      tentSizes.find((tent) => tent.size === configuration.size) ??
      tentSizes[0],
    [configuration.size],
  );

  // =========================================
  // ASYNCHRONOUS PRICING CALCULATION
  // =========================================

  useEffect(() => {
    let active = true;

    const calculatePricing = async () => {
      try {
        const result = await getTentPricing(configuration);

        if (active) {
          setPricing(result);
          setPricingError("");
        }
      } catch (error) {
        console.error("Pricing calculation failed:", error);

        if (active) {
          setPricing(null);
          setPricingError("Unable to calculate pricing.");
        }
      }
    };

    void calculatePricing();

    return () => {
      active = false;
    };
  }, [configuration]);

  // =========================================
  // UPDATE INDIVIDUAL PANEL COLOR
  // =========================================

  const updatePanelColor = (panel: keyof PanelColors, color: string) => {
    setConfiguration((previous) => ({
      ...previous,
      panelColors: {
        ...previous.panelColors,
        [panel]: color,
      },
    }));

    setIsSaved(false);
    setMessage("");
  };

  // =========================================
  // APPLY COLOR TO ALL PANELS
  // =========================================

  const applyColorToAllPanels = (color: string) => {
    setConfiguration((previous) => ({
      ...previous,
      panelColors: {
        roof: color,
        front: color,
        back: color,
        left: color,
        right: color,
      },
    }));

    setIsSaved(false);
    setMessage("Color applied to all panels.");
  };

  // =========================================
  // UPDATE ARTWORK
  // =========================================

  const updateArtwork = (artwork: ArtworkDesign) => {
    setConfiguration((previous) => ({
      ...previous,
      artwork,
    }));

    setIsSaved(false);
    setMessage("");
  };

  // =========================================
  // CHANGE TENT SIZE
  // =========================================

  const updateTentSize = (size: string) => {
    setConfiguration((previous) => ({
      ...previous,
      size,
    }));

    setIsSaved(false);
    setMessage("");
  };

  // =========================================
  // SAVE CONFIGURATION
  // =========================================

  const handleSaveConfiguration = () => {
    try {
      const success = saveConfiguration(configuration);

      if (success) {
        setIsSaved(true);
        setMessage("Your design has been saved.");
      } else {
        setIsSaved(false);
        setMessage("Unable to save your design.");
      }
    } catch (error) {
      console.error("Save failed:", error);
      setIsSaved(false);
      setMessage("Unable to save your design.");
    }
  };

  // =========================================
  // LOAD CONFIGURATION
  // =========================================

  const handleLoadConfiguration = () => {
    try {
      const saved = loadConfiguration();

      if (!saved) {
        setMessage("No saved design was found.");
        return;
      }

      setConfiguration({
        ...defaultConfiguration,
        ...saved,
        panelColors: {
          ...defaultPanelColors,
          ...saved.panelColors,
        },
        artwork: {
          ...defaultArtwork,
          ...saved.artwork,
        },
      });

      setIsSaved(true);
      setMessage("Saved design loaded successfully.");
    } catch (error) {
      console.error("Load failed:", error);
      setMessage("Unable to load your saved design.");
    }
  };

  // =========================================
  // DOWNLOAD CONFIGURATION PDF WITH 3D IMAGE
  // =========================================

  const handleDownloadPDF = () => {
    if (!pricing) {
      setMessage("Pricing is not available yet.");
      return;
    }

    try {
      const canvas = previewContainerRef.current?.querySelector("canvas");

      const previewImage = canvas ? canvas.toDataURL("image/png") : null;

      generateConfigurationPDF(configuration, pricing, previewImage);

      setMessage("Configuration PDF generated successfully.");
    } catch (error) {
      console.error("PDF generation failed:", error);
      setMessage("Unable to generate the PDF.");
    }
  };

  // =========================================
  // ADD TO DEMO CART
  // =========================================

  const handleAddToCart = async () => {
    if (!pricing) {
      setMessage("Pricing is not available yet.");
      return;
    }

    setIsAddingToCart(true);
    setMessage("");

    try {
      const updatedCart = await addToShopifyCart(configuration, pricing, 1);

      setCart(updatedCart);
      setMessage("Tent added to the demo cart.");
    } catch (error) {
      console.error("Add to cart failed:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add the tent to the cart.",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  // =========================================
  // CLEAR DEMO CART
  // =========================================

  const handleClearCart = () => {
    try {
      clearMockCart();

      setCart(EMPTY_CART);
      setMessage("Demo cart cleared.");
    } catch (error) {
      console.error("Unable to clear cart:", error);
      setMessage("Unable to clear the cart.");
    }
  };

  // Selected panel color.
  const activePanelColor =
    activeSection !== "artwork"
      ? configuration.panelColors[activeSection]
      : null;

  // =========================================
  // RENDER
  // =========================================

  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">T</div>

          <div>
            <h1>TENTIFY</h1>
            <p>Custom Tent Configurator</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleLoadConfiguration}
          >
            Load Design
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={handleSaveConfiguration}
          >
            Save Design
          </button>
        </div>
      </header>

      {/* MESSAGE */}
      {message && (
        <div className="app-message" role="status">
          {message}

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* MAIN CONFIGURATOR */}
      <main className="configurator">
        {/* LEFT SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-heading">
            <h2>Customize Your Tent</h2>
            <p>Select a section to customize.</p>
          </div>

          {/* SECTION SELECTOR */}
          <div className="section-list">
            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                className={`section-button ${
                  activeSection === section.id ? "active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.label}</span>
                <span className="section-arrow">›</span>
              </button>
            ))}
          </div>

          {/* COLOR CUSTOMIZATION */}
          {activeSection !== "artwork" ? (
            <div className="color-settings">
              <h3>
                {
                  sections.find((section) => section.id === activeSection)
                    ?.label
                }
              </h3>

              <p>Choose a fabric color.</p>

              <div className="color-grid">
                {fabricColors.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    className={`color-option ${
                      activePanelColor === color.value ? "selected" : ""
                    }`}
                    onClick={() => updatePanelColor(activeSection, color.value)}
                    title={color.name}
                    aria-label={`${color.name} color`}
                    aria-pressed={activePanelColor === color.value}
                  >
                    <span
                      className="color-swatch"
                      style={{
                        backgroundColor: color.value,
                      }}
                    />

                    <span className="color-name">{color.name}</span>
                  </button>
                ))}
              </div>

              <div className="selected-color">
                <span>Selected color</span>
                <strong>{activePanelColor?.toUpperCase()}</strong>
              </div>

              <button
                type="button"
                className="secondary-button apply-all-button"
                onClick={() =>
                  applyColorToAllPanels(activePanelColor ?? "#FFFFFF")
                }
              >
                Apply to All Panels
              </button>
            </div>
          ) : (
            <ArtworkEditor
              design={configuration.artwork}
              onDesignChange={updateArtwork}
            />
          )}
        </aside>

        {/* CENTER 3D PREVIEW */}
        <section className="preview-section">
          <div className="preview-heading">
            <div>
              <h2>3D Live Preview</h2>
              <p>Rotate and zoom to inspect your custom tent.</p>
            </div>

            <span className="preview-status">
              <span className="status-dot" />
              Live Preview
            </span>
          </div>

          {/* PREVIEW CONTAINER WITH REF FOR PDF CAPTURE */}
          <div className="preview-container" ref={previewContainerRef}>
            <Suspense
              fallback={
                <div className="viewer-loading">Loading 3D tent...</div>
              }
            >
              <Viewer3D
                key={selectedTent.modelPath}
                modelPath={selectedTent.modelPath}
                panelColors={configuration.panelColors}
                artwork={configuration.artwork}
              />
            </Suspense>
          </div>

          {/* PANEL COLOR SUMMARY */}
          <div className="panel-color-summary">
            <h3>Panel Colors</h3>

            <div className="panel-color-list">
              {(
                Object.entries(configuration.panelColors) as [
                  keyof PanelColors,
                  string,
                ][]
              ).map(([panel, color]) => (
                <div className="panel-color-item" key={panel}>
                  <span
                    className="mini-color-swatch"
                    style={{
                      backgroundColor: color,
                    }}
                  />

                  <span className="panel-color-name">
                    {panel.charAt(0).toUpperCase() + panel.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT ORDER SUMMARY */}
        <aside className="summary-sidebar">
          <div className="summary-card">
            <div className="summary-heading">
              <h2>Order Summary</h2>
              <p>Your custom tent details.</p>
            </div>

            {/* PRODUCT */}
            <div className="summary-product">
              <h3>{configuration.productName}</h3>
              <span>{selectedTent.label}</span>
            </div>

            {/* PANEL COLORS */}
            <div className="summary-details">
              <div className="summary-row">
                <span>Roof</span>
                <span
                  className="mini-color-swatch"
                  style={{
                    backgroundColor: configuration.panelColors.roof,
                  }}
                />
              </div>

              <div className="summary-row">
                <span>Front Panel</span>
                <span
                  className="mini-color-swatch"
                  style={{
                    backgroundColor: configuration.panelColors.front,
                  }}
                />
              </div>

              <div className="summary-row">
                <span>Back Panel</span>
                <span
                  className="mini-color-swatch"
                  style={{
                    backgroundColor: configuration.panelColors.back,
                  }}
                />
              </div>

              <div className="summary-row">
                <span>Left Panel</span>
                <span
                  className="mini-color-swatch"
                  style={{
                    backgroundColor: configuration.panelColors.left,
                  }}
                />
              </div>

              <div className="summary-row">
                <span>Right Panel</span>
                <span
                  className="mini-color-swatch"
                  style={{
                    backgroundColor: configuration.panelColors.right,
                  }}
                />
              </div>
            </div>

            {/* ARTWORK SUMMARY */}
            <div className="summary-artwork">
              <h3>Artwork</h3>

              <p>
                Logo: {configuration.artwork.logo ? "Uploaded" : "Not added"}
              </p>

              <p>
                Brand text: {configuration.artwork.text.trim() || "Not added"}
              </p>
            </div>

            {/* PRICE BREAKDOWN */}
            <div className="price-breakdown">
              <h3>Price Breakdown</h3>

              {pricingError ? (
                <p className="pricing-error">{pricingError}</p>
              ) : pricing ? (
                <>
                  <div className="summary-row">
                    <span>Base Price</span>
                    <strong>{formatPrice(pricing.basePrice)}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Panel Customization</span>
                    <strong>{formatPrice(pricing.panelCustomization)}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Logo Printing</span>
                    <strong>{formatPrice(pricing.logoPrinting)}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Text Printing</span>
                    <strong>{formatPrice(pricing.textPrinting)}</strong>
                  </div>

                  <div className="summary-total">
                    <span>Total</span>
                    <strong>{formatPrice(pricing.total)}</strong>
                  </div>
                </>
              ) : (
                <p>Calculating price...</p>
              )}
            </div>

            {/* ADD TO CART */}
            <button
              type="button"
              className="primary-button add-cart-button"
              onClick={handleAddToCart}
              disabled={!pricing || isAddingToCart}
            >
              {isAddingToCart ? "Adding..." : "Add to Cart"}
            </button>

            {/* PDF DOWNLOAD */}
            <button
              type="button"
              className="secondary-button pdf-button"
              onClick={handleDownloadPDF}
              disabled={!pricing}
            >
              Download Configuration PDF
            </button>

            {isSaved && (
              <p className="saved-indicator">
                <span>✓</span> Design saved
              </p>
            )}
          </div>

          {/* DEMO CART */}
          <div className="cart-card">
            <div className="cart-heading">
              <h3>Demo Cart</h3>
              <span>{cart.totalQuantity} items</span>
            </div>

            {cart.items.length === 0 ? (
              <p className="empty-cart">Your cart is empty.</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <strong>{item.productTitle}</strong>

                        <span>
                          {item.configuration.size} · Qty {item.quantity}
                        </span>
                      </div>

                      <strong>{formatPrice(item.price)}</strong>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>Cart Total</span>
                  <strong>{formatPrice(cart.totalPrice)}</strong>
                </div>

                <button
                  type="button"
                  className="text-button clear-cart-button"
                  onClick={handleClearCart}
                >
                  Clear Cart
                </button>
              </>
            )}

            <p className="cart-disclaimer">
              Demo cart only. This is not a live Shopify checkout.
            </p>
          </div>
        </aside>
      </main>

      {/* TENT SIZE SELECTOR */}
      <section className="size-selector">
        <div>
          <h2>Select Tent Size</h2>
          <p>Choose the size that fits your requirements.</p>
        </div>

        <div className="size-options">
          {tentSizes.map((tent) => (
            <button
              type="button"
              key={tent.size}
              className={`size-option ${
                configuration.size === tent.size ? "active" : ""
              }`}
              onClick={() => updateTentSize(tent.size)}
              aria-pressed={configuration.size === tent.size}
            >
              {tent.label}
            </button>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="app-footer">
        <p>
          TENTIFY Custom Tent Configurator · Interactive product customization
          demo
        </p>
      </footer>
    </div>
  );
}

export default App;
