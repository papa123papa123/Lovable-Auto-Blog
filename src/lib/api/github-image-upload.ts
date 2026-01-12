// -*- coding: utf-8 -*-
// GitHubリポジトリに画像をアップロード

export interface ImageUploadOptions {
  domain: string; // 例: "comic-review-navi.com"
  slug: string; // 例: "ipad-case-review"
  filename: string; // 例: "eyecatch-800.webp"
  imageDataUrl: string; // data:image/webp;base64,... 形式
}

export interface ImageUploadResult {
  success: boolean;
  url?: string; // GitHubでの画像URL
  error?: string;
}

const GITHUB_CONFIG = {
  sitesDir: "sites",
  articlesDir: "articles",
  imagesDir: "images",
};

/**
 * 画像をGitHubリポジトリにアップロード
 */
export async function uploadImageToGitHub(
  options: ImageUploadOptions
): Promise<ImageUploadResult> {
  const { domain, slug, filename, imageDataUrl } = options;
  
  // data:image/webp;base64,xxxxx から base64部分を抽出
  const base64Data = imageDataUrl.split(",")[1];
  
  if (!base64Data) {
    return {
      success: false,
      error: "Invalid image data URL",
    };
  }

  // ファイルパス: sites/<domain>/articles/<slug>/images/<filename>
  const filePath = `${GITHUB_CONFIG.sitesDir}/${domain}/${GITHUB_CONFIG.articlesDir}/${slug}/${GITHUB_CONFIG.imagesDir}/${filename}`;
  
  console.log(`[GitHubImageUpload] アップロード開始: ${filePath}`);
  
  try {
    const response = await fetch("/api/upload-image-to-github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath,
        content: base64Data,
        domain,
        filename,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GitHubImageUpload] エラー:`, errorText);
      return {
        success: false,
        error: `アップロードに失敗しました (${response.status})`,
      };
    }

    const result = await response.json() as { success: boolean; url?: string; error?: string };
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || "アップロードに失敗しました",
      };
    }

    console.log(`[GitHubImageUpload] アップロード成功: ${result.url}`);
    
    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    console.error(`[GitHubImageUpload] 例外:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * PC用とスマホ用の2つの画像をアップロード（個別コミット - 非推奨）
 */
export async function uploadOptimizedImages(
  domain: string,
  slug: string,
  baseFilename: string, // 例: "eyecatch"
  pcImageDataUrl: string,
  mobileImageDataUrl: string
): Promise<{
  success: boolean;
  pcUrl?: string;
  mobileUrl?: string;
  pcRelativePath?: string;
  mobileRelativePath?: string;
  error?: string;
}> {
  // PC用画像をアップロード
  const pcResult = await uploadImageToGitHub({
    domain,
    slug,
    filename: `${baseFilename}-800.webp`,
    imageDataUrl: pcImageDataUrl,
  });

  if (!pcResult.success) {
    return {
      success: false,
      error: `PC用画像のアップロードに失敗: ${pcResult.error}`,
    };
  }

  // スマホ用画像をアップロード
  const mobileResult = await uploadImageToGitHub({
    domain,
    slug,
    filename: `${baseFilename}-350.webp`,
    imageDataUrl: mobileImageDataUrl,
  });

  if (!mobileResult.success) {
    return {
      success: false,
      error: `スマホ用画像のアップロードに失敗: ${mobileResult.error}`,
    };
  }

  // 相対パス（HTML内で使用）
  const pcRelativePath = `images/${baseFilename}-800.webp`;
  const mobileRelativePath = `images/${baseFilename}-350.webp`;

  return {
    success: true,
    pcUrl: pcResult.url,
    mobileUrl: mobileResult.url,
    pcRelativePath,
    mobileRelativePath,
  };
}

export interface BatchImageUploadOptions {
  domain: string;
  slug: string;
  images: Array<{
    filename: string;
    dataUrl: string;
  }>;
}

/**
 * 複数画像を1つのコミットで一括アップロード（推奨）
 */
export async function batchUploadImages(
  options: BatchImageUploadOptions
): Promise<{
  success: boolean;
  urls?: Record<string, string>; // { filename: url }
  error?: string;
}> {
  const { domain, slug, images } = options;

  if (images.length === 0) {
    return { success: true, urls: {} };
  }

  const files = images.map(img => ({
    path: `${GITHUB_CONFIG.sitesDir}/${domain}/${GITHUB_CONFIG.articlesDir}/${slug}/${GITHUB_CONFIG.imagesDir}/${img.filename}`,
    content: img.dataUrl.split(",")[1], // data:image/xxx;base64, の後の部分
    encoding: "base64" as const,
  }));

  const commitMessage = `Upload ${images.length} images for ${domain}/${slug}`;

  console.log(`[batchUploadImages] ${images.length}枚の画像を一括アップロード中...`);
  console.log(`[batchUploadImages] エンドポイント: /api/batch-deploy-to-github`);
  console.log(`[batchUploadImages] ファイル数: ${files.length}`);

  try {
    const { GITHUB_CONFIG: DEPLOY_CONFIG } = await import("./github-deploy");
    
    const requestBody = {
      owner: DEPLOY_CONFIG.owner,
      repo: DEPLOY_CONFIG.repo,
      branch: DEPLOY_CONFIG.branch,
      files,
      commitMessage,
    };
    
    console.log(`[batchUploadImages] リクエスト詳細:`, {
      owner: requestBody.owner,
      repo: requestBody.repo,
      branch: requestBody.branch,
      filesCount: requestBody.files.length,
      commitMessage: requestBody.commitMessage,
    });
    
    const response = await fetch("/api/batch-deploy-to-github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    console.log(`[batchUploadImages] レスポンスステータス: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[batchUploadImages] ❌ エラー詳細:`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorBody: errorText,
      });
      return {
        success: false,
        error: `一括アップロードに失敗しました (${response.status}: ${response.statusText})`,
      };
    }

    const result = await response.json() as { success: boolean; url?: string; error?: string };

    console.log(`[batchUploadImages] レスポンス内容:`, result);

    if (!result.success) {
      console.error(`[batchUploadImages] ❌ アップロード失敗（APIレスポンス）:`, result.error);
      return {
        success: false,
        error: result.error || "一括アップロードに失敗しました",
      };
    }

    console.log(`[batchUploadImages] ✅ 一括アップロード成功:`, result.url);

    // URLマップを生成（GitHub Pages URLを構築）
    const baseUrl = `https://${DEPLOY_CONFIG.owner}.github.io/${DEPLOY_CONFIG.repo}`;
    const imagesPath = `${GITHUB_CONFIG.sitesDir}/${domain}/${GITHUB_CONFIG.articlesDir}/${slug}/${GITHUB_CONFIG.imagesDir}`;
    
    const urls: Record<string, string> = {};
    images.forEach(img => {
      urls[img.filename] = `${baseUrl}/${imagesPath}/${img.filename}`;
    });

    return {
      success: true,
      urls,
    };
  } catch (error) {
    console.error(`[batchUploadImages] ❌ 例外発生:`, error);
    if (error instanceof Error) {
      console.error(`[batchUploadImages] スタックトレース:`, error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
