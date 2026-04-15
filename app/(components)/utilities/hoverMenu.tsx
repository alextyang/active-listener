import Link from "next/link";
import { shouldUseNativeLink } from "./hoverMenuHref";
import { runHoverMenuAction } from "./hoverMenuAction";



export function HoverMenu({ children, menu, className, onClick, testId }: { children: React.ReactNode, menu: React.ReactNode, className?: string, onClick?: () => void | Promise<void>, testId?: string }) {
    return (
        <div className={"hoverMenu " + className} data-testid={testId} onClick={() => runHoverMenuAction(onClick)}>
            <div className="item">
                {children}
            </div>
            <div className="menu">
                {menu}
            </div>
        </div>
    )
}

export function HoverMenuLink({ children, menu, className, href }: { children: React.ReactNode, menu: React.ReactNode, className?: string, href: string }) {
    if (shouldUseNativeLink(href))
        return (
            <a className={"hoverMenu " + className} href={href} target="_blank" rel="noreferrer">
                <div className="item">
                    {children}
                </div>
                <div className="menu">
                    {menu}
                </div>
            </a>
        );

    return (
        <Link className={"hoverMenu " + className} href={href} target="_blank">
            <div className="item">
                {children}
            </div>
            <div className="menu">
                {menu}
            </div>
        </Link>
    )
}
