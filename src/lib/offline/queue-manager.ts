import { getOfflineDB, OfflinePhotoItem } from './db';

export const queueManager = {
  // Tambah atau perbarui foto di antrean (satu slot per laporan ditimpa jika diedit ulang)
  async enqueuePhoto(item: OfflinePhotoItem): Promise<void> {
    const db = await getOfflineDB();
    if (!db) return;

    await db.put('queue', item);
    this.updateQueueCountNotification();
  },

  // Ambil semua item di antrean
  async getQueue(): Promise<OfflinePhotoItem[]> {
    const db = await getOfflineDB();
    if (!db) return [];

    return await db.getAll('queue');
  },

  // Ambil foto spesifik di antrean
  async getPhoto(reportId: string, slotKey: string): Promise<OfflinePhotoItem | undefined> {
    const db = await getOfflineDB();
    if (!db) return undefined;

    return await db.get('queue', `${reportId}_${slotKey}`);
  },

  // Hapus item dari antrean
  async removeItem(id: string): Promise<void> {
    const db = await getOfflineDB();
    if (!db) return;

    await db.delete('queue', id);
    this.updateQueueCountNotification();
  },

  // Perbarui status antrean
  async updateStatus(
    id: string,
    status: OfflinePhotoItem['status'],
    lastError?: string
  ): Promise<void> {
    const db = await getOfflineDB();
    if (!db) return;

    const item = await db.get('queue', id);
    if (item) {
      item.status = status;
      if (status === 'uploading') item.attempts += 1;
      if (lastError) item.lastError = lastError;
      await db.put('queue', item);
      this.updateQueueCountNotification();
    }
  },

  // Hitung jumlah item tertunda
  async getPendingCount(): Promise<number> {
    const db = await getOfflineDB();
    if (!db) return 0;

    const all = await db.getAll('queue');
    return all.filter((i) => i.status !== 'synced').length;
  },

  // Perbarui notifikasi counter badge di UI
  async updateQueueCountNotification(): Promise<void> {
    try {
      const count = await this.getPendingCount();
      localStorage.setItem('omov_offline_queue_count', count.toString());
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Abaikan jika di SSR
    }
  },

  // Kirim semua item yang pending/failed ke API
  async processQueue(): Promise<{ success: number; failed: number }> {
    const db = await getOfflineDB();
    if (!db || !navigator.onLine) return { success: 0, failed: 0 };

    const items = await db.getAll('queue');
    const toUpload = items.filter((i) => i.status === 'pending' || i.status === 'failed');

    let success = 0;
    let failed = 0;

    for (const item of toUpload) {
      try {
        await this.updateStatus(item.id, 'uploading');

        const formData = new FormData();
        formData.append('reportId', item.reportId);
        formData.append('slotKey', item.slotKey);
        formData.append('file', item.blob, `${item.slotKey}.jpg`);
        formData.append('thumb', item.thumbBlob, `thumb_${item.slotKey}.jpg`);
        formData.append('meta', JSON.stringify(item.meta));

        const res = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload gagal dengan kode ${res.status}`);
        }

        // Tandai selesai atau hapus dari antrean
        await this.removeItem(item.id);
        success++;
      } catch (err: any) {
        await this.updateStatus(item.id, 'failed', err.message || 'Koneksi gagal');
        failed++;
      }
    }

    return { success, failed };
  },
};

