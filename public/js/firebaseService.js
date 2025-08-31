// firebaseService.js
import {
  getAuth,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
  authDomain: "qrscan2-99ffd.firebaseapp.com",
  projectId: "qrscan2-99ffd",
  storageBucket: "qrscan2-99ffd.firebasestorage.app",
  messagingSenderId: "1089215781575",
  appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
  measurementId: "G-QZZWT3HW0W",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Firestore ---
export async function getUserDoc(adminId, userId) {
  const ref = doc(db, `admin_collections/${adminId}/users/${userId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveUidToUserDoc(adminId, userId, uid) {
  const ref = doc(db, `admin_collections/${adminId}/users/${userId}`);
  await setDoc(ref, { uid }, { merge: true });
}

// --- Auth ---
export async function loginWithCustomToken(customToken) {
  await signInWithCustomToken(auth, customToken);

  // currentUser が確実に取得できるまで待つ
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (auth.currentUser) return resolve(auth.currentUser);
      if (Date.now() - start > 3000) return reject(new Error("Auth timeout"));
      setTimeout(check, 100);
    })();
  });
}

export {
  auth,
  db,
  getAuth,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  signInWithCustomToken,
};
