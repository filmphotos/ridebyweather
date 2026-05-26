// On-device photo storage backed by IndexedDB.
// Photos never leave the browser — blob + thumbnail live in the same record.
// Keyed by photo id, indexed by rideId for fast per-ride lookup.

const DB_NAME = "rbw_photos";
const DB_VERSION = 1;
const STORE = "photos";

export interface PhotoRecord {
  id: string;
  rideId: string;
  blob: Blob;
  thumbBlob: Blob;
  mime: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  bytes: number;
  caption?: string;
  createdAt: number;
}

export type PhotoMeta = Omit<PhotoRecord, "blob">;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("rideId", "rideId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- thumbnail generation ----------------------------------------------------

const THUMB_MAX_EDGE = 480;

async function makeThumbnail(blob: Blob): Promise<{ blob: Blob; width: number; height: number; fullWidth: number; fullHeight: number }> {
  // createImageBitmap honors EXIF orientation when imageOrientation: "from-image"
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const fullWidth = bitmap.width;
  const fullHeight = bitmap.height;
  const scale = Math.min(1, THUMB_MAX_EDGE / Math.max(fullWidth, fullHeight));
  const w = Math.max(1, Math.round(fullWidth * scale));
  const h = Math.max(1, Math.round(fullHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const thumbBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Thumbnail encode failed"))),
      "image/jpeg",
      0.8
    );
  });
  return { blob: thumbBlob, width: w, height: h, fullWidth, fullHeight };
}

// --- public API --------------------------------------------------------------

export async function addPhoto(file: File | Blob, opts: { rideId: string; caption?: string }): Promise<PhotoRecord> {
  const db = await openDb();
  const thumb = await makeThumbnail(file);
  const id = (crypto.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const record: PhotoRecord = {
    id,
    rideId: opts.rideId,
    blob: file,
    thumbBlob: thumb.blob,
    mime: file.type || "image/jpeg",
    width: thumb.fullWidth,
    height: thumb.fullHeight,
    thumbWidth: thumb.width,
    thumbHeight: thumb.height,
    bytes: file.size,
    caption: opts.caption,
    createdAt: Date.now(),
  };
  await reqToPromise(tx(db, "readwrite").add(record));
  return record;
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await openDb();
  return reqToPromise(tx(db, "readonly").get(id) as IDBRequest<PhotoRecord | undefined>);
}

export async function getPhotosForRide(rideId: string): Promise<PhotoRecord[]> {
  const db = await openDb();
  const idx = db.transaction(STORE, "readonly").objectStore(STORE).index("rideId");
  const records = await reqToPromise(idx.getAll(rideId) as IDBRequest<PhotoRecord[]>);
  records.sort((a, b) => a.createdAt - b.createdAt);
  return records;
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  await reqToPromise(tx(db, "readwrite").delete(id));
}

export async function deletePhotosForRide(rideId: string): Promise<number> {
  const db = await openDb();
  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  const idx = store.index("rideId");
  return new Promise((resolve, reject) => {
    let count = 0;
    const req = idx.openCursor(IDBKeyRange.only(rideId));
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        cur.delete();
        count++;
        cur.continue();
      } else {
        resolve(count);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function countPhotosForRide(rideId: string): Promise<number> {
  const db = await openDb();
  const idx = db.transaction(STORE, "readonly").objectStore(STORE).index("rideId");
  return reqToPromise(idx.count(rideId));
}

export async function updateCaption(id: string, caption: string): Promise<void> {
  const db = await openDb();
  const store = tx(db, "readwrite");
  const existing = await reqToPromise(store.get(id) as IDBRequest<PhotoRecord | undefined>);
  if (!existing) return;
  existing.caption = caption;
  await reqToPromise(store.put(existing));
}

// Ask the browser to mark storage as "persistent" so it won't be evicted under pressure.
// Safari may show a prompt; Chrome usually grants silently if the site is installed/bookmarked.
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  } catch {
    return null;
  }
}

// Helper: stable ride id from a saved-ride startedAt timestamp.
// Matches the convention in src/lib/ride/rideStorage.ts (`ride_${startedAt}`).
export function rideIdForStartedAt(startedAt: number): string {
  return `ride_${startedAt}`;
}
