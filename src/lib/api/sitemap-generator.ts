/**
 * sitemap.xml自動生成機能
 * SEO対策用のサイトマップを生成
 */

import { ArticleMetadata } from './article-metadata';

/**
 * sitemap.xmlを生成
 */
export function generateSitemap(
  articles: ArticleMetadata[],
  options: {
    domain: string;
    baseUrl?: string;
  }
): string {
  const { domain, baseUrl = `https://${domain}` } = options;

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
`;

  // トップページ
  xml += `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // 各記事ページ
  for (const article of articles) {
    xml += `  <url>
    <loc>${baseUrl}${article.url}</loc>
    <lastmod>${article.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return xml;
}

/**
 * robots.txtを生成
 */
export function generateRobotsTxt(domain: string, baseUrl = `https://${domain}`): string {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
}

/**
 * RSS feedを生成（オプション）
 */
export function generateRssFeed(
  articles: ArticleMetadata[],
  options: {
    domain: string;
    siteName: string;
    siteDescription: string;
    baseUrl?: string;
  }
): string {
  const { domain, siteName, siteDescription, baseUrl = `https://${domain}` } = options;
  const now = new Date().toUTCString();

  // 最新10件の記事
  const recentArticles = articles.slice(0, 10);

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <link>${baseUrl}/</link>
    <description>${siteDescription}</description>
    <language>ja</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
`;

  for (const article of recentArticles) {
    const pubDate = new Date(article.date).toUTCString();
    
    rss += `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${baseUrl}${article.url}</link>
      <guid>${baseUrl}${article.url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${article.category}</category>
      <description>${escapeXml(article.title)}</description>
    </item>
`;
  }

  rss += `  </channel>
</rss>`;

  return rss;
}

/**
 * XML特殊文字をエスケープ
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
