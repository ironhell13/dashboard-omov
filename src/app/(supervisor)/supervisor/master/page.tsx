'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Database, Building2, Cpu, UserCheck } from 'lucide-react';
import { MasterVendor, MasterMesin, MasterOrang } from '@/lib/store/mock-db';

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<'vendor' | 'mesin' | 'orang'>('vendor');
  const [vendors, setVendors] = useState<MasterVendor[]>([]);
  const [mesin, setMesin] = useState<MasterMesin[]>([]);
  const [orang, setOrang] = useState<MasterOrang[]>([]);

  // Inputs
  const [vendorNama, setVendorNama] = useState('');
  const [vendorPeran, setVendorPeran] = useState('');
  const [mesinTipe, setMesinTipe] = useState('');
  const [orangNama, setOrangNama] = useState('');
  const [orangJabatan, setOrangJabatan] = useState('');

  const fetchMaster = async () => {
    try {
      const res = await fetch('/api/master');
      const json = await res.json();
      if (json.success) {
        setVendors(json.data.vendors);
        setMesin(json.data.mesin);
        setOrang(json.data.orang);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMaster();
  }, []);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorNama.trim()) return;
    await fetch('/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'vendor',
        data: { nama: vendorNama.trim(), peran: vendorPeran.trim() },
      }),
    });
    setVendorNama('');
    setVendorPeran('');
    fetchMaster();
  };

  const handleAddMesin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesinTipe.trim()) return;
    await fetch('/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'mesin',
        data: { tipe: mesinTipe.trim() },
      }),
    });
    setMesinTipe('');
    fetchMaster();
  };

  const handleAddOrang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orangNama.trim()) return;
    await fetch('/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'orang',
        data: { nama: orangNama.trim(), jabatan: orangJabatan.trim() },
      }),
    });
    setOrangNama('');
    setOrangJabatan('');
    fetchMaster();
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    await fetch(`/api/master?type=${type}&id=${id}`, { method: 'DELETE' });
    fetchMaster();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Master Data
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Kelola data rujukan untuk vendor, tipe mesin ATM, dan penandatangan dokumen
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-white rounded-t-card px-4 pt-2">
        <button
          onClick={() => setActiveTab('vendor')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'vendor'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Master Vendor ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mesin')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'mesin'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Tipe Mesin ({mesin.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orang')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'orang'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Penandatangan ({orang.length})</span>
        </button>
      </div>

      {/* VENDOR */}
      {activeTab === 'vendor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddVendor} className="app-card p-5 bg-white space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-text">Tambah Vendor Baru</h3>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Nama Vendor</label>
              <input
                type="text"
                required
                value={vendorNama}
                onChange={(e) => setVendorNama(e.target.value)}
                placeholder="Contoh: PT TAG"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Peran / Bidang</label>
              <input
                type="text"
                value={vendorPeran}
                onChange={(e) => setVendorPeran(e.target.value)}
                placeholder="Contoh: Vendor Instalasi & Mover"
                className="form-input"
              />
            </div>
            <button type="submit" className="w-full btn-primary gap-1.5 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              <span>Tambah Vendor</span>
            </button>
          </form>

          <div className="lg:col-span-2 app-card overflow-hidden bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle text-text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3">Nama Vendor</th>
                  <th className="px-5 py-3">Peran / Spesialisasi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-text">{v.nama}</td>
                    <td className="px-5 py-3.5 text-xs text-text-muted">{v.peran || '-'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete('vendor', v.id)}
                        className="p-1.5 text-text-muted hover:text-status-danger-text rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MESIN */}
      {activeTab === 'mesin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddMesin} className="app-card p-5 bg-white space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-text">Tambah Tipe Mesin</h3>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Tipe / Merk Mesin</label>
              <input
                type="text"
                required
                value={mesinTipe}
                onChange={(e) => setMesinTipe(e.target.value)}
                placeholder="Contoh: Diebold 7500"
                className="form-input"
              />
            </div>
            <button type="submit" className="w-full btn-primary gap-1.5 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              <span>Tambah Tipe</span>
            </button>
          </form>

          <div className="lg:col-span-2 app-card overflow-hidden bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle text-text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3">Tipe Mesin ATM</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mesin.map((m) => (
                  <tr key={m.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-text">{m.tipe}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete('mesin', m.id)}
                        className="p-1.5 text-text-muted hover:text-status-danger-text rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORANG */}
      {activeTab === 'orang' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddOrang} className="app-card p-5 bg-white space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-text">Tambah Penandatangan</h3>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={orangNama}
                onChange={(e) => setOrangNama(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Jabatan / Peran</label>
              <input
                type="text"
                value={orangJabatan}
                onChange={(e) => setOrangJabatan(e.target.value)}
                placeholder="Contoh: Supervisor Operasional"
                className="form-input"
              />
            </div>
            <button type="submit" className="w-full btn-primary gap-1.5 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              <span>Tambah Orang</span>
            </button>
          </form>

          <div className="lg:col-span-2 app-card overflow-hidden bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle text-text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Jabatan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orang.map((o) => (
                  <tr key={o.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-text">{o.nama}</td>
                    <td className="px-5 py-3.5 text-xs text-text-muted">{o.jabatan || '-'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete('orang', o.id)}
                        className="p-1.5 text-text-muted hover:text-status-danger-text rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

