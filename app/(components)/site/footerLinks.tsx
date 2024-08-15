import Link from "next/link";


export function FooterLinks() {
    return (
        <div className="footerLinks">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/about">About</Link>
        </div>

    )
}