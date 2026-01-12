// -*- coding: utf-8 -*-
// 固定のリポジトリ・ドメイン設定
export const GITHUB_CONFIG = {
  owner: "papa123papa123",
  repo: "Lovable-Auto-Blog",
  branch: "main",
  sitesDir: "sites",
  defaultDomain: "comic-review-navi.com",
} as const;

export interface DeployResult {
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
}

export interface DeployOptions {
  domain: string;
  slug: string;
  htmlContent: string;
  isIndexPage?: boolean;
}

export interface ImageData {
  filename: string; // 例: "eyecatch-800.webp"
  dataUrl: string; // data:image/webp;base64,... 形式
}

export interface BatchDeployOptions {
  domain: string;
  slug: string;
  htmlContent: string;
  images: ImageData[]; // アップロードする画像リスト
  isIndexPage?: boolean;
}

/**
 * 画像とHTMLを1つのコミットで一括デプロイ（推奨）
 */
export async function batchDeployToGitHub(options: BatchDeployOptions): Promise<DeployResult> {
  const functionName = "batch-deploy-to-github";
  const { domain, slug, htmlContent, images, isIndexPage = false } = options;
  
  // ファイルパスを構築
  const htmlPath = isIndexPage 
    ? `${GITHUB_CONFIG.sitesDir}/${domain}/index.html`
    : `${GITHUB_CONFIG.sitesDir}/${domain}/articles/${slug}/index.html`;
  
  const imagesDir = isIndexPage 
    ? `${GITHUB_CONFIG.sitesDir}/${domain}/images`
    : `${GITHUB_CONFIG.sitesDir}/${domain}/articles/${slug}/images`;
  
  // 絶対URLを相対パスに置換（デプロイ用）
  const baseUrl = `https://${GITHUB_CONFIG.owner}.github.io/${GITHUB_CONFIG.repo}`;
  const fullImagePath = `${baseUrl}/${imagesDir}`;
  
  let deployHtml = htmlContent;
  deployHtml = deployHtml.replace(
    new RegExp(fullImagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    'images'
  );
  
  // HTMLをBase64エンコード
  const htmlBase64 = btoa(unescape(encodeURIComponent(deployHtml)));
  
  // ファイルリストを構築
  const files = [
    {
      path: htmlPath,
      content: htmlBase64,
      encoding: "base64" as const,
    },
    ...images.map(img => ({
      path: `${imagesDir}/${img.filename}`,
      content: img.dataUrl.split(',')[1], // data:image/xxx;base64, の後の部分
      encoding: "base64" as const,
    })),
  ];
  
  // コミットメッセージを構築
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const commitMessage = `Deploy ${domain}/${slug} (${images.length} images + HTML) - ${timestamp}`;
  
  console.log(`[${functionName}] リクエスト開始:`, {
    domain,
    slug,
    htmlPath,
    imagesCount: images.length,
    isIndexPage,
  });

  try {
    const response = await fetch("/api/batch-deploy-to-github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      console.error(`[${functionName}] ❌ エラー発生:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      
      return { 
        success: false, 
        error: `APIリクエストに失敗しました (ステータス: ${response.status})`
      };
    }

    const data = await response.json() as { success?: boolean; url?: string; error?: string };

    if (!data.success) {
      return { success: false, error: data.error || "GitHubへのデプロイに失敗しました" };
    }

    console.log(`[${functionName}] ✅ 成功 (1コミットで${files.length}ファイル):`, { url: data.url });
    return {
      success: true,
      url: data.url,
      message: `${files.length}ファイルを1コミットでデプロイしました`,
    };
  } catch (err) {
    console.error(`[${functionName}] ❌ 例外発生:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラーが発生しました",
    };
  }
}

/**
 * 記事HTMLのみをGitHubリポジトリにデプロイする（旧方式）
 * 
 * sites/<domain>/articles/<slug>/index.html または
 * sites/<domain>/index.html に保存
 */
export async function deployToGitHub(options: DeployOptions): Promise<DeployResult> {
  const functionName = "deploy-to-github";
  const { domain, slug, htmlContent, isIndexPage = false } = options;
  
  // ファイルパスを構築
  const filePath = isIndexPage 
    ? `${GITHUB_CONFIG.sitesDir}/${domain}/index.html`
    : `${GITHUB_CONFIG.sitesDir}/${domain}/articles/${slug}/index.html`;
  
  // 絶対URLを相対パスに置換（デプロイ用）
  // https://papa123papa123.github.io/Lovable-Auto-Blog/sites/.../images/eyecatch-800.webp
  // → images/eyecatch-800.webp
  const baseUrl = `https://${GITHUB_CONFIG.owner}.github.io/${GITHUB_CONFIG.repo}`;
  const imagePath = isIndexPage 
    ? `sites/${domain}/images`
    : `sites/${domain}/articles/${slug}/images`;
  const fullImagePath = `${baseUrl}/${imagePath}`;
  
  let deployHtml = htmlContent;
  // 絶対URLを相対パスに置換
  deployHtml = deployHtml.replace(
    new RegExp(fullImagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    'images'
  );
  
  // コミットメッセージを構築
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const commitMessage = `update ${domain} ${timestamp}`;
  
  console.log(`[${functionName}] リクエスト開始:`, {
    domain,
    slug,
    filePath,
    isIndexPage,
    htmlContentLength: htmlContent.length,
  });

  try {
    console.log(`[${functionName}] API呼び出し中...`);
    
    const response = await fetch("/api/deploy-to-github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: GITHUB_CONFIG.owner,
        repo: GITHUB_CONFIG.repo,
        branch: GITHUB_CONFIG.branch,
        filePath,
        content: deployHtml,
        commitMessage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${functionName}] ❌ エラー発生:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      
      let userMessage = `[${functionName}] APIリクエストに失敗しました。`;
      if (response.status >= 500) {
        userMessage = "サーバーエラーが発生しました。しばらく待ってから再試行してください。";
      }
      
      return { 
        success: false, 
        error: `${userMessage} (ステータス: ${response.status})`
      };
    }

    const data = await response.json() as { success?: boolean; url?: string; error?: string };

    if (!data) {
      console.error(`[${functionName}] レスポンスデータなし`);
      return { success: false, error: "レスポンスデータがありません" };
    }

    if (!data.success) {
      return { success: false, error: data.error || "GitHubへのデプロイに失敗しました" };
    }

    console.log(`[${functionName}] ✅ 成功:`, { url: data.url });
    return {
      success: true,
      url: data.url,
      message: `${filePath} をデプロイしました`,
    };
  } catch (err) {
    console.error(`[${functionName}] ❌ 例外発生:`, {
      error: err,
      errorType: err instanceof Error ? err.constructor.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return { 
      success: false, 
      error: errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")
        ? "APIへの接続に失敗しました。ネットワーク接続を確認してください。"
        : errorMessage
    };
  }
}

/**
 * スラッグを生成（Gemini APIで日本語を英語に翻訳してURLフレンドリーな文字列を作成）
 */
export async function generateSlug(keyword: string): Promise<string> {
  // 日本語が含まれている場合は英語に翻訳
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(keyword);
  
  if (!hasJapanese) {
    // 既に英語の場合はそのままslugに変換
    return keyword
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .substring(0, 100);
  }

  try {
    // Gemini 2.0 Flash APIで日本語を英語に翻訳
    const response = await fetch("/api/translate-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
      console.error("Translation API error:", response.status);
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedKeyword = data.slug || keyword;

    return translatedKeyword
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .substring(0, 100);
  } catch (error) {
    console.error("Slug generation error:", error);
    throw error;
  }
}
