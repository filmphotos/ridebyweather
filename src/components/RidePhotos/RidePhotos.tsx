"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addPhoto,
  deletePhoto,
  getPhotosForRide,
  requestPersistence,
  type PhotoRecord,
} from "@/lib/photos/photoStore";

interface Props {
  rideId: string;
  // Compact mode hides the empty-state CTA and renders a tighter grid (for inline use in modals).
  compact?: boolean;
}

export default function RidePhotos({ rideId, compact = false }: Props) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build blob: URLs for thumbs and originals, and revoke them on change/unmount.
  const urls = useMemo(() => {
    return photos.map((p) => ({
      id: p.id,
      thumb: URL.createObjectURL(p.thumbBlob),
      full: URL.createObjectURL(p.blob),
    }));
  }, [photos]);

  useEffect(() => {
    return () => {
      urls.forEach((u) => {
        URL.revokeObjectURL(u.thumb);
        URL.revokeObjectURL(u.full);
      });
    };
  }, [urls]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPhotosForRide(rideId);
      setPhotos(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        // Best-effort: bump to persistent storage the first time the user adds a photo.
        await requestPersistence();
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          await addPhoto(file, { rideId });
        }
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save photo");
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [rideId, reload]
  );

  const onDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this photo?")) return;
      await deletePhoto(id);
      setLightboxIdx(null);
      await reload();
    },
    [reload]
  );

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i == null || i <= 0 ? i : i - 1));
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i == null || i >= photos.length - 1 ? i : i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, photos.length]);

  return (
    <div className={compact ? "" : "space-y-3"}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Photos
            {photos.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-500">{photos.length}</span>
            )}
          </h3>
          <AddButton onClick={() => fileInputRef.current?.click()} busy={busy} />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-gray-500">Loading photos…</div>
      ) : photos.length === 0 ? (
        compact ? null : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-gray-800 hover:border-sky-500/40 bg-gray-900/30 py-8 text-center text-sm text-gray-500 transition-colors"
          >
            <div className="text-2xl mb-1">📷</div>
            <div>Tap to add a photo from this ride</div>
            <div className="mt-1 text-[10px] text-gray-600">Stored on this device only</div>
          </button>
        )
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((u, i) => {
            const p = photos[i];
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
                aria-label={`Open photo from ${new Date(p.createdAt).toLocaleString()}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.thumb}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            );
          })}
          {compact && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-800 text-gray-500 hover:border-sky-500/40 hover:text-sky-400 transition-colors flex flex-col items-center justify-center text-xs"
            >
              <span className="text-xl">＋</span>
              <span>{busy ? "Saving…" : "Add"}</span>
            </button>
          )}
        </div>
      )}

      {lightboxIdx != null && photos[lightboxIdx] && (
        <Lightbox
          photo={photos[lightboxIdx]}
          fullUrl={urls[lightboxIdx].full}
          hasPrev={lightboxIdx > 0}
          hasNext={lightboxIdx < photos.length - 1}
          onPrev={() => setLightboxIdx((i) => (i == null ? null : Math.max(0, i - 1)))}
          onNext={() => setLightboxIdx((i) => (i == null ? null : Math.min(photos.length - 1, i + 1)))}
          onClose={() => setLightboxIdx(null)}
          onDelete={() => onDelete(photos[lightboxIdx].id)}
        />
      )}
    </div>
  );
}

function AddButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 disabled:opacity-50 inline-flex items-center gap-1.5"
    >
      <span>📷</span>
      <span>{busy ? "Saving…" : "Add photo"}</span>
    </button>
  );
}

function Lightbox({
  photo,
  fullUrl,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onDelete,
}: {
  photo: PhotoRecord;
  fullUrl: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 p-3"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div>{new Date(photo.createdAt).toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">
            {photo.width}×{photo.height} · {formatBytes(photo.bytes)}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white px-2 py-1"
          >
            Close
          </button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 text-white w-10 h-10 flex items-center justify-center"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fullUrl}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/80 text-white w-10 h-10 flex items-center justify-center"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
