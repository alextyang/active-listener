import { TrackSyncContext, trackSyncMessages, TrackSyncState } from "@/app/(domain)/app/context";
import { useContext } from "react";

export function TrackSyncMessage() {
    const fetchState = useContext(TrackSyncContext);
    const message = trackSyncMessages[fetchState.state.state];
    const percentage = fetchState.state.percent;

    return (
        <div className={"loading " + (message.length == 0 ? ' hidden ' : '') + (percentage && percentage !== -1 ? ' percentage ' : '')}>
            <div className="loadingText">{message}</div>
            {
                percentage && percentage !== -1 ? (
                    <div className="loadingBar">
                        <div className="loadingBarFill" style={{ width: percentage + '%' }}></div>
                    </div>
                ) : ('')
            }
        </div>
    );
}