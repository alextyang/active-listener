import Link from "next/link";
import Image from "next/image";
import { MouseEvent, useCallback, useContext, useState } from "react";
import { CompleteArticle } from "@/app/(domain)/app/types";
import { ArticleContext } from "@/app/(domain)/app/context";

export function ArticleList() {
    const articles = useContext(ArticleContext).articles;

    if (!articles) return <></>;
    return (
        <div className="articles">
            {articles.map((article, index) => {
                return (
                    <ArticleLink key={article?.link + 'link'} article={article} index={index}></ArticleLink>
                )
            })}
        </div>
    );
}

export function ArticleLink({ article, index }: { article: CompleteArticle, index: number }) {
    if (!article || article.type != 'article') return <></>;

    let relevanceToken = '';
    if (article.relevance == 'track') relevanceToken = '✧ ';
    else if (article.relevance == 'album') relevanceToken = '⊚ ';
    else if (article.relevance == 'artist') relevanceToken = '✲ ';

    return (
        <>
            {index == 0 ? (
                <ArticleLinkHeader article={article}></ArticleLinkHeader>
            ) : ('')}

            <div key={article?.link + 'link'} className="articleLink">
                <PhotoLink article={article}>
                    <div className="linkSubtitle">
                        <p>{String(index + 1).padStart(2, '0')}</p>
                        <p>{article.siteName}</p>
                        {article.wordCount ?
                            (
                                <div className="linkWordCount">
                                    <p>{(Math.floor(article.wordCount / 238)) + ':' + (Math.floor((article.wordCount % 238) / (238 / 60)).toString().padStart(2, '0'))} </p>

                                </div>
                            ) : ''}
                    </div>
                    <span className="linkIcon">{relevanceToken}</span>
                    <Link href={article.link}
                        target="_blank" className="linkTitle">{article.title}</Link>
                </PhotoLink>

            </div>
        </>
    )
}

function ArticleLinkHeader({ article }: { article: CompleteArticle }) {
    return (
        <div key={'linkHeader'} className="articleLink">
            <PhotoLink article={article} disabled={true}>
                <div className="articleHeader">
                    <p><span>✧</span> Track</p>
                    <p><span>⊚</span> Album</p>
                    <p><span>✲</span> Artist</p>
                </div>
            </PhotoLink>
        </div>
    )
}


function PhotoLink({
    children, article, className, disabled
}: {
    children: React.ReactNode, article: CompleteArticle, className?: string, disabled?: boolean
}) {

    return (
        <Link href={!disabled ? (article?.link ?? '') : ''} target="_blank" className={"photoText " + className} >
            <div
                className="gradientText"
                style={{ background: article.gradient }}
            >
                {children}
                <div className="imageWrapper" style={{
                    // transform: `translate(${pictureState.x}px, ${pictureState.y}px)`
                }}>
                    {
                        !disabled ? (article?.image ? <Image src={article?.image ?? ''} alt='' fill sizes="30vw" className={'image'}></Image> : <div className="placeholder"></div>) : ''}
                </div>
            </div>
        </Link>
    )
}