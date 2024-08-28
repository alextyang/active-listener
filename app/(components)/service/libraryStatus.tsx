import { LIBRARY_SETTINGS } from "@/app/(domain)/app/config";
import { LibrarySyncContext, PlaylistContext } from "@/app/(domain)/app/context";
import { getLoadingMessage } from "@/app/(domain)/spotify/library";
import { useContext, useCallback, useState } from "react";


export function LibraryStatus() {
    const libraryState = useContext(LibrarySyncContext);
    const playlists = useContext(PlaylistContext);
    const [isHovering, setIsHovering] = useState(false);

    const message = isHovering ?
        LIBRARY_SETTINGS.LOADING_MESSAGES['hover'] :
        getLoadingMessage(libraryState.state, playlists.playlistDict);


    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
    }, []);

    const handleClick = useCallback(() => {
        libraryState.requestUpdate();
    }, [libraryState]);


    return (
        <div className="footerMessage" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleClick}>
            {message}
        </div>
    )
}