
import { CurrentTrackInfoContext, SpotifyClientContext } from "@/app/context";
import { useEffect, useContext, useState } from "react";


export default function ControlIcons() {
    const currentTrackInfo = useContext(CurrentTrackInfoContext);
    const client = useContext(SpotifyClientContext);
    const [isInLibrary, setIsInLibrary] = useState(false);

    useEffect(() => {
        if (currentTrackInfo)
            // Check if track is in library
            client?.currentUser.tracks.hasSavedTracks([currentTrackInfo.track.id]).then((result) => {
                setIsInLibrary(result[0]);
            });
    }, [currentTrackInfo, client]);


    return (
        <div className="controlIcons">
            {isInLibrary ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#777777"><path d="M450-290h60v-160h160v-60H510v-160h-60v160H290v60h160v160Zm30.07 190q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Zm-.07-60q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#1DB954"><path d="m423.23-309.85 268.92-268.92L650-620.92 423.23-394.15l-114-114L267.08-466l156.15 156.15ZM480.07-100q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Z" /></svg>
            )}
        </div>
    )
}