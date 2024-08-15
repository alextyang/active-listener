

// Login settings
export const CURRENT_URL = process.env.NODE_ENV == 'production' ? 'https://activelistener.alexya.ng/' : 'http://localhost:3000/';
export const SPOTIFY_CLIENT_ID = 'b0947280bc0540fcbc59062db29a52c0';

// Profile settings
export const DEFAULT_MARKET = 'US';

// Playlist settings
export const PLAYLIST_REQUEST_DELAY = 1 * 100;
export const PLAYLIST_FETCH_LIMIT = 50; // 50 or below
export const MAX_USER_PLAYLISTS = 1000;


// Now playing settings
export const TRACK_END_POLL_DELAY = 1 * 1000;
export const TRACK_AUTO_POLL_INTERVAL = 600 * 1000;

// Control settings
export const PLAY_AFTER_SEEK = true;
export const PLAY_AFTER_SKIP = true;
export const CONTROL_RESYNC_LATENCY = 500;

// Track metadata settings
export const SLOW_METADATA_REQUEST_DELAY = 1 * 1000;
export const SIBLING_ALBUM_LIMIT = 50;


// Journalism settings
export const MINIMUM_WORD_COUNT = 60;
export const ARTICLE_RELEVANCE_ORDER = ['track', 'album', 'artist'];
export const BLACKLISTED_KEYWORDS = ['watch', 'video', 'tour', 'playlist'];
export const WHITELISTED_KEYWORDS = ['review', 'interview', 'conversation', 'discussion'];

export const ARTICLE_BATCH_SIZE = 5;
export const ARTICLE_SEARCH_URL = 'https://customsearch.googleapis.com/customsearch/v1';
export const ARTIST_SEARCH_QUERY = 'interview -wikipedia';

export const WIKIPEDIA_POPULATE_URL = 'https://en.wikipedia.org/w/api.php';

export const DEFAULT_ARTICLE_GRADIENT = ['#FFF', '#CCC'];
export const ARTICLE_GRADIENT = ['LightVibrant', 'LightMuted'];

export const DEFAULT_ARTICLE_TYPE = 'article';
export const DEFAULT_ARTICLE_RELEVANCE = 'artist';

// Storage settings
export const PLAYLIST_STORAGE_KEY = 'playlistDict';

// API settings
export const INTERNAL_FETCH_SETTINGS = { cache: 'force-cache' } as RequestInit;
export const ARTICLE_SEARCH_API_ROUTE = 'article/search';
export const ARTICLE_POPULATE_API_ROUTE = 'article/populate';

// Log settings
export const DEBUG_ACCOUNT = false;
export const DEBUG_LIBRARY_PLAYLIST_SYNC = false;
export const DEBUG_NOW_PLAYING = true;
export const DEBUG_PLAYER_CONTROLS = false;
export const DEBUG_SPOTIFY_METADATA_SYNC = true;
export const DEBUG_COMPRESSION = false;
export const DEBUG_INTERNAL_API = false;
export const DEBUG_FETCH = false;
export const DEBUG_ARTICLE_SEARCH = true;
export const DEBUG_ARTICLE_POPULATE = true;
export const DEBUG_ARTICLE_FILTER = false;

// App settings
export const VERSION = 'v0.2.1';



