
import { TrackContext } from "@/app/(domain)/app/context";
import { getGenreLink, getTrackGenres } from "@/app/(domain)/spotify/metadata";
import Link from "next/link";
import { useContext } from "react";


export default function GenreList({ children, }: Readonly<{ children: React.ReactNode; }>) {
    const currentTrackDetails = useContext(TrackContext);
    const genres = getTrackGenres(currentTrackDetails);

    return (
        <div className="genreList">
            {children}
            {genres.map((genre, index) => GenreItem({ genre, index }))}
        </div>
    )
}

function GenreItem({ genre, index }: Readonly<{ genre: string, index: number }>) {
    const href = getGenreLink(genre);
    return (
        <Link key={index + 'genreItem'} className="genreItem" href={href}>
            {genre}
        </Link>
    )
}