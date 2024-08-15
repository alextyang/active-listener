import { LibraryStatus } from "../service/libraryStatus";
import Profile from "../service/profile";
import { FooterLinks } from "./footerLinks";

export function Footer() {
    return (
        <div className="footer">
            <FooterLinks></FooterLinks>
            <LibraryStatus />
            <Profile></Profile>
        </div>
    )
}