import { 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "firebase/auth";
import type { User } from "firebase/auth"; // 👈 LA MAGIA ESTÁ AQUÍ (import type)
import { auth, IS_MOCK, MOCK_AUTH_USER, ALLOWED_EMAIL_DOMAIN_MAIL } from './config';

export const loginWithGoogleDomain = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    // La restricción de dominio principal ocurre a nivel de Identity Provider
    provider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN_MAIL });
    
    const result = await signInWithPopup(auth, provider);
    return result.user;
};

export const loginAsReader = async (): Promise<User> => {
    const result = await signInAnonymously(auth);
    return result.user;
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    // Modo desconectado: sin conexión a Firebase Auth. Inyectamos el Mock
    // Superuser para que la sesión no sea nula y el RBAC otorgue ADMIN_IT.
    if (IS_MOCK) {
        callback(MOCK_AUTH_USER);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};