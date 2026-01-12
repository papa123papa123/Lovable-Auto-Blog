// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { prompt, alt } = await context.request.json() as { prompt?: string; alt?: string };

    if (!prompt) {
      return errorResponse("Prompt is required", 400);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return errorResponse("API key not configured", 500);
    }

    console.log(`Generating image for: ${prompt.substring(0, 50)}...`);

    // Build cinematic image generation prompt
    const imagePrompt = `【高品質な日本語ブログ記事用アイキャッチ画像】

表示テキスト: 「${prompt}」

【画像要件】
- アスペクト比: 16:9
- スタイル: モダンでプロフェッショナルなブログ記事のアイキャッチ
- 画像中央に「${prompt}」というテキストを美しいタイポグラフィで大きく配置
- 背景: テーマに関連した写真やイラスト（ぼかし効果可）
- 日本人モデルを適切に配置（テーマに合う場合）
- テキストは読みやすく、背景とのコントラストを確保

【禁止事項】
- 「8K」「HD」「Ultra」などの画質用語をテキストとして表示しない
- 英語テキストは入れない
- ウォーターマーク禁止

Generate a professional blog post featured image with Japanese text.`;

    // リトライロジック（503エラー対策）
    const maxRetries = 5;
    let lastError = "";
    
    for (let retry = 0; retry < maxRetries; retry++) {
      if (retry > 0) {
        const waitTime = Math.min(1000 * Math.pow(2, retry - 1), 10000); // 指数バックオフ: 1s, 2s, 4s, 8s, 10s
        console.log(`🔄 画像生成リトライ ${retry}/${maxRetries - 1} (${waitTime}ms待機後)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: imagePrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API image error (試行 ${retry + 1}/${maxRetries}):`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorBody: errorText,
        });
        
        lastError = errorText;
        
        // 429, 503エラーはリトライ可能
        if (response.status === 429 || response.status === 503) {
          if (retry < maxRetries - 1) {
            continue; // リトライ
          }
          return errorResponse(`画像生成API過負荷（${maxRetries}回試行）。数分後に再試行してください。`, response.status);
        }
        
        // その他のエラーは即座に返す
        if (response.status === 403) {
          return errorResponse("APIキーが無効です。設定を確認してください。", 403);
        }
        if (response.status === 404) {
          return errorResponse("画像生成APIエンドポイントが見つかりません。モデル名を確認してください。", 404);
        }
        
        return errorResponse(`画像生成エラー: ${response.status} - ${errorText.substring(0, 200)}`, 500);
      }

      const aiData = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data?: string; mimeType?: string };
              text?: string;
            }>
          }
        }>
      };
      
      const imagePart = aiData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      const imageData = imagePart?.inlineData?.data;
      
      const imageUrl = imageData ? `data:${imagePart?.inlineData?.mimeType};base64,${imageData}` : null;

      if (!imageUrl) {
        console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
        lastError = "画像データが見つかりません";
        if (retry < maxRetries - 1) {
          continue; // リトライ
        }
        return errorResponse("画像生成に失敗しました（レスポンスに画像なし）", 500);
      }

      console.log(`✅ 画像生成成功 (試行 ${retry + 1}/${maxRetries})`);

      return jsonResponse({ 
        success: true, 
        data: { 
          imageUrl,
          alt: alt || prompt,
        } 
      });
    }
    
    // すべてのリトライが失敗
    return errorResponse(`画像生成失敗（${maxRetries}回試行）: ${lastError.substring(0, 200)}`, 500);
    
  } catch (error) {
    console.error("Generate image error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
