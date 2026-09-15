// ── Utilidades para el campo "Usuario o Sitio Web" de menciones ─────────────
// El formulario guarda la URL cruda (p. ej. https://twitter.com/usuario).
// En tarjetas y reportes mostramos SOLO una etiqueta corta (@usuario o el
// dominio) y la URL completa se conserva como destino del enlace.

const SOCIAL_HOSTS = new Set([
    'facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com',
    'youtube.com', 'twitter.com', 'x.com', 'whatsapp.com', 'wa.me',
    't.me', 'telegram.me', 'snapchat.com', 'pinterest.com', 'reddit.com',
    'twitch.tv', 'medium.com', 'threads.net',
]);

// Primer segmento de ruta que NO representa un usuario en redes sociales.
const NON_USER_PATH = new Set([
    'watch', 'shorts', 'reels', 'reel', 'posts', 'post', 'status', 'i',
    'channel', 'user', 'live', 'video', 'videos', 'events', 'share',
    'hashtag', 'search', 'feed', 'home', 'tab', 'project', 'explore',
]);

export const isUrl = (value: string): boolean => {
    const raw = String(value ?? '').trim();
    if (!raw) return false;
    try {
        const u = new URL(raw);
        return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'ftp:';
    } catch {
        return false;
    }
};

const bareHost = (hostname: string): string => hostname.toLowerCase().replace(/^www\./, '');

// URL completa válida → la devuelve tal cual; si no es URL → null.
export const extractFuenteUrl = (value: string): string | null => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    return isUrl(raw) ? raw : null;
};

// Etiqueta corta: `@usuario` para redes, dominio (sin www) para sitios web,
// y el texto original si no es una URL.
export const extractFuenteLabel = (value: string): string => {
    const raw = String(value ?? '').trim();
    if (!raw || !isUrl(raw)) return raw;

    let hostname: string;
    let firstPath: string;
    try {
        const u = new URL(raw);
        hostname = bareHost(u.hostname);
        firstPath = u.pathname.replace(/^\/+/, '').split('/')[0] || '';
    } catch {
        return raw;
    }

    if (SOCIAL_HOSTS.has(hostname) && firstPath && !NON_USER_PATH.has(firstPath.toLowerCase())) {
        return `@${firstPath}`;
    }

    return hostname || raw;
};