

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

//Clue settings
export const CLUE_TYPE_TRACK = 'spotify-track';
export const CLUE_TYPE_ARTIST = 'spotify-artist';
export const CLUE_TYPE_ALBUM = 'spotify-album';
export const CLUE_TYPE_ARTICLE = 'article';

//Summary settings
export const SUMMARY_MAX_TOKENS_IN = 6400;
export const SUMMARY_MAX_TOKENS_OUT = 3200;
export const SUMMARY_MODEL = 'gpt-4o-mini';

// Storage settings
export const PLAYLIST_STORAGE_KEY = 'playlistDict';

// API settings
export const INTERNAL_FETCH_SETTINGS = { cache: 'force-cache' } as RequestInit;
export const ARTICLE_SEARCH_API_ROUTE = 'article/search';
export const ARTICLE_POPULATE_API_ROUTE = 'article/populate';
export const SUMMARY_API_ROUTE = 'summarize';

// Log settings
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
export const DEBUG_CLUES = true;

// App settings
export const VERSION = 'v0.2.1';



export const SUMMARY_PROMPT = `
You will be given unformatted articles about a provided song, its artist, and its album. Summarize the articles as they explain the specifics of the song's background, musicology, and reception. If they don't contain any relevant information, discuss the artist only.
\n\nFormat your answer into paragraphs describing: concept, musicality, and reviews. Reference the articles' site name when relevant. Use a neutral, concise tone.
\n\nDo not discuss the music video at all. Only describe takeaways that are directly relevant to the song. If there aren't any reviews or takeaways, don't make up any. Mention other popular songs by the artist if they are relevant to the discussion.
\n\nExample:
\n"Easy" by Troye Sivan, from his fifth EP "In a Dream" released in 2020, revolves around the theme of attempting to salvage a failing relationship. The song's lyrics express Sivan's plea for his partner to stay, reminiscing about how being in love used to feel effortless. It is speculated that the track draws inspiration from Sivan's own breakup with his former partner.
\n\nThe track is characterized by its mellow and contemplative vibe, featuring '80s-twinged production and Sivan's signature laid-back delivery. The song incorporates elements such as drums, autotune, and a flute-like synth solo. Sivan's vocals, coupled with the nostalgic sound of the production, create an intimate atmosphere.
\n\nJustin Curto of "Vulture" praised "Easy" for its relaxed and introspective nature, contrasting it with some of Sivan's previous works. He highlighted the track as a departure from Sivan's earlier style, noting its use of autotune and subdued instrumentation. Stephen Daw of "Billboard" commended the song's '80s-inspired production, Sivan's emotive delivery, and the relatable portrayal of a deteriorating relationship.`;