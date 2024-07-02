import { use, useContext, useEffect, useState } from "react";
import { PlaybackContext, SpotifyClientContext } from "../context";
import Image from "next/image";
import { UserProfile } from "@spotify/web-api-ts-sdk";
import Profile from "./profile";
import Link from "next/link";

export default function Footer() {
    const client = useContext(SpotifyClientContext);

    return (
        <div className="footer">
            <div className="footerLinks">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/about">About</Link>
            </div>
            <Profile></Profile>
        </div>
    )
}