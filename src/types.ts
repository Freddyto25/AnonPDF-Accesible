export type ScreenType = 'home' | 'viewer' | 'editor' | 'sign' | 'tools' | 'browse' | 'settings' | 'about';

export type ToolCategoryId = 'organize' | 'convert' | 'security' | 'sign';

export enum ToolId {
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  EXTRACT = 'EXTRACT',
  COMPRESS = 'COMPRESS',
  PDF_TO_IMAGES = 'PDF_TO_IMAGES',
  IMAGES_TO_PDF = 'IMAGES_TO_PDF',
  EXTRACT_TEXT = 'EXTRACT_TEXT',
  PROTECT = 'PROTECT',
  UNLOCK = 'UNLOCK',
  SIGN = 'SIGN',
}

export enum ToolInput {
  SINGLE_PDF = 'SINGLE_PDF',
  MULTIPLE_PDF = 'MULTIPLE_PDF',
  IMAGES = 'IMAGES',
}

export interface ToolSpec {
  id: ToolId;
  title: string;
  summary: string;
  caveat?: string;
  input: ToolInput;
  category: ToolCategoryId;
  iconName: string;
}

export enum SplitMode {
  RANGES = 'RANGES',
  PAGES_PER_FILE = 'PAGES_PER_FILE',
}

export enum CompressMode {
  LOSSLESS = 'LOSSLESS',
  RESAMPLE = 'RESAMPLE',
}

export enum CompressStrength {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  HEAVY = 'HEAVY',
}

export enum ImageFormat {
  PNG = 'PNG',
  JPEG = 'JPEG',
}

export enum PdfPageSizePreset {
  FIT_IMAGE = 'FIT_IMAGE',
  A4 = 'A4',
  LETTER = 'LETTER',
}

export enum NumberPosition {
  TOP_LEFT = 'TOP_LEFT',
  TOP_CENTER = 'TOP_CENTER',
  TOP_RIGHT = 'TOP_RIGHT',
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_CENTER = 'BOTTOM_CENTER',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
}

export enum NumberFormat {
  PAGE_ONLY = 'PAGE_ONLY', // "3"
  OF_TOTAL = 'OF_TOTAL', // "3 / 10"
  PAGE_PREFIX = 'PAGE_PREFIX', // "Page 3"
  PAGE_OF_TOTAL = 'PAGE_OF_TOTAL', // "Page 3 of 10"
}

export enum WatermarkLayout {
  DIAGONAL = 'DIAGONAL',
  CENTER = 'CENTER',
  HEADER = 'HEADER',
  FOOTER = 'FOOTER',
  TILED = 'TILED',
}

export interface NormalizedPoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface TextMark {
  id: string;
  type: 'text';
  text: string;
  x: number; // 0..1 (top-left or center)
  y: number; // 0..1
  fontSize: number; // pt (relative)
  color: string;
  backgroundColor?: string;
  bold?: boolean;
}

export interface FillMark {
  id: string;
  type: 'fill';
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
  color: string;
  opacity: number; // 0..1
  isRedaction?: boolean;
}

export interface InkMark {
  id: string;
  type: 'ink';
  color: string;
  strokeWidth: number;
  strokes: NormalizedPoint[][];
}

export type PageMark = TextMark | FillMark | InkMark;

export interface PageCrop {
  top: number; // 0..1
  bottom: number;
  left: number;
  right: number;
}

export interface PageMargin {
  top: number; // pt
  bottom: number;
  left: number;
  right: number;
}

export interface PagePlan {
  id: string;
  originalPageIndex: number;
  rotation: number; // 0, 90, 180, 270
  crop?: PageCrop;
  margin?: PageMargin;
  marks: PageMark[];
  aspectRatio: number; // width / height
  widthPt: number;
  heightPt: number;
}

export interface PageNumberOptions {
  enabled: boolean;
  position: NumberPosition;
  format: NumberFormat;
  startFrom: number;
  fontSize: number;
  margin: number;
  pageRange?: string;
}

export interface WatermarkOptions {
  enabled: boolean;
  text: string;
  opacity: number;
  layout: WatermarkLayout;
  fontSize: number;
  color: string;
  pageRange?: string;
}

export interface EditPlan {
  pages: PagePlan[];
  pageNumbers?: PageNumberOptions;
  watermark?: WatermarkOptions;
}

export type EditorMode = 'pages' | 'crop' | 'resize' | 'numbers' | 'watermark' | 'text' | 'redact' | 'draw';

export interface RecentDocument {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  lastModified: number;
  data: Uint8Array;
}

export interface InputDocItem {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  needsPassword?: boolean;
  password?: string;
  data: Uint8Array;
}

export interface ToolOptionsState {
  splitMode: SplitMode;
  splitEvery: number;
  pageRange: string;
  compressMode: CompressMode;
  compressStrength: CompressStrength;
  exportFormat: ImageFormat;
  exportDpi: number;
  exportQuality: number;
  imagesPageSize: PdfPageSizePreset;
  imagesMargin: number;
  protectPassword: string;
  protectConfirm: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
  unlockPassword: string;
}

export interface GeneratedFile {
  name: string;
  data: Uint8Array;
  sizeBytes: number;
  mimeType: string;
  blobUrl: string;
}

export interface ToolResultData {
  summary: string;
  note?: string;
  files: GeneratedFile[];
}
