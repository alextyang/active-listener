
export function isTrackSingle(trackName: string, albumName: string): boolean {
    const album = albumName.toLowerCase();
    const track = trackName.toLowerCase();

    return album.includes(track)
        || track.includes(album)
        || album.includes('single');
}

export function isSelfTitled(name: string, artistNames: string[]): boolean {
    const album = name.toLowerCase();
    const artists = artistNames.map((artist) => artist.toLowerCase().split(' ')).flat();

    return artists.some((artist) => album.includes(artist));
}



