import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging as _getMessaging } from "firebase-admin/messaging";
import { getFirestore } from "firebase-admin/firestore";

function getFcmApp(): App {
    const existing = getApps().find(a => a.name === "horus-fcm");
    if (existing) return existing;
    const credential = process.env.FIREBASE_FCM_JSON
        ? cert(JSON.parse(process.env.FIREBASE_FCM_JSON))
        : undefined;
    return initializeApp(credential ? { credential } : {}, "horus-fcm");
}

function getFirestoreApp(): App {
    const existing = getApps().find(a => a.name === "horus-firestore");
    if (existing) return existing;
    const credential = process.env.FIREBASE_FIRESTORE_JSON
        ? cert(JSON.parse(process.env.FIREBASE_FIRESTORE_JSON))
        : undefined;
    return initializeApp(credential ? { credential } : {}, "horus-firestore");
}

export function getMessaging() {
    return _getMessaging(getFcmApp());
}

// Firestore del proyecto FCM (horus-98edf) — donde el watch escribe watchFcmToken
export function getFcmDb() {
    return getFirestore(getFcmApp());
}

// Firestore del proyecto de datos (horus-64e3b) — donde se guardan notificaciones
export function getDb() {
    return getFirestore(getFirestoreApp());
}
