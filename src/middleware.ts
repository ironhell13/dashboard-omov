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
  if (demoRole === 'supervisor' || demoRole === 'lapangan') {
    const response = NextResponse.next();
    response.cookies.set('omov_role', demoRole, { path: '/' });
    response.cookies.set(
      'omov_name',
      encodeURIComponent(demoRole === 'supervisor' ? 'Budi Santoso' : 'Ahmad Fauzi'),
      { path: '/' }
    );
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

  // Rute Supervisor (/supervisor/*) mewajibkan login role supervisor
  if (pathname.startsWith('/supervisor')) {
    if (role !== 'supervisor') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Jika sudah login sebagai supervisor dan membuka /login, arahkan ke /supervisor
  if (pathname === '/login' && role === 'supervisor') {
    return NextResponse.redirect(new URL('/supervisor', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
