import { useEffect, useState } from "react"

export default function Lyrics() {

    const geniusEmbed = 'http://genius.com/songs/378195/embed.js';
    const [embedHTML, setEmbedHTML] = useState<string | undefined>(undefined);

    useEffect(() => {
        const fetchEmbedScript = async () => {
            const embedScript = await fetch(geniusEmbed);
            const embedScriptText = await embedScript.text();
            const embedScriptArray = embedScriptText.split('document.write(').splice(1);
            const embedHTMLText = embedScriptArray?.map((line, index) => {

                line = line.trim().replaceAll('\\n', '');
                if (line.includes('JSON.parse(\'')) {
                    console.log('[LYRICS] Found JSON.parse() in embed script', line, line.substring('JSON.parse(\''.length + 2, line.length - 4).replaceAll('\\', ''));
                    return line.substring('JSON.parse(\''.length + 2, line.length - 4).replaceAll('\\', '');
                }
                if (index === embedScriptArray.length - 1) {
                    return line.substring(1, line.length - 3);
                }
                return line.substring(1, line.length - 2);
            });

            console.log('[LYRICS] Genius embed HTML:', embedHTMLText);

            setEmbedHTML(embedHTMLText.join());
        };

        fetchEmbedScript();
    });

    return (
        <div style={{ position: 'relative' }}>
            <div id='rg_embed_link_378195' className='rg_embed_link' data-song-id='378195' dangerouslySetInnerHTML={embedHTML ? { __html: embedHTML } : { __html: '' }}></div>
        </div>
    )
}