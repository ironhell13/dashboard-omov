import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati static assets, file dokumen, manifest, dan API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('.webmanifest') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Dukungan demo role parameter untuk pengujian / dev
  const demoRole = request.nextUrl.searchParams.get('demo_role');
  if (demoRole === 'superadmin' || demoRole === 'supervisor' || demoRole === 'lapangan') {
    const response = NextResponse.next();
    response.cookies.set('omov_role', demoRole, { path: '/' });
    const demoName =
      demoRole === 'superadmin'
        ? 'Super Admin'
        : demoRole === 'supervisor'
        ? 'Budi Santoso'
        : 'Ahmad Fauzi';
    response.cookies.set('omov_name', encodeURIComponent(demoName), { path: '/' });
    return response;
  }

  const role = request.cookies.get('omov_role')?.value;

  // Halaman Root (/) langsung diarahkan ke Dashboard Lapangan (tanpa perlu login)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/lapangan', request.url));
  }

  // Rute Tim Lapangan (/lapangan/*) bebas diakses publik tanpa perlu login
  if (pathname.startsWith('/lapangan')) {
    return NextResponse.next();
  }

  // Rute Supervisor & Superadmin (/supervisor/*)
  if (pathname.startsWith('/supervisor')) {
    if (role !== 'superadmin' && role !== 'supervisor') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Rute Pengguna dan Google Drive hanya boleh diakses oleh Superadmin
    if (
      pathname.startsWith('/supervisor/pengguna') ||
      pathname.startsWith('/supervisor/pengaturan/drive')
    ) {
      if (role !== 'superadmin') {
        // Supervisor biasa dilarang mengakses menu ini, diarahkan kembali ke beranda supervisor
        return NextResponse.redirect(new URL('/supervisor', request.url));
      }
    }

    return NextResponse.next();
  }

  // Jika sudah login sebagai supervisor/superadmin dan membuka /login, arahkan ke /supervisor
  if (pathname === '/login' && (role === 'superadmin' || role === 'supervisor')) {
    return NextResponse.redirect(new URL('/supervisor', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
