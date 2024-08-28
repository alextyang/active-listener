import Link from "next/link";
import Image from "next/image";
import { useContext } from "react";
import { CompleteArticle } from "@/app/(domain)/app/types";
import { ArticleContext, TrackContext } from "@/app/(domain)/app/context";
import { getRelevanceToken, getArticleNumber, getTimeToRead, getArticleTextGradient, getArticleBackgroundGradient } from "@/app/(domain)/app/articles/articles";
import { ARTICLE_IMAGE_SIZES } from "@/app/(domain)/app/config";

export function ArticleList() {
    const articles = useContext(ArticleContext).articles;
    if (!articles) return <></>;

    return (
        <div className="articles">
            {articles.map((article, index) => {
                return (
                    <ArticleCard key={article?.link + 'item'} article={article} index={index}></ArticleCard>
                )
            })}
        </div>
    );
}

export function ArticleCard({ article, index }: { article: CompleteArticle, index: number }) {
    const trackContext = useContext(TrackContext);
    if (!article || article.type != 'article') return <></>;

    const key = article.link + 'card' + index;
    const href = article.link;

    // Subtitle
    const articleNumber = getArticleNumber(index);
    const articleSiteName = article.siteName;
    const timeToRead = getTimeToRead(article.wordCount);

    // Title
    const relevanceToken = getRelevanceToken(article.relevance) + ' ';
    const articleTitle = article.title;

    const textGradient = getArticleTextGradient(article, trackContext?.palette, index);
    const textStyles = { background: textGradient };

    // Background
    const hasImage = article?.image ? true : false;
    const backgroundGradient = getArticleBackgroundGradient(trackContext?.palette, index);
    const backgroundStyles = { background: backgroundGradient };

    return (
        <>
            {/* {index == 0 ? (
                <ArticleLinkHeader article={article}></ArticleLinkHeader>
            ) : ('')} */}

            <div key={key} className="articleLink">
                <Link href={href} target="_blank" className={"photoText"}>
                    <div className="gradientText" style={textStyles}>
                        <div className="linkSubtitle">
                            <p>{articleNumber}</p>
                            <p>{articleSiteName}</p>
                            <div className="linkWordCount">
                                <p>{timeToRead}</p>
                            </div>
                        </div>
                        <span className="linkIcon">{relevanceToken}</span>
                        <p className="linkTitle">{articleTitle}</p>
                        <div className="imageWrapper" >
                            {hasImage ?
                                <Image src={article?.image ?? ''} style={backgroundStyles} alt='' fill sizes={ARTICLE_IMAGE_SIZES} className={'image'}></Image>
                                : <div className="placeholder" style={backgroundStyles}></div>
                            }
                        </div>
                    </div>
                </Link>
            </div>
        </>
    )
}

function ArticleLinkHeader({ article }: { article: CompleteArticle }) {

    const trackContext = useContext(TrackContext);
    const href = article.link;
    const index = -1;

    const textGradient = getArticleTextGradient(article, trackContext?.palette, index);
    const textStyles = { background: textGradient };

    return (
        <div key={'linkHeader'} className="articleLink">
            <Link href={href} target="_blank" className={"photoText"}>
                <div className="gradientText" style={textStyles}>
                    <div className="articleHeader">
                        <p><span>✧</span> Track</p>
                        <p><span>⊚</span> Album</p>
                        <p><span>✲</span> Artist</p>
                    </div>
                </div>
            </Link >
        </div >
    )
}