import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";
import type { User } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";

/**
 * 🧊 INTERRUPTOR DE AISLAMIENTO (Zero-State / White-Label)
 *
 * Si VITE_USE_MOCK_DB === 'true' la aplicación corre en modo DESCONECTADO:
 *  - NO se inicializa Firebase (evita el error de credenciales "dummy").
 *  - Se exportan objetos Mock tipados (casts) que imitan la API para que
 *    TypeScript no marque errores y la app arranque con datos vacíos.
 *  - `auth.currentUser` es `null` y no hay conexión a ninguna base real.
 *
 * El código original de Firebase NO se borra: solo se condiciona a
 * la rama `false` de este interruptor.
 */
export const IS_MOCK = import.meta.env.VITE_USE_MOCK_DB === 'true';

// Vite expone las variables de entorno a través de import.meta.env
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Dominio permitido para autenticación.
// Valor: VITE_ALLOWED_EMAIL_DOMAIN o el dominio por defecto (@engie.com).
// Se normaliza SIN el '@' inicial en ALLOWED_EMAIL_DOMAIN_MAIL para poder
// usarse tanto en validaciones ('.endsWith("@dominio")') como en parámetros
// de proveedores OAuth ('hd: dominio') y placeholders de UI.
// MANTÉN ESTE VALOR SINCRONIZADO con firestore.rules (regex isAuthenticated).
export const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@engie.com';
export const ALLOWED_EMAIL_DOMAIN_MAIL = ALLOWED_EMAIL_DOMAIN.replace(/^@/, '');

// ---------------------------------------------------------------------------
// MOCK SUPERUSER (modo desconectado)
// Usuario administrativo inyectado en `auth.currentUser` para que la sesión
// nunca sea nula en Zero-State. Se le concede rol ADMIN_IT y permisos totales
// saltándose la consulta a la colección `users` (ver useAuthSession).
// ---------------------------------------------------------------------------
export const MOCK_SUPERUSER_ID = 'MOCK_ADMIN_IT';
export const MOCK_SUPERUSER_EMAIL = 'superadmin@local.mock';

const mockAuthUser = {
    uid: MOCK_SUPERUSER_ID,
    email: MOCK_SUPERUSER_EMAIL,
    displayName: 'Mock Superuser',
    photoURL: null,
    isAnonymous: false,
    emailVerified: true,
    providerData: [{ providerId: 'google.com', uid: MOCK_SUPERUSER_EMAIL }]
} as unknown as User;

export const MOCK_AUTH_USER = mockAuthUser;

// ---------------------------------------------------------------------------
// MOCKS (modo desconectado). Solo se construyen cuando IS_MOCK es true.
// El objeto `db` mock NO debe pasarse a las funciones reales de
// "firebase/firestore"; por eso los componentes usan early-return.
// ---------------------------------------------------------------------------
const mockApp = {} as unknown as FirebaseApp;
const mockAuth = { currentUser: mockAuthUser } as unknown as Auth;

// `mockDb`: Proxy de Firestore. En la API modular los componentes no consumen
// `db.method()` directamente (usan `collection(db, ...)`, `getDocs(db, ...)`,
// etc., que en mock llegan desde firestore.mock.ts). Aun así, este Proxy hace
// que CUALQUIER acceso a un método de `db` devuelva un noop seguro, de modo
// que la app jamás crashea si algún código invocara `db.xxx()`.
const mockFirestoreMethods: Record<string, (...args: any[]) => any> = {
    collection: (...p: any[]) => ({ type: 'collection', path: p.join('/'), id: p[p.length - 1] ?? '' }),
    doc: (...p: any[]) => ({ type: 'doc', path: p.join('/'), id: p[p.length - 1] ?? '' }),
    batch: () => ({
        set: () => {}, update: () => {}, delete: () => {},
        commit: async (): Promise<void> => {}
    }),
    runTransaction: async () => {},
    enableNetwork: async () => {},
    disableNetwork: async () => {},
    terminate: async () => {}
};

const mockDb = new Proxy({ _isMockFirestore: true }, {
    get(target, prop: string | symbol, _receiver) {
        if (prop === '_isMockFirestore') return true;
        if (typeof prop === 'string' && mockFirestoreMethods[prop]) {
            return mockFirestoreMethods[prop];
        }
        // Método no reconocido: noop genérico para no romper el flujo.
        return (..._args: any[]) => ({} as any);
    }
}) as unknown as Firestore;

export const app: FirebaseApp = IS_MOCK ? mockApp : initializeApp(firebaseConfig);
export const auth: Auth = IS_MOCK ? mockAuth : getAuth(app);
export const db: Firestore = IS_MOCK ? mockDb : getFirestore(app);
// appId = projectId de Firebase. Define el path raíz en Firestore:
//   artifacts/{appId}/public/data/...
// Debe coincidir con el {appId} de firestore.rules y con la ruta de los docs.
export const appId = (firebaseConfig.projectId || 'engie-76fb0') as string;

/**
 * 🛡️ CONTEXTO DE RED SEGURO (ipQuery API)
 * Extrae IP, país y región en segundo plano de forma 100% gratuita,
 * sin necesidad de tokens ni variables sensibles expuestas en Vite.
 */
export async function getNetworkContext() {
  // Modo desconectado: sin llamadas externas (no se toca api.ipquery.io)
  if (IS_MOCK) {
    return { ip: "127.0.0.1", country: "Local/Zero-State", region: "Local" };
  }

  try {
    const res = await fetch('https://api.ipquery.io/?format=json');
    
    if (!res.ok) {
      throw new Error("Error en servicio de IP");
    }

    const data = await res.json();
    
    return {
      ip: data.ip || "0.0.0.0",
      country: data.location?.country || data.country || "Desconocido",
      region: data.location?.state || data.region || "Desconocida"
    };
  } catch (e) {
    // Fallback de contingencia en caso de bloqueos locales o adblockers
    return { ip: "127.0.0.1", country: "Local/Proxy", region: "Local" };
  }
}