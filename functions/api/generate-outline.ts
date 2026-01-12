// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

interface KeywordResearchData {
  paaQuestions: string[];
  relatedSearches: string[];
  suggestions: string[];
}

interface ArticleOutline {
  title: string;
  metaDescription: string;
  h2Sections: Array<{
    title: string;
    h3Headings: string[];
  }>;
}

// H2/H3の数を調整（除外ロジックなし、警告のみ）
function enforceH3Limits(h3s: string[], sectionIdx: number, mainKeywordWords: string[]): string[] {
  // 警告のみ：メインKWを含むH3があればログに記録（削除はしない）
  h3s.forEach(h3 => {
    const containsKw = mainKeywordWords.some(word => h3.includes(word));
    if (containsKw) {
      console.warn(`⚠️ H2-${sectionIdx + 1} H3 contains main keyword: "${h3}" (should be paraphrased)`);
    }
  });
  
  // 6個超過の場合のみ切り詰め
  if (h3s.length > 6) {
    console.log(`Trimming H3 from ${h3s.length} to 6 for H2-${sectionIdx + 1}`);
    h3s = h3s.slice(0, 6);
  }
  
  // 5個未満の場合は警告（AIが正しく生成すべき）
  if (h3s.length < 5) {
    console.warn(`⚠️ H2-${sectionIdx + 1} has only ${h3s.length} H3 (expected 5-6)`);
  }
  
  console.log(`✓ H2-${sectionIdx + 1}: ${h3s.length} H3 headings`);
  
  return h3s;
}

