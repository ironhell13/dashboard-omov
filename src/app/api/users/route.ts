import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: db.getUsers(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, email, role } = body;

    if (!nama || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Nama, email, dan peran wajib diisi' },
        { status: 400 }
      );
    }

    const newUser = db.addUser(nama, email, role);
    return NextResponse.json({ success: true, data: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    const user = db.toggleUserActive(id);
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

