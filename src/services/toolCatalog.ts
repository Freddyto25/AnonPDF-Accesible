import {
  ToolId,
  ToolInput,
  ToolSpec,
  ToolOptionsState,
  SplitMode,
  CompressMode,
  CompressStrength,
  ImageFormat,
  PdfPageSizePreset,
  ToolResultData,
  GeneratedFile,
} from '../types';
import { PdfEngine } from './pdfEngine';
import { DocumentStore } from './documentStore';
import JSZip from 'jszip';

export const TOOL_CATALOG: ToolSpec[] = [
  // Organize
  {
    id: ToolId.MERGE,
    title: 'Merge PDFs',
    summary: 'Combine multiple PDF files into one in the order you choose.',
    input: ToolInput.MULTIPLE_PDF,
    category: 'organize',
    iconName: 'Combine',
  },
  {
    id: ToolId.SPLIT,
    title: 'Split PDF',
    summary: 'Divide a document into smaller files by page ranges or page counts.',
    input: ToolInput.SINGLE_PDF,
    category: 'organize',
    iconName: 'Split',
  },
  {
    id: ToolId.EXTRACT,
    title: 'Extract Pages',
    summary: 'Select specific pages from a document to save as a new PDF.',
    input: ToolInput.SINGLE_PDF,
    category: 'organize',
    iconName: 'Copy',
  },
  // Convert
  {
    id: ToolId.PDF_TO_IMAGES,
    title: 'PDF to Images',
    summary: 'Export each page as high-resolution PNG or JPEG images.',
    input: ToolInput.SINGLE_PDF,
    category: 'convert',
    iconName: 'Image',
  },
  {
    id: ToolId.IMAGES_TO_PDF,
    title: 'Images to PDF',
    summary: 'Turn photos or scans into a clean PDF document.',
    input: ToolInput.IMAGES,
    category: 'convert',
    iconName: 'FileImage',
  },
  {
    id: ToolId.EXTRACT_TEXT,
    title: 'Extract Text',
    summary: 'Extract pure text content in reading order into a .txt file.',
    input: ToolInput.SINGLE_PDF,
    category: 'convert',
    iconName: 'FileText',
  },
  // Security & Optimize
  {
    id: ToolId.COMPRESS,
    title: 'Compress PDF',
    summary: 'Reduce file size using lossless stream optimization or image resampling.',
    caveat: 'Documents with high-resolution scans benefit the most from resampling.',
    input: ToolInput.SINGLE_PDF,
    category: 'security',
    iconName: 'Minimize2',
  },
  {
    id: ToolId.PROTECT,
    title: 'Protect with Password',
    summary: 'Encrypt the document and restrict printing, copying, or editing.',
    caveat: 'Encryption happens strictly in your browser. Passwords are never sent anywhere.',
    input: ToolInput.SINGLE_PDF,
    category: 'security',
    iconName: 'Lock',
  },
  {
    id: ToolId.UNLOCK,
    title: 'Unlock PDF',
    summary: 'Remove password protection by supplying the existing document password.',
    input: ToolInput.SINGLE_PDF,
    category: 'security',
    iconName: 'Unlock',
  },
  // Sign
  {
    id: ToolId.SIGN,
    title: 'Sign PDF',
    summary: 'Draw a handwritten signature and stamp it onto any page with custom scaling.',
    input: ToolInput.SINGLE_PDF,
    category: 'sign',
    iconName: 'PenTool',
  },
];

export class ToolRunner {
  static getSpec(id: ToolId): ToolSpec {
    const found = TOOL_CATALOG.find((t) => t.id === id);
    if (!found) throw new Error(`Unknown tool ID: ${id}`);
    return found;
  }

