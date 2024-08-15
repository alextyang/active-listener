import { useContext } from "react";
import { SpotifyClientContext } from "../../(domain)/app/context";
import { SpotifyLogoWhite } from "@/app/(components)/service/spotifyLogo";
import { trySpotifyLogin } from "@/app/(domain)/spotify/account";
import { useRouter } from "next/navigation";


export default function LoginButton({ message = 'Login to Spotify' }: { message?: string }) {
    const client = useContext(SpotifyClientContext);
    const router = useRouter();

    const handleLogin = () => {
        client.login();
    }

    return (

        <div className="loginButton" onClick={handleLogin}>
            <SpotifyLogoWhite></SpotifyLogoWhite>
            <p>{message}</p>
        </div>

    )
}