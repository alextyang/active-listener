import LoginButton from "@/app/(components)/spotify/loginButton";
import SongSearch from "../(home)/components/songSearch";

const VERSION = 'v0.1.0';
export default function Intro() {
    return (
        <div className="intro">
            <div className="splashText">
                <p className="version">{VERSION}</p>
                <h1>Active Listener</h1>
                <h2>A companion for <span className="green">Spotify</span> that uncovers <span className="magic">the story behind the song.</span></h2>
            </div>
            <div className="splashButtons">
                <p className="disclaimer">Login + live playback is disabled until Spotify approves this app. <br /> Use the search feature to demo the app.</p>
                <LoginButton message="Login with Spotify"></LoginButton>
                <SongSearch message="Search for songs.."></SongSearch>
            </div>
        </div>
    );
}