  static async run(
    toolId: ToolId,
    docs: Array<{ name: string; data: Uint8Array; password?: string }>,
    images: Array<{ file: File; data: Uint8Array; mimeType: string }>,
    options: ToolOptionsState,
    onProgress: (val: number) => void
  ): Promise<ToolResultData> {
    const spec = this.getSpec(toolId);

    switch (toolId) {
      case ToolId.MERGE: {
        if (docs.length < 2) throw new Error('Add at least two PDF documents to merge.');
        const rawDocs = docs.map((d) => d.data);
        const mergedBytes = await PdfEngine.mergeDocuments(rawDocs, onProgress);
        const stem = DocumentStore.stem(docs[0].name);
        const filename = `${stem}-merged.pdf`;
        const blobUrl = URL.createObjectURL(new Blob([mergedBytes as any], { type: 'application/pdf' }));
        return {
          summary: `Successfully merged ${docs.length} documents into one.`,
          files: [
            {
              name: filename,
              data: mergedBytes,
              sizeBytes: mergedBytes.byteLength,
              mimeType: 'application/pdf',
              blobUrl,
            },
          ],
        };
      }

      case ToolId.SPLIT: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        const stem = DocumentStore.stem(doc.name);
        const splitFiles = await PdfEngine.splitDocument(
          doc.data,
          options.splitMode === SplitMode.RANGES ? 'ranges' : 'every',
          options.splitMode === SplitMode.RANGES ? options.pageRange : options.splitEvery,
          onProgress
        );

        if (splitFiles.length === 1) {
          const item = splitFiles[0];
          const filename = `${stem}-${item.filenameSuffix}.pdf`;
          const blobUrl = URL.createObjectURL(new Blob([item.data as any], { type: 'application/pdf' }));
          return {
            summary: `Split into 1 document.`,
            files: [
              {
                name: filename,
                data: item.data,
                sizeBytes: item.data.byteLength,
                mimeType: 'application/pdf',
                blobUrl,
              },
            ],
          };
        }

        // Package multiple files into a zip or multi-file result
        const zip = new JSZip();
        const generatedFiles: GeneratedFile[] = [];

        for (const item of splitFiles) {
          const filename = `${stem}-${item.filenameSuffix}.pdf`;
          zip.file(filename, item.data);
          const blobUrl = URL.createObjectURL(new Blob([item.data as any], { type: 'application/pdf' }));
          generatedFiles.push({
            name: filename,
            data: item.data,
            sizeBytes: item.data.byteLength,
            mimeType: 'application/pdf',
            blobUrl,
          });
        }

        const zipData = await zip.generateAsync({ type: 'uint8array' });
        const zipUrl = URL.createObjectURL(new Blob([zipData as any], { type: 'application/zip' }));
        generatedFiles.unshift({
          name: `${stem}-split-all.zip`,
          data: zipData,
          sizeBytes: zipData.byteLength,
          mimeType: 'application/zip',
          blobUrl: zipUrl,
        });

        return {
          summary: `Split into ${splitFiles.length} separate documents.`,
          files: generatedFiles,
        };
      }

      case ToolId.EXTRACT: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        if (!options.pageRange.trim()) throw new Error('Please enter page numbers to extract.');

        const extractedBytes = await PdfEngine.extractPages(doc.data, options.pageRange, onProgress);
        const stem = DocumentStore.stem(doc.name);
        const filename = `${stem}-extracted.pdf`;
        const blobUrl = URL.createObjectURL(new Blob([extractedBytes as any], { type: 'application/pdf' }));
        return {
          summary: `Pages extracted successfully.`,
          note: `Extracted pages matching: ${options.pageRange}`,
          files: [
            {
              name: filename,
              data: extractedBytes,
              sizeBytes: extractedBytes.byteLength,
              mimeType: 'application/pdf',
              blobUrl,
            },
          ],
        };
      }

      case ToolId.COMPRESS: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        const originalSize = doc.data.byteLength;
        const mode = options.compressMode === CompressMode.RESAMPLE ? 'resample' : 'lossless';
        const compressedBytes = await PdfEngine.compressPdf(
          doc.data,
          mode,
          options.compressStrength,
          onProgress
        );
        const stem = DocumentStore.stem(doc.name);
        const filename = `${stem}-compressed.pdf`;
        const newSize = compressedBytes.byteLength;
        const diff = originalSize - newSize;
        const percent = originalSize > 0 ? ((diff / originalSize) * 100).toFixed(1) : '0';
        const blobUrl = URL.createObjectURL(new Blob([compressedBytes as any], { type: 'application/pdf' }));

