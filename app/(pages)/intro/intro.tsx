import LoginButton from "@/app/(components)/service/loginButton";
import SongSearch from "../../(components)/service/songSearch";
import { VERSION } from "@/app/(domain)/app/config";
import { LibraryStatus } from "@/app/(components)/service/libraryStatus";
import Profile from "@/app/(components)/service/profile";
import { FooterLinks } from "@/app/(components)/site/footerLinks";

export default function Intro() {
    return (
        <main>
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
            <div className="footer">
                <FooterLinks></FooterLinks>
                <LibraryStatus />
                <Profile></Profile>
            </div>
        </main>
    );
}