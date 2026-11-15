import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/drive/drive-service';

export async function GET() {
  try {
    const status = await GoogleDriveService.testConnection();
    return NextResponse.json({ success: true, ...status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, message: err.message },
      { status: 500 }
    );
  }
}

