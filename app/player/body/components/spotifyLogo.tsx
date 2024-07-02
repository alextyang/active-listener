import Image from "next/image";


export function SpotifyLogoWhite() {
    return (
        <div className="spotifyLogo">
            <Image src={'/spotify_white.png'} alt="Content provided by Spotify." fill={true} />
        </div>
    )
}

