import { useEffect, useState } from "react"

export default function Lyrics() {
    return;

    const geniusEmbed = 'https://genius.com/songs/378195/embed.js';
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
            {/* <script src="https://code.jquery.com/jquery-1.7.2.min.js" integrity="sha256-R7aNzoy2gFrVs+pNJ6+SokH04ppcEqJ0yFLkNGoFALQ=" crossOrigin="anonymous"></script>
            <div id='rg_embed_link_378195' className='rg_embed_link' data-song-id='378195'></div>
            <div dangerouslySetInnerHTML={embedHTML ? { __html: embedHTML } : { __html: '' }} ></div> */}
        </div>
    )
}