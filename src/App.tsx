import { useEffect, useMemo, useState } from "react";

import Viewer3D from "./components/Viewer3D";
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

/* -----------------------------------------
   TENT SIZES
----------------------------------------- */

const tentSizes = [
  {
    id: "5x5",
    name: "5 × 5",
    model: "/models/Tent_5_5.glb",
  },
  {
    id: "6.5x6.5",
    name: "6.5 × 6.5",
    model: "/models/Tent_6_5.glb",
  },
  {
    id: "8x8",
    name: "8 × 8",
    model: "/models/Tent_8_8.glb",
  },
];

/* -----------------------------------------
   FABRIC COLORS
----------------------------------------- */

const fabricColors = [
  { name: "White", value: "#FFFFFF" },
  { name: "Red", value: "#E53935" },
  { name: "Blue", value: "#1976D2" },
  { name: "Green", value: "#2E7D32" },
  { name: "Black", value: "#212121" },
  { name: "Yellow", value: "#FDD835" },
];

/* -----------------------------------------
   CUSTOMIZATION SECTIONS
----------------------------------------- */

const sections = [
  { id: "roof", name: "Roof Design" },
  { id: "front", name: "Front Panel" },
  { id: "back", name: "Back Panel" },
  { id: "left", name: "Left Panel" },
  { id: "right", name: "Right Panel" },
  { id: "artwork", name: "Logo & Artwork" },
] as const;

type SectionId = (typeof sections)[number]["id"];

const EMPTY_CART: ShopifyMockCart = {
  items: [],
  totalQuantity: 0,
  totalPrice: 0,
  currency: "INR",
};

/* -----------------------------------------
   DEFAULT PANEL COLORS
----------------------------------------- */

const defaultPanelColors: PanelColors = {
  roof: "#FFFFFF",
  front: "#FFFFFF",
  back: "#FFFFFF",
  left: "#FFFFFF",
  right: "#FFFFFF",
};

/* -----------------------------------------
   DEFAULT ARTWORK
----------------------------------------- */

const defaultArtwork: ArtworkDesign = {
  logo: null,
  text: "YOUR BRAND",
  textColor: "#222222",
  logoX: 50,
  logoY: 35,
  textX: 50,
  textY: 75,
};

/* -----------------------------------------
   DEFAULT CONFIGURATION
----------------------------------------- */

const defaultConfiguration: TentConfiguration = {
  productId: "tentify-custom-canopy",
  productName: "Custom Canopy Tent",
  size: "5x5",
  panelColors: defaultPanelColors,
  artwork: defaultArtwork,
};

/* -----------------------------------------
   INITIAL CONFIGURATION
----------------------------------------- */

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

/* -----------------------------------------
   INITIAL CART
----------------------------------------- */

function getInitialCart(): ShopifyMockCart {
  try {
    return getMockCart();
  } catch (error) {
    console.error("Unable to load cart:", error);

    return EMPTY_CART;
  }
}

