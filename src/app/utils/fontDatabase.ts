import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'margarita_fonts_db';
const STORE_NAME = 'fonts';

interface StoredFont {
  id: string;
  name: string;
  fileName: string;
  data: ArrayBuffer;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase>;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveFontToDB(file: File): Promise<string> {
  const db = await getDB();
  const id = `font-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const arrayBuffer = await file.arrayBuffer();
  
  const fontData: StoredFont = {
    id,
    name: file.name.split('.')[0],
    fileName: file.name,
    data: arrayBuffer,
    createdAt: Date.now(),
  };

  await db.put(STORE_NAME, fontData);
  return id;
}

export async function getAllFontsFromDB(): Promise<StoredFont[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deleteFontFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Registra una fuente del DB en el documento para que CSS pueda usarla
 */
export async function registerFont(font: StoredFont): Promise<string> {
  try {
    const fontFace = new FontFace(font.id, font.data);
    const loadedFace = await fontFace.load();
    (document.fonts as any).add(loadedFace);
    return font.id;
  } catch (error) {
    console.error('Error registering font:', error);
    throw error;
  }
}
