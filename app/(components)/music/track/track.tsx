import { SimplifiedArtist } from "@spotify/web-api-ts-sdk";
import Link from "next/link";


export function ArtistLink({ artist, index, key }: Readonly<{ artist: SimplifiedArtist, index: number, key: string }>) {
    const itemKey = artist.uri + index + key;

    const separator = index === 0 ? '' : ', ';
    const artistHref = artist.uri;
    const artistName = artist.name;

    return (
        <>
            <p key={itemKey + 's'} className="artistName">{separator}</p>
            <Link key={itemKey + 'a'} href={artistHref} className="artistName">{artistName}</Link>
        </>
    )
}