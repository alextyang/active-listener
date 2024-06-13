import { Article } from "@/app/types";
import Link from "next/link";
import { useState } from "react";

export function PhotoLink({
    children, article, className
}: {
    children: React.ReactNode, article: Article, className?: string
}) {
    const [angle, setAngle] = useState<number>(Math.floor(Math.random() * 360));

    if (!article) return '';

    return (
        <div className={"photoText " + className} >
            <div
                className="gradientText"
                style={{ background: `linear-gradient(${angle}deg, ${article?.colorExtracts?.[0] ?? '#FFF'}, ${article?.colorExtracts?.[1] ?? '#CCC'})` }}
            >
                {children}
            </div>
        </div>
    )
}