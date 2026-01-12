// -*- coding: utf-8 -*-
interface Env {
  GEMINI_API_KEY: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ success: false, error: message }, status);
}

function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { keyword } = await context.request.json() as { keyword?: string };

    if (!keyword) {
      return errorResponse("Keyword is required", 400);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return errorResponse("API key not configured", 500);
    }

    console.log(`Translating keyword to slug: ${keyword}`);

    const prompt = `以下の日本語キーワードを英語に翻訳してください。
翻訳結果は、URLスラッグとして使用できるように、簡潔で分かりやすい英単語またはフレーズにしてください。
スペースは使わず、単語間はハイフンで区切ってください。

日本語キーワード: ${keyword}

出力形式: 英語のスラッグのみを出力してください（説明や追加のテキストは不要）。

例:
- 「iPad ケース おすすめ」 → "ipad-case-recommended"
- 「充電 すぐ切れる」 → "battery-drains-quickly"
- 「漫画 無料」 → "manga-free"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return errorResponse("レート制限に達しました。しばらく待ってから再試行してください。", 429);
      }
      if (response.status === 403) {
        return errorResponse("APIキーが無効です。", 403);
      }
      
      return errorResponse(`AI API error: ${response.status}`, 500);
    }

    const aiData = await response.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("No content in AI response");
      return errorResponse("翻訳結果が空でした", 500);
    }

    // 翻訳結果をクリーンアップ（改行や余分な文字を削除）
    const slug = content
      .trim()
      .toLowerCase()
      .replace(/["""]/g, '')
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .substring(0, 100);

    console.log(`Translation completed: ${keyword} → ${slug}`);

    return jsonResponse({ 
      success: true,
      slug,
      original: keyword,
    });
  } catch (err) {
    console.error("Exception in translate-slug:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(errorMessage);
  }
};
