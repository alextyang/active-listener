
import { TrackContext } from "@/app/(domain)/context";
import Link from "next/link";
import { useContext } from "react";


export default function GenreList({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const currentTrackDetails = useContext(TrackContext);
    const genres = (currentTrackDetails?.track?.album?.genres ?? []).concat(currentTrackDetails?.artists?.map((artist) => artist.genres).flat() ?? []);
    // Remove duplicates
    const uniqueGenres = Array.from(new Set(genres));

    return (
        <div className="genreList">
            {children}
            {uniqueGenres?.map((genre, index) => {
                return (
                    <Link key={index} className="genreItem" href={'spotify:search:genre:"' + genre + '"'}>
                        {toTitleCase(genre)}
                    </Link>
                )
            })}
        </div>
    )
}

function toTitleCase(str: string) {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}