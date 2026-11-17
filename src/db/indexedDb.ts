import type {
  AcademicState,
  AssessmentItem,
  ClassItem,
  FocusSessionItem,
  NoteItem,
  TaskItem,
} from '../types/academic';

const DB_NAME = 'focus_star_db';
const DB_VERSION = 1;

export type StoreName =
  | 'classes'
  | 'tasks'
  | 'notes'
  | 'assessments'
  | 'focusSessions'
  | 'appMeta';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openFocusDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('classes')) {
        const classStore = db.createObjectStore('classes', { keyPath: 'id' });
        classStore.createIndex('dayOfWeek', 'dayOfWeek', { unique: false });
      }

      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        taskStore.createIndex('completed', 'completed', { unique: false });
      }

      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('category', 'category', { unique: false });
        noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('assessments')) {
        const assessmentStore = db.createObjectStore('assessments', { keyPath: 'id' });
        assessmentStore.createIndex('date', 'date', { unique: false });
        assessmentStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains('focusSessions')) {
        const sessionStore = db.createObjectStore('focusSessions', { keyPath: 'id' });
        sessionStore.createIndex('dateKey', 'dateKey', { unique: false });
      }

      if (!db.objectStoreNames.contains('appMeta')) {
        db.createObjectStore('appMeta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function putInStore<T>(storeName: StoreName, item: T): Promise<T> {
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function bulkPutInStore<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('appMeta', 'readonly');
    const req = tx.objectStore('appMeta').get(key);
    req.onsuccess = () => resolve(req.result?.value as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta<T = unknown>(key: string, value: T): Promise<void> {
  const db = await openFocusDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('appMeta', 'readwrite');
    tx.objectStore('appMeta').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadFullAcademicState(): Promise<AcademicState> {
  const [classes, tasks, notes, assessments, focusSessions] = await Promise.all([
    getAllFromStore<ClassItem>('classes'),
    getAllFromStore<TaskItem>('tasks'),
    getAllFromStore<NoteItem>('notes'),
    getAllFromStore<AssessmentItem>('assessments'),
    getAllFromStore<FocusSessionItem>('focusSessions'),
  ]);

  return {
    classes,
    tasks,
    notes,
    assessments,
    focusSessions,
  };
}

export async function removeSampleRecords(): Promise<void> {
  const dataStores: StoreName[] = ['classes', 'tasks', 'notes', 'assessments', 'focusSessions'];
  const db = await openFocusDB();

  await Promise.all(
    dataStores.map(
      (storeName) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => {
            const items = (req.result ?? []) as Array<{ id: string; isSample?: boolean }>;
            for (const item of items) {
              if (item.isSample) {
                store.delete(item.id);
              }
            }
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })
    )
  );
}

export async function clearAllAcademicRecords(): Promise<void> {
  await Promise.all([
    clearStore('classes'),
    clearStore('tasks'),
    clearStore('notes'),
    clearStore('assessments'),
    clearStore('focusSessions'),
  ]);
}
