/**
 * 🧊 MOCK DE FIRESTORE (Zero-State / White-Label)
 *
 * En modo mock (VITE_USE_MOCK_DB === 'true') el alias de Vite en
 * 'vite.config.ts' redirige TODAS las importaciones de 'firebase/firestore'
 * hacia este módulo. De esta forma, las llamadas modulares
 * `collection(db, ...)`, `doc()`, `getDocs()`, `addDoc()`, `setDoc()`,
 * `updateDoc()`, `deleteDoc()`, `onSnapshot()`, `query()`, `writeBatch()`,
 * etc. se interceptan y resuelven exitosamente SIN tocar la API real,
 * de modo que la app no crashea al interactuar en el Zero-State.
 *
 * REGLA DE ORO: el código original de Firebase no se borra; solo se
 * desvía condicionalmente por el alias mientras dure el modo mock.
 *
 * NOTA: No se importan valores en runtime desde 'firebase/firestore'
 * (solo tipos), para evitar una dependencia circular con el alias.
 */

// ---------------------------------------------------------------------------
// Re-export de tipos (se elimina en runtime; no genera dependencia circular).
// ---------------------------------------------------------------------------
export type {
    Firestore,
    DocumentData,
    CollectionReference,
    DocumentReference,
    Query,
    QuerySnapshot,
    QueryDocumentSnapshot,
    DocumentSnapshot,
    SnapshotOptions,
    FieldValue,
    QueryConstraint,
    OrderByDirection,
    WhereFilterOp
} from 'firebase/firestore';

/* -------------------------------------------------------------------------- */
/*  Helpers internos del mock                                                 */
/* -------------------------------------------------------------------------- */

const resolveNoop = (): Promise<void> => Promise.resolve();

function makeCollectionRef(...path: string[]) {
    return { type: 'collection', path: path.join('/'), id: path[path.length - 1] ?? '' };
}

function makeDocRef(...path: string[]) {
    return { type: 'doc', path: path.join('/'), id: path[path.length - 1] ?? '' };
}

const emptySnapshot = {
    docs: [],
    empty: true,
    size: 0,
    forEach: (_fn: any) => {},
    docChanges: () => []
};

/* -------------------------------------------------------------------------- */
/*  Funciones de Firestore (interceptadas, con promesas resueltas)            */
/* -------------------------------------------------------------------------- */

export const collection = (...pathArgs: any[]): any => {
    // collection(db, 'a', 'b', ...) -> omitimos el primer argumento (la db)
    const path = pathArgs.slice(1);
    return makeCollectionRef(...path);
};

export const doc = (...pathArgs: any[]): any => {
    // doc(db, 'a', 'b', 'id') o doc(collectionRef, 'id')
    const path = pathArgs.slice(1);
    return makeDocRef(...path);
};

export const getDocs = async (): Promise<any> => emptySnapshot;

export const getDoc = async (ref?: any): Promise<any> => ({
    exists: () => false,
    data: () => undefined,
    id: (ref && ref.id) || ''
});

export const getCountFromServer = async (): Promise<any> => ({ data: () => 0 });

export const addDoc = async (ref?: any, _data?: any): Promise<any> => ({
    id: 'mock_id_' + Date.now(),
    path: (ref && ref.path) || ''
});

export const setDoc = async (): Promise<void> => resolveNoop();
export const updateDoc = async (): Promise<void> => resolveNoop();
export const deleteDoc = async (): Promise<void> => resolveNoop();

export const onSnapshot = (..._args: any[]): (() => void) => {
    // En modo mock no hay tiempo real: devolvemos una función de limpieza vacía.
    const unsubscribe = () => {};
    return unsubscribe;
};

export const query = (..._args: any[]): any => ({ type: 'query', _mock: true });
export const orderBy = (_field: any, _dir?: any): any => ({ type: 'orderBy', field: _field, dir: _dir });
export const where = (_field: any, _op?: any, _value?: any): any => ({ type: 'where', field: _field });
export const limit = (_n: any): any => ({ type: 'limit', n: _n });

export const arrayUnion = (...values: any[]): any => values;
export const arrayRemove = (...values: any[]): any => values;
export const increment = (n: number): any => n;
export const serverTimestamp = (): any => new Date();

export const writeBatch = (): any => ({
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async (): Promise<void> => resolveNoop()
});

// `getFirestore(app)` es usado por config.ts; en mock no se ejecuta, pero lo
// exportamos para que el símbolo exista y la app compile.
export const getFirestore = (): any => ({ _isMockFirestore: true });

// En modo no-mock NO se toca este módulo (sin alias), de modo que nadie
// llega aquí en producción real.