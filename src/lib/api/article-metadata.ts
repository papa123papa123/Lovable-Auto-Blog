/**
 * 記事メタデータ抽出機能
 * GitHubリポジトリから記事一覧を取得し、メタデータを抽出
 */

export interface ArticleMetadata {
  slug: string;
  title: string;
  date: string;
  category: string;
  url: string;
  ogImage?: string;
  description?: string;
}

/**
 * HTMLから記事タイトルを抽出
 */
function extractTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (titleMatch) {
    return titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  
  // <title>タグからも試す
  const pageTitleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (pageTitleMatch) {
    return pageTitleMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  
  return '無題の記事';
}

/**
 * HTMLからOGP画像URLを抽出
 */
function extractOgImageFromHtml(html: string, slug: string, domain: string): string | undefined {
  // OGP画像を取得
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImageMatch) {
    const ogImage = ogImageMatch[1];
    // 相対パスの場合は絶対パスに変換
    if (ogImage.startsWith('http')) {
      return ogImage;
    } else if (ogImage.startsWith('/')) {
      return `https://${domain}${ogImage}`;
    } else {
      return `https://${domain}/articles/${slug}/${ogImage}`;
    }
  }
  
  // アイキャッチ画像を探す（srcsetから）
  const srcsetMatch = html.match(/srcset=["']([^"']+)["']/i);
  if (srcsetMatch) {
    const srcset = srcsetMatch[1];
    // 最初の画像URLを取得
    const urlMatch = srcset.match(/([^\s,]+)/);
    if (urlMatch) {
      const imageUrl = urlMatch[1];
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      } else if (imageUrl.startsWith('/')) {
        return `https://${domain}${imageUrl}`;
      } else {
        return `https://${domain}/articles/${slug}/${imageUrl}`;
      }
    }
  }
  
  // 通常のimg srcから取得
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    const imgSrc = imgMatch[1];
    if (imgSrc.startsWith('http')) {
      return imgSrc;
    } else if (imgSrc.startsWith('/')) {
      return `https://${domain}${imgSrc}`;
    } else {
      return `https://${domain}/articles/${slug}/${imgSrc}`;
    }
  }
  
  return undefined;
}

/**
 * HTMLから説明文を抽出
 */
function extractDescriptionFromHtml(html: string): string | undefined {
  // OGP descriptionを取得
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (ogDescMatch) {
    return ogDescMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  
  // meta descriptionを取得
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (metaDescMatch) {
    return metaDescMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  
  return undefined;
}

/**
 * HTMLからカテゴリを推測（記事内容から）
 */
function extractCategoryFromHtml(html: string, slug: string): string {
  // スラグからカテゴリを推測
  if (slug.includes('manga') || slug.includes('comic')) return '少年漫画';
  if (slug.includes('goods') || slug.includes('ipad') || slug.includes('kindle')) return 'グッズレビュー';
  if (slug.includes('seinen')) return '青年漫画';
  if (slug.includes('shoujo')) return '少女漫画';
  
  return 'グッズレビュー'; // デフォルト
}

/**
 * GitHubから記事一覧を取得
 */
export async function fetchArticlesFromGitHub(
  owner: string,
  repo: string,
  domain: string
): Promise<ArticleMetadata[]> {
  const articlesPath = `sites/${domain}/articles`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${articlesPath}`;
  
  try {
    console.log(`[article-metadata] GitHubから記事一覧取得: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      console.error(`[article-metadata] GitHub API エラー: ${response.status}`);
      return [];
    }
    
    const folders = await response.json();
    
    if (!Array.isArray(folders)) {
      console.error('[article-metadata] 予期しないレスポンス形式');
      return [];
    }
    
    const articles: ArticleMetadata[] = [];
    
    // 各フォルダから記事情報を取得
    for (const folder of folders) {
      if (folder.type !== 'dir') continue;
      
      const slug = folder.name;
      const indexHtmlUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${articlesPath}/${slug}/index.html`;
      
      try {
        console.log(`[article-metadata] 記事取得: ${slug}`);
        
        const htmlResponse = await fetch(indexHtmlUrl);
        if (!htmlResponse.ok) {
          console.warn(`[article-metadata] index.html取得失敗: ${slug}`);
          continue;
        }
        
        const html = await htmlResponse.text();
        const title = extractTitleFromHtml(html);
        const category = extractCategoryFromHtml(html, slug);
        const ogImage = extractOgImageFromHtml(html, slug, domain);
        const description = extractDescriptionFromHtml(html);
        
        // 日付を現在日時で設定（後でより良い方法に改善可能）
        const date = new Date().toISOString().split('T')[0];
        
        articles.push({
          slug,
          title,
          date,
          category,
          url: `/articles/${slug}/`,
          ogImage,
          description,
        });
        
      } catch (error) {
        console.error(`[article-metadata] 記事処理エラー: ${slug}`, error);
      }
    }
    
    // 日付順にソート（新しい順）
    articles.sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`[article-metadata] ${articles.length}件の記事を取得`);
    return articles;
    
  } catch (error) {
    console.error('[article-metadata] 記事一覧取得エラー:', error);
    return [];
  }
}

/**
 * ローカルの記事メタデータを取得（デバッグ用）
 */
export function getLocalArticleMetadata(domain: string): ArticleMetadata[] {
  // 実際の実装では、ビルド時に記事情報を収集
  // ここではサンプルデータを返す
  return [
    {
      slug: 'ipad-cases',
      title: 'iPadケース選びで迷ったら？裸で使うリスクや100均の品質、世代別の互換性を徹底解説',
      date: '2024-01-12',
      category: 'グッズレビュー',
      url: '/articles/ipad-cases/',
      ogImage: `https://${domain}/articles/ipad-cases/images/eyecatch-800.webp`,
    },
    {
      slug: 'ipad-case',
      title: 'iPadケース選びの安心基準｜100均や非純正の安全性、サイズ・熱・ペンシルの疑問を解決',
      date: '2024-01-10',
      category: 'グッズレビュー',
      url: '/articles/ipad-case/',
      ogImage: `https://${domain}/articles/ipad-case/images/eyecatch-800.webp`,
    },
  ];
}
