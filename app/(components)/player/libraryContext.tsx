import React, { useContext } from 'react';
import { PlaylistContext, TrackContext } from '@/app/(domain)/app/context';
import { PlaylistInfo } from '../music/playlist';


export default function LibraryContext() {
    const track = useContext(TrackContext);
    const playlistDicts = useContext(PlaylistContext).playlistDict;

    if (!track || !track.track || !playlistDicts || !playlistDicts.tracks)
        return <></>;

    const playlistIds = playlistDicts.tracks[track.track.id];
    if (!playlistIds)
        return <></>;

    const playlists = playlistIds.map(id => playlistDicts.playlists?.[id] ?? undefined);

    return (
        <div className={'libraryContext '}>
            <div className={'playlistGrid'}>
                {playlists.map((playlist, index) => {
                    if (!playlist) {
                        return <></>;
                    }
                    return <PlaylistInfo key={index} playlist={playlist} />;
                })}
            </div>
        </div>
    );
};