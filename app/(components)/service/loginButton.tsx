import { useContext } from "react";
import { SpotifyClientContext } from "../../(domain)/app/context";
import { SpotifyLogoWhite } from "@/app/(components)/service/spotifyLogo";


export default function LoginButton({ message = 'Login to Spotify' }: { message?: string }) {
    const client = useContext(SpotifyClientContext);
    const isLoggingIn = client.isLoggingIn ?? false;

    const handleLogin = () => {
        if (isLoggingIn) return;
        client.login();
    }

    return (
        <button className="loginButton" data-testid="spotify-login-button" type="button" onClick={handleLogin} disabled={isLoggingIn} aria-busy={isLoggingIn}>
            <SpotifyLogoWhite></SpotifyLogoWhite>
            <p>{isLoggingIn ? "Connecting to Spotify..." : message}</p>
            {isLoggingIn ? <span className="loginButtonSpinner" aria-hidden="true"></span> : null}
        </button>

    )
}
