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
    'p', 'tv', 'stories', 'results', 'pin', 'groups', 'pages',
    'marketplace', 'intent', 'discover', 'directory',
]);

// Segmentos que son scripts de plataforma (facebook.com/profile.php, photo.php):
// nunca son un handle, aunque no figuren en la lista de rutas.
const SCRIPT_SEGMENT = /\.(php|aspx?|html?|jsp|cgi|do)$/i;

// Prefijos estructurales por plataforma: el handle real es el segmento SIGUIENTE
// (youtube.com/c/Canal, linkedin.com/in/usuario, reddit.com/r/mexico). Se declaran
// por host para no afectar a plataformas donde esa misma palabra sí es el usuario.
const USER_PATH_PREFIXES: Record<string, Set<string>> = {
    'youtube.com': new Set(['c', 'user']),
    'linkedin.com': new Set(['in', 'company', 'school']),
    'reddit.com': new Set(['u', 'user', 'r']),
};

// El handle ya puede venir con arroba en la propia URL (youtube.com/@canal),
// por lo que se quitan las arrobas iniciales antes de volver a prefijarlas
// para no generar etiquetas duplicadas del tipo `@@canal`.
const safeDecode = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const stripAt = (segment: string): string => safeDecode(segment).replace(/^@+/, '').trim();

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
    let segments: string[];
    try {
        const u = new URL(raw);
        hostname = bareHost(u.hostname);
        segments = u.pathname.split('/').map(stripAt).filter(Boolean);
    } catch {
        return raw;
    }

    if (SOCIAL_HOSTS.has(hostname)) {
        const first = segments[0] || '';
        const prefixes = USER_PATH_PREFIXES[hostname];
        const handle = prefixes?.has(first.toLowerCase()) ? segments[1] || '' : first;
        if (handle && !NON_USER_PATH.has(handle.toLowerCase()) && !SCRIPT_SEGMENT.test(handle)) {
            return `@${handle}`;
        }
    }

    return hostname || raw;
};