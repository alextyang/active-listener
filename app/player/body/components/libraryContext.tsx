import React, { useContext } from 'react';
import { PlaylistContext, TrackContext } from '@/app/context';
import { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk';
import Image from 'next/image';
import Link from 'next/dist/client/link';
import ScrollOverflow from '@/app/components/scrollOverflow';


export default function LibraryContext() {
    const track = useContext(TrackContext);
    const playlistDicts = useContext(PlaylistContext);

    if (!track || !track.track || !playlistDicts || !playlistDicts.playlistTrackDict) {
        return <></>;
    }

    const playlistIds = playlistDicts.playlistTrackDict[track.track.id];
    if (!playlistIds) {
        return <></>;
    }

    const playlists = playlistIds.map(id => playlistDicts.playlistIDDict?.[id] ?? undefined);

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

function PlaylistInfo({ playlist }: { playlist: SimplifiedPlaylist }) {
    return (
        <div className={'playlistInfo'}>
            <Link className='albumWrapper' href={playlist.uri}>
                <Link className="cardBackground" href={playlist.uri}></Link>
                <Image className='albumCover' src={playlist.images[0].url} alt={playlist.name} width={128} height={128} />
            </Link>
            <div className="infoStack">
                <ScrollOverflow>
                    <Link className='title' href={playlist.uri}>{playlist.name}</Link>
                </ScrollOverflow>
                <ScrollOverflow>
                    <Link className='owner' href={playlist.owner.uri}>{playlist.owner.display_name}</Link>
                </ScrollOverflow>

            </div>
        </div>
    );

}