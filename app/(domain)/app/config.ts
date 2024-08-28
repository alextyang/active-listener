import { CompleteTrack } from "./types";


// Login settings
export const CURRENT_URL = process.env.NODE_ENV == 'production' ? 'https://activelistener.alexya.ng/' : 'http://localhost:3000/';
export const SPOTIFY_CLIENT_ID = 'b0947280bc0540fcbc59062db29a52c0';

// Profile settings
export const DEFAULT_MARKET = 'US';
export const PROFILE_IMAGE_SIZES = '10vw';

// Playlist settings
export const PLAYLIST_REQUEST_DELAY = 1 * 100;
export const PLAYLIST_FETCH_LIMIT = 50; // 50 or below
export const MAX_USER_PLAYLISTS = 1000;
export const PLAYLIST_SYNC_INTERVAL = 15 * 60 * 1000;

export const PLAYLIST_COVER_QUALITY = 128;

// Library settings
export const LIBRARY_SETTINGS = {
    LOADING_MESSAGES: {
        'hover': 'Click to refresh library.',
        'waiting': 'No library loaded.',
        'done': 'Library loaded.',
        'library': 'Syncing library...',
        'playlists': 'Syncing playlists... '
    },
}

// Now playing settings
export const TRACK_END_POLL_DELAY = 1 * 1000;
export const TRACK_AUTO_POLL_INTERVAL = 10 * 60 * 1000;
export const TIMESTAMP_ERROR_MARGIN = 5 * 100;

export const TRACK_GRADIENT_ANGLE = 64;
export const DEFAULT_TRACK_GRADIENT = 'linear-gradient(' + TRACK_GRADIENT_ANGLE + 'deg, #333, #333)';
export const NP_ALBUM_SIZES = '12vw';


// Control settings
export const PLAY_AFTER_SEEK = true;
export const PLAY_AFTER_SKIP = true;
export const CONTROL_DISABLED_TIMEOUT = 100;
export const CONTROL_RESYNC_LATENCY = 1000;
export const PROGRESS_INTERVAL = 1000;
export const REFRESH_ICON_ANIMATION_INTERVAL = 1000;

// Track metadata settings
export const SLOW_METADATA_REQUEST_DELAY = 1 * 1000;
export const SIBLING_ALBUM_LIMIT = 50;


// Queue settings
export const QUEUE_OVERLAY_DEFAULT_SIZE = 200;
export const QUEUE_SYNC_INTERVAL = 30 * 1000;
export const QUEUE_CACHE_DELAY = 5 * 1000;
export const QUEUE_CACHE_NUMBER = 5;

// Journalism settings
export const MINIMUM_WORD_COUNT = 60;
export const ARTICLE_RELEVANCE_ORDER = ['track', 'album', 'artist'];
export const BLACKLISTED_KEYWORDS = ['watch', 'video', 'tour', 'playlist'];
export const WHITELISTED_KEYWORDS = ['review', 'interview', 'conversation', 'discussion'];

export const DEFAULT_ARTICLE_TYPE = 'article';
export const DEFAULT_ARTICLE_RELEVANCE = 'artist';
export const ARTICLE_RELEVANCE_TOKENS: { [key: string]: string } = { 'track': '✧', 'album': '⊚', 'artist': '✲' };
export const DEFAULT_ARTICLE_RELEVANCE_TOKEN = ARTICLE_RELEVANCE_TOKENS[DEFAULT_ARTICLE_RELEVANCE];

export const ARTICLE_BATCH_SIZE = 5;
export const ARTICLE_SEARCH_URL = 'https://customsearch.googleapis.com/customsearch/v1';
export const ARTIST_SEARCH_QUERY = 'interview -wikipedia';

export const WIKIPEDIA_POPULATE_URL = 'https://en.wikipedia.org/w/api.php';

export const ARTICLE_GRADIENT = ['LightVibrant', 'LightMuted'];
export const DEFAULT_ARTICLE_BG = 'rgba(0, 0, 0, 0.4)';
export const ARTICLE_BG_OPACITY = 0.3;
export const ARTICLE_BG_DARKEN = 100;
export const ARTICLE_BG_GRADIENT_OFFSET = 60;
export const DEFAULT_ARTICLE_FG = 'rgba(0, 0, 0, 0.9)';
export const ARTICLE_FG_OPACITY = 0.7;
export const ARTICLE_FG_LIGHTEN = 100;
export const ARTICLE_FG_GRADIENT_OFFSET = 60;

export const ARTICLE_IMAGE_SIZES = '30vw';

