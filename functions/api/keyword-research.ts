// -*- coding: utf-8 -*-
import { Env, corsHeaders, jsonResponse, errorResponse, optionsResponse } from "./_types";

interface SearchResult {
  paaQuestions: string[];
  relatedSearches: string[];
  suggestions: string[];
  topResults: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

// Jina AI Reader でページをスクレイプ（APIキー不要）
async function scrapeWithJina(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    console.log(`Jina scraping: ${url}`);
    
    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
      },
    });

    if (!response.ok) {
      console.error(`Jina error: ${response.status}`);
      return "";
    }

    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Jina scrape error:", error);
    return "";
  }
}

// Jina AI Search でウェブ検索（APIキー不要）
async function searchWithJina(query: string): Promise<Array<{ title: string; url: string; description: string }>> {
  try {
    const jinaUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
    console.log(`Jina searching: ${query}`);
    
    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Jina search error: ${response.status}`);
      return [];
    }

    const data = await response.json() as { data?: Array<{ title?: string; url?: string; description?: string; content?: string }> };
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((item) => ({
        title: item.title || "",
        url: item.url || "",
        description: item.description || item.content?.substring(0, 200) || ""
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Jina search error:", error);
    return [];
  }
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

    console.log(`Starting keyword research for: ${keyword}`);

    // Jina AI Search で検索
    const searchResults = await searchWithJina(keyword);
    console.log("Search results received:", searchResults.length, "results");

    // Googleの検索ページをスクレイプしてPAAと関連検索を取得
    const googleSearchUrl = `https://www.google.co.jp/search?q=${encodeURIComponent(keyword)}&hl=ja`;
    const googleContent = await scrapeWithJina(googleSearchUrl);

    let paaQuestions: string[] = [];
    let relatedSearches: string[] = [];
    let suggestions: string[] = [];

    if (googleContent) {
      console.log("Scraped Google page, extracting PAA from '関連する質問' section and related searches from page bottom...");

      // 「関連する質問」セクションからPAAを抽出
      const paaMatch = googleContent.match(/関連する質問[\s\S]*$/);
      if (paaMatch) {
        const paaSection = paaMatch[0];
        const lines = paaSection.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && 
              trimmed.length > 8 && 
              trimmed !== "関連する質問" &&
              !trimmed.startsWith("#") &&
              !trimmed.startsWith("http") &&
              (trimmed.includes("?") || trimmed.includes("？"))) {
            paaQuestions.push(trimmed);
          }
        }
      }

      // ページ最下部から関連検索を抽出（6〜8個程度）
      const lines = googleContent.split("\n");
      const bottomLines = lines.slice(-50); // 最後50行を確認
      for (const line of bottomLines) {
        const trimmed = line.trim();
        if (trimmed && 
            trimmed.length > 3 && 
            trimmed.length < 50 &&
            !trimmed.includes("関連する質問") &&
            !trimmed.startsWith("#") &&
            !trimmed.startsWith("http") &&
            !trimmed.includes("?") &&
            !trimmed.includes("？") &&
            trimmed.match(/^[ぁ-んァ-ヶー一-龯a-zA-Z0-9\s　]+$/)) {
          relatedSearches.push(trimmed);
        }
      }

      // 検索結果からサジェストを生成
      if (searchResults.length > 0) {
        suggestions = searchResults
          .map((result) => result.title || "")
          .filter((title: string) => title.length > 0);
      }
    }

    // 関連キーワードのPAAも取得
    const relatedKeywordsForPAA = relatedSearches; // 全ての関連キーワードでPAAを取得
    console.log(`Fetching PAA for ${relatedKeywordsForPAA.length} related keywords...`);
    for (const relatedKw of relatedKeywordsForPAA) {
      try {
        const relatedGoogleSearchUrl = `https://www.google.co.jp/search?q=${encodeURIComponent(relatedKw)}&hl=ja`;
        const relatedGoogleContent = await scrapeWithJina(relatedGoogleSearchUrl);
        
        if (relatedGoogleContent) {
          // 「関連する質問」セクションからPAAを抽出
          const paaMatch = relatedGoogleContent.match(/関連する質問[\s\S]*$/);
          if (paaMatch) {
            const paaSection = paaMatch[0];
            const lines = paaSection.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && 
                  trimmed.length > 8 && 
                  trimmed !== "関連する質問" &&
                  !trimmed.startsWith("#") &&
                  !trimmed.startsWith("http") &&
                  (trimmed.includes("?") || trimmed.includes("？"))) {
                paaQuestions.push(trimmed);
              }
            }
          }
        }
        
        // レート制限回避のため少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching PAA for related keyword "${relatedKw}":`, error);
      }
    }

    // 検索結果を整形
    const topResults = searchResults.map((result) => ({
      title: result.title || "",
      url: result.url || "",
      description: result.description || "",
    }));

    const result: SearchResult = {
      paaQuestions: [...new Set(paaQuestions)],
      relatedSearches: [...new Set(relatedSearches)],
      suggestions: [...new Set(suggestions)],
      topResults,
    };

    console.log("Keyword research complete:", {
      paaCount: result.paaQuestions.length,
      relatedCount: result.relatedSearches.length,
      suggestionsCount: result.suggestions.length,
      topResultsCount: result.topResults.length,
    });

    return jsonResponse({ success: true, data: result });
  } catch (error) {
    console.error("Keyword research error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
