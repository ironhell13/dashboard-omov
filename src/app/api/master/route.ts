import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      vendors: db.getVendors(),
      mesin: db.getMesin(),
      orang: db.getOrang(),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let result;
    if (type === 'vendor') {
      result = db.addVendor(data.nama, data.peran);
    } else if (type === 'mesin') {
      result = db.addMesin(data.tipe);
    } else if (type === 'orang') {
      result = db.addOrang(data.nama, data.jabatan);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = parseInt(searchParams.get('id') || '0', 10);

    if (type === 'vendor') {
      db.deleteVendor(id);
    } else if (type === 'mesin') {
      db.deleteMesin(id);
    } else if (type === 'orang') {
      db.deleteOrang(id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

