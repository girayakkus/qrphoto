'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'nisan-fotograflari';
const PIN_STORAGE_KEY = 'organizer-pin';

export default function Page() {
  const [view, setView] = useState('upload');
  const [uploaderName, setUploaderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // {file, previewUrl}
  const [uploading, setUploading] = useState(false);

  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const fileInputRef = useRef(null);
  const qrCanvasRef = useRef(null);

  const showToast = useCallback((msg, duration = 3200) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), duration);
  }, []);

  // ---------- Upload ----------
  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  }

  function removeSelected(idx) {
    setSelectedFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].previewUrl);
      copy.splice(idx, 1);
      return copy;
    });
  }

  async function uploadOneFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', FOLDER);
    formData.append('tags', 'nisan-misafir');
    if (uploaderName.trim()) {
      const safeName = uploaderName.trim().replace(/[|=]/g, ' ');
      formData.append('context', `uploader=${safeName}`);
    }
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Yükleme başarısız');
    }
    return res.json();
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    let success = 0;
    let failed = 0;
    for (const item of selectedFiles) {
      try {
        await uploadOneFile(item.file);
        success++;
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setSelectedFiles([]);
    setUploading(false);
    if (success === 0) {
      showToast('Yükleme başarısız oldu, tekrar dener misin?');
    } else {
      let msg = `Teşekkürler! ${success} fotoğraf yüklendi 💛`;
      if (failed > 0) msg += ` (${failed} tanesi yüklenemedi)`;
      showToast(msg, 4000);
    }
  }

  // ---------- Organizer / gallery ----------
  async function loadGallery(pin) {
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/photos', { headers: { 'x-organizer-pin': pin } });
      if (res.status === 401) {
        setGalleryLoading(false);
        return false;
      }
      if (!res.ok) throw new Error('Galeri alınamadı');
      const data = await res.json();
      setGallery(data.photos || []);
      setGalleryLoading(false);
      return true;
    } catch (err) {
      console.error(err);
      setGalleryLoading(false);
      showToast('Galeri yüklenirken bir sorun oluştu.');
      return false;
    }
  }

  function handleToggleView() {
    if (view === 'gallery') {
      setView('upload');
      return;
    }
    const storedPin = typeof window !== 'undefined' ? sessionStorage.getItem(PIN_STORAGE_KEY) : null;
    if (storedPin) {
      setView('gallery');
      loadGallery(storedPin);
    } else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  }

  async function handlePinSubmit() {
    const val = pinInput.trim();
    if (!val) {
      setPinError('PIN gir.');
      return;
    }
    const ok = await loadGallery(val);
    if (ok) {
      sessionStorage.setItem(PIN_STORAGE_KEY, val);
      setShowPinModal(false);
      setView('gallery');
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN yanlış.');
    }
  }

  function currentPin() {
    return typeof window !== 'undefined' ? sessionStorage.getItem(PIN_STORAGE_KEY) : null;
  }

  function downloadUrl(url, filename) {
    const dlUrl = url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(filename)}/`);
    window.open(dlUrl, '_blank');
  }

  async function handleDownloadAll() {
    if (gallery.length === 0) return;
    showToast('ZIP hazırlanıyor, bu biraz sürebilir…', 6000);
    try {
      const zip = new JSZip();
      await Promise.all(
        gallery.map(async (p, i) => {
          const res = await fetch(p.secure_url);
          const blob = await res.blob();
          const ext = p.format || 'jpg';
          const safeName = (p.uploader || 'misafir').replace(/[^a-z0-9ığüşöçİĞÜŞÖÇ]/gi, '_');
          zip.file(`${String(i + 1).padStart(3, '0')}_${safeName}.${ext}`, blob);
        })
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nisan-fotograflari.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('ZIP indirildi.');
    } catch (err) {
      console.error(err);
      showToast('ZIP oluşturulamadı, tarayıcı bazı fotoğrafları engellemiş olabilir.');
    }
  }

  async function handleDelete(photo) {
    if (!confirm('Bu fotoğrafı silmek istediğine emin misin?')) return;
    const pin = currentPin();
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-organizer-pin': pin || '' },
        body: JSON.stringify({ public_id: photo.public_id }),
      });
      if (!res.ok) throw new Error('Silinemedi');
      setGallery((prev) => prev.filter((p) => p.public_id !== photo.public_id));
      showToast('Fotoğraf silindi.');
    } catch (err) {
      console.error(err);
      showToast('Silinemedi, tekrar dener misin?');
    }
  }

  // ---------- QR code ----------
  useEffect(() => {
    if (view === 'gallery' && qrCanvasRef.current && typeof window !== 'undefined') {
      QRCode.toCanvas(qrCanvasRef.current, window.location.origin, {
        width: 180,
        margin: 1,
        color: { dark: '#1B2036', light: '#FFFFFF' },
      }).catch(console.error);
    }
  }, [view]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.origin).then(() => showToast('Link kopyalandı.'));
  }

  // ---------- Render ----------
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="15" r="5" />
            <circle cx="16" cy="15" r="5" />
          </svg>
          Nişan Anıları
        </div>
        <button onClick={handleToggleView}>{view === 'upload' ? 'Organizatör' : '← Yükleme Sayfası'}</button>
      </div>

      {view === 'upload' ? (
        <UploadView
          uploaderName={uploaderName}
          setUploaderName={setUploaderName}
          selectedFiles={selectedFiles}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onRemove={removeSelected}
          onUpload={handleUpload}
          uploading={uploading}
        />
      ) : (
        <GalleryView
          gallery={gallery}
          loading={galleryLoading}
          qrCanvasRef={qrCanvasRef}
          onCopyLink={copyLink}
          onDownloadAll={handleDownloadAll}
          onRefresh={() => loadGallery(currentPin())}
          onDownloadOne={(p) => downloadUrl(p.secure_url, `${p.uploader || 'misafir'}-${p.public_id}.${p.format}`)}
          onDelete={handleDelete}
        />
      )}

      {showPinModal && (
        <PinModal
          value={pinInput}
          error={pinError}
          onChange={setPinInput}
          onCancel={() => setShowPinModal(false)}
          onSubmit={handlePinSubmit}
        />
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

function UploadView({ uploaderName, setUploaderName, selectedFiles, fileInputRef, onFileSelect, onRemove, onUpload, uploading }) {
  return (
    <>
      <div className="hero">
        <svg className="ring-motif" viewBox="0 0 60 30" fill="none" stroke="#C9A227" strokeWidth="1.2">
          <circle cx="21" cy="15" r="12" />
          <circle cx="39" cy="15" r="12" />
        </svg>
        <h1>Bugünün Anılarını<br />Bizimle Paylaş</h1>
        <p>Çektiğin en güzel kareleri aşağıdan yükle, biz hepsini tek yerde toplayıp saklayalım.</p>
      </div>
      <div className="card">
        <div className="field">
          <label>Adın (opsiyonel)</label>
          <input type="text" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="Örn: Ayşe" />
        </div>
        <div className="field">
          <label>Fotoğraflar</label>
          <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            <div className="dz-title">Fotoğraf seç ya da çek</div>
            <div className="dz-sub">Birden fazla fotoğraf seçebilirsin</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={onFileSelect} />
        </div>
        {selectedFiles.length > 0 && (
          <div className="preview-grid">
            {selectedFiles.map((f, i) => (
              <div className="preview-thumb" key={i}>
                <img src={f.previewUrl} alt="" />
                <button className="remove" onClick={() => onRemove(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-gold" disabled={selectedFiles.length === 0 || uploading} onClick={onUpload}>
          {uploading ? 'Yükleniyor…' : `Fotoğrafları Yükle (${selectedFiles.length})`}
        </button>
      </div>
    </>
  );
}

function GalleryView({ gallery, loading, qrCanvasRef, onCopyLink, onDownloadAll, onRefresh, onDownloadOne, onDelete }) {
  return (
    <>
      <div className="qr-box">
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>Misafir Erişim QR'ı</div>
        <canvas ref={qrCanvasRef} />
        <button className="copy-btn" onClick={onCopyLink}>Linki Kopyala</button>
      </div>
      <div className="gallery-header">
        <h2>Galeri</h2>
        <span className="count">{gallery.length} fotoğraf</span>
      </div>
      <div className="gallery-actions">
        <button className="btn btn-ink" disabled={gallery.length === 0} onClick={onDownloadAll}>Tümünü ZIP indir</button>
        <button className="btn btn-outline" onClick={onRefresh}>Yenile</button>
      </div>
      {loading && <div className="spinner" />}
      {!loading && gallery.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <path d="M21 15l-5-5-4 4-3-3-6 6" />
          </svg>
          <div>Henüz fotoğraf yüklenmedi.<br />QR kod paylaşılınca burada görünecek.</div>
        </div>
      )}
      {!loading && gallery.length > 0 && (
        <div className="polaroid-grid">
          {gallery.map((p, i) => (
            <div className="polaroid" key={p.public_id} style={{ transform: `rotate(${((i % 5) - 2) * 1.1}deg)` }}>
              <img src={p.thumb_url} alt="" loading="lazy" />
              <div className="cap">
                <span className="cap-name">{p.uploader || 'Misafir'}</span>
                <span className="cap-actions">
                  <button className="icon-btn" title="İndir" onClick={() => onDownloadOne(p)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v12M7 10l5 5 5-5" />
                      <path d="M5 20h14" />
                    </svg>
                  </button>
                  <button className="icon-btn danger" title="Sil" onClick={() => onDelete(p)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PinModal({ value, error, onChange, onCancel, onSubmit }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <h3>Organizatör Girişi</h3>
        <p>Galeriyi görüntülemek için PIN'ini gir.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={12}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          placeholder="••••"
        />
        <div className="error-text">{error}</div>
        <div className="modal-actions">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>Vazgeç</button>
          <button className="btn btn-gold" style={{ flex: 1 }} onClick={onSubmit}>Gir</button>
        </div>
      </div>
    </div>
  );
}
