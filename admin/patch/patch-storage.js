const DB_NAME = "sdlive-patch-smoke";
const DB_VERSION = 1;
const STORE = "projects";

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("patch_indexeddb_request_failed"));
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("patch_indexeddb_open_failed"));
  });
}

export async function loadLocalPatch(id) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, "readonly");
    return await requestAsPromise(tx.objectStore(STORE).get(id));
  } finally {
    db.close();
  }
}

export async function saveLocalPatch(project) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await requestAsPromise(tx.objectStore(STORE).put(project));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("patch_indexeddb_transaction_failed"));
      tx.onabort = () => reject(tx.error || new Error("patch_indexeddb_transaction_aborted"));
    });
    return project;
  } finally {
    db.close();
  }
}
