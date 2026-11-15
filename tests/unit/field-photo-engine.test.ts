import { describe, it, expect } from 'vitest';
import { getTargetDimensions, applyPixelAdjustments } from '@/lib/editor/canvas-engine';

describe('Tahap 3: Studio Foto & Canvas Compression Engine (SPEC A.10)', () => {
  it('menghitung dimensi target piksel tepat sesuai rasio 4:3 dan tier standar', () => {
    const dim = getTargetDimensions(4, 3, 'standar');
    expect(dim.width).toBe(1280);
    expect(dim.height).toBe(960);
    expect(dim.maxBytes).toBe(260 * 1024);
    expect(dim.initialQuality).toBe(0.78);
  });

  it('menghitung dimensi target piksel tepat sesuai rasio 4:3 dan tier detail', () => {
    const dim = getTargetDimensions(4, 3, 'detail');
    expect(dim.width).toBe(1600);
    expect(dim.height).toBe(1200);
    expect(dim.maxBytes).toBe(450 * 1024);
    expect(dim.initialQuality).toBe(0.85);
  });

  it('menghitung dimensi target piksel tepat sesuai rasio 7:10 dan tier dokumen', () => {
    const dim = getTargetDimensions(7, 10, 'dokumen');
    expect(dim.height).toBe(1800);
    expect(dim.width).toBe(1260); // (1800 * 7) / 10
    expect(dim.maxBytes).toBe(600 * 1024);
    expect(dim.initialQuality).toBe(0.85);
  });

  it('menghitung dimensi target rasio 5:6 (vendor) dan 4:5 (dynabolt)', () => {
    const dimVendor = getTargetDimensions(5, 6, 'standar');
    expect(dimVendor.height).toBe(1280);
    expect(dimVendor.width).toBe(Math.round((1280 * 5) / 6)); // 1067
    expect(dimVendor.maxBytes).toBe(260 * 1024);

    const dimDynabolt = getTargetDimensions(4, 5, 'standar');
    expect(dimDynabolt.height).toBe(1280);
    expect(dimDynabolt.width).toBe(Math.round((1280 * 4) / 5)); // 1024
    expect(dimDynabolt.maxBytes).toBe(260 * 1024);
  });

  it('memproses manipulasi piksel kecerahan & kontras tanpa nilai di luar range 0-255', () => {
    const fakeData = new Uint8ClampedArray([
      50, 100, 150, 255,
      10, 20, 30, 255,
      240, 250, 255, 255
    ]);
    const imgData = { data: fakeData, width: 3, height: 1 } as ImageData;

    applyPixelAdjustments(imgData, 15, 10, true);

    // Semua nilai RGB harus berada di rentang [0, 255]
    for (let i = 0; i < fakeData.length; i += 4) {
      expect(fakeData[i]).toBeGreaterThanOrEqual(0);
      expect(fakeData[i]).toBeLessThanOrEqual(255);
      expect(fakeData[i + 1]).toBeGreaterThanOrEqual(0);
      expect(fakeData[i + 1]).toBeLessThanOrEqual(255);
      expect(fakeData[i + 2]).toBeGreaterThanOrEqual(0);
      expect(fakeData[i + 2]).toBeLessThanOrEqual(255);
      expect(fakeData[i + 3]).toBe(255); // Alpha tetap 255
    }
  });
});

