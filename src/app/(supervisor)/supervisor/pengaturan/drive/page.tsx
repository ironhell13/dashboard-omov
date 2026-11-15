'use client';

import { useState } from 'react';
import { HardDrive, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, FolderGit2 } from 'lucide-react';

export default function DriveSettingsPage() {
  const [isConnected, setIsConnected] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string>('bca.omov.archive@gmail.com');

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/drive/status');
      const json = await res.json();
      if (json.success) {
        setIsConnected(true);
        if (json.accountEmail) setAccountEmail(json.accountEmail);
        setTestResult(json.message || 'Koneksi Google Drive API berhasil!');
      } else {
        setIsConnected(false);
        setTestResult(`Gagal: ${json.message}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      setTestResult(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Integrasi Google Drive
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Arsip otomatis berkas Berita Acara Word (.docx) saat laporan ditandai Final
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="app-card p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-btn bg-bg-tint text-primary flex items-center justify-center">
              <HardDrive className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">
                Status Koneksi Google Drive
              </h2>
              <p className="text-xs text-text-muted">
                OAuth 2.0 Web Application (Scope: <code>drive.file</code>)
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-status-success-text bg-[#E3F6EC] px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terhubung</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-btn bg-bg-subtle border border-border">
            <span className="text-text-muted block mb-1">Akun Google Pemilik:</span>
            <span className="font-semibold text-text text-sm">bca.omov.archive@gmail.com</span>
          </div>

          <div className="p-3.5 rounded-btn bg-bg-subtle border border-border">
            <span className="text-text-muted block mb-1">Struktur Folder Arsip:</span>
            <span className="font-semibold text-primary text-xs flex items-center gap-1">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>LAPORAN OMOV / {new Date().getFullYear()} / {new Date().toLocaleString('id-ID', { month: 'long' })} /</span>
            </span>
          </div>
        </div>

        {testResult && (
          <div className="p-3 rounded-input bg-[#E3F6EC] text-[#17714A] text-xs flex items-center gap-2 border border-green-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="btn-secondary h-10 px-4 text-xs font-semibold gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Menguji API...' : 'Uji Koneksi Drive'}</span>
          </button>
        </div>
      </div>

      {/* Setup Guide Alert per SPEC A.13 */}
      <div className="p-5 bg-bg-tint border border-[#B9D4F3] rounded-card space-y-3 text-xs text-text">
        <div className="flex items-center gap-2 font-bold text-primary text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Panduan Penting Token Refresh Google (SPEC A.13)</span>
        </div>
        <p className="leading-relaxed">
          Agar arsip otomatis tidak kedaluwarsa setelah 7 hari, pastikan status aplikasi OAuth di Google Cloud Console telah diubah dari <strong>Testing</strong> menjadi <strong>In Production</strong> dengan scope terbatas <code>https://www.googleapis.com/auth/drive.file</code>.
        </p>
      </div>
    </div>
  );
}

