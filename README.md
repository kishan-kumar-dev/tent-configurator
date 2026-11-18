# TENTIFY – Custom Tent Configurator

An interactive 3D promotional tent configurator built with React, TypeScript, and Three.js.

## Project Overview

TENTIFY allows users to customize promotional tents by selecting different tent sizes, changing individual panel colors, adding logos and text, and previewing their designs in 3D.

## Features

- 3D Tent Preview: Interactive 3D model with rotation and zoom.
- Multiple Tent Sizes: Supports 5 × 5, 6.5 × 6.5, and 8 × 8.
- Individual Panel Customization: Customize roof, front, back, left, and right panels independently.
- Color Selection: Choose from multiple fabric colors.
- Artwork Customization: Upload logos and add custom text.
- Artwork Positioning: Adjust logo and text positions.
- Configuration Management: Save and load configurations using browser storage.
- Dynamic Pricing: Calculate demo pricing based on tent size and customization options.
- Shopping Cart: Add configurations to a local mock shopping cart.
- PDF Export: Generate a PDF containing configuration details and pricing.
- Responsive Design: Layout adapts to desktop, tablet, and mobile screens.

## Technology Stack

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- React Three Drei
- Fabric.js
- jsPDF
- CSS

## Project Structure

```text
tent-configurator/
├── public/
│   └── models/
│       ├── Tent_5_5.glb
│       ├── Tent_6_5.glb
│       └── Tent_8_8.glb
├── src/
│   ├── components/
│   │   ├── Viewer3D.tsx
│   │   └── ArtworkEditor.tsx
│   ├── services/
│   │   ├── configurationService.ts
│   │   ├── pricingService.ts
│   │   ├── shopifyService.ts
│   │   └── pdfService.ts
│   ├── types/
│   │   └── configurator.ts
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── package.json
└── README.md
```

## Installation

Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate to the project:

```bash
cd tent-configurator
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal.

## Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Configuration Data

The application stores configuration data in a structured format containing:

- Product ID and product name
- Selected tent size
- Individual panel colors
- Logo and text artwork
- Artwork colors and positioning

## Pricing and Cart

The project currently includes demo pricing and a local mock shopping cart.

The Shopify service is a demonstration implementation. A production Shopify integration requires connecting the application to Shopify's actual cart and checkout APIs.

## Future Improvements

- Production Shopify integration
- Backend configuration storage
- iframe embedding
- Improved artwork positioning on all tent panels
- Production deployment and automated testing

## Author

Developed as an interactive product configurator technical assessment.
