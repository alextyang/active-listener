
export const SLOW_REQUEST_DELAY = 1 * 100;

export const PLAYLIST_FETCH_LIMIT = 50; // 50 or below
export const MAX_USER_PLAYLISTS = 1000;

export const LOGIN_REDIRECT_URI = process.env.NODE_ENV == 'production' ? 'https://activelistener.alexya.ng/' : 'http://localhost:3000/';
export const SPOTIFY_CLIENT_ID = 'b0947280bc0540fcbc59062db29a52c0';

export const PLAYLIST_STORAGE_KEY = 'playlistDict';

// Log settings
export const DEBUG_LIBRARY_PLAYLIST_SYNC = true;