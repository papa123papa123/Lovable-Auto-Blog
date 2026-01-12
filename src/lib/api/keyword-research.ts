// -*- coding: utf-8 -*-
export interface KeywordResearchResult {
  paaQuestions: string[];
  relatedSearches: string[];
  suggestions: string[];
  topResults: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

export interface KeywordResearchResponse {
  success: boolean;
  data?: KeywordResearchResult;
  error?: string;
}

export const keywordResearchApi = {
  async research(keyword: string): Promise<KeywordResearchResponse> {
    const functionName = "keyword-research";
    console.log(`[${functionName}] リクエスト開始:`, { keyword });

    try {
      console.log(`[${functionName}] API呼び出し中...`);
      
      const response = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${functionName}] ❌ エラー発生:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        let userMessage = `[${functionName}] APIリクエストに失敗しました。`;
        if (response.status === 429) {
          userMessage = "レート制限に達しました。しばらく待ってから再試行してください。";
        } else if (response.status >= 500) {
          userMessage = "サーバーエラーが発生しました。しばらく待ってから再試行してください。";
        }
        
        return { 
          success: false, 
          error: `${userMessage} (ステータス: ${response.status})`
        };
      }

      const data = await response.json() as KeywordResearchResponse;

      if (!data) {
        console.error(`[${functionName}] レスポンスデータなし`);
        return { success: false, error: "レスポンスデータがありません" };
      }

      console.log(`[${functionName}] ✅ 成功`);
      return data;
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
  },
};
