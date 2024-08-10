import Link from "next/dist/client/link"



export function HoverMenu({ children, menu, className, onClick }: { children: React.ReactNode, menu: React.ReactNode, className?: string, onClick?: () => void }) {

    return (
        <div className={"hoverMenu " + className} onClick={onClick}>
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