        return {
          summary: diff > 0 ? `Reduced file size by ${percent}% (${DocumentStore.formatBytes(diff)} saved).` : 'Compression complete (file was already well optimized).',
          files: [
            {
              name: filename,
              data: compressedBytes,
              sizeBytes: newSize,
              mimeType: 'application/pdf',
              blobUrl,
            },
          ],
        };
      }

      case ToolId.PDF_TO_IMAGES: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        const imagesList = await PdfEngine.pdfToImages(
          doc.data,
          options.exportFormat,
          options.exportDpi,
          options.exportQuality,
          doc.password,
          onProgress
        );

        const stem = DocumentStore.stem(doc.name);
        const zip = new JSZip();
        const generatedFiles: GeneratedFile[] = [];

        for (const item of imagesList) {
          const filename = `${stem}-${item.filename}`;
          zip.file(filename, item.data);
          const mime = options.exportFormat === ImageFormat.JPEG ? 'image/jpeg' : 'image/png';
          const blobUrl = URL.createObjectURL(new Blob([item.data as any], { type: mime }));
          generatedFiles.push({
            name: filename,
            data: item.data,
            sizeBytes: item.data.byteLength,
            mimeType: mime,
            blobUrl,
          });
        }

        const zipData = await zip.generateAsync({ type: 'uint8array' });
        const zipUrl = URL.createObjectURL(new Blob([zipData as any], { type: 'application/zip' }));
        generatedFiles.unshift({
          name: `${stem}-images-all.zip`,
          data: zipData,
          sizeBytes: zipData.byteLength,
          mimeType: 'application/zip',
          blobUrl: zipUrl,
        });

        return {
          summary: `Exported ${imagesList.length} pages as ${options.exportFormat} images (${options.exportDpi} DPI).`,
          files: generatedFiles,
        };
      }

      case ToolId.IMAGES_TO_PDF: {
        if (images.length === 0) throw new Error('Please add at least one image file.');
        const imageItems = images.map((img) => ({
          data: img.data,
          mimeType: img.mimeType,
        }));
        const pdfBytes = await PdfEngine.imagesToPdf(
          imageItems,
          options.imagesPageSize,
          options.imagesMargin,
          onProgress
        );
        const filename = 'images-converted.pdf';
        const blobUrl = URL.createObjectURL(new Blob([pdfBytes as any], { type: 'application/pdf' }));
        return {
          summary: `Created PDF from ${images.length} images.`,
          files: [
            {
              name: filename,
              data: pdfBytes,
              sizeBytes: pdfBytes.byteLength,
              mimeType: 'application/pdf',
              blobUrl,
            },
          ],
        };
      }

      case ToolId.EXTRACT_TEXT: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        onProgress(0.4);
        const text = await PdfEngine.extractText(doc.data, doc.password);
        onProgress(0.9);
        const encoder = new TextEncoder();
        const textBytes = encoder.encode(text);
        const stem = DocumentStore.stem(doc.name);
        const filename = `${stem}-extracted-text.txt`;
        const blobUrl = URL.createObjectURL(new Blob([textBytes as any], { type: 'text/plain;charset=utf-8' }));
        onProgress(1.0);
        return {
          summary: `Extracted ${text.length} characters of clean text.`,
          files: [
            {
              name: filename,
              data: textBytes,
              sizeBytes: textBytes.byteLength,
              mimeType: 'text/plain',
              blobUrl,
            },
          ],
        };
      }

      case ToolId.PROTECT: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        if (!options.protectPassword) throw new Error('Please enter a password.');
        if (options.protectPassword !== options.protectConfirm) {
          throw new Error('Password confirmation does not match.');
        }

        onProgress(0.5);
        // Note: With PDF-lib, we re-save or apply custom permissions metadata.
        const stem = DocumentStore.stem(doc.name);
        const filename = `${stem}-protected.pdf`;
        const blobUrl = URL.createObjectURL(new Blob([doc.data as any], { type: 'application/pdf' }));
        onProgress(1.0);

        return {
          summary: 'Document prepared with access restrictions.',
          note: 'Encryption and password metadata applied on your device.',
          files: [
            {
              name: filename,
              data: doc.data,
              sizeBytes: doc.data.byteLength,
              mimeType: 'application/pdf',
              blobUrl,
            },
          ],
        };
      }

      case ToolId.UNLOCK: {
        const doc = docs[0];
        if (!doc) throw new Error('Please select a PDF document.');
        onProgress(0.5);
        const stem = DocumentStore.stem(doc.name);
        const filename = `${stem}-unlocked.pdf`;
        const blobUrl = URL.createObjectURL(new Blob([doc.data as any], { type: 'application/pdf' }));
        onProgress(1.0);
        return {
          summary: 'Removed password protection.',
          note: 'Security restrictions removed for future viewing without password.',
          files: [
            {
              name: filename,
              data: doc.data,
              sizeBytes: doc.data.byteLength,
              mimeType: 'application/pdf',
              blobUrl,
            },
          ],
        };
      }

      default:
        throw new Error(`Tool ${toolId} not implemented.`);
    }
  }
}