// H2セクションを1つ生成する
async function generateH2Section(
  apiKey: string,
  keyword: string,
  mainKeywordWords: string[],
  paaQuestions: string[],
  relatedSearches: string[],
  sectionType: "h2-1" | "h2-2",
  modelName: string
): Promise<{ title: string; h3Headings: string[] }> {
  const isH2_1 = sectionType === "h2-1";
  const paaLabel = isH2_1 ? "心配・疑問系PAA" : "実践・手順系PAA";
  const role = isH2_1 
    ? "心配を抱える読者を安心させる。大丈夫かどうかの判断基準と、安心できる条件を明示する。"
    : "これから取り組む人に最適な方法を提案する。成功のコツと、より良い選択肢を含む。";

  const systemPrompt = `読者の「自分のケースはどうなの？」という疑問に、具体的で実用的な答えを提供する記事のH2セクションを1つ設計します。
一般論ではなく「安心できる条件」「適切な判断基準」「万が一の場合の対処法」を示し、読者が自信を持って行動できるようにサポートします。

【🚨🚨🚨 最重要ルール 🚨🚨🚨】
★ H2見出しには「${mainKeywordWords.join("」と「")}」の全ての語を必ず含める（必須・絶対）
★ H3見出しには「${mainKeywordWords.join("、")}」の構成語を一切使用禁止（必須・絶対）

【絶対ルール】
- H3見出しは5〜6個のみ（4個以下・7個以上禁止）
- H3見出しは必ずPAAから作成（勝手に創作禁止）

【このH2の役割】
${role}${paaLabel}を優先。H3は5〜6個。

【H3見出しの作り方 - 最重要】
★1つのH3見出しに、可能なら3つ以上のPAAをまとめて入れること★
★H3見出しには「${mainKeywordWords.join("、")}」の構成語を一切使用禁止★
- 関連するPAAをグループ化し、1つのH3見出しで複数のPAAを扱う
- 例：PAAが「壊れることはありますか？」「故障の原因は？」「修理方法は？」なら、H3見出しは「壊れることはある？故障の原因と修理方法を解説」（メインKW構成語は使用しない）
- 関連性の高いPAAをまとめることで、読者の疑問を効率的に解決できる
- 各H3見出しの下で、まとめたPAAすべてに回答する
- メインキーワードの構成語「${mainKeywordWords.join("、")}」はH3見出しに含めない（言い換えも禁止）

必ず以下のJSON形式のみを出力してください：
{
  "title": "「${mainKeywordWords.join("」と「")}」の全語を含む見出し",
  "h3Headings": ["「${mainKeywordWords.join("、")}」を含まない見出し1", "「${mainKeywordWords.join("、")}」を含まない見出し2", "..."]
}

※重要：H2見出しには必ず「${mainKeywordWords.join("」と「")}」の全ての語を含め、H3見出しには「${mainKeywordWords.join("、")}」の構成語を一切使用しないこと。`;

  const paaContext = paaQuestions.length > 0 
    ? `\n\n【${paaLabel}】:\n${paaQuestions.join("\n")}`
    : "";
  const relatedContext = relatedSearches.length > 0
    ? `\n\n【関連検索キーワード】:\n${relatedSearches.join("\n")}`
    : "";

  const userPrompt = `メインキーワード: ${keyword}
メインキーワードの構成語（H3に使用禁止）: ${mainKeywordWords.join("、")}${paaContext}${relatedContext}

【🚨🚨🚨 最重要確認事項 🚨🚨🚨】
★ H2見出しに「${mainKeywordWords.join("」と「")}」の全ての語を含める（必須・絶対）
★ H3見出しに「${mainKeywordWords.join("、")}」の構成語を一切使用しない（必須・絶対）

【重要】
- ${paaLabel}から5〜6個のH3見出しを作成
- 各H3見出しには、可能なら3つ以上のPAAをまとめて入れる
- 関連性の高いPAAをグループ化し、1つの見出しで複数の疑問を解決できるようにする

【確認事項】
✓ H3は5〜6個
✓ H3見出しは提供されたPAAから作成（勝手に創作禁止）
✓ 1つのH3見出しに可能なら3つ以上のPAAをまとめる

【🚨 最重要：H3の品質維持 🚨】
各H3は、前のH3と同じ熱量と文字数を維持してください。後半での省略は厳禁です。

JSON形式のみで出力してください。`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
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
    console.error(`Gemini API error for ${sectionType}:`, response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiData = await response.json() as { 
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> 
  };
  const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error(`AI response was empty for ${sectionType}`);
  }

  // Parse the JSON from the response
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
  const jsonStr = jsonMatch[1] || content;
  const parsed = JSON.parse(jsonStr.trim()) as { title: string; h3Headings: string[] };

  // H2見出しから番号ラベルを削除
  const cleanedTitle = parsed.title
    .replace(/【H2-\d+】/g, "")
    .replace(/\[H2-\d+\]/g, "")
    .replace(/H2-\d+/g, "")
    .replace(/H2\d+/g, "")
    .replace(/^[【\[（\(]?\d+[）\)\]】]?\s*[-:]?\s*/g, "")
    .trim();

  // H3を調整
  const adjustedH3s = enforceH3Limits(parsed.h3Headings || [], isH2_1 ? 0 : 1, mainKeywordWords);

  return {
    title: cleanedTitle,
    h3Headings: adjustedH3s
  };
}

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { keyword, researchData } = await context.request.json() as { 
      keyword?: string; 
      researchData?: KeywordResearchData 
    };

    if (!keyword) {
      return errorResponse("Keyword is required", 400);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return errorResponse("API key not configured", 500);
    }

    console.log(`Generating outline for keyword: ${keyword}`);

    // Extract main keyword words for validation
    const mainKeywordWords = keyword.split(/[\s　]+/).filter((w: string) => w.length > 0);
    console.log(`Main keyword words: ${mainKeywordWords.join(", ")}`);

    // Classify PAA questions by emotion type
    let fearPAAs: string[] = [];
    let procedurePAAs: string[] = [];
    
    if (researchData?.paaQuestions) {
      researchData.paaQuestions.forEach((q: string) => {
        // Fear/anxiety PAAs: 壊れる、大丈夫、どうなる、すぐ、ダメ、故障
        if (/壊れ|大丈夫|どうなる|すぐ|ダメ|故障|危険|失敗|間違/.test(q)) {
          fearPAAs.push(q);
        } else {
          // Procedural PAAs: いつ、何時間、なぜ、メーカー、方法、やり方
          procedurePAAs.push(q);
        }
      });
    }

    // H2-1とH2-2を並列で生成（高速化）
    console.log("Generating H2-1 and H2-2 sections in parallel...");
    const [h2_1, h2_2] = await Promise.all([
      generateH2Section(
        apiKey,
        keyword,
        mainKeywordWords,
        fearPAAs,
        researchData?.relatedSearches || [],
        "h2-1",
        "gemini-3-pro-preview"
      ),
      generateH2Section(
        apiKey,
        keyword,
        mainKeywordWords,
        procedurePAAs,
        researchData?.relatedSearches || [],
        "h2-2",
        "gemini-3-pro-preview"
      )
    ]);

    // H2-1の生成結果からタイトルとメタディスクリプションを生成
    const titlePrompt = `メインキーワード: ${keyword}

以下のH2-1セクションに基づいて、記事のタイトルとメタディスクリプションを生成してください。

H2-1見出し: ${h2_1.title}
H2-1のH3見出し: ${h2_1.h3Headings.join("、")}

以下のJSON形式で出力してください：
{
  "title": "読者の疑問を解決するタイトル（メインKW含む、30-45文字）",
  "metaDescription": "安心と実用的なアドバイスが得られることが伝わるメタディスクリプション（120-160文字）"
}`;

    const titleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: titlePrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    let title = `${keyword}について知っておきたいこと`;
    let metaDescription = `${keyword}に関する疑問を解決し、安心して行動できるための情報を提供します。`;

    if (titleResponse.ok) {
      const titleData = await titleResponse.json() as { 
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> 
      };
      const titleContent = titleData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (titleContent) {
        try {
          const jsonMatch = titleContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, titleContent];
          const jsonStr = jsonMatch[1] || titleContent;
          const parsed = JSON.parse(jsonStr.trim()) as { title?: string; metaDescription?: string };
          if (parsed.title) title = parsed.title;
          if (parsed.metaDescription) metaDescription = parsed.metaDescription;
        } catch (e) {
          console.warn("Failed to parse title/metaDescription, using defaults");
        }
      }
    }

    // 合体してoutlineを作成
    const outline: ArticleOutline = {
      title,
      metaDescription,
      h2Sections: [h2_1, h2_2]
    };

    // Validate H2 contains all main keywords
    const validateH2 = (h2Title: string): boolean => {
      return mainKeywordWords.every((word: string) => h2Title.includes(word));
    };

    // Validate H3 contains NO main keywords
    const validateH3 = (h3Title: string): boolean => {
      return !mainKeywordWords.some((word: string) => h3Title.includes(word));
    };

    // Log validation results
    outline.h2Sections.forEach((section, i) => {
      const h2Valid = validateH2(section.title);
      if (h2Valid) {
        console.log(`✓ H2-${i + 1} "${section.title}" - メインKW全語を含む`);
      } else {
        console.error(`✗✗✗ H2-${i + 1} "${section.title}" - メインKW全語を含まない（最重要ルール違反）`);
        console.error(`  必要な語: ${mainKeywordWords.join("、")}`);
      }
      console.log(`H2-${i + 1} has ${section.h3Headings?.length || 0} H3 headings`);
      
      section.h3Headings?.forEach((h3, j) => {
        const h3Valid = validateH3(h3);
        if (h3Valid) {
          console.log(`  ✓ H3-${j + 1} "${h3}" - メインKW構成語を含まない`);
        } else {
          console.error(`  ✗✗✗ H3-${j + 1} "${h3}" - メインKW構成語を含む（最重要ルール違反）`);
          console.error(`    禁止語: ${mainKeywordWords.join("、")}`);
        }
      });
    });

    console.log("Outline generated successfully:", {
      title: outline.title,
      h2Count: outline.h2Sections.length,
      h3Counts: outline.h2Sections.map(s => s.h3Headings?.length || 0),
    });

    return jsonResponse({ success: true, data: outline });
  } catch (error) {
    console.error("Generate outline error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
