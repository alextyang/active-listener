'use server';

import { Article } from '@/app/types';
import { openai } from '@ai-sdk/openai';
import { Track } from '@spotify/web-api-ts-sdk';
import { streamText } from 'ai';
import { createStreamableValue } from 'ai/rsc';

const maxTokensIn = 6400;
const maxTokensOut = 3200;
const systemPrompt = `
You will be given unformatted articles about a provided song, its artist, and its album. Summarize the articles as they explain the specifics of the song's background, musicology, and reception. If they don't contain any relevant information, discuss the artist only.

\n\nFormat your answer into paragraphs describing: concept, musicality, and reviews. Reference the articles' site name when relevant. Use a neutral, concise tone.

\n\nDo not discuss the music video at all. Only describe takeaways that are directly relevant to the song. If there aren't any reviews or takeaways, don't make up any. Mention other popular songs by the artist if they are relevant to the discussion.

\n\nExample:
\n"Easy" by Troye Sivan, from his fifth EP "In a Dream" released in 2020, revolves around the theme of attempting to salvage a failing relationship. The song's lyrics express Sivan's plea for his partner to stay, reminiscing about how being in love used to feel effortless. It is speculated that the track draws inspiration from Sivan's own breakup with his former partner.

\n\nThe track is characterized by its mellow and contemplative vibe, featuring '80s-twinged production and Sivan's signature laid-back delivery. The song incorporates elements such as drums, autotune, and a flute-like synth solo. Sivan's vocals, coupled with the nostalgic sound of the production, create an intimate atmosphere.

\n\nJustin Curto of "Vulture" praised "Easy" for its relaxed and introspective nature, contrasting it with some of Sivan's previous works. He highlighted the track as a departure from Sivan's earlier style, noting its use of autotune and subdued instrumentation. Stephen Daw of "Billboard" commended the song's '80s-inspired production, Sivan's emotive delivery, and the relatable portrayal of a deteriorating relationship.`;

export async function createSummary(articles: Article[], track?: Track) {

    if (articles.length === 0 || !track) return createStreamableValue('').value;

    let prompt = `Target song: ${track.name}, Target album: ${track.album.name}, Artist(s): ${track.artists.map((artist) => artist.name)}\n` + articles.map((article, index) => {
        return `\n\nArticle ${index + 1}:\n (by ${article?.byline} for ${article?.siteName})` + article?.content;
    }).join('\n');

    if (prompt.length === 0) return createStreamableValue('').value;
    if (prompt.length > maxTokensIn * 5) prompt = prompt.slice(0, maxTokensIn * 5);

    const stream = createStreamableValue('');

    console.log('[SUMMARY] Prompting summary with token count:', (prompt.length / 5), ' + ', (systemPrompt.length / 5));

    (async () => {
        const { textStream } = await streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            prompt,
            maxTokens: maxTokensOut
        });

        for await (const delta of textStream) {
            stream.update(delta);
        }

        stream.done();
    })();

    return stream.value;
}