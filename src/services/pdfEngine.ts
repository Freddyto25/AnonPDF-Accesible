import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFPage,
  grayscale,
} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  EditPlan,
  PagePlan,
  NumberPosition,
  NumberFormat,
  WatermarkLayout,
  PageNumberOptions,
  WatermarkOptions,
  TextMark,
  FillMark,
  InkMark,
  ImageFormat,
  PdfPageSizePreset,
  CompressStrength,
} from '../types';
import { PageRanges } from './pageRanges';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface PdfMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageSizes: Array<{ width: number; height: number; aspectRatio: number }>;
  isEncrypted: boolean;
}

export interface SearchResult {
  pageIndex: number;
  snippet: string;
}

export class PdfEngine {
  /**
   * Reads metadata and page dimensions from raw PDF bytes.
   */
  static async readMeta(data: Uint8Array, password?: string): Promise<PdfMetadata> {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: data.slice(0),
        password: password || undefined,
      });

      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      const pageSizes: Array<{ width: number; height: number; aspectRatio: number }> = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        pageSizes.push({
          width: viewport.width,
          height: viewport.height,
          aspectRatio: viewport.width / viewport.height,
        });
      }

      let title: string | undefined;
      let author: string | undefined;
      let creator: string | undefined;
      let producer: string | undefined;

      try {
        const meta = await pdf.getMetadata();
        const info = meta?.info as Record<string, any> | undefined;
        if (info) {
          title = info.Title;
          author = info.Author;
          creator = info.Creator;
          producer = info.Producer;
        }
      } catch (e) {
        // metadata read optional
      }

      return {
        pageCount,
        title,
        author,
        creator,
        producer,
        pageSizes,
        isEncrypted: false,
      };
    } catch (err: any) {
      if (err?.name === 'PasswordException' || err?.message?.includes('password')) {
        return {
          pageCount: 0,
          pageSizes: [],
          isEncrypted: true,
        };
      }
      throw new Error(err?.message || 'Could not read PDF document.');
    }
  }

  /**
   * Tests if the document is password protected.
   */
  static async isPasswordProtected(data: Uint8Array): Promise<boolean> {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
      await loadingTask.promise;
      return false;
    } catch (err: any) {
      if (err?.name === 'PasswordException' || err?.message?.includes('password') || err?.name === 'NeedPasswordException') {
        return true;
      }
      return false;
    }
  }

  /**
   * Renders a specific PDF page to an HTML Canvas or extracts Image Bitmap.
   */
  static async renderPageToCanvas(
    data: Uint8Array,
    pageIndex: number,
    canvas: HTMLCanvasElement,
    targetWidthPx?: number,
    password?: string
  ): Promise<{ width: number; height: number }> {
    const loadingTask = pdfjsLib.getDocument({
      data: data.slice(0),
      password: password || undefined,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageIndex + 1);

    const baseViewport = page.getViewport({ scale: 1.0 });
    let scale = 1.0;
    if (targetWidthPx && targetWidthPx > 0) {
      scale = targetWidthPx / baseViewport.width;
    }

    const viewport = page.getViewport({ scale });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport,
    };

    await page.render(renderContext).promise;
    return { width: viewport.width, height: viewport.height };
  }

  /**
   * Extracts text from all pages with "--- Page N ---" delimiter headers.
   */
  static async extractText(data: Uint8Array, password?: string): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({
      data: data.slice(0),
      password: password || undefined,
    });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      fullText += `\n--- Page ${i} ---\n${pageText}\n`;
    }

    return fullText.trim();
  }

  /**
   * Searches for a query string in the document text, returning matched snippets.
   */
  static async searchDocument(data: Uint8Array, query: string, password?: string): Promise<SearchResult[]> {
    if (!query || !query.trim()) return [];
    const text = await this.extractText(data, password);
    const hits: SearchResult[] = [];
    const q = query.trim().toLowerCase();

    const pages = text.split(/--- Page \d+ ---/g).slice(1);
    pages.forEach((pageText, index) => {
      const lower = pageText.toLowerCase();
      const pos = lower.indexOf(q);
      if (pos >= 0) {
        const start = Math.max(0, pos - 40);
        const end = Math.min(pageText.length, pos + query.length + 60);
        const snippet = pageText.substring(start, end).replace(/\s+/g, ' ').trim();
        hits.push({
          pageIndex: index,
          snippet: (start > 0 ? '…' : '') + snippet + (end < pageText.length ? '…' : ''),
        });
      }
    });

    return hits;
  }

  /**
   * Merges multiple PDF files into one document in sequence.
   */
  static async mergeDocuments(
    docs: Uint8Array[],
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    if (docs.length === 0) throw new Error('No documents provided to merge.');
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < docs.length; i++) {
      onProgress?.(i / docs.length);
      const srcPdf = await PDFDocument.load(docs[i], { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    onProgress?.(1.0);
    return await mergedPdf.save();
  }

  /**
   * Splits a PDF document by ranges (e.g. "1-2, 3-5") or every N pages.
   */
  static async splitDocument(
    data: Uint8Array,
    mode: 'ranges' | 'every',
    splitEveryOrRanges: number | string,
    onProgress?: (progress: number) => void
  ): Promise<Array<{ filenameSuffix: string; data: Uint8Array }>> {
    const srcDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const results: Array<{ filenameSuffix: string; data: Uint8Array }> = [];

    if (mode === 'every') {
      const every = typeof splitEveryOrRanges === 'number' ? splitEveryOrRanges : parseInt(splitEveryOrRanges as string, 10);
      if (isNaN(every) || every <= 0) throw new Error('Invalid pages per file setting.');

      let fileIndex = 1;
      for (let start = 0; start < totalPages; start += every) {
        onProgress?.(start / totalPages);
        const end = Math.min(start + every, totalPages);
        const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);

        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(srcDoc, pageIndices);
        pages.forEach((p) => newDoc.addPage(p));

        const bytes = await newDoc.save();
        results.push({
          filenameSuffix: `part-${fileIndex}-pages-${start + 1}-to-${end}`,
          data: bytes,
        });
        fileIndex++;
      }
    } else {
      const spec = String(splitEveryOrRanges);
      const ranges = PageRanges.parse(spec, totalPages);

      for (let idx = 0; idx < ranges.length; idx++) {
        onProgress?.(idx / ranges.length);
        const [start, end] = ranges[idx];
        const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);

        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(srcDoc, pageIndices);
        pages.forEach((p) => newDoc.addPage(p));

        const bytes = await newDoc.save();
        results.push({
          filenameSuffix: start === end ? `page-${start + 1}` : `pages-${start + 1}-to-${end + 1}`,
          data: bytes,
        });
      }
    }

    onProgress?.(1.0);
    return results;
  }

  /**
   * Extracts specified pages into a single PDF document.
   */
  static async extractPages(
    data: Uint8Array,
    rangeSpec: string,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const ranges = PageRanges.parse(rangeSpec, totalPages);
    const pageList = PageRanges.toPageList(ranges);

    onProgress?.(0.3);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageList);
    copiedPages.forEach((p) => newDoc.addPage(p));

    onProgress?.(0.8);
    const result = await newDoc.save();
    onProgress?.(1.0);
    return result;
  }

  /**
   * Applies an EditPlan (reordering, rotation, marks, watermarks, numbering) to create a final PDF.
   */
  static async applyPlan(
    data: Uint8Array,
    plan: EditPlan,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const outDoc = await PDFDocument.create();

    const helvetica = await outDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

    const totalPages = plan.pages.length;

    for (let i = 0; i < totalPages; i++) {
      onProgress?.(i / (totalPages + 1));
      const pagePlan = plan.pages[i];

      // Copy original page
      const [copiedPage] = await outDoc.copyPages(srcDoc, [pagePlan.originalPageIndex]);
      outDoc.addPage(copiedPage);

      // 1. Rotation
      if (pagePlan.rotation !== 0) {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRotation + pagePlan.rotation) % 360));
      }

      const { width, height } = copiedPage.getSize();

      // 2. Crop
      if (pagePlan.crop) {
        const c = pagePlan.crop;
        const cropX = width * (c.left || 0);
        const cropY = height * (c.bottom || 0);
        const cropW = width * (1 - (c.left || 0) - (c.right || 0));
        const cropH = height * (1 - (c.top || 0) - (c.bottom || 0));
        if (cropW > 10 && cropH > 10) {
          copiedPage.setCropBox(cropX, cropY, cropW, cropH);
        }
      }

      // 3. User Annotations/Marks on this page
      for (const mark of pagePlan.marks) {
        this.renderMarkOnPdfPage(copiedPage, mark, width, height, helvetica, helveticaBold);
      }

      // 4. Page Watermark (if enabled for this page)
      if (plan.watermark && plan.watermark.enabled && plan.watermark.text.trim()) {
        const shouldWatermark = this.isPageInRange(i + 1, totalPages, plan.watermark.pageRange);
        if (shouldWatermark) {
          this.renderWatermark(copiedPage, plan.watermark, width, height, helveticaBold);
        }
      }

      // 5. Page Numbering (if enabled for this page)
      if (plan.pageNumbers && plan.pageNumbers.enabled) {
        const shouldNumber = this.isPageInRange(i + 1, totalPages, plan.pageNumbers.pageRange);
        if (shouldNumber) {
          this.renderPageNumber(
            copiedPage,
            plan.pageNumbers,
            i,
            totalPages,
            width,
            height,
            helvetica
          );
        }
      }
    }

    onProgress?.(0.95);
    const result = await outDoc.save();
    onProgress?.(1.0);
    return result;
  }

  /**
   * Stamps an image (signature or graphic) onto a specific PDF page.
   */
  static async stampImage(
    data: Uint8Array,
    imagePngBytes: Uint8Array,
    pageIndex: number,
    centerXRatio: number,
    centerYRatio: number,
    widthRatio: number,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    onProgress?.(0.2);
    const doc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = doc.getPages();
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error(`Page ${pageIndex + 1} does not exist in document.`);
    }

    onProgress?.(0.5);
    const page = pages[pageIndex];
    const image = await doc.embedPng(imagePngBytes);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const imgWidth = pageWidth * widthRatio;
    const imgHeight = imgWidth * (image.height / image.width);

    const x = pageWidth * centerXRatio - imgWidth / 2;
    // PDF coordinate system has (0,0) at bottom-left!
    const y = pageHeight * (1 - centerYRatio) - imgHeight / 2;

    page.drawImage(image, {
      x,
      y,
      width: imgWidth,
      height: imgHeight,
    });

    onProgress?.(0.85);
    const result = await doc.save();
    onProgress?.(1.0);
    return result;
  }

  /**
   * Converts a list of image files into a single PDF document.
   */
  static async imagesToPdf(
    images: Array<{ data: Uint8Array; mimeType: string }>,
    preset: PdfPageSizePreset,
    marginPt: number,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();

    for (let i = 0; i < images.length; i++) {
      onProgress?.(i / images.length);
      const imgItem = images[i];
      const isPng = imgItem.mimeType.includes('png');
      const embedded = isPng
        ? await doc.embedPng(imgItem.data)
        : await doc.embedJpg(imgItem.data);

      let pageWidth = embedded.width;
      let pageHeight = embedded.height;

      if (preset === PdfPageSizePreset.A4) {
        pageWidth = 595.28;
        pageHeight = 841.89;
      } else if (preset === PdfPageSizePreset.LETTER) {
        pageWidth = 612;
        pageHeight = 792;
      }

      const page = doc.addPage([pageWidth, pageHeight]);
      const availWidth = Math.max(10, pageWidth - marginPt * 2);
      const availHeight = Math.max(10, pageHeight - marginPt * 2);

      const scale = Math.min(availWidth / embedded.width, availHeight / embedded.height);
      const drawWidth = embedded.width * scale;
      const drawHeight = embedded.height * scale;

      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(embedded, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }

    onProgress?.(0.95);
    const result = await doc.save();
    onProgress?.(1.0);
    return result;
  }

  /**
   * Exports all or selected PDF pages as raster image files (PNG/JPEG).
   */
  static async pdfToImages(
    data: Uint8Array,
    format: ImageFormat,
    dpi: number,
    quality: number,
    password?: string,
    onProgress?: (progress: number) => void
  ): Promise<Array<{ filename: string; data: Uint8Array }>> {
    const loadingTask = pdfjsLib.getDocument({
      data: data.slice(0),
      password: password || undefined,
    });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const results: Array<{ filename: string; data: Uint8Array }> = [];
    const scale = dpi / 72.0;

    const mime = format === ImageFormat.JPEG ? 'image/jpeg' : 'image/png';
    const ext = format === ImageFormat.JPEG ? 'jpg' : 'png';

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(i / (numPages + 1));
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mime, quality / 100);
      });

      if (blob) {
        const buffer = await blob.arrayBuffer();
        results.push({
          filename: `page-${i}.${ext}`,
          data: new Uint8Array(buffer),
        });
      }
    }

    onProgress?.(1.0);
    return results;
  }

  /**
   * Compresses or cleans a PDF document.
   */
  static async compressPdf(
    data: Uint8Array,
    mode: 'lossless' | 'resample',
    strength: CompressStrength,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    onProgress?.(0.3);

    if (mode === 'resample') {
      // Re-rasterize and re-embed at reduced DPI & quality
      const dpiMap = {
        [CompressStrength.LIGHT]: 180,
        [CompressStrength.MEDIUM]: 130,
        [CompressStrength.HEAVY]: 90,
      };
      const qualityMap = {
        [CompressStrength.LIGHT]: 75,
        [CompressStrength.MEDIUM]: 60,
        [CompressStrength.HEAVY]: 45,
      };

      const targetDpi = dpiMap[strength] || 130;
      const targetQuality = qualityMap[strength] || 60;

      const images = await this.pdfToImages(
        data,
        ImageFormat.JPEG,
        targetDpi,
        targetQuality,
        undefined,
        (p) => onProgress?.(0.3 + p * 0.4)
      );

      const imageItems = images.map((img) => ({
        data: img.data,
        mimeType: 'image/jpeg',
      }));

      return await this.imagesToPdf(
        imageItems,
        PdfPageSizePreset.FIT_IMAGE,
        0,
        (p) => onProgress?.(0.7 + p * 0.3)
      );
    }

    // Lossless: Load with PDF-lib and rewrite objects cleanly
    const doc = await PDFDocument.load(data, { ignoreEncryption: true });
    onProgress?.(0.8);
    const optimized = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    onProgress?.(1.0);
    return optimized;
  }

  // --- Helper rendering methods ---

  private static renderMarkOnPdfPage(
    page: PDFPage,
    mark: TextMark | FillMark | InkMark,
    pageWidth: number,
    pageHeight: number,
    font: any,
    boldFont: any
  ) {
    if (mark.type === 'text') {
      const textMark = mark as TextMark;
      const rgbColor = this.hexToRgb(textMark.color);
      const fontSize = textMark.fontSize || 16;
      const activeFont = textMark.bold ? boldFont : font;

      const x = pageWidth * textMark.x;
      const y = pageHeight * (1 - textMark.y) - fontSize;

      if (textMark.backgroundColor) {
        const bgRgb = this.hexToRgb(textMark.backgroundColor);
        const textWidth = activeFont.widthOfTextAtSize(textMark.text, fontSize);
        const pad = 4;
        page.drawRectangle({
          x: x - pad,
          y: y - pad / 2,
          width: textWidth + pad * 2,
          height: fontSize + pad,
          color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
        });
      }

      page.drawText(textMark.text, {
        x,
        y,
        size: fontSize,
        font: activeFont,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
      });
    } else if (mark.type === 'fill') {
      const fillMark = mark as FillMark;
      const rgbColor = this.hexToRgb(fillMark.color);
      const x = pageWidth * fillMark.x;
      const w = pageWidth * fillMark.width;
      const h = pageHeight * fillMark.height;
      const y = pageHeight * (1 - fillMark.y) - h;

      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity: fillMark.isRedaction ? 1.0 : fillMark.opacity ?? 0.5,
      });
    } else if (mark.type === 'ink') {
      const inkMark = mark as InkMark;
      const rgbColor = this.hexToRgb(inkMark.color);
      const strokeWidth = inkMark.strokeWidth || 2;

      for (const stroke of inkMark.strokes) {
        if (stroke.length < 2) continue;
        for (let idx = 1; idx < stroke.length; idx++) {
          const p1 = stroke[idx - 1];
          const p2 = stroke[idx];
          page.drawLine({
            start: { x: pageWidth * p1.x, y: pageHeight * (1 - p1.y) },
            end: { x: pageWidth * p2.x, y: pageHeight * (1 - p2.y) },
            thickness: strokeWidth,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
          });
        }
      }
    }
  }

  private static renderWatermark(
    page: PDFPage,
    watermark: WatermarkOptions,
    pageWidth: number,
    pageHeight: number,
    font: any
  ) {
    const text = watermark.text;
    const fontSize = watermark.fontSize || 42;
    const rgbColor = this.hexToRgb(watermark.color || '#999999');
    const opacity = watermark.opacity || 0.25;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize;

    if (watermark.layout === WatermarkLayout.DIAGONAL) {
      const x = (pageWidth - textWidth) / 2;
      const y = (pageHeight - textHeight) / 2;
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity,
        rotate: degrees(45),
      });
    } else if (watermark.layout === WatermarkLayout.CENTER) {
      const x = (pageWidth - textWidth) / 2;
      const y = (pageHeight - textHeight) / 2;
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity,
      });
    } else if (watermark.layout === WatermarkLayout.HEADER) {
      const x = (pageWidth - textWidth) / 2;
      const y = pageHeight - 36;
      page.drawText(text, {
        x,
        y,
        size: Math.min(14, fontSize),
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity,
      });
    } else if (watermark.layout === WatermarkLayout.FOOTER) {
      const x = (pageWidth - textWidth) / 2;
      const y = 24;
      page.drawText(text, {
        x,
        y,
        size: Math.min(14, fontSize),
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity,
      });
    } else if (watermark.layout === WatermarkLayout.TILED) {
      const stepX = 220;
      const stepY = 160;
      for (let cx = 40; cx < pageWidth; cx += stepX) {
        for (let cy = 40; cy < pageHeight; cy += stepY) {
          page.drawText(text, {
            x: cx,
            y: cy,
            size: Math.min(22, fontSize),
            font,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            opacity: opacity * 0.8,
            rotate: degrees(30),
          });
        }
      }
    }
  }

  private static renderPageNumber(
    page: PDFPage,
    options: PageNumberOptions,
    pageIndex: number,
    totalCount: number,
    pageWidth: number,
    pageHeight: number,
    font: any
  ) {
    const num = pageIndex + (options.startFrom || 1);
    let label = `${num}`;
    if (options.format === NumberFormat.OF_TOTAL) {
      label = `${num} / ${totalCount}`;
    } else if (options.format === NumberFormat.PAGE_PREFIX) {
      label = `Page ${num}`;
    } else if (options.format === NumberFormat.PAGE_OF_TOTAL) {
      label = `Page ${num} of ${totalCount}`;
    }

    const fontSize = options.fontSize || 10;
    const margin = options.margin || 24;
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x = margin;
    let y = margin;

    // Horizontal
    if (
      options.position === NumberPosition.TOP_CENTER ||
      options.position === NumberPosition.BOTTOM_CENTER
    ) {
      x = (pageWidth - textWidth) / 2;
    } else if (
      options.position === NumberPosition.TOP_RIGHT ||
      options.position === NumberPosition.BOTTOM_RIGHT
    ) {
      x = pageWidth - margin - textWidth;
    }

    // Vertical
    if (
      options.position === NumberPosition.TOP_LEFT ||
      options.position === NumberPosition.TOP_CENTER ||
      options.position === NumberPosition.TOP_RIGHT
    ) {
      y = pageHeight - margin - fontSize;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: grayscale(0.2),
    });
  }

  private static isPageInRange(pageNumber1Based: number, totalPages: number, rangeSpec?: string): boolean {
    if (!rangeSpec || !rangeSpec.trim()) return true;
    try {
      const ranges = PageRanges.parse(rangeSpec, totalPages);
      const pages = PageRanges.toPageList(ranges);
      return pages.includes(pageNumber1Based - 1);
    } catch {
      return true;
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const val = parseInt(clean, 16);
    if (isNaN(val)) return { r: 0, g: 0, b: 0 };
    return {
      r: ((val >> 16) & 255) / 255,
      g: ((val >> 8) & 255) / 255,
      b: (val & 255) / 255,
    };
  }
}
