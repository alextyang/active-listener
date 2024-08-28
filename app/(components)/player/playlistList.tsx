import React, { useContext } from 'react';
import { PlaylistContext, SpotifyClientContext, TrackContext } from '@/app/(domain)/app/context';
import { PlaylistCard } from '../music/playlist';
import { getTracksPlaylists } from '@/app/(domain)/spotify/library';
import { SimplifiedTrack } from '@spotify/web-api-ts-sdk';


export default function PlaylistsWithTrackList({ track }: { track?: SimplifiedTrack }) {
    const user = useContext(SpotifyClientContext).user;
    const trackContext = useContext(TrackContext);
    const playlistDicts = useContext(PlaylistContext).playlistDict;
    if (!track) track = trackContext?.track;

    const playlists = getTracksPlaylists(track?.id, playlistDicts, user);
    if (!playlists || playlists.length === 0) return <></>;

    return (
        <div className={'libraryContext'}>
            <div className={'playlistGrid'}>
                {playlists.map((playlist, index) => {
                    return <PlaylistCard key={index + 'playlistContextItem'} playlist={playlist} />;
                })}
            </div>
        </div>
    );
};