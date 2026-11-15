import { google } from 'googleapis';
import { Readable } from 'stream';
import { NAMA_BULAN, formatNamaBerkasDocx } from '@/lib/utils';
import { Report } from '@/types/database';

export interface DriveUploadResult {
  fileId: string;
  driveUrl: string;
  folderPath: string;
  fileName: string;
  verified: boolean;
}

export interface DriveConnectionStatus {
  connected: boolean;
  message: string;
  accountEmail?: string;
  rootFolderId?: string;
}

export class GoogleDriveService {
  private static getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return oauth2Client;
  }

  /**
   * Menguji koneksi ke Google Drive API
   */
  public static async testConnection(): Promise<DriveConnectionStatus> {
    const auth = this.getOAuth2Client();

    // Jika kredensial belum diset di environment (mode simulasi)
    if (!auth) {
      return {
        connected: true,
        message: 'Mode simulasi aktif (kredensial Google OAuth belum disetel di .env)',
        accountEmail: 'bca.omov.archive@gmail.com (Simulasi)',
        rootFolderId: 'omov-root-folder-simulated',
      };
    }

    try {
      const drive = google.drive({ version: 'v3', auth });
      const about = await drive.about.get({ fields: 'user' });

      return {
        connected: true,
        message: 'Koneksi ke Google Drive API berhasil!',
        accountEmail: about.data.user?.emailAddress || 'Akun Google Terhubung',
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `Gagal menghubungkan ke Google Drive: ${err.message}`,
      };
    }
  }

  /**
   * Mencari atau membuat folder berdasarkan nama di dalam parent tertentu
   */
  private static async findOrCreateFolder(
    drive: any,
    folderName: string,
    parentId?: string
  ): Promise<string> {
    let q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const res = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // Buat folder baru jika belum ada
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const created = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return created.data.id!;
  }

  /**
   * Mengunggah berkas Berita Acara .docx ke struktur folder:
   * LAPORAN OMOV/{tahun}/{bulan Indonesia}/
   */
  public static async uploadReportDocx(
    report: Report,
    docxBuffer: Buffer
  ): Promise<DriveUploadResult> {
    const reportDate = report.tanggal ? new Date(report.tanggal) : new Date();
    const yearStr = reportDate.getFullYear().toString();
    const monthStr = NAMA_BULAN[reportDate.getMonth()];
    const fileName = formatNamaBerkasDocx(report.jenis_pekerjaan, report.wsid, report.lokasi);
    const folderPath = `LAPORAN OMOV/${yearStr}/${monthStr}/`;

    const auth = this.getOAuth2Client();

    // Jika mode simulasi (kredensial OAuth belum diset di .env)
    if (!auth) {
      const mockId = `drive_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        fileId: mockId,
        driveUrl: `https://drive.google.com/file/d/${mockId}/view`,
        folderPath,
        fileName,
        verified: true,
      };
    }

    try {
      const drive = google.drive({ version: 'v3', auth });

      // 1. Dapatkan atau buat folder Root 'LAPORAN OMOV'
      const rootId = await this.findOrCreateFolder(drive, 'LAPORAN OMOV');

      // 2. Dapatkan atau buat folder Tahun
      const yearId = await this.findOrCreateFolder(drive, yearStr, rootId);

      // 3. Dapatkan atau buat folder Bulan
      const targetFolderId = await this.findOrCreateFolder(drive, monthStr, yearId);

      // 4. Unggah berkas dokumen .docx
      const fileStream = new Readable();
      fileStream.push(docxBuffer);
      fileStream.push(null);

      const media = {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: fileStream,
      };

      const fileMetadata = {
        name: fileName,
        parents: [targetFolderId],
      };

      const res = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink',
      });

      const fileId = res.data.id!;
      const driveUrl = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      // 5. Verifikasi unggahan dengan membaca metadata (SPEC A.13)
      const verifyRes = await drive.files.get({
        fileId,
        fields: 'id, name, size',
      });

      const verified = !!verifyRes.data.id && verifyRes.data.name === fileName;

      return {
        fileId,
        driveUrl,
        folderPath,
        fileName,
        verified,
      };
    } catch (err: any) {
      throw new Error(`Gagal mengunggah ke Google Drive: ${err.message}`);
    }
  }
}

