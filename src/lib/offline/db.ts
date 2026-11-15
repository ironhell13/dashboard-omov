import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PhotoSlotTier } from '@/types/slot';

export interface OfflinePhotoItem {
  id: string; // `${reportId}_${slotKey}`
  reportId: string;
  slotKey: string;
  blob: Blob;
  thumbBlob: Blob;
  meta: {
    width: number;
    height: number;
    bytes: number;
    tier: PhotoSlotTier;
    takenAt: string;
    source: 'kamera' | 'galeri';
    watermark: boolean;
  };
  status: 'pending' | 'uploading' | 'failed' | 'synced';
  attempts: number;
  lastError?: string;
  createdAt: string;
}

interface OmovDBSchema extends DBSchema {
  queue: {
    key: string;
    value: OfflinePhotoItem;
    indexes: {
      'by-status': string;
      'by-report': string;
    };
  };
  cache: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<OmovDBSchema>> | null = null;

export function getOfflineDB() {
  if (typeof window === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB<OmovDBSchema>('omov-offline-db', 1, {
      upgrade(db) {
        // Store antrean foto
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-report', 'reportId');
        }

        // Store cache lokasi & master
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  }

  return dbPromise;
}

