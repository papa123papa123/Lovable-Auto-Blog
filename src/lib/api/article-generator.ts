// -*- coding: utf-8 -*-
import { fetchAllIcons, replaceIconsInHtml, getIconImageCss, type IconInfo } from "./icon-matcher";
import { optimizeImage, type OptimizedImages } from "./image-optimizer";
import { uploadOptimizedImages } from "./github-image-upload";
import { 
  SECTION_COLORS, 
  getTableStyles, 
  getTocStyles, 
  getPochippStyles, 
  getSectionStyles,
  getMarkerStyles,
  generateTocHtml,
  generatePochippHtml,
  generateBottomTocHtml,
  generateSummaryHtml,
  generateRelatedArticlesHtml
} from "./html-styles";
import type { ProductInfo, HtmlProduct } from "./affiliate";
import { createFallbackProduct } from "./affiliate";
export type { IconInfo } from "./icon-matcher";

export interface H2Section {
  title: string;
  h3Headings: string[];
}

export interface ArticleOutline {
  title: string;
  metaDescription: string;
  h2Sections: H2Section[];
}

export interface GeneratedSection {
  h2Title: string;
  content: string;
  h3Contents: Array<{
    title: string;
    content: string;
  }>;
}

export interface GeneratedImage {
  imageUrl: string;
  alt: string;
}

export interface KeywordResearchData {
  paaQuestions: string[];
  relatedSearches: string[];
  suggestions: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  charCount?: number;
}

