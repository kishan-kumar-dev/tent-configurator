
# TENTIFY – Custom Tent Configurator

An interactive 3D promotional tent configurator built with React, TypeScript, Three.js, and Vite.

Live Demo: https://tent-configurator-seven.vercel.app/

GitHub Repository: https://github.com/kishan-kumar-dev/tent-configurator

Reference Product: https://mvpvisuals.com/products/10x10-custom-canopy-tent

---

## 1. Project Overview

TENTIFY is an interactive product configurator that allows customers to customize promotional canopy tents.

Customers can select tent sizes, customize individual fabric panel colors, upload logos, add custom text, adjust artwork positioning, and preview their designs in an interactive 3D environment.

The application uses a reusable configuration structure and separates UI components, business logic, pricing, configuration storage, cart functionality, and PDF generation.

---

## 2. Features

### 3D Product Configurator
- Interactive 3D tent preview.
- Rotate, zoom, and inspect the tent.
- GLB-based 3D product models.
- Multiple tent size options.

### Product Customization
- Independently customize roof, front, back, left, and right panels.
- Select different fabric colors.
- Apply one color to all panels.
- Upload custom logos.
- Add custom text.
- Change text color.
- Adjust logo and text positioning.

### 2D Artwork Editor
- Canvas-based artwork editor.
- Logo upload and removal.
- Custom text editing.
- Drag-and-drop artwork positioning.
- Live artwork updates.

### Configuration Management
- Structured TypeScript configuration data.
- Save configurations using browser localStorage.
- Load previously saved configurations.
- Store product selections, panel colors, and artwork details.

### Dynamic Pricing
- Pricing calculation through a dedicated service.
- Different base prices for tent sizes.
- Additional panel customization charges.
- Logo printing charges.
- Custom text printing charges.
- Centralized price breakdown.

### Shopping Cart
- Local mock shopping cart.
- Add customized products to cart.
- Store selected product options and configuration details.
- Calculate cart totals.
- Remove cart items through cart clearing.

### PDF Export
- Generate a PDF configuration summary.
- Include product details and tent size.
- Include panel color selections.
- Include artwork details.
- Include pricing breakdown and final price.

### Responsive Design
- Desktop layout.
- Tablet layout.
- Mobile-friendly interface.

### iframe Embedding
- Hosted configurator can be embedded into another website using an iframe.
- Responsive iframe example included below.

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type safety |
| Vite | Development and production build |
| Three.js | 3D rendering |
| React Three Fiber | React integration for Three.js |
| React Three Drei | 3D helpers and controls |
| Fabric.js | Canvas editing dependency |
| jsPDF | PDF generation |
| CSS | Styling and responsive layout |
| localStorage | Local configuration and mock cart storage |

---

## 4. Project Architecture

The application separates components, services, and types to keep the code maintainable and reusable.

```text
tent-configurator/
│
├── public/
│   └── models/
│       ├── Tent_5_5.glb
│       ├── Tent_6_5.glb
│       └── Tent_8_8.glb
│
├── src/
│   ├── components/
│   │   ├── Viewer3D.tsx
│   │   └── ArtworkEditor.tsx
│   │
│   ├── services/
│   │   ├── configurationService.ts
│   │   ├── pricingService.ts
│   │   ├── shopifyService.ts
│   │   └── pdfService.ts
│   │
│   ├── types/
│   │   └── configurator.ts
│   │
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
│
├── embed-demo/
│   └── index.html
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

### Architecture Responsibilities

Components
- `Viewer3D.tsx`: Loads and displays the 3D tent model and applies panel colors and artwork.
- `ArtworkEditor.tsx`: Provides the 2D artwork editing interface.

Services
- `configurationService.ts`: Saves and loads configuration data.
- `pricingService.ts`: Calculates product and customization pricing.
- `shopifyService.ts`: Handles the mock shopping cart and cart configuration.
- `pdfService.ts`: Generates configuration summary PDFs.

Types
- `configurator.ts`: Defines reusable TypeScript interfaces and configuration types.

Application
- `App.tsx`: Coordinates configuration state, components, pricing, cart, and application actions.

---

## 5. Installation

### Prerequisites

- Node.js
- npm
- Git

### Clone the Repository

```bash
git clone https://github.com/kishan-kumar-dev/tent-configurator.git
```

### Navigate to the Project

```bash
cd tent-configurator
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open the local URL displayed in the terminal.

