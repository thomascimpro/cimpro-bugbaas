import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const extra = Constants.expoConfig?.extra ?? {};

export const firebaseConfig = {
  apiKey: String(extra.firebaseApiKey || ""),
  authDomain: String(extra.firebaseAuthDomain || ""),
  projectId: String(extra.firebaseProjectId || ""),
  messagingSenderId: String(extra.firebaseMessagingSenderId || ""),
  appId: String(extra.firebaseAppId || "")
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const appConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      apiKey: "demo-api-key",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo-project",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:demo"
    };

const app = getApps().length ? getApp() : initializeApp(appConfig);

function initializeFirebaseAuth() {
  const getReactNativePersistence = (
    firebaseAuth as typeof firebaseAuth & {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    }
  ).getReactNativePersistence;

  if (!getReactNativePersistence) return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = initializeFirebaseAuth();
export const db = getFirestore(app);
