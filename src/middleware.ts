import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati static assets dan API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
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

  // Jika belum login dan mencoba mengakses rute yang dilindungi
  if (!role && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan membuka halaman /login, redirect ke dashboard yang sesuai
  if (role && pathname === '/login') {
    if (role === 'supervisor') {
      return NextResponse.redirect(new URL('/supervisor', request.url));
    } else {
      return NextResponse.redirect(new URL('/lapangan', request.url));
    }
  }

  // Supervisor tidak boleh dibobol peran lapangan (A.13)
  if (pathname.startsWith('/supervisor') && role !== 'supervisor') {
    return NextResponse.redirect(new URL('/lapangan', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