---

## 6. Production Build

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The production output is generated in the `dist/` directory.

---

## 7. Configuration Data Structure

The application stores product customization as structured data.

Example:

```ts
type PanelColors = {
  roof: string;
  front: string;
  back: string;
  left: string;
  right: string;
};

type ArtworkDesign = {
  logo: string | null;
  text: string;
  textColor: string;
  logoX: number;
  logoY: number;
  textX: number;
  textY: number;
};

type TentConfiguration = {
  productId: string;
  productName: string;
  size: string;
  panelColors: PanelColors;
  artwork: ArtworkDesign;
};
```

This structure separates product selections from artwork data and supports future product configurators.

---

## 8. Pricing and Shopify Integration

### Pricing Service

Pricing is handled through a dedicated service instead of being calculated directly inside UI components.

The demo pricing calculation considers:

- Base tent price based on selected size.
- Additional charges for customized fabric panels.
- Logo printing charges.
- Custom text printing charges.

The service returns a structured price breakdown.

### Mock Shopify Integration

The project includes a local mock shopping cart implementation.

It demonstrates:

- Product variant selection based on tent size.
- Dynamic customization charges.
- Final calculated product price.
- Configuration properties associated with cart items.
- Cart quantity and total price calculations.

Important: The current implementation is a demonstration using browser localStorage. It does not create a real Shopify order or initiate Shopify checkout.

A production integration would connect the pricing and cart services to Shopify's actual cart and checkout APIs.

---

## 9. PDF Configuration Summary

Customers can export a PDF containing their customized tent configuration.

The PDF service supports:

- Product information.
- Selected tent size.
- Panel color selections.
- Artwork information.
- Pricing breakdown.
- Final estimated price.
- Optional 3D preview image.

The generated PDF can serve as a production summary and can later be associated with a Shopify order through a backend integration.

---

## 10. iframe Embedding

TENTIFY can be embedded into another website using an iframe.

Example:

```html
<iframe
  src="https://tent-configurator-seven.vercel.app/"
  width="100%"
  height="900"
  style="border: none;"
  title="TENTIFY Product Configurator"
  loading="lazy"
  allow="fullscreen"
></iframe>
```

### iframe Demo

A separate embedding demonstration is available in:

```text
embed-demo/index.html
```

The example displays the hosted configurator inside a separate website layout.

---

## 11. Deployment

The application is deployed using Vercel.

Live Application:

https://tent-configurator-seven.vercel.app/

Deployment Configuration:

| Setting | Value |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Vercel can automatically deploy future updates when changes are pushed to the connected GitHub repository.

---

## 12. Future Improvements

- Production Shopify cart and checkout integration.
- Backend API for pricing and configuration storage.
- Artwork placement on all tent panels.
- Improved 2D and 3D artwork synchronization.
- Additional tent sizes and product variants.
- Configuration sharing through unique URLs.
- Automated testing.
- Performance optimization and code splitting.
- Production order and CRM integration.

---

## 13. Technical Decisions

- React components separate the 2D editor and 3D viewer.
- TypeScript provides structured configuration types.
- Dedicated service modules separate business logic from presentation.
- Pricing calculations are centralized in a pricing service.
- The mock cart demonstrates a future Shopify integration boundary.
- Browser storage provides a lightweight persistence mechanism for the assessment.
- GLB models allow reusable 3D product assets.
- Vite provides a fast development workflow and production build.

---

## 14. Author

Developed as an interactive product configurator technical assessment.

Project: TENTIFY – Custom Tent Configurator

GitHub: https://github.com/kishan-kumar-dev/tent-configurator

Live Demo: https://tent-configurator-seven.vercel.app/

---
