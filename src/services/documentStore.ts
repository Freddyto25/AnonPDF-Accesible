import { RecentDocument } from '../types';

const PREFS_KEY = 'anonpdf_preferences';
const RECENTS_KEY = 'anonpdf_recent_documents';
const MAX_RECENTS = 20;

export interface AppPreferencesState {
  rememberRecents: boolean;
  invertColors: boolean;
  keepScreenOn: boolean;
}

const DEFAULT_PREFERENCES: AppPreferencesState = {
  rememberRecents: true,
  invertColors: false,
  keepScreenOn: false,
};

// Simple IndexedDB wrapper for binary PDF storage
class LocalDb {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('anonpdf_store', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  async saveFile(id: string, name: string, data: Uint8Array, pageCount: number): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.put({
        id,
        name,
        data,
        sizeBytes: data.byteLength,
        pageCount,
        lastModified: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getFile(id: string): Promise<{ id: string; name: string; data: Uint8Array; sizeBytes: number; pageCount: number; lastModified: number } | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFiles(): Promise<Array<{ id: string; name: string; sizeBytes: number; pageCount: number; lastModified: number }>> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result || []).map((item) => ({
          id: item.id,
          name: item.name,
          sizeBytes: item.sizeBytes || item.data?.byteLength || 0,
          pageCount: item.pageCount || 1,
          lastModified: item.lastModified || Date.now(),
        }));
        results.sort((a, b) => b.lastModified - a.lastModified);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async removeFile(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

const localDb = new LocalDb();

export class DocumentStore {
  static getPreferences(): AppPreferencesState {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read preferences from localStorage:', e);
    }
    return DEFAULT_PREFERENCES;
  }

  static savePreferences(prefs: Partial<AppPreferencesState>): AppPreferencesState {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not write preferences to localStorage:', e);
    }
    return updated;
  }

  static async getRecentDocuments(): Promise<RecentDocument[]> {
    const prefs = this.getPreferences();
    if (!prefs.rememberRecents) return [];
    try {
      const items = await localDb.getAllFiles();
      return items.slice(0, MAX_RECENTS) as RecentDocument[];
    } catch (e) {
      console.warn('Could not load recents from database:', e);
      return [];
    }
  }

  static async saveRecentDocument(name: string, data: Uint8Array, pageCount: number): Promise<string> {
    const prefs = this.getPreferences();
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (!prefs.rememberRecents) return id;

    try {
      await localDb.saveFile(id, name, data, pageCount);
    } catch (e) {
      console.warn('Could not save document to local database:', e);
    }
    return id;
  }

  static async loadRecentDocument(id: string): Promise<{ name: string; data: Uint8Array; pageCount: number } | null> {
    try {
      const file = await localDb.getFile(id);
      if (file && file.data) {
        return {
          name: file.name,
          data: file.data,
          pageCount: file.pageCount,
        };
      }
    } catch (e) {
      console.warn('Could not load document from local database:', e);
    }
    return null;
  }

  static async clearRecents(): Promise<void> {
    try {
      await localDb.clearAll();
      localStorage.removeItem(RECENTS_KEY);
    } catch (e) {
      console.warn('Could not clear recents:', e);
    }
  }

  static async removeRecent(id: string): Promise<void> {
    try {
      await localDb.removeFile(id);
    } catch (e) {
      console.warn('Could not remove file:', e);
    }
  }

  static stem(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(0, lastDot) : filename;
  }

  static downloadFile(data: Uint8Array, filename: string, mimeType = 'application/pdf'): void {
    const blob = new Blob([data as any], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  static formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
