import { SpotifyClientContext } from "@/app/context";
import { searchSongs } from "@/app/demo/actions";
import { Track } from "@spotify/web-api-ts-sdk";
import { useCallback, useContext, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/dist/client/link";

export default function SongSearch() {
    const value = useRef('');
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const [results, setResults] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value.trim().length < 1) return setResults([]);
        if (event.target.value === value.current) return;

        if (timeoutRef.current) return;

        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = undefined;
            value.current = event.target.value;
            search();
        }, 1000);
    }

    const handleSubmit = (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter') return;
        search();
    }

    const search = useCallback(() => {
        if (value.current.trim().length < 1) return setResults([]);

        setIsLoading(true);
        const action = searchSongs.bind(null, value.current);
        action().then((tracks) => {
            setResults(tracks);
            setIsLoading(false);
        });
    }, [value]);

    return (
        <div className={"songSearch " + (results.length > 0 ? 'songSearchSuccess' : 'songSearch')}>
            <input type="text" placeholder="Search for a song..." onChange={handleInputChange} onKeyDown={handleSubmit} />
            <div className="searchIcon">
                {isLoading ? <svg className="spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M480-71.87q-83.91 0-158.34-32.12-74.43-32.11-129.99-87.68-55.57-55.56-87.68-129.99Q71.87-396.09 71.87-480q0-84.71 32.11-158.7 32.12-73.99 87.68-129.61 55.56-55.62 129.99-87.72 74.44-32.1 158.35-32.1 19.15 0 32.33 13.17 13.17 13.18 13.17 32.33t-13.17 32.33q-13.18 13.17-32.33 13.17-131.81 0-224.47 92.66T162.87-480q0 131.8 92.66 224.47 92.66 92.66 224.47 92.66 131.8 0 224.47-92.66 92.66-92.66 92.66-224.47 0-19.15 13.17-32.33 13.18-13.17 32.33-13.17t32.33 13.17q13.17 13.18 13.17 32.33 0 83.91-32.11 158.35-32.12 74.44-87.68 130.01-55.56 55.57-129.58 87.67-74.02 32.1-158.76 32.1Z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M783.52-110.91 529.85-364.59q-29.76 23.05-68.64 36.57-38.88 13.52-83.12 13.52-111.16 0-188.33-77.17-77.17-77.18-77.17-188.33t77.17-188.33q77.17-77.17 188.33-77.17 111.15 0 188.32 77.17 77.18 77.18 77.18 188.33 0 44.48-13.52 83.12-13.53 38.64-36.57 68.16l253.91 254.15-63.89 63.66ZM378.09-405.5q72.84 0 123.67-50.83 50.83-50.82 50.83-123.67t-50.83-123.67q-50.83-50.83-123.67-50.83-72.85 0-123.68 50.83-50.82 50.82-50.82 123.67t50.82 123.67q50.83 50.83 123.68 50.83Z" /></svg>}
            </div>
            <div className="searchResults">
                {results.map((track) => {
                    return (
                        <Link className="result" key={track.id} href={'/demo/' + track.id} prefetch={false}>
                            <div className="resultImage">
                                <Image className="img" src={track.album.images[0].url} alt={track.name} fill sizes="5vw" />
                            </div>
                            <div className="infoStack">
                                <p className="title">{track.name}</p>
                                <p className="artist">{track.artists.map((artist) => artist.name).join(', ')}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}