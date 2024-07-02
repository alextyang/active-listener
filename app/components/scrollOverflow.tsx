import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { TrackContext } from "../context";


export default function ScrollOverflow({ children }: { children: React.ReactNode }) {
    const trackContext = useContext(TrackContext);
    const [isScrolling, setIsScrolling] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);


    const handleResize = useCallback(() => {
        setIsScrolling(false);

        clearTimeout(updateTimeout.current!);
        updateTimeout.current = setTimeout(() => {
            if (!elementRef.current) return;
            var overflowX = elementRef.current.offsetWidth < elementRef.current.scrollWidth;
            setIsScrolling(overflowX);
        }, 0);
    }, []);

    useEffect(() => {
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [handleResize]);

    useEffect(() => {
        handleResize();
    }, [handleResize, trackContext]);


    return (
        <div className={"scrollIfOverflow " + (isScrolling ? 'scroll' : '')} ref={elementRef} >
            {!isScrolling ?
                (children) :
                (
                    <div>{children}
                        <div className="redundant">{children}</div>
                    </div>
                )}
        </div>
    )
}