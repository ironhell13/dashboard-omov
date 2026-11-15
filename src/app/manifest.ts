import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LAPORAN OMOV - Berita Acara ATM BCA',
    short_name: 'OMOV',
    description: 'Aplikasi Berita Acara Instalasi / Trade In mesin ATM BCA',
    start_url: '/lapangan',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#1A73D9',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

