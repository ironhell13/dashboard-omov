// In-memory photo storage for dev/runtime
export interface StoredPhoto {
  slotKey: string;
  bytes: number;
  width: number;
  height: number;
  source: 'kamera' | 'galeri';
  uploadedAt: string;
  review: 'menunggu' | 'diterima' | 'ditolak';
  review_note?: string;
  thumbBase64?: string;
  buffer?: Buffer;
}

export const photoStore = new Map<string, StoredPhoto>();
