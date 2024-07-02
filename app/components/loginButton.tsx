import { useContext } from "react";
import { SpotifyClientContext } from "../context";
import { SpotifyLogoWhite } from "../player/body/components/spotifyLogo";


export default function LoginButton() {
    const client = useContext(SpotifyClientContext);

    const handleLogin = () => {
        client?.login();
    }

    return (

        <div className="loginButton" onClick={handleLogin}>
            <SpotifyLogoWhite></SpotifyLogoWhite>
            <p>Login to Spotify</p>
        </div>

    )
}