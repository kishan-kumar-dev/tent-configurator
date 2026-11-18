
export type PanelColors = {
  roof: string;
  front: string;
  back: string;
  left: string;
  right: string;
};

export type ArtworkDesign = {
  logo: string | null;
  text: string;
  textColor: string;
  logoX: number;
  logoY: number;
  textX: number;
  textY: number;
};

export type TentConfiguration = {
  productId: string;
  productName: string;
  size: string;
  panelColors: PanelColors;
  artwork: ArtworkDesign;
};

export type SavedConfiguration = {
  version: 1;
  savedAt: string;
  configuration: TentConfiguration;
};
