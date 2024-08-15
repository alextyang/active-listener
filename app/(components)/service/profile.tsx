import { UserProfile } from "@spotify/web-api-ts-sdk";
import { useContext, useEffect, useState } from "react";
import { PlaybackContext, SpotifyClientContext } from "../../(domain)/app/context";
import { HoverMenu } from "../utilities/hoverMenu";
import Image from "next/image";
import Link from "next/link";
import LoginButton from "./loginButton";
import { usePathname } from "next/navigation";


export default function Profile() {
    const client = useContext(SpotifyClientContext);
    const path = usePathname();

    const logout = () => {
        if (!client) return;
        client.logout();
    };

    return (
        <>
            {client?.user ? (
                <HoverMenu className="profileCard " menu={
                    <>
                        <div className="profileName">{client?.user.display_name}</div>
                        {client?.user.email ? <div className="profileEmail">{client?.user.email}</div> : ''}
                        <Link className="profileLogout" href="/settings">Settings</Link>
                        <a className="profileLogout" onClick={logout}>Logout</a>
                    </>
                }>
                    <Image className="profileImage" src={client?.user.images[client?.user.images.length - 1].url} alt="Profile Picture" fill />
                </HoverMenu>
            ) : (
                !path.includes('/demo') ? <></> :
                    <div className="profilePlaceholder">
                        <LoginButton></LoginButton>
                    </div>
            )}
        </>
    )
}