import { useContext, useEffect, useRef, useState } from "react";
import { FetchContext, PlaybackContext, TrackContext } from "../../../context";
import { getArticles } from "./actions";
import { Article } from "../../../types";
import { Summary } from "./summary/summary";
import { PhotoLink } from "../components/photoLink";
import Link from "next/link";



export function Articles() {
    const trackContext = useContext(TrackContext);
    const fetchState = useContext(FetchContext);

    const [articles, setArticles] = useState<Article[]>([]);
    const lastTrackID = useRef<string | undefined>('');

    useEffect(() => {
        setArticles([]);
        fetchState.update({ state: 'articles', percent: 0 });
        const getArticlesForTrack = getArticles.bind(null, trackContext?.track);

        getArticlesForTrack().then((fetchedArticles) => {
            console.log('[ARTICLES] Articles found:', fetchedArticles);
            setArticles(fetchedArticles);

            if (fetchedArticles.length === 0 || !fetchedArticles)
                fetchState.update({ state: 'done', percent: 1 });
            else
                fetchState.update({ state: 'articles', percent: 1 });
        });

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