export const FAVICON_API_QUERY = '&sz=256';
export const FAVICON_API_ROUTE = 'https://s2.googleusercontent.com/s2/favicons?domain=';


//Clue settings
export const CLUE_TYPE_TRACK = 'spotify-track';
export const CLUE_TYPE_ARTIST = 'spotify-artist';
export const CLUE_TYPE_ALBUM = 'spotify-album';
export const CLUE_TYPE_ARTICLE = 'article';

//Summary settings
export const SUMMARY_MAX_TOKENS_IN = 6400;
export const SUMMARY_MAX_TOKENS_OUT = 3200;
export const SUMMARY_MODEL = 'gpt-4o-mini';

export const SUMMARY_OVERLAY_OPACITY = 0.6;
export const SUMMARY_IMAGE_SIZES = '80vw';
export const SUMMARY_DEFAULT_COLOR = 'rgba(51, 51, 51, 0.6)';

// Storage settings
export const PLAYLIST_STORAGE_KEY = 'playlistDict';

// Cache settings
export const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
export const CACHE_METADATA_KEY = 'metadata';
export const CACHE_ARTICLES_KEY = 'articles';
export const CACHE_SUMMARY_KEY = 'summary';
export const CACHE_REQUIRED_KEYS = ['timestamp', CACHE_METADATA_KEY, CACHE_ARTICLES_KEY, CACHE_SUMMARY_KEY] as (keyof CompleteTrack)[];

// API settings
export const INTERNAL_FETCH_SETTINGS = { cache: 'force-cache' } as RequestInit;
export const ARTICLE_SEARCH_API_ROUTE = 'article/search';
export const ARTICLE_POPULATE_API_ROUTE = 'article/populate';
export const SUMMARY_API_ROUTE = 'summarize';
export const CACHE_LOAD_API_ROUTE = 'cache/track/load';
export const CACHE_SAVE_API_ROUTE = 'cache/track/save';

// Log settings
export const LOG_PRIORITY = true;
export const DEBUG_ACCOUNT = false;
export const DEBUG_LIBRARY_PLAYLIST_SYNC = false;
export const DEBUG_NOW_PLAYING = false;
export const DEBUG_PLAYER_CONTROLS = false;
export const DEBUG_SPOTIFY_METADATA_SYNC = false;
export const DEBUG_COMPRESSION = false;
export const DEBUG_INTERNAL_API = false;
export const DEBUG_FETCH = false;
export const DEBUG_ARTICLE_SEARCH = false;
export const DEBUG_ARTICLE_POPULATE = false;
export const DEBUG_ARTICLE_FILTER = false;
export const DEBUG_SUMMARY_STREAM = false;
export const DEBUG_SUMMARY_PARSE = false;
export const DEBUG_CLUES = false;
export const DEBUG_QUEUE = false;
export const DEBUG_CACHE = false;
export const DEBUG_QUEUE_CACHE = false;

// App settings
export const VERSION = 'v0.2.3';



export const SUMMARY_PROMPT = `
You will be given unformatted articles about a provided song, its artist, and its album. Summarize the articles as they explain the specifics of the song's background, musicology, and reception. If they don't contain any relevant information, discuss the artist only.
\n\nFormat your answer into paragraphs describing: concept, musicality, and reviews. Reference the articles' site name when relevant. Use a neutral, concise tone.
\n\nDo not discuss the music video at all. Only describe takeaways that are directly relevant to the song. If there aren't any reviews or takeaways, don't make up any. Mention other popular songs by the artist if they are relevant to the discussion.
\n\nExample:
\n"Easy" by Troye Sivan, from his fifth EP "In a Dream" released in 2020, revolves around the theme of attempting to salvage a failing relationship. The song's lyrics express Sivan's plea for his partner to stay, reminiscing about how being in love used to feel effortless. It is speculated that the track draws inspiration from Sivan's own breakup with his former partner.
\n\nThe track is characterized by its mellow and contemplative vibe, featuring '80s-twinged production and Sivan's signature laid-back delivery. The song incorporates elements such as drums, autotune, and a flute-like synth solo. Sivan's vocals, coupled with the nostalgic sound of the production, create an intimate atmosphere.
\n\nJustin Curto of "Vulture" praised "Easy" for its relaxed and introspective nature, contrasting it with some of Sivan's previous works. He highlighted the track as a departure from Sivan's earlier style, noting its use of autotune and subdued instrumentation. Stephen Daw of "Billboard" commended the song's '80s-inspired production, Sivan's emotive delivery, and the relatable portrayal of a deteriorating relationship.`;