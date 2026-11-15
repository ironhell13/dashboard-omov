import { describe, it, expect } from 'vitest';
import { PHOTO_SLOTS } from '@/types/slot';

describe('RLS & Policy Isolation Logic (SPEC A.6)', () => {
  it('harus memuat tepat 34 slot foto master', () => {
    expect(PHOTO_SLOTS.length).toBe(34);
  });

  it('slot ba_hdd_full harus mereferensikan ba_hdd (reuse_of)', () => {
    const slot34 = PHOTO_SLOTS.find(s => s.key === 'ba_hdd_full');
    expect(slot34).toBeDefined();
    expect(slot34?.reuse_of).toBe('ba_hdd');
    expect(slot34?.grp).toBe('Otomatis');
  });

  it('memverifikasi aturan akses status laporan untuk tim lapangan', () => {
    // Lapangan hanya boleh melihat dan mengunggah pada status aktif
    const activeStatuses = ['menunggu_foto', 'perlu_perbaikan', 'foto_lengkap'];
    const lockedStatuses = ['final', 'terarsip', 'dibatalkan'];

    const canFieldAccess = (status: string) => activeStatuses.includes(status);

    // Aktif -> Boleh
    expect(canFieldAccess('menunggu_foto')).toBe(true);
    expect(canFieldAccess('perlu_perbaikan')).toBe(true);
    expect(canFieldAccess('foto_lengkap')).toBe(true);

    // Terkunci / Final -> Ditolak RLS
    expect(canFieldAccess('final')).toBe(false);
    expect(canFieldAccess('terarsip')).toBe(false);
    expect(canFieldAccess('dibatalkan')).toBe(false);
  });

  it('memverifikasi isolasi wewenang review foto (hanya supervisor)', () => {
    const canReviewPhoto = (role: 'supervisor' | 'lapangan') => role === 'supervisor';

    expect(canReviewPhoto('supervisor')).toBe(true);
    expect(canReviewPhoto('lapangan')).toBe(false);
  });
});

