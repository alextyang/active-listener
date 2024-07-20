import { useEffect, useState } from "react"

export default function LyricsTest() {

    const [embedScript, setEmbedScript] = useState<string | undefined>(undefined);

    useEffect(() => {
        const fetchEmbedScript = async () => {
            const embedScript = await fetch('https://genius.com/songs/378195/embed.js');
            const embedScriptText = await embedScript.text();
            setEmbedScript(embedScriptText.replaceAll('https', 'http'));
        };

        fetchEmbedScript();
    });

    return (
        <div style={{ position: 'relative' }}>
            <div id='rg_embed_link_378195' className='rg_embed_link' data-song-id='378195'>Read <a href='https://genius.com/Sia-chandelier-lyrics'>“Chandelier” by Sia</a> on Genius</div>
            <script>{embedScript}</script>
        </div>
    )
}