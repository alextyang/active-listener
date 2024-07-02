
import { TrackContext } from "@/app/context";
import Link from "next/link";
import { useContext } from "react";


export default function GenreList({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const currentTrackDetails = useContext(TrackContext);
    const genres = currentTrackDetails?.track?.album?.genres ?? []
    genres.concat((currentTrackDetails?.artists ? currentTrackDetails?.artists[0].genres : []));

    return (
        <div className="genreList">
            {children}
            {genres?.map((genre, index) => {
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