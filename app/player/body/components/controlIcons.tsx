
import { TrackContext, SpotifyClientContext, ActionContext } from "@/app/context";
import { useEffect, useContext, useState, use, useRef, useCallback } from "react";


export default function ControlIcons() {





    return (
        <div className="controlIcons">
            <RefreshIcon />
            <LibraryIcon />
        </div>
    )
}

function RefreshIcon() {
    const actions = useContext(ActionContext);
    const client = useContext(SpotifyClientContext)?.api;
    const [isRotating, setIsRotating] = useState(actions.isUpdating);
    const rotationTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

    const handleRefreshClick = useCallback(() => {
        if (isRotating) return;
        actions?.setShouldUpdate(true);
        setIsRotating(true);
    }, [actions, isRotating]);

    useEffect(() => {
        if (actions.isUpdating)
            setIsRotating(true);

        const tryResolveRefresh = () => {
            if (rotationTimeout.current)
                clearTimeout(rotationTimeout.current);
            rotationTimeout.current = setTimeout(() => {
                if (actions?.isUpdating) tryResolveRefresh();
                else setIsRotating(false);
            }, 500);
        };

        tryResolveRefresh();
    }, [actions.isUpdating, isRotating]);

    if (!client) return <></>;
    return (
        <div className={"refreshIcon " + (isRotating ? 'refreshIconRotating' : '')} onClick={handleRefreshClick} title="Refresh">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" ><path d="M160-160v-80h110l-16-14q-49-49-71.5-106.5T160-478q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z" /></svg>
        </div>
    );
}

function LibraryIcon() {
    const currentTrackInfo = useContext(TrackContext);
    const client = useContext(SpotifyClientContext)?.api;

    const [isInLibrary, setIsInLibrary] = useState(false);

    useEffect(() => {
        setIsInLibrary(false);
        if (!currentTrackInfo?.track) return;

        // Check if track is in library
        client?.currentUser.tracks.hasSavedTracks([currentTrackInfo.track.id]).then((result) => {
            setIsInLibrary(result[0]);
            console.log('[LIBRARY] Track is in library: ' + result[0]);
        });
    }, [currentTrackInfo?.track, client?.currentUser]);

    if (!client) return <></>;

    return (
        <div className="libraryIcon" title={isInLibrary ? 'In Your Library' : 'Not In Your Library'}>
            {isInLibrary ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#1DB954"><path d="m423.23-309.85 268.92-268.92L650-620.92 423.23-394.15l-114-114L267.08-466l156.15 156.15ZM480.07-100q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#777777"><path d="M450-290h60v-160h160v-60H510v-160h-60v160H290v60h160v160Zm30.07 190q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Zm-.07-60q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg>

            )}
        </div>
    );

}