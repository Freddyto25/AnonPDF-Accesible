/**
 * Page range parsing and description, keeping compatibility with 1-based user input
 * and 0-based document page indexing.
 */

export class PageRanges {
  /**
   * Parses a user-entered range string (e.g. "1-3, 5, 8-10") into a list of 0-based ranges [start, end].
   */
  static parse(spec: string, totalPages: number): Array<[number, number]> {
    if (!spec || !spec.trim()) {
      throw new Error('Please specify at least one page number.');
    }

    if (totalPages <= 0) {
      throw new Error('Document has no pages.');
    }

    const segments = spec.split(',').map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) {
      throw new Error('Please specify at least one page number.');
    }

    const result: Array<[number, number]> = [];

    for (const segment of segments) {
      if (segment.includes('-')) {
        const parts = segment.split('-').map((p) => p.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Error(`"${segment}" is not a valid page range.`);
        }

        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);

        if (isNaN(start) || isNaN(end)) {
          throw new Error(`"${segment}" contains non-numeric page numbers.`);
        }

        if (start === 0 || end === 0) {
          throw new Error('Page numbers start at 1.');
        }

        if (start > end) {
          throw new Error(`"${segment}" runs backwards.`);
        }

        if (start > totalPages || end > totalPages) {
          const suffix = totalPages === 1 ? '1 page.' : `${totalPages} pages.`;
          throw new Error(`This document only has ${suffix}`);
        }

        result.push([start - 1, end - 1]);
      } else {
        const page = parseInt(segment, 10);
        if (isNaN(page)) {
          throw new Error(`"${segment}" is not a valid page number.`);
        }

        if (page === 0) {
          throw new Error('Page numbers start at 1.');
        }

        if (page > totalPages) {
          const suffix = totalPages === 1 ? '1 page.' : `${totalPages} pages.`;
          throw new Error(`This document only has ${suffix}`);
        }

        result.push([page - 1, page - 1]);
      }
    }

    return result;
  }

  /**
   * Flattens ranges into an ordered list of unique 0-based page indices, preserving first-seen order.
   */
  static toPageList(ranges: Array<[number, number]>): number[] {
    const seen = new Set<number>();
    const pages: number[] = [];

    for (const [start, end] of ranges) {
      for (let p = start; p <= end; p++) {
        if (!seen.has(p)) {
          seen.add(p);
          pages.push(p);
        }
      }
    }

    return pages;
  }

  /**
   * Describes a set of 0-based page indices in human-friendly collapsed 1-based format.
   * e.g. [0, 1, 2, 4, 7, 8, 9] -> "1-3, 5, 8-10"
   */
  static describe(pages: number[]): string {
    if (!pages || pages.length === 0) return 'none';

    const sorted = Array.from(new Set(pages))
      .filter((p) => p >= 0)
      .sort((a, b) => a - b);

    if (sorted.length === 0) return 'none';

    const runs: Array<[number, number]> = [];
    let runStart = sorted[0];
    let runEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === runEnd + 1) {
        runEnd = current;
      } else {
        runs.push([runStart, runEnd]);
        runStart = current;
        runEnd = current;
      }
    }
    runs.push([runStart, runEnd]);

    return runs
      .map(([s, e]) => (s === e ? `${s + 1}` : `${s + 1}-${e + 1}`))
      .join(', ');
  }
}