/* =========================================
   MAIN APP
========================================= */

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

  /* -----------------------------------------
     CONFIGURATION VALUES
  ----------------------------------------- */

  const panelColors = configuration.panelColors;

  const artwork = configuration.artwork;

  const selectedTent = useMemo(() => {
    return (
      tentSizes.find((tent) => tent.id === configuration.size) ?? tentSizes[0]
    );
  }, [configuration.size]);

  /* -----------------------------------------
     UPDATE PANEL COLOR
  ----------------------------------------- */

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

  /* -----------------------------------------
     APPLY COLOR TO ALL PANELS
  ----------------------------------------- */

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

  /* -----------------------------------------
     UPDATE ARTWORK
  ----------------------------------------- */

  const updateArtwork = (newArtwork: ArtworkDesign) => {
    setConfiguration((previous) => ({
      ...previous,
      artwork: newArtwork,
    }));

    setIsSaved(false);
    setMessage("");
  };

  /* -----------------------------------------
     UPDATE TENT SIZE
  ----------------------------------------- */

  const updateTentSize = (size: string) => {
    setConfiguration((previous) => ({
      ...previous,
      size,
    }));

    setIsSaved(false);
    setMessage("");
  };

  /* -----------------------------------------
     DYNAMIC PRICING
  ----------------------------------------- */

  useEffect(() => {
    let active = true;

    const calculatePrice = async () => {
      try {
        setPricingError("");

        const result = await getTentPricing(configuration);

        if (active) {
          setPricing(result);
        }
      } catch (error) {
        console.error("Pricing error:", error);

        if (active) {
          setPricing(null);
          setPricingError(
            "Unable to calculate pricing. Please check your configuration.",
          );
        }
      }
    };

    calculatePrice();

    return () => {
      active = false;
    };
  }, [configuration]);

  /* -----------------------------------------
     CART VALUES
  ----------------------------------------- */

  const cartCount = cart.totalQuantity;

  const cartTotal = cart.totalPrice;

  /* -----------------------------------------
     SAVE CONFIGURATION
  ----------------------------------------- */

  const handleSaveConfiguration = () => {
    const success = saveConfiguration(configuration);

    setIsSaved(success);

    setMessage(
      success
        ? "Configuration saved successfully."
        : "Unable to save. Browser storage may be full.",
    );
  };

  /* -----------------------------------------
     LOAD SAVED CONFIGURATION
  ----------------------------------------- */

  const handleLoadConfiguration = () => {
    try {
      const saved = loadConfiguration();

      if (!saved) {
        setMessage("No saved configuration found.");
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
      setMessage("Saved configuration loaded successfully.");
    } catch (error) {
      console.error("Load error:", error);

      setMessage("Unable to load saved configuration.");
    }
  };

  /* -----------------------------------------
     DOWNLOAD PDF
  ----------------------------------------- */

  const handleDownloadPDF = () => {
    if (!pricing) {
      setMessage("Please wait for pricing to finish calculating.");
      return;
    }

    try {
      generateConfigurationPDF(configuration, pricing);

      setMessage("Configuration PDF downloaded successfully.");
    } catch (error) {
      console.error("PDF error:", error);

      setMessage("Unable to generate PDF.");
    }
  };

  /* -----------------------------------------
     ADD TO CART
  ----------------------------------------- */

  const handleAddToCart = async () => {
    if (!pricing) {
      setMessage("Please wait for pricing to finish calculating.");
      return;
    }

    setIsAddingToCart(true);
    setMessage("");

    try {
      const updatedCart = await addToShopifyCart(configuration, pricing);

      setCart(updatedCart);

      setMessage("Tent added to the demo cart successfully.");
    } catch (error) {
      console.error("Cart error:", error);

      setMessage(
        error instanceof Error ? error.message : "Unable to add tent to cart.",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  /* -----------------------------------------
     CLEAR CART
  ----------------------------------------- */

  const handleClearCart = () => {
    try {
      clearMockCart();

      setCart(EMPTY_CART);

      setMessage("Cart cleared successfully.");
    } catch (error) {
      console.error("Clear cart error:", error);

      setMessage("Unable to clear cart.");
    }
  };

  /* -----------------------------------------
     ACTIVE PANEL COLOR
  ----------------------------------------- */

  const activePanelColor =
    activeSection !== "artwork" ? panelColors[activeSection] : "#FFFFFF";

  /* -----------------------------------------
     RENDER
  ----------------------------------------- */

  return (
    <div className="configurator">
      {/* HEADER */}

      <header className="header">
        <div className="brand">
          <div className="brand-icon">T</div>

          <div>
            <h1>TENTIFY</h1>
            <p>Custom Tent Configurator</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleSaveConfiguration}
          >
            Save Design
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLoadConfiguration}
          >
            Load Design
          </button>
        </div>
      </header>

      {/* STATUS MESSAGE */}

      {message && (
        <div className="status-message" role="status">
          {message}

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {/* MAIN CONFIGURATOR */}

      <main className="configurator-layout">
        {/* LEFT SIDEBAR */}

        <aside className="sidebar">
          <div className="sidebar-heading">
            <h2>Customize Your Tent</h2>
            <p>Select a section to customize.</p>
          </div>

          <div className="section-list">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`section-button ${
                  activeSection === section.id ? "active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.name}</span>

                {activeSection === section.id && (
                  <span className="section-arrow">›</span>
                )}
              </button>
            ))}
          </div>

          {/* COLOR CONTROLS */}

          {activeSection !== "artwork" && (
            <div className="color-section">
              <h3>Fabric Color</h3>

              <p>
                Choose a color for the{" "}
                {sections
                  .find((section) => section.id === activeSection)
                  ?.name.toLowerCase()}
                .
              </p>

              <div className="color-grid">
                {fabricColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`color-swatch ${
                      activePanelColor === color.value ? "selected" : ""
                    }`}
                    onClick={() => updatePanelColor(activeSection, color.value)}
                    title={color.name}
                    aria-label={`Select ${color.name}`}
                    aria-pressed={activePanelColor === color.value}
                  >
                    <span
                      className="swatch-color"
                      style={{
                        backgroundColor: color.value,
                      }}
                    />

                    <span className="swatch-name">{color.name}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="secondary-button full-width"
                onClick={() => applyColorToAllPanels(activePanelColor)}
              >
                Apply to All Panels
              </button>

              <div className="selected-color-info">
                <span
                  className="selected-color-preview"
                  style={{
                    backgroundColor: activePanelColor,
                  }}
                />

                <div>
                  <strong>Selected Color</strong>
                  <small>{activePanelColor}</small>
                </div>
              </div>
            </div>
          )}

          {/* ARTWORK EDITOR */}

          {activeSection === "artwork" && (
            <ArtworkEditor design={artwork} onDesignChange={updateArtwork} />
          )}
        </aside>

        {/* CENTER 3D PREVIEW */}

        <section className="preview-section">
          <div className="preview-heading">
            <div>
              <h2>3D Preview</h2>
              <p>Rotate, zoom and preview your custom tent.</p>
            </div>

            <span className="preview-status">Live Preview</span>
          </div>

          <div className="viewer-container">
            <Viewer3D
              modelPath={selectedTent.model}
              panelColors={panelColors}
              artwork={artwork}
            />
          </div>

          <div className="preview-instructions">
            <span>↻ Drag to rotate</span>
            <span>＋ Scroll to zoom</span>
            <span>⇧ Drag to move</span>
          </div>

          {/* PANEL COLOR SUMMARY */}

          <div className="panel-color-summary">
            <h3>Panel Colors</h3>

            <div className="panel-color-list">
              {(
                Object.entries(panelColors) as [keyof PanelColors, string][]
              ).map(([panel, color]) => (
                <div className="panel-color-item" key={panel}>
                  <span
                    className="panel-color-dot"
                    style={{
                      backgroundColor: color,
                    }}
                  />

                  <span>{panel.charAt(0).toUpperCase() + panel.slice(1)}</span>

                  <strong>{color}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT SUMMARY */}

        <aside className="summary-section">
          <div className="summary-card">
            <div className="summary-heading">
              <h2>Configuration Summary</h2>
              <p>Review your custom tent.</p>
            </div>

            <div className="summary-product">
              <div className="summary-product-icon">⛺</div>

              <div>
                <h3>Custom Canopy Tent</h3>
                <p>Premium promotional tent</p>
              </div>
            </div>

            {/* SELECTED SIZE */}

            <div className="summary-row">
              <span>Tent Size</span>
              <strong>{selectedTent.name}</strong>
            </div>

            <div className="summary-row">
              <span>Product</span>
              <strong>Custom Tent</strong>
            </div>

            <div className="summary-divider" />

            <h3 className="summary-subheading">Fabric Colors</h3>

            {(Object.entries(panelColors) as [keyof PanelColors, string][]).map(
              ([panel, color]) => (
                <div className="summary-row" key={panel}>
                  <span>{panel.charAt(0).toUpperCase() + panel.slice(1)}</span>

                  <div className="summary-color-value">
                    <span
                      className="summary-color-dot"
                      style={{
                        backgroundColor: color,
                      }}
                    />

                    <strong>{color}</strong>
                  </div>
                </div>
              ),
            )}

            <div className="summary-divider" />

            {/* ARTWORK SUMMARY */}

            <h3 className="summary-subheading">Artwork</h3>

            <div className="summary-row">
              <span>Logo</span>
              <strong>{artwork.logo ? "Uploaded" : "Not added"}</strong>
            </div>

            <div className="summary-row">
              <span>Brand Text</span>
              <strong>{artwork.text.trim() || "Not added"}</strong>
            </div>

            <div className="summary-divider" />

            {/* PRICING */}

            <h3 className="summary-subheading">Price Breakdown</h3>

            {pricingError ? (
              <p className="pricing-error">{pricingError}</p>
            ) : pricing ? (
              <>
                <div className="summary-row">
                  <span>Base Price</span>

                  <strong>₹{pricing.basePrice.toLocaleString("en-IN")}</strong>
                </div>

                <div className="summary-row">
                  <span>Panel Customization</span>

                  <strong>
                    ₹{pricing.panelCustomization.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Logo Printing</span>

                  <strong>
                    ₹{pricing.logoPrinting.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Text Printing</span>

                  <strong>
                    ₹{pricing.textPrinting.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="summary-divider" />

                <div className="summary-total">
                  <span>Total Price</span>

                  <strong>₹{pricing.total.toLocaleString("en-IN")}</strong>
                </div>
              </>
            ) : (
              <p className="pricing-loading">Calculating price...</p>
            )}

            {/* ACTIONS */}

            <button
              type="button"
              className="primary-button full-width"
              onClick={handleAddToCart}
              disabled={!pricing || isAddingToCart}
            >
              {isAddingToCart ? "Adding..." : "Add to Cart"}
            </button>

            <button
              type="button"
              className="secondary-button full-width"
              onClick={handleDownloadPDF}
              disabled={!pricing}
            >
              Download PDF
            </button>

            <div className="summary-save-status">
              {isSaved ? "✓ Configuration saved" : "Configuration not saved"}
            </div>
          </div>

          {/* SHOPPING CART */}

          <div className="cart-card">
            <div className="cart-heading">
              <h2>Shopping Cart</h2>

              <span className="cart-count">{cartCount}</span>
            </div>

            {cart.items.length === 0 ? (
              <p className="empty-cart">Your cart is currently empty.</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <strong>{item.productTitle}</strong>

                        <p>Size: {item.configuration.size}</p>

                        <p>Quantity: {item.quantity}</p>
                      </div>

                      <strong>₹{item.price.toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>Cart Total</span>

                  <strong>₹{cartTotal.toLocaleString("en-IN")}</strong>
                </div>

                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={handleClearCart}
                >
                  Clear Cart
                </button>
              </>
            )}

            <p className="cart-disclaimer">
              Demo cart only. No real Shopify checkout is connected.
            </p>
          </div>
        </aside>
      </main>

      {/* TENT SIZE SELECTOR */}

      <section className="tent-size-section">
        <div>
          <h2>Choose Tent Size</h2>

          <p>Select the size that suits your requirements.</p>
        </div>

        <div className="tent-size-options">
          {tentSizes.map((tent) => (
            <button
              key={tent.id}
              type="button"
              className={`tent-size-option ${
                configuration.size === tent.id ? "active" : ""
              }`}
              onClick={() => updateTentSize(tent.id)}
              aria-pressed={configuration.size === tent.id}
            >
              <span className="tent-size-icon">⛺</span>

              <strong>{tent.name}</strong>

              <small>
                {tent.id === "5x5"
                  ? "Compact"
                  : tent.id === "6.5x6.5"
                    ? "Medium"
                    : "Large"}
              </small>
            </button>
          ))}
        </div>
      </section>

      {/* FOOTER */}

      <footer className="footer">
        <p>© {new Date().getFullYear()} TENTIFY. Custom Tent Configurator.</p>
      </footer>
    </div>
  );
}

export default App;
