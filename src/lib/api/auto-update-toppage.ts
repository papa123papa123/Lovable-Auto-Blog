/**
 * トップページとsitemap自動更新機能
 * 記事デプロイ後に自動でトップページとsitemap.xmlを更新
 */

import { fetchArticlesFromGitHub } from './article-metadata';
import { generateToppageHtml } from './toppage-generator';
import { generateSitemap, generateRobotsTxt, generateRssFeed } from './sitemap-generator';
import { GITHUB_CONFIG } from './github-deploy';

interface AutoUpdateOptions {
  domain: string;
}

interface AutoUpdateResult {
  success: boolean;
  error?: string;
  filesUpdated?: string[];
}

/**
 * トップページとSEOファイルを自動更新
 */
export async function autoUpdateToppageAndSeo(
  options: AutoUpdateOptions
): Promise<AutoUpdateResult> {
  const { domain } = options;
  
  console.log(`[auto-update] トップページ・SEOファイル更新開始: ${domain}`);
  
  try {
    // 1. GitHubから全記事を取得
    console.log('[auto-update] 記事一覧を取得中...');
    const articles = await fetchArticlesFromGitHub(
      GITHUB_CONFIG.owner,
      GITHUB_CONFIG.repo,
      domain
    );
    
    if (articles.length === 0) {
      console.warn('[auto-update] 記事が見つかりません');
      return {
        success: true,
        filesUpdated: [],
      };
    }
    
    console.log(`[auto-update] ${articles.length}件の記事を取得しました`);
    
    // 2. トップページHTML生成
    console.log('[auto-update] トップページHTMLを生成中...');
    const indexHtml = generateToppageHtml(articles, {
      siteName: '漫画レビューナビ',
      siteTitle: '漫画レビューナビ | あなたの次の一冊が、ここにある',
      siteSubtitle: '漫画好きによる、漫画好きのためのレビューサイト',
      siteDescription: '漫画好きによる、漫画好きのためのレビューサイト。少年漫画・青年漫画・少女漫画のおすすめやグッズレビューをお届けします。',
      domain,
    });
    
    // 3. sitemap.xml生成
    console.log('[auto-update] sitemap.xmlを生成中...');
    const sitemapXml = generateSitemap(articles, { domain });
    
    // 4. robots.txt生成
    console.log('[auto-update] robots.txtを生成中...');
    const robotsTxt = generateRobotsTxt(domain);
    
    // 5. feed.xml生成（RSS）
    console.log('[auto-update] feed.xmlを生成中...');
    const feedXml = generateRssFeed(articles, {
      domain,
      siteName: '漫画レビューナビ',
      siteDescription: '漫画好きによる、漫画好きのためのレビューサイト',
    });
    
    // 6. GitHubにデプロイ
    console.log('[auto-update] GitHubにデプロイ中...');
    
    const functionUrl = "/api/batch-deploy-to-github";
    
    // Base64エンコード
    const indexHtmlBase64 = btoa(unescape(encodeURIComponent(indexHtml)));
    const sitemapXmlBase64 = btoa(unescape(encodeURIComponent(sitemapXml)));
    const robotsTxtBase64 = btoa(unescape(encodeURIComponent(robotsTxt)));
    const feedXmlBase64 = btoa(unescape(encodeURIComponent(feedXml)));
    
    // ファイルリスト
    const files = [
      {
        path: `${GITHUB_CONFIG.sitesDir}/${domain}/index.html`,
        content: indexHtmlBase64,
        encoding: "base64" as const,
      },
      {
        path: `${GITHUB_CONFIG.sitesDir}/${domain}/sitemap.xml`,
        content: sitemapXmlBase64,
        encoding: "base64" as const,
      },
      {
        path: `${GITHUB_CONFIG.sitesDir}/${domain}/robots.txt`,
        content: robotsTxtBase64,
        encoding: "base64" as const,
      },
      {
        path: `${GITHUB_CONFIG.sitesDir}/${domain}/feed.xml`,
        content: feedXmlBase64,
        encoding: "base64" as const,
      },
    ];
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const commitMessage = `Auto-update: toppage + SEO files (${articles.length} articles) - ${timestamp}`;
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: GITHUB_CONFIG.owner,
        repo: GITHUB_CONFIG.repo,
        branch: GITHUB_CONFIG.branch,
        files,
        commitMessage,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('[auto-update] デプロイ完了:', result);
    
    return {
      success: true,
      filesUpdated: [
        'index.html',
        'sitemap.xml',
        'robots.txt',
        'feed.xml',
      ],
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('[auto-update] エラー:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}
