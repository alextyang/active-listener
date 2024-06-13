import { useContext, useEffect, useState } from "react";
import { PlaybackContext, TrackContext } from "../../../context";
import { getArticles } from "./actions";
import { Article } from "../../../types";
import { Summary } from "./summary/summary";
import { PhotoCard } from "../components/photoCard";
import { PhotoLink } from "../components/photoLink";
import Link from "next/link";



export function Articles() {
    const currentTrack = useContext(TrackContext);

    const [articles, setArticles] = useState<Article[]>([]);

    useEffect(() => {
        setArticles([]);
        const getArticlesForTrack = getArticles.bind(null, currentTrack?.track);

        getArticlesForTrack().then((articles) => {
            console.log('[ARTICLES] Articles found:', articles);
            setArticles(articles);
        });

    }, [currentTrack]);

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
                        <div key={article?.link} className="articleLink">
                            <PhotoLink article={article}>
                                {(index == 0) ? (
                                    <div className="articleHeader">
                                        <p><span>✧</span> Track</p>
                                        <p><span>⊚</span> Album</p>
                                        <p><span>✲</span> Artist</p>
                                    </div>
                                ) : ('')}
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

                {/* {articles.map((article) => {
                    if (!article || !article.content || article.type != 'article') return <></>;
                    return (
                        <PhotoCard className="articleCard" key={article.link} src={article.image}>
                            <h1>{article.title}</h1>
                            <div className="preview">
                                <p>{article.content.replace('\n', '\xa0\xa0')}</p>
                            </div>
                        </PhotoCard>
                    )
                })} */}
            </div>
        </div>
    )
}