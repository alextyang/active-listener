import { useContext, useEffect, useRef, useState } from "react";
import { TrackFetchContext, PlaybackContext, TrackContext } from "../../../context";
import { fetchArticle, getArticles } from "./actions";
import { Article } from "../../../types";
import { Summary } from "./summary/summary";
import { PhotoLink } from "../components/photoLink";
import Link from "next/link";
import { Track } from "@spotify/web-api-ts-sdk";
import { filterArticles } from "./utils";



export function Articles() {
    const trackContext = useContext(TrackContext);
    const fetchState = useContext(TrackFetchContext);

    const [articles, setArticles] = useState<Article[]>([]);
    const lastTrackID = useRef<string | undefined>('');

    useEffect(() => {
        setArticles([]);
        fetchState.update({ state: 'articles', percent: -1 });
        const getArticlesForTrack = getArticles.bind(null, trackContext?.track);

        getArticlesForTrack().then(async (fetchedArticles) => {
            console.log('[ARTICLES] Article list found:', fetchedArticles);

            if (!trackContext?.track || trackContext?.track?.id !== lastTrackID.current)
                return;

            let fetchedArticlesCount = 0;
            const incrementProgress = () => {
                fetchedArticlesCount++;

                fetchState.update({ state: 'articles', percent: (fetchedArticlesCount * (Math.round(100 / fetchedArticles.length))) });

                console.log('[ARTICLES] Incrementing progress', fetchedArticlesCount * (Math.round(100 / fetchedArticles.length)));
            };

            const articlePromises = fetchedArticles.map((article) => {
                const fetchArticleAction = fetchArticle.bind(null, article);
                return new Promise<Article>(async (resolve) => {
                    let result: Article | undefined = undefined;
                    try {
                        result = await fetchArticleAction();

                    } catch (error) {
                        result = undefined;
                    }
                    incrementProgress();
                    resolve(result);
                });
            });

            const articleResults = await Promise.all(articlePromises);

            if (!trackContext?.track || trackContext?.track?.id !== lastTrackID.current)
                return;

            const finalArticles = filterArticles(articleResults, trackContext?.track);

            console.log('[ARTICLES] Final articles:', finalArticles);

            setArticles(finalArticles);

            fetchState.update({ state: 'done', percent: -1 });
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trackContext?.track]);

    useEffect(() => {
        if (trackContext?.track?.id === lastTrackID.current) return;

        lastTrackID.current = trackContext?.track?.id;

        setArticles([]);
    }, [trackContext?.track]);

    return (
        <div className="journalism">
            <Summary articles={articles}></Summary>
            <div className="articles">
                {articles.map((article, index) => {
                    if (!article || !article.content || article.type != 'article') return <></>;
                    let relevanceToken = '';
                    if (article.relevance == 'track') relevanceToken = '✧ ';
                    else if (article.relevance == 'album') relevanceToken = '⊚ ';
                    else if (article.relevance == 'artist') relevanceToken = '✲ ';
                    return (
                        <div key={article?.link + 'link'} className="articleLink">
                            {(index == 0) ? (
                                <PhotoLink article={article} disabled={true}>
                                    <div className="articleHeader">
                                        <p><span>✧</span> Track</p>
                                        <p><span>⊚</span> Album</p>
                                        <p><span>✲</span> Artist</p>
                                    </div>
                                </PhotoLink>
                            ) : ('')}
                            <PhotoLink article={article}>
                                <div className="linkSubtitle">
                                    <p >{String(index + 1).padStart(2, '0')}
                                    </p>
                                    <p>{article.siteName}</p>
                                </div>
                                <span className="linkIcon">{relevanceToken}</span>
                                <Link href={article.link}
                                    target="_blank" className="linkTitle">{article.title}</Link>
                            </PhotoLink>

                        </div>
                    )
                })}
            </div>
        </div>
    )
}
