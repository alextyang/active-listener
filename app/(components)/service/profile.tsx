import { useContext } from "react";
import { SpotifyClientContext } from "../../(domain)/app/context";
import { HoverMenu } from "../utilities/hoverMenu";
import Image from "next/image";
import Link from "next/link";
import LoginButton from "./loginButton";
import { usePathname } from "next/navigation";
import { PROFILE_IMAGE_SIZES } from "@/app/(domain)/app/config";


export default function Profile() {
    const client = useContext(SpotifyClientContext);
    const path = usePathname();

    if (!client.user && path.includes('/demo')) return <></>;
    else if (!client.user) return (
        <div className="profilePlaceholder">
            <LoginButton></LoginButton>
        </div>
    );

    const profileImage = client?.user.images[client?.user.images.length - 1].url;
    const profileName = client?.user.display_name;

    return (
        <HoverMenu className="profileCard " menu={<ProfileMenu />}>
            <Image className="profileImage" src={profileImage} alt={profileName} fill sizes={PROFILE_IMAGE_SIZES} />
        </HoverMenu>

    )
}

function ProfileMenu() {
    const client = useContext(SpotifyClientContext);

    if (!client.user) return <></>;

    const profileName = client.user.display_name;
    const profileEmail = client.user.email;

    const handleClick = () => {
        if (!client) return;
        client.logout();
    };

    return (
        <>
            <div className="profileName">{profileName}</div>
            <div className="profileEmail">{profileEmail}</div>
            {/* <Link className="profileLogout" href="/settings">Settings</Link> */}
            <a className="profileLogout" onClick={handleClick}>Logout</a>
        </>
    );
}