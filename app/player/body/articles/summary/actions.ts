'use server';

import { Article } from '@/app/types';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createStreamableValue } from 'ai/rsc';

const maxTokens = 1600;
const systemPrompt = `You will be given unformatted articles about a song, its artist, and its album. Use the articles to explain the song's: background, musicology, and reception. Focus on elements a listener can hear in the song.\n\nFormat your answer into three separate paragraphs describing: background, musicology, and reception. Use a neutral, concise tone.\n\nDo not discuss the music video at all. Only describe takeaways that are directly relevant to the song.\n\nExample 1:\n"Easy" by Troye Sivan, from his fifth EP "In a Dream" released in 2020, revolves around the theme of attempting to salvage a failing relationship. The song's lyrics express Sivan's plea for his partner to stay, reminiscing about how being in love used to feel effortless. It is speculated that the track draws inspiration from Sivan's own breakup with his former partner. The emotional depth of the song reflects Sivan's personal experiences and contributes to the raw and heartfelt nature of the track.\n\nThe track is characterized by its mellow and contemplative vibe, featuring '80s-twinged production and Sivan's signature laid-back delivery. The song incorporates elements such as drums, autotune, and a flute-like synth solo. Sivan's vocals, coupled with the nostalgic sound of the production, create an intimate atmosphere that resonates with the listener. The music production complements the emotional lyrics, emphasizing the melancholic theme of lost love and the longing for reconciliation.\n\nCritics have praised "Easy" for its relaxed and introspective nature, contrasting it with some of Sivan's previous works. Justin Curto of Vulture highlighted the track as a departure from Sivan's earlier style, noting its use of autotune and subdued instrumentation. Stephen Daw of Billboard commended the song's '80s-inspired production, Sivan's emotive delivery, and the relatable portrayal of a deteriorating relationship. The collaboration between Troye Sivan, Kacey Musgraves, and Mark Ronson in the remixed version further added a new dimension to the song, with Musgraves contributing a fresh verse and Ronson infusing a disco-pop vibe, expanding the track's appeal to a wider audience.`;

export async function createSummary(articles: Article[]) {
    if (articles.length === 0) return createStreamableValue('').value;

    let prompt = articles.map((article) => {
        return article?.content;
    }).join('\n');

    if (prompt.length === 0) return createStreamableValue('').value;
    if (prompt.length > maxTokens * 5) prompt = prompt.slice(0, maxTokens * 5);

    const stream = createStreamableValue('');

    console.log('[SUMMARY] Creating summary for articles:', articles.map((article) => article?.title).join(', '));

    (async () => {
        const { textStream } = await streamText({
            model: openai('gpt-3.5-turbo-0125'),
            system: systemPrompt,
            prompt,
            maxTokens: maxTokens
        });

        for await (const delta of textStream) {
            stream.update(delta);
        }

        stream.done();
    })();

    return stream.value;
}