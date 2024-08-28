import { CACHE_ARTICLES_KEY, CACHE_LOAD_API_ROUTE, CACHE_REQUIRED_KEYS, CACHE_SAVE_API_ROUTE, DEBUG_CACHE as LOG } from "../app/config";
import { CompleteTrack } from "../app/types";
import { hasSessionKey, loadSessionItem, saveSessionItem } from "../browser/sessionStorage";
import { fetchInternalResource } from "../utilities/fetch";



export async function loadTrackProperty<T>(id: string, property: string): Promise<T | undefined> {
    if (!CACHE_REQUIRED_KEYS.includes(property as keyof CompleteTrack)) {
        if (LOG) console.error('[CACHE] Invalid property name: ' + property);
        return;
    }

    if (LOG) console.log('[CACHE] Loading property ' + property + ' from track ' + id);

    const track = await loadTrack(id);
    if (!track) return undefined;

    return Object.getOwnPropertyDescriptor(track, property)?.value as T ?? undefined;
}

export async function savePropertyToTrack<T>(id: string, property: string, value: T) {
    if (!CACHE_REQUIRED_KEYS.includes(property as keyof CompleteTrack)) {
        if (LOG) console.error('[CACHE] Invalid property name: ' + property);
        return;
    }

    if (LOG) console.log('[CACHE] Saving property ' + property + ' to track ' + id + ':', value);

    let track = loadTrackLocally(id);
    if (!track) {
        if (LOG) console.log('[CACHE] Creating new track object for ' + id);
        track = { timestamp: Date.now() };
    }

    Object.defineProperty(track, property, { value });
    track.timestamp = Date.now();

    saveTrackLocally(id, track);

    if (isCompleteTrack(track)) saveTrackRemotely(track);
}

async function loadTrack(id: string): Promise<CompleteTrack | undefined> {
    if (!isTrackCachedLocally(id)) {
        if (LOG) console.log('[CACHE] Track ' + id + ' not locally cached.');
        return await loadTrackRemotely(id);
    }

    return loadTrackLocally(id);
}


export function isCompleteTrackCachedLocally(id: string): boolean {
    if (!isTrackCachedLocally(id)) return false;
    const track = loadTrackLocally(id);
    return isCompleteTrack(track);
}


function isTrackCachedLocally(id: string): boolean {
    if (!hasSessionKey(id + 'timestamp')) return false;

    const value = loadSessionItem<number>(id + 'timestamp');

    return value ? true : false;
}

function saveTrackLocally(id: string, track: CompleteTrack) {
    if (LOG) console.log('[CACHE] Saved track ' + id + ' to local cache:', track);

    CACHE_REQUIRED_KEYS.forEach((requiredKey) => {
        const result = track[requiredKey] ?? undefined;

        if (result !== undefined)
            saveSessionItem(id + requiredKey, result);
    });
}

function loadTrackLocally(id: string) {
    const workingTrack: CompleteTrack = {};

    CACHE_REQUIRED_KEYS.forEach((requiredKey) => {
        const result = loadSessionItem<any>(id + requiredKey);

        if (result !== undefined)
            workingTrack[requiredKey] = result;
    });

    try {
        const track = workingTrack as CompleteTrack;
        if (LOG) console.log('[CACHE] Loaded track ' + id + ' from local cache:', track);
        return track;
    } catch (error) {
        if (LOG) console.error('[CACHE] Error loading track ' + id + ' from local cache:', error);
        return undefined
    }
}


async function saveTrackRemotely(track: CompleteTrack) {
    if (LOG) console.log('[CACHE] Saving track ' + track.metadata?.track?.id + ' to remote cache:', JSON.stringify(track));
    fetchInternalResource<string>(CACHE_SAVE_API_ROUTE, track);
}

async function loadTrackRemotely(id: string) {
    const response = await fetchInternalResource<CompleteTrack>(CACHE_LOAD_API_ROUTE, id);
    if (LOG) console.log('[CACHE] Loaded track ' + id + ' from remote cache:', response);

    if (response)
        saveTrackLocally(id, response);
    else
        saveTrackLocally(id, { timestamp: Date.now() });

    return response;
}



export function isCompleteTrack(value?: CompleteTrack): boolean {
    if (!value) return false;

    let isComplete = true;

    CACHE_REQUIRED_KEYS.forEach((requiredKey) => {
        const result = value[requiredKey] ?? undefined;

        if (result === undefined) isComplete = false;
    });


    return isComplete;
}

