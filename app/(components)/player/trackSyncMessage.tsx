import { TrackSyncContext, trackSyncMessages } from "@/app/(domain)/app/context";
import { useContext } from "react";

export function TrackSyncMessage() {
    const fetchState = useContext(TrackSyncContext);

    const message = trackSyncMessages[fetchState.state.state];
    const percentage = fetchState.state.percent;

    const shouldShowMessage = message.length > 0;
    const hiddenClass = shouldShowMessage ? '' : ' hidden ';

    const shouldShowPercentage = percentage && percentage !== -1;
    const percentageClass = shouldShowPercentage ? ' percentage ' : '';
    const percentageStyle = { width: percentage + '%' };

    return (
        <div className={"loading " + hiddenClass + percentageClass}>
            <div className="loadingText">{message}</div>
            {shouldShowPercentage ? (
                <div className="loadingBar">
                    <div className="loadingBarFill" style={percentageStyle}></div>
                </div>
            ) : ('')}
        </div>
    );
}