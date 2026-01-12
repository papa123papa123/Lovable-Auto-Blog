/**
 * トップページHTML自動生成機能
 * 記事メタデータからトップページHTMLを生成
 */

import { ArticleMetadata } from './article-metadata';

const TOPPAGE_TEMPLATE = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{SITE_TITLE}}</title>
    <meta name="description" content="{{SITE_DESCRIPTION}}" />
    <meta name="author" content="{{SITE_AUTHOR}}" />

    <meta property="og:title" content="{{SITE_TITLE}}" />
    <meta property="og:description" content="{{SITE_DESCRIPTION}}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="{{OG_IMAGE}}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="{{TWITTER_HANDLE}}" />
    <meta name="twitter:image" content="{{OG_IMAGE}}" />
    
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
      
      /* Header */
      header { background: linear-gradient(135deg, #FF6B9D 0%, #7FCDCD 100%); color: white; padding: 60px 0; text-align: center; }
      header h1 { font-size: 3rem; margin-bottom: 1rem; }
      header p { font-size: 1.5rem; opacity: 0.9; }
      
      /* Navigation */
      nav { background: white; padding: 1rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
      nav .container { display: flex; justify-content: space-between; align-items: center; }
      nav .logo { font-size: 1.5rem; font-weight: bold; color: #FF6B9D; text-decoration: none; }
      nav ul { display: flex; list-style: none; gap: 2rem; }
      nav a { text-decoration: none; color: #333; font-weight: 500; transition: color 0.3s; }
      nav a:hover { color: #FF6B9D; }
      
      /* Section */
      section { padding: 4rem 0; }
      section h2 { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; color: #FF6B9D; }
      
      /* Article Grid */
      .article-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 2rem; }
      .article-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; text-decoration: none; color: inherit; display: block; }
      .article-card:hover { transform: translateY(-4px); box-shadow: 0 8px 12px rgba(0,0,0,0.15); }
      .article-card img { width: 100%; height: 200px; object-fit: cover; }
      .article-card-content { padding: 1.5rem; }
      .article-category { display: inline-block; background: #FF6B9D; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; margin-bottom: 0.5rem; }
      .article-card h3 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #333; }
      .article-date { font-size: 0.875rem; color: #666; }
      
      /* Footer */
      footer { background: #2C3E50; color: white; padding: 3rem 0; margin-top: 4rem; }
      footer .container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
      footer h3 { margin-bottom: 1rem; color: #7FCDCD; }
      footer ul { list-style: none; }
      footer a { color: rgba(255,255,255,0.8); text-decoration: none; transition: color 0.3s; }
      footer a:hover { color: white; }
      footer .copyright { text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); opacity: 0.7; }
      
      @media (max-width: 768px) {
        header h1 { font-size: 2rem; }
        header p { font-size: 1.2rem; }
        .article-grid { grid-template-columns: 1fr; }
        nav ul { display: none; }
      }
    </style>
  </head>

  <body>
    <nav>
      <div class="container">
        <a href="/" class="logo">📚 {{SITE_NAME}}</a>
        <ul>
          <li><a href="/">ホーム</a></li>
          <li><a href="#latest">最新記事</a></li>
          <li><a href="#popular">人気記事</a></li>
        </ul>
      </div>
    </nav>

    <header>
      <div class="container">
        <h1>{{SITE_TITLE}}</h1>
        <p>{{SITE_SUBTITLE}}</p>
      </div>
    </header>

    <main>
      <!-- 最新記事セクション -->
      <section id="latest">
        <div class="container">
          <h2>📝 最新記事</h2>
          <div class="article-grid">
            {{LATEST_ARTICLES}}
          </div>
        </div>
      </section>

      <!-- 全記事セクション -->
      <section id="all-articles" style="background: white;">
        <div class="container">
          <h2>📖 全記事一覧</h2>
          <div class="article-grid">
            {{ALL_ARTICLES}}
          </div>
        </div>
      </section>
    </main>

    <footer>
      <div class="container">
        <div>
          <h3>{{SITE_NAME}}</h3>
          <p>{{SITE_DESCRIPTION}}</p>
        </div>
        <div>
          <h3>カテゴリ</h3>
          <ul>
            <li><a href="#">少年漫画</a></li>
            <li><a href="#">青年漫画</a></li>
            <li><a href="#">少女漫画</a></li>
            <li><a href="#">グッズレビュー</a></li>
          </ul>
        </div>
        <div>
          <h3>サイト情報</h3>
          <ul>
            <li><a href="#">運営者情報</a></li>
            <li><a href="#">プライバシーポリシー</a></li>
            <li><a href="#">お問い合わせ</a></li>
          </ul>
        </div>
      </div>
      <div class="copyright">
        <p>© 2024 {{SITE_NAME}} All Rights Reserved.</p>
      </div>
    </footer>
  </body>
</html>`;

/**
 * 記事カードHTMLを生成
 */
function generateArticleCard(article: ArticleMetadata): string {
  // OGP画像を使用（なければプレースホルダー）
  const imageUrl = article.ogImage || `https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=200&fit=crop`;
  
  return `
            <a href="${article.url}" class="article-card">
              <img src="${imageUrl}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=200&fit=crop'">
              <div class="article-card-content">
                <span class="article-category">${article.category}</span>
                <h3>${escapeHtml(article.title)}</h3>
                <p class="article-date">${article.date}</p>
              </div>
            </a>`;
}

/**
 * HTML特殊文字をエスケープ
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * トップページHTMLを生成
 */
export function generateToppageHtml(
  articles: ArticleMetadata[],
  options: {
    siteName?: string;
    siteTitle?: string;
    siteSubtitle?: string;
    siteDescription?: string;
    siteAuthor?: string;
    ogImage?: string;
    twitterHandle?: string;
    domain?: string;
  } = {}
): string {
  const {
    siteName = '漫画レビューナビ',
    siteTitle = '漫画レビューナビ | あなたの次の一冊が、ここにある',
    siteSubtitle = '漫画好きによる、漫画好きのためのレビューサイト',
    siteDescription = '漫画好きによる、漫画好きのためのレビューサイト。少年漫画・青年漫画・少女漫画のおすすめやグッズレビューをお届けします。',
    siteAuthor = '漫画レビューナビ',
    ogImage,
    twitterHandle = '@MangaReviewNavi',
    domain,
  } = options;
  
  // OGP画像: 最新記事のアイキャッチ、またはデフォルト画像
  const defaultOgImage = articles.length > 0 && articles[0].ogImage 
    ? articles[0].ogImage 
    : 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&h=630&fit=crop';
  
  const finalOgImage = ogImage || defaultOgImage;

  // 最新記事（最大6件）
  const latestArticles = articles.slice(0, 6);
  const latestArticlesHtml = latestArticles.map(generateArticleCard).join('\n');
  
  // 全記事
  const allArticlesHtml = articles.map(generateArticleCard).join('\n');

  let html = TOPPAGE_TEMPLATE;
  
  // テンプレート変数を置換
  html = html.replace(/{{SITE_NAME}}/g, siteName);
  html = html.replace(/{{SITE_TITLE}}/g, siteTitle);
  html = html.replace(/{{SITE_SUBTITLE}}/g, siteSubtitle);
  html = html.replace(/{{SITE_DESCRIPTION}}/g, siteDescription);
  html = html.replace(/{{SITE_AUTHOR}}/g, siteAuthor);
  html = html.replace(/{{OG_IMAGE}}/g, finalOgImage);
  html = html.replace(/{{TWITTER_HANDLE}}/g, twitterHandle);
  html = html.replace(/{{LATEST_ARTICLES}}/g, latestArticlesHtml);
  html = html.replace(/{{ALL_ARTICLES}}/g, allArticlesHtml);

  return html;
}
