import { Article } from "@/app/types";
import Link from "next/link";
import Image from "next/image";
import { MouseEvent, useCallback, useState } from "react";

export function PhotoLink({
    children, article, className, disabled
}: {
    children: React.ReactNode, article: Article, className?: string, disabled?: boolean
}) {
    const [angle, setAngle] = useState<number>(Math.floor(Math.random() * 360));
    // const [pictureState, setPictureState] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });

    // const handleMouseEnter = useCallback((event: MouseEvent) => {
    //     if (disabled) return;
    //     setPictureState({ show: true, x: event.clientX, y: event.clientY });
    // }, [disabled]);
    // const handleMouseMove = useCallback((event: MouseEvent) => {
    //     if (disabled) return;
    //     setPictureState({ show: true, x: event.clientX + 20, y: event.clientY + 24 });

    // }, [disabled]);
    // const handleMouseExit = useCallback((event: MouseEvent) => {
    //     if (disabled) return;
    //     setPictureState({ show: false, x: event.clientX, y: event.clientY });

    // }, [disabled]);

    return (
        <Link href={article?.link ?? ''} target="_blank" className={"photoText " + className} >
            <div
                className="gradientText"
                style={{ background: `linear-gradient(${angle}deg, ${article?.colorExtracts?.[0] ?? '#FFF'}, ${article?.colorExtracts?.[1] ?? '#CCC'})` }}
            >
                {children}
                <div className="imageWrapper" style={{
                    // transform: `translate(${pictureState.x}px, ${pictureState.y}px)`
                }}>
                    {
                        !disabled ? (article?.image ? <Image src={article?.image ?? ''} alt='' fill sizes="50vw" className={'image'}></Image> : <div className="placeholder"></div>) : ''}
                </div>
            </div>
        </Link>
    )
}