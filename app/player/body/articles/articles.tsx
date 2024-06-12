import { useContext, useEffect, useState } from "react";
import { CurrentPlaybackContext, CurrentTrackInfoContext } from "../../../context";
import { getArticles } from "./actions";
import { Article } from "../../../types";
import { Summary } from "./summary/summary";



export function Articles() {
    const currentTrackInfo = useContext(CurrentTrackInfoContext);

    const [articles, setArticles] = useState<Article[]>([]);

    useEffect(() => {
        const getArticlesForTrack = getArticles.bind(null, currentTrackInfo?.track);

        getArticlesForTrack().then((articles) => {
            console.log('[ARTICLES] Articles found:', articles);
            setArticles(articles);
        });

    }, [currentTrackInfo]);

    return (
        <div className="articles">
            <Summary articles={articles}></Summary>
            {/* {articles.map((article) => {
                if (!article || !article.content) return <></>;
                return (
                    <div key={article.link}>
                        <h2>{article.title}</h2>
                        <div dangerouslySetInnerHTML={{ __html: article.content }}></div>
                    </div>
                )
            })} */}
        </div>
    )
}