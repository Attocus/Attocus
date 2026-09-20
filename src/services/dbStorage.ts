import { Lecture } from '../types';

const DB_NAME = 'AttocusStudyDB';
const DB_VERSION = 1;
const STORE_LECTURES = 'lectures';
const STORE_META = 'metadata';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_LECTURES)) {
        db.createObjectStore(STORE_LECTURES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update a lecture in IndexedDB (supports large PDF page canvases and full resolution images).
 */
export async function saveLectureToDB(lecture: Lecture): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LECTURES, 'readwrite');
      const store = tx.objectStore(STORE_LECTURES);
      const req = store.put(lecture);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to save lecture:', err);
  }
}

/**
 * Get all stored lectures from IndexedDB.
 */
export async function getAllLecturesFromDB(): Promise<Lecture[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LECTURES, 'readonly');
      const store = tx.objectStore(STORE_LECTURES);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Lecture[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get lectures:', err);
    return [];
  }
}

/**
 * Delete a lecture from IndexedDB.
 */
export async function deleteLectureFromDB(lectureId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LECTURES, 'readwrite');
      const store = tx.objectStore(STORE_LECTURES);
      const req = store.delete(lectureId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to delete lecture:', err);
  }
}

/**
 * Save active session meta (e.g. active lecture ID, active screen) so refresh keeps user in place.
 */
export async function setMetaItem(key: string, value: any): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to set meta item:', err);
  }
}

export async function getMetaItem<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get meta item:', err);
    return null;
  }
}