async function callApi<T>(
  endpoint: string,
  body: Record<string, unknown>,
  functionName: string
): Promise<ApiResponse<T>> {
  console.log(`[${functionName}] リクエスト開始:`, body);

  try {
    console.log(`[${functionName}] API呼び出し中...`);
    
    const response = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "エラーレスポンスの読み取りに失敗しました";
      }
      
      let errorDetails: any = {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      };
      
      // JSON形式のエラーレスポンスをパース
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = { ...errorDetails, ...errorJson };
      } catch (e) {
        // JSONパース失敗は無視（テキストのまま）
      }
      
      console.error(`[${functionName}] ❌ エラー発生:`, errorDetails);
      
      let userMessage = `[${functionName}] APIリクエストに失敗しました。`;
      if (response.status === 429) {
        userMessage = "レート制限に達しました。しばらく待ってから再試行してください。";
      } else if (response.status === 403) {
        userMessage = "APIキーが無効です。";
      } else if (response.status >= 500) {
        userMessage = "サーバーエラーが発生しました。しばらく待ってから再試行してください。";
      }
      
      // エラーメッセージを構築
      let errorMessage = `${userMessage} (ステータス: ${response.status})`;
      if (errorText && errorText.length < 500) {
        // エラーテキストが短い場合は追加情報として含める
        errorMessage += `\n詳細: ${errorText}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }

    let data: ApiResponse<T>;
    try {
      data = await response.json() as ApiResponse<T>;
    } catch (parseError) {
      console.error(`[${functionName}] ❌ JSONパースエラー:`, parseError);
      return { success: false, error: "レスポンスの解析に失敗しました" };
    }

    if (!data) {
      console.error(`[${functionName}] レスポンスデータなし`);
      return { success: false, error: "レスポンスデータがありません" };
    }

    if (!data.success) {
      console.error(`[${functionName}] ❌ APIがエラーを返しました:`, {
        error: data.error,
        hasData: !!data.data,
      });
      return { success: false, error: data.error || "APIがエラーを返しました" };
    }

    console.log(`[${functionName}] ✅ 成功`);
    return data;
  } catch (err) {
    const errorDetails = {
      error: err,
      errorType: err instanceof Error ? err.constructor.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
    };
    
    console.error(`[${functionName}] ❌ 例外発生:`, errorDetails);
    
    let errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
      errorMessage = "APIへの接続に失敗しました。ネットワーク接続を確認してください。";
    } else if (err instanceof Error && err.stack) {
      // スタックトレースの最初の数行を追加（デバッグ用）
      const stackLines = err.stack.split("\n").slice(0, 3).join("\n");
      errorMessage += `\n\nスタックトレース:\n${stackLines}`;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * 段落内の文章をスマホで読みやすくするため、2～3行ごとに改行を追加する関数
 */
function addMobileLineBreaks(html: string): string {
  // <p>タグ内のテキストを処理
  return html.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (match, content) => {
    // HTMLタグを一時的に置き換えて保護
    const tagMap = new Map<string, string>();
    let tagIndex = 0;
    const protectedContent = content.replace(/<[^>]+>/g, (tag: string) => {
      const placeholder = `__TAG_${tagIndex}__`;
      tagMap.set(placeholder, tag);
      tagIndex++;
      return placeholder;
    });
    
    // 句点（。）、感嘆符（！）、疑問符（？）で分割（句読点も含める）
    const parts: string[] = [];
    let currentPart = '';
    for (let i = 0; i < protectedContent.length; i++) {
      const char = protectedContent[i];
      currentPart += char;
      if (char === '。' || char === '！' || char === '？') {
        if (currentPart.trim()) {
          parts.push(currentPart);
        }
        currentPart = '';
      }
    }
    if (currentPart.trim()) {
      parts.push(currentPart);
    }
    
    // 2～3文ごとに<br><br>を挿入
    let result = '';
    let sentenceCount = 0;
    for (let i = 0; i < parts.length; i++) {
      result += parts[i];
      sentenceCount++;
      // 2文目または3文目ごとに改行を追加（最後の文の前は除く）
      // パターン: 2文目、3文目、5文目、6文目、8文目、9文目...
      if (i < parts.length - 1) {
        const remainder = sentenceCount % 3;
        if (remainder === 2 || remainder === 0) {
          result += '<br><br>';
        }
      }
    }
    
    // プレースホルダーを元のHTMLタグに戻す
    tagMap.forEach((tag, placeholder) => {
      result = result.replace(placeholder, tag);
    });
    
    return match.replace(content, result);
  });
}

/**
 * Markdown記法をHTMLに変換する関数
 * AIが生成したMarkdown記法（#、*、**など）をHTMLタグに変換
 */
function convertMarkdownToHtml(content: string): string {
  let html = content;
  
  // 見出し（H1-H6）を削除（記事内では使用しない）
  html = html.replace(/^#{1,6}\s+.+$/gm, '');
  
  // 太字 **text** または __text__ を <strong>text</strong> に変換
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // イタリック *text* または _text_ を <em>text</em> に変換（ただし既にHTMLタグの中でない場合のみ）
  html = html.replace(/(?<!<[^>]*)\*([^*]+)\*(?![^<]*>)/g, '<em>$1</em>');
  html = html.replace(/(?<!<[^>]*)_([^_]+)_(?![^<]*>)/g, '<em>$1</em>');
  
  // リスト記号（- または * で始まる行）は既にHTMLの<ul><li>になっている可能性があるのでスキップ
  // ただし、まだMarkdownのままの場合は変換しない（AIがHTML形式で出力しているため）
  
  // スマホで読みやすくするため、段落内の文章を2～3行ごとに改行
  html = addMobileLineBreaks(html);
  
  return html;
}

export const articleGeneratorApi = {
  async generateOutline(
    keyword: string, 
    researchData?: KeywordResearchData
  ): Promise<ApiResponse<ArticleOutline>> {
    return callApi<ArticleOutline>(
      "generate-outline",
      { keyword, researchData },
      "generate-outline"
    );
  },

  async generateSection(
    keyword: string,
    outline: ArticleOutline,
    sectionIndex: number,
    researchData?: KeywordResearchData
  ): Promise<ApiResponse<GeneratedSection>> {
    return callApi<GeneratedSection>(
      "generate-section",
      { keyword, outline, sectionIndex, researchData },
      "generate-section"
    );
  },

  async generateImage(
    prompt: string,
    alt: string
  ): Promise<ApiResponse<GeneratedImage>> {
    return callApi<GeneratedImage>(
      "generate-image",
      { prompt, alt },
      "generate-image"
    );
  },

  async generateArticleImages(
    outline: ArticleOutline,
    domain: string, // GitHub保存用のドメイン
    slug: string, // 記事のスラッグ
    onProgress?: (step: string) => void
  ): Promise<{
    success: boolean;
    eyecatchImage?: { pc: string; mobile: string };
    sectionImages?: Array<{ pc: string; mobile: string } | null>;
    eyecatchImageAbsolute?: { pc: string; mobile: string };
    sectionImagesAbsolute?: Array<{ pc: string; mobile: string } | null>;
    imageDataList?: Array<{ filename: string; dataUrl: string }>; // 一括デプロイ用
    error?: string;
  }> {
    try {
      console.log("[generateArticleImages] 開始:", { domain, slug, title: outline.title });
      
      // Generate eyecatch image
      onProgress?.("アイキャッチ画像を生成中...");
      const eyecatchResult = await this.generateImage(outline.title, outline.title);
      
      console.log("[generateArticleImages] アイキャッチ生成結果:", {
        success: eyecatchResult.success,
        hasData: !!eyecatchResult.data,
        error: eyecatchResult.error,
      });
      
      if (!eyecatchResult.success || !eyecatchResult.data) {
        console.error("[generateArticleImages] アイキャッチ生成失敗:", eyecatchResult.error);
        return { success: false, error: eyecatchResult.error || "アイキャッチ画像の生成に失敗しました" };
      }
      
      // 画像を最適化（WebP変換、リサイズ、圧縮）
      onProgress?.("アイキャッチ画像を最適化中...");
      console.log("[generateArticleImages] 画像最適化開始");
      const eyecatchOptimized = await optimizeImage(eyecatchResult.data.imageUrl);
      console.log("[generateArticleImages] 画像最適化完了");
      
      // 一括アップロード用の画像データリスト
      const imageDataList: Array<{ filename: string; dataUrl: string }> = [
        { filename: "eyecatch-800.webp", dataUrl: eyecatchOptimized.pc },
        { filename: "eyecatch-350.webp", dataUrl: eyecatchOptimized.mobile },
      ];
      
      // 🚨 画像生成API過負荷対策：次の画像生成まで5秒待機 🚨
      console.log("[generateArticleImages] 次の画像生成まで5秒待機（API過負荷対策）");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Generate H2-2 section image only (2枚目のH2のみ) - 直列実行
      const sectionImages: Array<{ pc: string; mobile: string } | null> = [];
      const sectionImagesAbsolute: Array<{ pc: string; mobile: string } | null> = [];
      for (let i = 0; i < outline.h2Sections.length; i++) {
        if (i === 1) {
          // H2-2のみ画像を生成
          const section = outline.h2Sections[i];
          onProgress?.(`H2-${i + 1}の画像を生成中...`);
          
          const sectionResult = await this.generateImage(section.title, section.title);
          
          if (sectionResult.success && sectionResult.data) {
            // 画像を最適化
            onProgress?.(`H2-${i + 1}の画像を最適化中...`);
            const sectionOptimized = await optimizeImage(sectionResult.data.imageUrl);
            
            // 画像データリストに追加
            imageDataList.push(
              { filename: `section-${i + 1}-800.webp`, dataUrl: sectionOptimized.pc },
              { filename: `section-${i + 1}-350.webp`, dataUrl: sectionOptimized.mobile }
            );
            
            // 相対パスとして保存（後でURLに変換）
            sectionImages.push({
              pc: `images/section-${i + 1}-800.webp`,
              mobile: `images/section-${i + 1}-350.webp`,
            });
            sectionImagesAbsolute.push(null); // 後で設定
          } else {
            console.error(`Failed to generate section ${i} image:`, sectionResult.error);
            sectionImages.push(null);
            sectionImagesAbsolute.push(null);
          }
        } else {
          // その他のH2セクションは画像なし
          sectionImages.push(null);
          sectionImagesAbsolute.push(null);
        }
      }
      
      // すべての画像を1コミットでGitHubにアップロード
      onProgress?.(`${imageDataList.length}枚の画像を一括アップロード中...`);
      console.log(`[generateArticleImages] ${imageDataList.length}枚の画像を一括アップロード開始`);
      
      const { batchUploadImages } = await import("./github-image-upload");
      const batchUploadResult = await batchUploadImages({
        domain,
        slug,
        images: imageDataList,
      });
      
      if (!batchUploadResult.success) {
        console.error("[generateArticleImages] 一括アップロード失敗:", batchUploadResult.error);
        return { success: false, error: batchUploadResult.error || "画像の一括アップロードに失敗しました" };
      }
      
      console.log("[generateArticleImages] ✅ 一括アップロード成功");
      
      // 絶対URLを設定
      const eyecatchImageAbsolute = {
        pc: batchUploadResult.urls!["eyecatch-800.webp"],
        mobile: batchUploadResult.urls!["eyecatch-350.webp"],
      };
      
      const eyecatchImage = {
        pc: "images/eyecatch-800.webp",
        mobile: "images/eyecatch-350.webp",
      };
      
      // セクション画像の絶対URLを設定
      for (let i = 0; i < outline.h2Sections.length; i++) {
        if (i === 1 && sectionImages[i]) {
          sectionImagesAbsolute[i] = {
            pc: batchUploadResult.urls![`section-${i + 1}-800.webp`],
            mobile: batchUploadResult.urls![`section-${i + 1}-350.webp`],
          };
        }
      }
      
      return {
        success: true,
        eyecatchImage,
        sectionImages,
        eyecatchImageAbsolute,
        sectionImagesAbsolute,
        imageDataList, // デプロイ時に再利用可能
      };
    } catch (err) {
      console.error("Generate article images failed:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  },

  async generateFullArticle(
    keyword: string,
    researchData?: KeywordResearchData,
    onProgress?: (step: string, progress: number) => void
  ): Promise<{
    success: boolean;
    outline?: ArticleOutline;
    sections?: GeneratedSection[];
    totalCharCount?: number;
    error?: string;
  }> {
    try {
      // Step 1: Generate outline
      onProgress?.("構成を生成中...", 10);
      const outlineResult = await this.generateOutline(keyword, researchData);
      
      if (!outlineResult.success || !outlineResult.data) {
        return { success: false, error: outlineResult.error || "Failed to generate outline" };
      }

      const outline = outlineResult.data;
      onProgress?.("構成完了", 20);

      // Step 2: Generate each section in parallel
      const sectionCount = outline.h2Sections.length;
      const maxRetries = 3; // リトライ回数

      // 各セクションの生成を並列実行するための関数
      const generateSectionWithRetry = async (index: number): Promise<{
        success: boolean;
        data?: GeneratedSection;
        charCount?: number;
        error?: string;
      }> => {
        let sectionResult = null;
        let lastError: string | undefined;
        
        for (let retry = 0; retry < maxRetries; retry++) {
          if (retry > 0) {
            console.log(`🔄 [generateFullArticle] セクション ${index + 1} (H2-${index + 1}) をリトライ中... (${retry}/${maxRetries - 1})`);
            // リトライ前に少し待機（レート制限対策）
            await new Promise(resolve => setTimeout(resolve, 2000 * retry));
          }
          
          sectionResult = await this.generateSection(keyword, outline, index, researchData);
          
          if (sectionResult.success && sectionResult.data) {
            console.log(`✅ [generateFullArticle] セクション ${index + 1} (H2-${index + 1}) 生成成功:`, {
              sectionIndex: index,
              sectionTitle: sectionResult.data.h2Title,
              h3Count: sectionResult.data.h3Contents?.length || 0,
              charCount: sectionResult.charCount || 0,
            });
            return {
              success: true,
              data: sectionResult.data,
              charCount: sectionResult.charCount,
            };
          }
          
          lastError = sectionResult.error || "不明なエラー";
          console.error(`❌ [generateFullArticle] セクション ${index + 1} (H2-${index + 1}) の生成に失敗 (試行 ${retry + 1}/${maxRetries}):`, {
            sectionIndex: index,
            sectionTitle: outline.h2Sections[index]?.title,
            error: lastError,
            hasData: !!sectionResult.data,
          });
        }
        
        // すべてのリトライが失敗した場合
        const errorMsg = lastError || "不明なエラー";
        console.error(`❌ [generateFullArticle] セクション ${index + 1} (H2-${index + 1}) の生成が完全に失敗しました（${maxRetries}回試行）:`, {
          sectionIndex: index,
          sectionTitle: outline.h2Sections[index]?.title,
          error: errorMsg,
        });
        
        return {
          success: false,
          error: errorMsg,
        };
      };

      // すべてのセクションを直列で生成（品質の一貫性を保つため）
      const sections: GeneratedSection[] = [];
      const failedSections: Array<{ index: number; title: string; error: string }> = [];
      let totalCharCount = 0;

      for (let i = 0; i < sectionCount; i++) {
        onProgress?.(`セクション ${i + 1}/${sectionCount} を生成中...`, 30 + (60 * i / sectionCount));
        
        const result = await generateSectionWithRetry(i);
        
        if (result.success && result.data) {
          sections.push(result.data);
          totalCharCount += result.charCount || 0;
          console.log(`✅ セクション ${i + 1}/${sectionCount} 完了: ${result.data.h2Title}`);
        } else {
          failedSections.push({
            index: i,
            title: outline.h2Sections[i]?.title || `セクション ${i + 1}`,
            error: result.error || "不明なエラー",
          });
          console.error(`❌ セクション ${i + 1}/${sectionCount} 失敗:`, result.error);
        }
      }

      // 進捗を更新
      const successCount = sections.length;
      onProgress?.(`セクション生成完了: ${successCount}/${sectionCount}`, 90);

      // 失敗したセクションがある場合、エラーを返す
      if (failedSections.length > 0) {
        const errorMessages = failedSections.map(f => `H2-${f.index + 1}「${f.title}」: ${f.error}`).join("\n");
        return {
          success: false,
          error: `以下のセクションの生成に失敗しました（${maxRetries}回試行）:\n${errorMessages}`,
          outline,
          sections, // 成功したセクションのみ
          totalCharCount,
        };
      }

      // 生成されたセクション数を確認
      if (sections.length !== sectionCount) {
        console.error(`❌ [generateFullArticle] セクション数の不整合: outline=${sectionCount}, sections=${sections.length}`);
        return {
          success: false,
          error: `セクション数の不整合が発生しました。期待: ${sectionCount}, 実際: ${sections.length}`,
          outline,
          sections,
          totalCharCount,
        };
      }

      onProgress?.("記事生成完了", 100);

      return {
        success: true,
        outline,
        sections,
        totalCharCount,
      };
    } catch (err) {
      console.error("Generate full article failed:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  },

  generateHtml(
    outline: ArticleOutline,
    sections: GeneratedSection[],
    eyecatchImage?: { pc: string; mobile: string },
    sectionImages?: Array<{ pc: string; mobile: string } | null>,
    icons?: IconInfo[],
    productLinks?: Array<{ h2Index: number; h3Index: number; product: ProductInfo }>
  ): string {
    const iconImageCss = getIconImageCss();
    const markerStyles = getMarkerStyles();
    const tableStyles = getTableStyles();
    const tocStyles = getTocStyles();
    const pochippStyles = getPochippStyles();
    const sectionStyles = getSectionStyles();
    
    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${outline.metaDescription}">
  <title>${outline.title}</title>
  <style>
    :root {
      --primary: #10b981;
      --primary-light: #d1fae5;
      --text: #1f2937;
      --text-light: #6b7280;
      --bg: #ffffff;
      --bg-light: #f9fafb;
      --yellow: rgba(254, 240, 138, 0.7);
      --pink: rgba(251, 207, 232, 0.7);
      --green: rgba(187, 247, 208, 0.7);
      --blue: rgba(191, 219, 254, 0.7);
      --bubble-left-bg: #f3f4f6;
      --bubble-right-bg: #ecfdf5;
      --warning-bg: #fef3c7;
      --warning-border: #f59e0b;
      --ok-bg: #d1fae5;
      --ok-border: #10b981;
      --info-bg: #eff6ff;
      --info-border: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', '游ゴシック', 'Yu Gothic', sans-serif;
      font-size: 16px;
      line-height: 2;
      color: var(--text);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
    }
    
    /* 見出しアニメーション */
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.02); }
    }
    @keyframes shine {
      0% { transform: translateX(-100%); }
      50%, 100% { transform: translateX(100%); }
    }
    article {
      max-width: 780px;
      margin: 0 auto;
      padding: 32px 16px;
    }
    @media (min-width: 768px) {
      article { padding: 48px 24px; }
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.4;
      margin-bottom: 32px;
      color: white;
      text-align: center;
      padding: 24px 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
      border-radius: 16px;
      box-shadow: 
        0 8px 32px rgba(99, 102, 241, 0.6),
        0 0 80px rgba(139, 92, 246, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 1;
    }
    h1::before {
      content: "";
      position: absolute;
      inset: -4px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef);
      border-radius: 20px;
      opacity: 0.3;
      z-index: -1;
      animation: pulse 3s ease-in-out infinite;
    }
    @media (min-width: 768px) {
      h1 { 
        font-size: 2rem;
        padding: 32px 28px;
      }
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 20px;
      padding: 16px 20px;
      border-radius: 12px;
      color: white;
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.15),
        0 0 40px currentColor,
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
    h2::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      transform: translateX(-100%);
      animation: shine 4s ease-in-out infinite;
    }
    @media (min-width: 768px) {
      h2 { font-size: 1.375rem; }
    }
    h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 32px 0 16px;
      padding: 12px 16px;
      background: white;
      border-radius: 8px;
      color: var(--text);
      border-left: 5px solid;
      border-image: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef) 1;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.08),
        -4px 0 12px rgba(99, 102, 241, 0.2);
    }
    p {
      margin-bottom: 1.5em;
      color: var(--text);
    }
    strong {
      font-weight: 700;
      color: var(--text);
    }
    
    /* Images */
    .eyecatch {
      width: 100%;
      border-radius: 16px;
      margin-bottom: 32px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }
    .section-image {
      width: 100%;
      border-radius: 12px;
      margin: 20px 0;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    .meta {
      color: var(--text-light);
      font-size: 0.875rem;
      margin-bottom: 24px;
      text-align: center;
    }
    
    /* Markers */
    .marker-yellow {
      background: linear-gradient(transparent 60%, var(--yellow) 60%);
      padding: 0 2px;
    }
    .marker-pink {
      background: linear-gradient(transparent 60%, var(--pink) 60%);
      padding: 0 2px;
    }
    .marker-green {
      background: linear-gradient(transparent 60%, var(--green) 60%);
      padding: 0 2px;
    }
    .marker-blue {
      background: linear-gradient(transparent 60%, var(--blue) 60%);
      padding: 0 2px;
    }
    
    /* Speech Bubbles - Pastel Colors */
    .bubble-left, .bubble-right {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 12px;
      margin: 20px 0;
    }
    .bubble-right {
      flex-direction: row-reverse;
    }
    .bubble-icon, .bubble-icon-img {
      width: 50px;
      height: 50px;
      min-width: 50px;
      border-radius: 50%;
      border: 2px solid #ddd;
      background: #f5f5f5;
      text-align: center;
      line-height: 46px;
      font-weight: bold;
      object-fit: cover;
    }
    .bubble-text {
      position: relative;
      flex: 1;
      padding: 14px 18px;
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.7;
    }
    /* Left bubble arrow */
    .bubble-left .bubble-text::before {
      content: "";
      position: absolute;
      left: -8px;
      top: 16px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-right: 8px solid var(--bubble-bg, #f3f4f6);
    }
    /* Right bubble arrow */
    .bubble-right .bubble-text::before {
      content: "";
      position: absolute;
      right: -8px;
      top: 16px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-left: 8px solid var(--bubble-bg, #e0f2fe);
    }
    /* Pastel color variations */
    .bubble-color-1 { --bubble-bg: #fce7f3; background: #fce7f3 !important; } /* Pink */
    .bubble-color-2 { --bubble-bg: #e0f2fe; background: #e0f2fe !important; } /* Sky Blue */
    .bubble-color-3 { --bubble-bg: #fef3c7; background: #fef3c7 !important; } /* Amber */
    .bubble-color-4 { --bubble-bg: #d1fae5; background: #d1fae5 !important; } /* Emerald */
    .bubble-color-5 { --bubble-bg: #ede9fe; background: #ede9fe !important; } /* Violet */
    .bubble-color-6 { --bubble-bg: #ffedd5; background: #ffedd5 !important; } /* Orange */
    .bubble-color-7 { --bubble-bg: #f3e8ff; background: #f3e8ff !important; } /* Purple */
    .bubble-color-8 { --bubble-bg: #ecfccb; background: #ecfccb !important; } /* Lime */
    .bubble-left .bubble-text { background: #f3f4f6; --bubble-bg: #f3f4f6; }
    .bubble-right .bubble-text { background: #e0f2fe; --bubble-bg: #e0f2fe; }
    
    /* Info Boxes */
    .info-box, .warning-box, .ok-box {
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 12px;
      font-size: 0.9375rem;
      line-height: 1.7;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .info-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid var(--info-border);
    }
    .warning-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid var(--warning-border);
    }
    .ok-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left: 4px solid var(--ok-border);
    }
    
    /* Check Lists */
    .check-list {
      list-style: none;
      margin: 20px 0;
      padding: 0;
    }
    .check-list li {
      position: relative;
      padding: 8px 0 8px 32px;
      line-height: 1.7;
    }
    .check-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 8px;
      width: 22px;
      height: 22px;
      background: var(--primary);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
    }
    
    /* Regular Lists */
    ul:not(.check-list):not(.toc-list):not(.toc-sublist), ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    ul:not(.check-list):not(.toc-list):not(.toc-sublist) li, ol li {
      margin-bottom: 8px;
      line-height: 1.8;
    }
    
    ${iconImageCss}
    ${markerStyles}
    ${tableStyles}
    ${tocStyles}
    ${pochippStyles}
    ${sectionStyles}
  </style>
</head>
<body>
  <article>
    <h1>${outline.title}</h1>
`;

    // Eyecatch image with responsive picture tag
    if (eyecatchImage) {
      html += `    <picture>
      <source media="(max-width: 768px)" srcset="${eyecatchImage.mobile}" type="image/webp">
      <source media="(min-width: 769px)" srcset="${eyecatchImage.pc}" type="image/webp">
      <img src="${eyecatchImage.pc}" alt="${outline.title}" class="eyecatch" width="800" height="450" loading="eager" />
    </picture>\n`;
    }

    // Generate table of contents
    html += generateTocHtml(outline);

    // Check for mismatch between outline and sections
    if (sections.length !== outline.h2Sections.length) {
      console.error(`❌ [generateHtml] セクション数の不整合を検出: outline=${outline.h2Sections.length}, sections=${sections.length}`);
      console.error(`❌ [generateHtml] outline.h2Sections:`, outline.h2Sections.map((s, i) => `H2-${i + 1}: ${s.title}`));
      console.error(`❌ [generateHtml] sections:`, sections.map((s, i) => `H2-${i + 1}: ${s.h2Title}`));
      
      // 不足しているセクションを特定
      const missingIndices: number[] = [];
      for (let i = 0; i < outline.h2Sections.length; i++) {
        if (!sections[i]) {
          missingIndices.push(i);
        }
      }
      
      if (missingIndices.length > 0) {
        console.error(`❌ [generateHtml] 以下のセクションが不足しています:`, missingIndices.map(i => `H2-${i + 1}: ${outline.h2Sections[i]?.title}`).join(", "));
        // エラーをHTMLに表示（開発者向け）
        html += `    <div style="background: #fee; border: 2px solid #f00; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h2 style="color: #c00;">⚠️ エラー: セクション生成の不整合</h2>
      <p>以下のセクションが生成されませんでした:</p>
      <ul>
        ${missingIndices.map(i => `<li>H2-${i + 1}: ${outline.h2Sections[i]?.title || "不明"}</li>`).join("")}
      </ul>
      <p>ブラウザのコンソール（F12）で詳細なエラーログを確認してください。</p>
    </div>\n`;
      }
    }

    // Generate sections with colored backgrounds - H3ごとに背景色変更
    let globalH3Index = 0;
    sections.forEach((section, h2Index) => {
      const colorScheme = SECTION_COLORS[h2Index % SECTION_COLORS.length];
      const sectionId = `section-${h2Index + 1}`;
      
      html += `
    <div class="section-wrapper" style="background: ${colorScheme.bg};">
      <h2 id="${sectionId}" style="background: linear-gradient(135deg, ${colorScheme.heading} 0%, ${colorScheme.border} 100%); border-left: 5px solid ${colorScheme.heading};">${section.h2Title}</h2>
`;
      
      // H2 section image with responsive picture tag
      if (sectionImages && sectionImages[h2Index]) {
        const sectionImage = sectionImages[h2Index];
        html += `      <picture>
        <source media="(max-width: 768px)" srcset="${sectionImage.mobile}" type="image/webp">
        <source media="(min-width: 769px)" srcset="${sectionImage.pc}" type="image/webp">
        <img src="${sectionImage.pc}" alt="${section.h2Title}" class="section-image" width="800" height="450" loading="lazy" />
      </picture>\n`;
      }
      
      // Section intro content
      html += `      <div class="section-intro">${convertMarkdownToHtml(section.content)}</div>\n`;

      // H3 contents with alternating backgrounds and product links
      section.h3Contents.forEach((h3, h3Index) => {
        const h3Id = `section-${h2Index + 1}-${h3Index + 1}`;
        const h3ColorScheme = SECTION_COLORS[globalH3Index % SECTION_COLORS.length];
        globalH3Index++;
        
        html += `
      <div class="h3-wrapper" style="background: ${h3ColorScheme.bg};">
        <h3 id="${h3Id}" style="border-left: 4px solid ${h3ColorScheme.heading}; background: white;">${h3.title}</h3>
        <div class="h3-content">${convertMarkdownToHtml(h3.content)}</div>
`;
        
        // Add product link if available
        if (productLinks) {
          const productLink = productLinks.find(p => p.h2Index === h2Index && p.h3Index === h3Index);
          if (productLink) {
            html += generatePochippHtml(productLink.product);
          }
        }
        
        html += `      </div>\n`;
      });

      html += `    </div>\n`;
    });

    // まとめセクション
    html += generateSummaryHtml(outline);

    // 記事下の目次（常に展開）
    html += generateBottomTocHtml(outline);

    // 関連記事セクション
    html += generateRelatedArticlesHtml();

    html += `  </article>
</body>
</html>`;

    // Apply icon matching
    if (icons && icons.length > 0) {
      html = replaceIconsInHtml(html, icons);
    }

    return html;
  },

  // Search product for affiliate link
  async searchProduct(
    productKeyword: string,
    h3Title: string,
    mainKeyword: string,
    h3Index: number = 0,
    usedUrls: string[] = [],
    usedAsins: string[] = [],
    htmlProducts?: Array<{ asin: string }>
  ): Promise<{ title: string; imageUrl: string; amazonUrl: string; rakutenUrl: string; asin?: string } | null> {
    const functionName = "search-products";
    console.log(`[${functionName}] リクエスト開始:`, {
      productKeyword,
      h3Title,
      mainKeyword,
      h3Index,
      usedUrlsCount: usedUrls.length,
      usedAsinsCount: usedAsins.length,
    });

    try {
      console.log(`[${functionName}] API呼び出し中...`);
      
      const response = await fetch("/api/search-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keyword: productKeyword, 
          h3Title, 
          mainKeyword, 
          h3Index, 
          usedUrls, 
          usedAsins,
          htmlProducts
        }),
      });

      if (!response.ok) {
        console.error(`[${functionName}] ❌ エラー発生:`, {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const data = await response.json() as { 
        success: boolean; 
        data?: { title: string; imageUrl: string; amazonUrl: string; rakutenUrl: string; asin?: string };
        error?: string;
      };

      if (!data?.success) {
        console.error(`[${functionName}] レスポンスエラー:`, data?.error);
        return null;
      }

      console.log(`[${functionName}] ✅ 成功`);
      return data.data || null;
    } catch (err) {
      console.error(`[${functionName}] ❌ 例外発生:`, {
        error: err,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  // Generate product links for all H3 sections
  async generateProductLinks(
    productKeyword: string,
    mainKeyword: string,
    sections: GeneratedSection[],
    onProgress?: (step: string) => void,
    htmlProducts?: Array<HtmlProduct>
  ): Promise<Array<{ h2Index: number; h3Index: number; product: ProductInfo }>> {
    const productLinks: Array<{ h2Index: number; h3Index: number; product: ProductInfo }> = [];
    let globalH3Index = 0;
    const usedUrls: string[] = [];
    const usedAsins: string[] = [];
    
    console.log(`Generating product links with product keyword: ${productKeyword}`);
    console.log(`Using main keyword for Amazon: ${mainKeyword}`);
    if (htmlProducts && htmlProducts.length > 0) {
      console.log(`HTMLから${htmlProducts.length}件の商品情報を取得しました`);
    }
    
    // HTMLから商品情報を順番に抜き出して配置
    for (let h2Index = 0; h2Index < sections.length; h2Index++) {
      const section = sections[h2Index];
      for (let h3Index = 0; h3Index < section.h3Contents.length; h3Index++) {
        if (htmlProducts && htmlProducts.length > 0) {
          const product = await this.searchProduct(
            productKeyword,
            section.h3Contents[h3Index].title,
            mainKeyword,
            globalH3Index,
            usedUrls,
            usedAsins,
            htmlProducts
          );
          
          if (product) {
            productLinks.push({
              h2Index,
              h3Index,
              product: {
                title: product.title,
                imageUrl: product.imageUrl,
                amazonUrl: product.amazonUrl,
                rakutenUrl: product.rakutenUrl,
                description: product.description || product.title,
                asin: product.asin,
                price: product.price,
              }
            });
            if (product.rakutenUrl) usedUrls.push(product.rakutenUrl);
            if (product.amazonUrl) usedUrls.push(product.amazonUrl);
            if (product.asin) usedAsins.push(product.asin);
          }
        }
        
        globalH3Index++;
      }
    }
    
    console.log(`✅ ${productLinks.length}件の商品リンクを生成しました`);
    return productLinks;
  },

  // Fetch icons helper
  async fetchIcons(): Promise<IconInfo[]> {
    return fetchAllIcons();
  },
};

/**
 * ファイル名に使えない文字を除去してサニタイズ
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "") // 無効な文字を削除
    .replace(/\s+/g, "-") // スペースをハイフンに
    .substring(0, 50); // 最大50文字
}
