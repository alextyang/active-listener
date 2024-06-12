
import { CurrentTrackInfoContext } from "@/app/context";
import { useContext } from "react";


export default function GenreList({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const currentTrackInfo = useContext(CurrentTrackInfoContext);
    const genres = currentTrackInfo && currentTrackInfo.album.genres.length > 0 ? currentTrackInfo?.album.genres : currentTrackInfo?.artists[0].genres;

    return (
        <div className="genreList">
            {children}
            {genres?.map((genre, index) => {
                return (
                    <div key={index} className="genreItem">
                        {toTitleCase(genre)}
                    </div>
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