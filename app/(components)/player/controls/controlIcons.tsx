
import { REFRESH_ICON_ANIMATION_INTERVAL } from "@/app/(domain)/app/config";
import { TrackContext, SpotifyClientContext, ActionContext, PlaybackSyncContext, PlaylistContext } from "@/app/(domain)/app/context";
import { getTracksPlaylists } from "@/app/(domain)/spotify/library";
import { useEffect, useContext, useState, use, useRef, useCallback } from "react";
import { AddToLibraryIcon, RefreshIcon, SavedToLibraryIcon } from "../../icons";


export default function ControlIcons() {
    return (
        <div className="controlIcons">
            <RefreshControlIcon />
            <LibraryControlIcon />
        </div>
    )
}

function RefreshControlIcon() {
    const actions = useContext(ActionContext);
    const playbackSyncState = useContext(PlaybackSyncContext);
    const client = useContext(SpotifyClientContext)?.api;

    const [isDisabled, setIsDisabled] = useState(playbackSyncState.state.state === 'playback');
    const [rotationAngle, setRotationAngle] = useState(isDisabled ? -360 : 0);

    // Sync icon rotation
    const rotationTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
    useEffect(() => {
        if (playbackSyncState.state.state === 'playback')
            setRotationAngle(rotationAngle - 180);

        const tryResolveRefresh = () => {
            if (rotationTimeout.current)
                clearTimeout(rotationTimeout.current);
            rotationTimeout.current = setTimeout(() => {
                if (playbackSyncState.state.state === 'playback') tryResolveRefresh();
                else setIsDisabled(false);
            }, REFRESH_ICON_ANIMATION_INTERVAL);
        };

        tryResolveRefresh();

        return () => {
            if (rotationTimeout.current)
                clearTimeout(rotationTimeout.current);
        };
    }, [playbackSyncState.state.state]);


    const handleRefreshClick = useCallback(() => {
        if (isDisabled) return;
        actions?.requestUpdate();
        setIsDisabled(true);
        setRotationAngle(rotationAngle - 180);
    }, [actions, isDisabled]);


    if (!client) return <></>;

    const actionName = 'Refresh Now Playing';
    const rotationStyle = {
        transform: `rotate(${rotationAngle}deg)`,
        // opacity: isDisabled ? 0.7 : 1
    };

    return (
        <div className={"refreshIcon "} onClick={handleRefreshClick} title={actionName} style={rotationStyle}>
            <RefreshIcon />
        </div>
    );
}

function LibraryControlIcon() {
    const trackContext = useContext(TrackContext);
    const playlistContext = useContext(PlaylistContext);
    const client = useContext(SpotifyClientContext)?.api;

    if (!client) return <></>;

    const presentPlaylists = getTracksPlaylists(trackContext?.track?.id, playlistContext.playlistDict);
    const isInLibrary = presentPlaylists.length > 0;
    const hoverText = isInLibrary ? 'Saved to Library' : 'Add to Library';
    const icon = isInLibrary ? <SavedToLibraryIcon /> : <AddToLibraryIcon />;

    return (
        <div className="libraryIcon" title={hoverText}>
            {icon}
        </div>
    );

}