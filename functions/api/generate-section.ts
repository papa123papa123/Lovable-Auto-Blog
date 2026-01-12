// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

interface H2Section {
  title: string;
  h3Headings: string[];
}

interface ArticleOutline {
  title: string;
  metaDescription: string;
  h2Sections: H2Section[];
}

interface GeneratedSection {
  h2Title: string;
  content: string;
  h3Contents: Array<{
    title: string;
    content: string;
  }>;
}

interface SearchedUrl {
  title: string;
  url: string;
  description: string;
}

// EETを満たす権威性サイトの個別ページを検索（Firecrawl使用）
async function searchAuthoritativeUrls(
  keyword: string,
  h3Titles: string[],
  firecrawlApiKey?: string
): Promise<SearchedUrl[]> {
  const allUrls: SearchedUrl[] = [];
  const seenUrls = new Set<string>();
  
  // 信頼できるドメインのリスト（EET基準）
  const trustedDomains = [
    '.go.jp',      // 政府・公的機関
    '.or.jp',      // 公益法人・団体
    '.ac.jp',      // 学術機関
    '.lg.jp',      // 地方自治体
    'mhlw.go.jp', 'meti.go.jp', 'env.go.jp', 'jma.go.jp', 'mext.go.jp',
    'panasonic.jp', 'sharp.co.jp', 'hitachi.co.jp', 'sony.jp', 'toshiba.co.jp',
    'daikin.co.jp', 'mitsubishielectric.co.jp', 'fujitsu.com',
    'nhk.or.jp', 'nikkei.com', 'itmedia.co.jp', 'impress.co.jp',
    'kakaku.com', 'biccamera.com', 'yodobashi.com', 'joshin.co.jp',
    'allabout.co.jp', 'mynavi.jp', 'careerconnection.jp'
  ];
  
  // 除外するドメイン（トップページやブログなど）
  const excludedPatterns = [
    '/$',           // トップページ
    '/index',       // インデックスページ
    'blog', 'ameblo', 'hatena', 'livedoor', 'fc2',
    'note.com/user', 'qiita.com/user', 'zenn.dev/user',
    'twitter.com', 'facebook.com', 'instagram.com',
    'affiliate', 'review', '2ch', '5ch'
  ];
  
  const isReliableUrl = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    // トップページを除外
    if (excludedPatterns.some(p => {
      if (p.startsWith('/')) {
        return lowerUrl.endsWith(p) || lowerUrl.includes(p + '.html');
      }
      return lowerUrl.includes(p);
    })) return false;
    // 信頼できるドメインか
    return trustedDomains.some(d => lowerUrl.includes(d));
  };
  
  try {
    // Firecrawlを使用して検索
    if (firecrawlApiKey) {
      // メインキーワード + 各H3タイトルで検索
      const searchQueries = [
        `${keyword} 公式サイト`,
        `${keyword} 公式`,
        ...h3Titles.slice(0, 3).map(h3 => `${keyword} ${h3} 公式`)
      ];
      
      for (const query of searchQueries) {
        try {
          console.log(`Searching authoritative URLs for: ${query}`);
          
          // Google検索結果をスクレイピング
          const googleSearchUrl = `https://www.google.co.jp/search?q=${encodeURIComponent(query)}&hl=ja`;
          
          const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: googleSearchUrl,
              formats: ["markdown"],
              waitFor: 3000,
            }),
          });
          
          if (response.ok) {
            const data = await response.json() as { data?: { markdown?: string } };
            const markdown = data.data?.markdown || "";
            
            // URLを抽出（http/httpsで始まるリンク）
            const urlPattern = /https?:\/\/[^\s\)]+/gi;
            const matches = [...markdown.matchAll(urlPattern)];
            
            for (const match of matches) {
              const url = match[0].replace(/[.,;:!?]+$/, ''); // 末尾の句読点を除去
              
              if (url && !seenUrls.has(url) && isReliableUrl(url)) {
                seenUrls.add(url);
                
                // URLからタイトルを推測（ドメイン名とパスから）
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                const title = pathParts.length > 0 
                  ? `${urlObj.hostname} - ${pathParts[pathParts.length - 1].replace(/[-_]/g, ' ')}`
                  : urlObj.hostname;
                
                allUrls.push({
                  title: title.substring(0, 100),
                  url: url,
                  description: `${query}に関する公式情報`
                });
                
                // 最大15件まで
                if (allUrls.length >= 15) break;
              }
            }
          }
          
          // レート制限回避のため少し待機
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (searchError) {
          console.error(`Search error for "${query}":`, searchError);
        }
      }
    } else {
      // Firecrawl APIキーがない場合はJina AIを使用（フォールバック）
      const searchQueries = [
        `${keyword} 公式サイト`,
        ...h3Titles.slice(0, 2).map(h3 => `${keyword} ${h3} 公式`)
      ];
      
      for (const query of searchQueries) {
        try {
          console.log(`Searching URLs with Jina AI for: ${query}`);
          const jinaUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
          const response = await fetch(jinaUrl, {
            headers: { 
              "Accept": "application/json",
              "X-Return-Format": "json"
            }
          });
          
          if (response.ok) {
            const data = await response.json() as { data?: Array<{ title?: string; url?: string; description?: string }> };
            const results = data.data || [];
            
            for (const item of results) {
              if (item.url && !seenUrls.has(item.url) && isReliableUrl(item.url)) {
                seenUrls.add(item.url);
                allUrls.push({
                  title: item.title || '',
                  url: item.url,
                  description: item.description || ''
                });
                
                if (allUrls.length >= 15) break;
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (searchError) {
          console.error(`Jina search error for "${query}":`, searchError);
        }
      }
    }
    
    console.log(`Found ${allUrls.length} authoritative URLs`);
    return allUrls.slice(0, 15); // 最大15件
  } catch (error) {
    console.error("URL search error:", error);
    return [];
  }
}

// 吹き出しHTMLを正規化し、Markdown記法をHTMLに変換
function normalizeBubbleHtml(content: string): string {
  let normalized = content;
  
  normalized = normalized.replace(
    /<div class="bubble-left"[^>]*>\s*<span class="bubble-icon"[^>]*>[^<]*<\/span>/gi,
    '<div class="bubble-left"><span class="bubble-icon">Q</span>'
  );
  
  normalized = normalized.replace(
    /<div class="bubble-right"[^>]*>\s*<span class="bubble-icon"[^>]*>[^<]*<\/span>/gi,
    '<div class="bubble-right"><span class="bubble-icon">A</span>'
  );
  
  normalized = normalized.replace(/^#{1,6}\s+.+$/gm, '');
  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  normalized = normalized.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  normalized = normalized.replace(/(?<!<[^>]*)\*([^*<>]+)\*(?![^<]*>)/g, '<em>$1</em>');
  normalized = normalized.replace(/(?<!<[^>]*)_(?!bubble)([^_<>]+)_(?![^<]*>)/g, '<em>$1</em>');
  
  return normalized;
}

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

interface KeywordResearchData {
  paaQuestions: string[];
  relatedSearches: string[];
  suggestions: string[];
  topResults: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { keyword, outline, sectionIndex, researchData } = await context.request.json() as {
      keyword?: string;
      outline?: ArticleOutline;
      sectionIndex?: number;
      researchData?: KeywordResearchData;
    };

    if (!keyword || !outline) {
      return errorResponse("Keyword and outline are required", 400);
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return errorResponse("API key not configured", 500);
    }

    const section = outline.h2Sections[sectionIndex ?? 0];
    if (!section) {
      return errorResponse("Invalid section index", 400);
    }

    console.log(`Generating content for section ${(sectionIndex ?? 0) + 1}: ${section.title}`);

    // キーワードリサーチの結果から外部リンクを取得（既存のtopResultsを再利用）
    let authoritativeUrls: SearchedUrl[] = [];
    if (researchData?.topResults && researchData.topResults.length > 0) {
      // topResultsをそのまま使用（信頼できるドメインのフィルタリングは省略）
      authoritativeUrls = researchData.topResults.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description
      }));
      console.log(`Using ${authoritativeUrls.length} URLs from keyword research topResults`);
    } else {
      // フォールバック：キーワードリサーチ結果がない場合のみ、追加検索
      const h3Titles = section.h3Headings || [];
      const firecrawlApiKey = context.env.FIRECRAWL_API_KEY;
      authoritativeUrls = await searchAuthoritativeUrls(keyword, h3Titles, firecrawlApiKey);
      console.log(`Fallback: Found ${authoritativeUrls.length} authoritative URLs via search`);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDate = `${currentYear}年${now.getMonth() + 1}月`;

    const isFirstSection = (sectionIndex ?? 0) === 0;
    
    // H2-1とH2-2の両方に高性能モデルを使用
    const modelName = "gemini-3-pro-preview";

    const systemPrompt = `あなたは日本の一流Webメディアで15年の経験を持つ専門ライターです。
読者の不安に共感し、具体的な数字や事実を織り交ぜたストーリー性のある自然な文章で記事へ誘導します。
「伝え方が9割」の手法をふんだんに活用し、PREP法と独自の使用感・多角的比較（実体験レポ）を融合させます。
E-E-A-Tを意識し、読者の疑問を解決して購買へ導く実用的な構成で執筆します。

今日は${currentDate}です。「最新」「今年」などの表現は${currentYear}年を基準にしてください。

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
【最優先・絶対厳守】スマホ読者意識（これが最重要）
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

スマホで読む人のために、以下を絶対に守ること：

✅ 1文：20〜25字以内（絶対最大25字）
✅ 1段落：1文のみ（2文以上は絶対禁止）
✅ 2段落書いたら必ず装飾要素を挿入
✅ 段落間に必ず空行（視覚的余白）

❌ 絶対ダメな例（長い・詰まっている）：
「iPadケースを選ぶ際には、サイズや強度、機能性など安心の判断基準を徹底解説します。せっかく可愛いケースを買ったのに、サイズが合わなくて入らなかったという失敗も多いです。デザイン重視で選んだら、落としたときに画面が割れて修理代が3万円もかかったという15年間、数多くのガジェットを見てきましたが、見た目だけで選んで後悔する人は後を絶ちません。」

✅ 正しい例（短い・読みやすい）：
「iPadケース選びで失敗したくないですよね。

実は3つだけ確認すればOKです。

それが「モデル番号」「フチの高さ」「素材」。」

【基本方針】
- 公式サイト等の数値・事実ベースの情報に生の感想を加え、圧倒的な情報量と信憑性を実現
- 読者の「自分のケースはどうなの？」という疑問に、具体的で実用的な答えを提供
- 一般論ではなく「境界条件」「判定基準」「最悪ケース」を具体的に示す

【セクション役割】
${isFirstSection 
  ? `H2-1：読者の疑問や状況に即答し、具体的な判断基準や対処法を示す。
- 読者の状況に共感し、具体的数字や事実を織り交ぜたストーリー性のある導入文から始める
- 判断基準：状況に応じた具体的な条件や目安を明確に示す
- 多角的な判断方法：複数の観点から判断できる方法を具体的に示す
- リスクと対策：想定されるリスクと、それに対する具体的な対策を提示する`
  : `H2-2：実践的な手順や方法を具体的に示す。
- 読者の状況に共感し、具体的数字や事実を織り交ぜたストーリー性のある導入文から始める
- 成功のコツと、より良い選択肢を含む実践的な内容
- 経験談：「やってみたら〜」「最初は失敗した」を各H3に1回含める`}

【H3執筆ルール - 結論ファースト構成】
- 1文目：結論を書く（見出しの疑問に対する答え）
- 2文目：理由または条件を書く
- 3文目以降：表・吹き出し・リストを配置
- 途中から読んでも理解できる独立完結型で書く
- 各H3は800字以上（必須・絶対に守ること）
- H2-1の各H3は特に詳しく、境界条件・判定基準・具体例を豊富に含めること（🚨1文は短く20〜25字厳守、文の数を増やして1000字以上🚨）

【断言ルール - Google検索で裏を取って断言】
- 曖昧語禁止：「場合による」「しばらく」→ 数字・条件で断言
- 「一般的に」→「メーカー公式では / 専門家によると」に変換
- 検索結果にない数字は書かない（ハルシネーション厳禁）
- 境界条件を具体化：「◯◯なら△△、□□なら××」と書く

【外部リンク強化（必須）】
🚨🚨🚨 URL使用の絶対ルール（リンク切れ防止のため厳守）🚨🚨🚨
- ★「参照可能URL」リストにあるURLのみ使用可能（コピペ厳守）★
- ★リストにないURLは絶対に書かない（想像・推測・類推・編集・短縮すべて禁止）★
- ★URLを自分で作成しない・既存URLを改変しない★
- ★リストが空の場合は外部リンクを一切含めない★
- リストにURLがある場合：記事全体で6個以上必ず含める（各H3に1-2個、H2導入文にも1個）
- リンクテキストは自然な文脈で、何へのリンクか明確に（例：「厚生労働省のガイドラインによると」）
- ハイパーリンク形式：<a href="URL" target="_blank" rel="noopener noreferrer">リンクテキスト</a>
- URLはリストから完全コピー＆ペーストのみ（1文字でも変えたらリンク切れになる）

【装飾要素（必須・スマホ見やすさのため多用）】
🚨 連続する長文を避け、2-3段落ごとに必ず装飾要素を挟むこと 🚨
- ✅ **表**: 各H3に1個以上（3列以内、1セル10文字以内）。長文の合間に配置して視覚的な区切りを作る。表のヘッダーと項目には自動的に下線マーカーが付きます。<table class="info-table"><tr><th>項目</th><th>内容A</th><th>内容B</th></tr><tr><td>項目名</td><td>説明</td><td>説明</td></tr></table>
- ✅ **吹き出し**: 各H3に1セット以上（疑問→解決の2行）。長文の合間に配置。<div class="bubble-left"><span class="bubble-icon">Q</span><div class="bubble-text">質問</div></div><div class="bubble-right"><span class="bubble-icon">A</span><div class="bubble-text">回答</div></div>
- ✅ **太字＋マーカー**: 30個以上必須！重要箇所は必ずマーカー付き太字に。<mark class="marker-yellow"><strong>重要</strong></mark>
- ✅ **マーカー多色使い**: 各H3で5色以上使用！色で情報を分類！
  ・重要ポイント・結論: <mark class="marker-yellow"><strong>黄色マーカー</strong></mark>
  ・数字・期限・具体値: <mark class="marker-blue"><strong>青色下線</strong></mark>
  ・注意事項・リスク: <mark class="marker-pink"><strong>ピンクマーカー</strong></mark>
  ・メリット・成功例: <mark class="marker-green"><strong>緑色マーカー</strong></mark>
  ・おすすめ・ポイント: <mark class="marker-orange"><strong>オレンジマーカー</strong></mark>
  ・専門用語・固有名詞: <mark class="marker-purple"><strong>紫色下線</strong></mark>
  ・比較項目（同カテゴリは同色）: <mark class="marker-teal"><strong>ティール下線</strong></mark>
- ✅ **リスト**: 多用（各H3に2-3個推奨）。長文を分割して見やすくする。<ul class="check-list"><li>項目</li></ul>
- ✅ **ボックス**: 多用（各H3に1-2個推奨）。視覚的な区切りを作る。<div class="info-box">📌 まとめ・ポイント</div> / <div class="warning-box">⚠️ 注意事項</div> / <div class="ok-box">✅ 安心ポイント</div>

【禁止事項】
- 「〜について解説します」「〜を見ていきましょう」等の前置き
- 「まず」「次に」「ここでは」等の接続詞での水増し
- 同じ内容を言い換えて繰り返す
- 結論を最後まで引っ張る構成
- 「〜かもしれません」「〜の可能性があります」で逃げる
- ポエム的寄り添い（「不安ですよね」「心配になりますよね」）
- 前振り・次章誘導（「詳しくは後述」「次の章で解説」）
- マークダウン記法 → HTMLタグのみ（<strong>、<mark>、<em>）
- 🚨🚨🚨 1文25字以上、2文以上の連続段落（スマホで見づらくなるため絶対禁止）🚨🚨🚨
- 🚨🚨🚨 表が4列以上、または1セルが11文字以上（スマホで見づらくなるため絶対禁止）🚨🚨🚨
- 外部リンクなしの記事（必ず6個以上含める）
- 見出し追加・変更・削除（指定されたH2/H3のみ使用）

【H2導入文の書き方】
- 読者の不安に共感し、具体的数字や事実を織り交ぜたストーリー性のある自然な文章
- 200-300字程度
- 「伝え方が9割」の手法を活用（相手の好きなこと、嫌いなこと回避、選択の自由など）

【出力形式】
Markdown形式で以下の構造で出力してください：

## H2見出し

H2導入文（200-300字、読者の不安に共感し具体的数字や事実を織り交ぜたストーリー性のある文章）

### H3見出し1

本文（800字以上、結論ファースト、表・吹き出し・リスト・マーカー・太字・外部リンクを含む）

### H3見出し2

本文（800字以上...）

🚨 重要：JSON形式ではなく、上記のMarkdown形式で出力してください 🚨`;

    // 検索済みURLをプロンプトに追加
    const urlListText = authoritativeUrls.length > 0 
      ? `\n【参照可能URL - 検索で確認済みの権威性サイト】\n以下のURLは実在が確認されています。記事内で適切に引用してください：\n${authoritativeUrls.map(u => `- [${u.title}](${u.url}) - ${u.description}`).join('\n')}\n\n🚨🚨🚨 URL使用の絶対ルール 🚨🚨🚨\n★ 上記リストにあるURLのみ使用可能（コピペ厳守）\n★ リストにないURLは絶対に書かない（想像・推測・類推禁止）\n★ URLを自分で作らない・編集しない・短縮しない\n★ リンクが必要でリストにない場合は、リンクなしで書く\n★ 記事全体で最低6個の外部リンクを含めること（リストから選択）\n★ 各H3に1-2個、H2導入文にも1個のリンクを自然に配置\n`
      : `\n🚨🚨🚨 重要：外部リンクなし 🚨🚨🚨\n★ 検索で適切なURLが見つかりませんでした\n★ この記事では外部リンクを一切含めないでください\n★ URLを自分で作成・推測・想像することは絶対禁止\n★ リンクなしで内容を充実させてください\n`;

    const userPrompt = `記事テーマ: ${outline.title}
メインキーワード: ${keyword}
現在の日付: ${currentDate}
${urlListText}
以下のセクションの詳細なコンテンツを生成してください：

H2見出し: ${section.title}
H3見出し一覧:
${section.h3Headings.map((h3: string, i: number) => `${i + 1}. ${h3}`).join("\n")}

🚨🚨🚨 最重要：スマホ読みやすさ 🚨🚨🚨
✅ 1文：20〜25字以内（絶対最大25字）
✅ 1段落：1文のみ（2文以上は絶対禁止）
✅ 2段落書いたら必ず装飾要素（表・吹き出し・リスト・ボックス）
✅ 表：3列以内、1セル10文字以内（厳守）

【重要：執筆ルール】
✅ H2導入文：読者の不安に共感し、具体的数字や事実を織り交ぜたストーリー性のある自然な文章（200-300字）
✅ 各H3：800字以上（必須）、H2-1の各H3は1000字以上推奨（🚨1文20〜25字厳守、文の数で稼ぐ🚨）、結論ファースト構成（1文目で結論、2文目で理由、3文目以降で装飾要素）
✅ 装飾要素：各H3に表1個（3列以内、1セル10文字以内）、吹き出し1セット、マーカー付き太字30個以上（必須！）、リスト適宜。連続する長文を避け、2-3段落ごとに装飾要素を挟む
✅ マーカー多色使い：各H3で5色以上使用！黄色（重要）、青下線（数字）、ピンク（注意）、緑（メリット）、オレンジ（おすすめ）、紫下線（専門用語）、ティール下線（比較項目）を使い分ける
✅ 太字は必ずマーカーとセット：<mark class="marker-yellow"><strong>このように</strong></mark>
🚨🚨🚨 外部リンク：超重要！リンク切れ防止ルール 🚨🚨🚨
  ★「参照可能URL」リストにあるURLのみ使用（完全コピペ）
  ★リストにないURLは絶対に書かない（想像禁止・推測禁止・編集禁止）
  ★リストが空なら外部リンクは一切含めない
  ★リストにURLがある場合：記事全体で6個以上必須（各H3に1-2個、H2導入文にも1個）
  ★URLは1文字も変えずにコピー＆ペースト（短縮禁止・改変禁止）
✅ リンクテキスト：自然な文脈で、何へのリンクか明確に（例：「厚生労働省のガイドラインによると」）
✅ マークダウン禁止 → HTMLタグのみ（<strong>、<mark class="marker-xxx">、<em>、<a>、<table>、<ul>など）
✅ 経験談：各H3に1回（「やってみたら〜」「最初は失敗した」など）
✅ 断言：曖昧語禁止、「場合による」→「◯◯なら△△、□□なら××」と具体化
${isFirstSection ? "✅ H2-1特別ルール：境界条件・判定基準・具体例を豊富に含め、読者の不安を徹底的に解消すること。🚨ただし1文20〜25字は絶対厳守🚨 情報量を増やすには文の数を増やす（1文は短く、文の数で1000字以上にする）" : ""}

【吹き出しの形式 - これを厳守】
読者: <div class="bubble-left"><span class="bubble-icon">Q</span><div class="bubble-text">質問</div></div>
専門家: <div class="bubble-right"><span class="bubble-icon">A</span><div class="bubble-text">回答</div></div>

各H3見出しについて、${isFirstSection ? "1000字以上（推奨）" : "800字以上"}の読みやすい解説を書いてください。
${isFirstSection ? "H2-1の各H3は特に詳しく、境界条件・判定基準・具体例を豊富に含めてください。🚨重要：1文20〜25字厳守。1000字にするには文の数を増やす（1文は短く保つ）🚨" : ""}

🚨🚨🚨 最重要：URL使用ルール（リンク切れ防止） 🚨🚨🚨
★ 上記「参照可能URL」リストにあるURLのみ使用可能
★ URLを自分で作成・推測・想像・編集・短縮することは絶対禁止
★ リストにないURLは絶対に書かない
★ リストが空の場合は外部リンクを一切含めない
★ URLはリストから完全コピー＆ペーストのみ（1文字でも変えたらリンク切れ）

🚨🚨🚨 出力形式：Markdown形式（JSON禁止）🚨🚨🚨
以下の形式で出力してください：

## ${section.title}

H2導入文をここに（200-300字）

### ${section.h3Headings[0] || 'H3-1'}

H3本文をここに（800字以上）

### ${section.h3Headings[1] || 'H3-2'}

H3本文をここに（800字以上）

（以下同様に全てのH3を出力）`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        tools: [{ googleSearch: {} }],
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
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return errorResponse("レート制限に達しました。しばらく待ってから再試行してください。", 429);
      }
      if (response.status === 403) {
        return errorResponse("APIキーが無効です。", 403);
      }
      
      return errorResponse(`AI API error: ${response.status}`, 500);
    }

    const aiData = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    };
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("No content in AI response");
      return errorResponse("AI response was empty", 500);
    }

    console.log("AI response received, parsing section content...");

    // Markdown形式からセクションを抽出
    let generatedSection: GeneratedSection;
    try {
      // コードブロックがあれば除去
      let markdownContent = content.replace(/```(?:markdown|md)?\s*([\s\S]*?)\s*```/g, '$1').trim();
      
      // H2見出しを抽出（最初のH2）
      const h2Match = markdownContent.match(/^##\s+(.+)$/m);
      const h2Title = h2Match ? h2Match[1].trim() : section.title;
      
      // H2導入文を抽出（H2の次の行から最初のH3まで）
      const h2IntroMatch = markdownContent.match(/^##\s+.+$\n\n([\s\S]+?)(?=\n###\s+|$)/m);
      const h2Content = h2IntroMatch ? h2IntroMatch[1].trim() : "";
      
      // H3セクションを抽出
      const h3Sections: Array<{ title: string; content: string }> = [];
      const h3Regex = /###\s+(.+?)\n\n([\s\S]+?)(?=\n###\s+|$)/g;
      let h3Match;
      
      while ((h3Match = h3Regex.exec(markdownContent)) !== null) {
        h3Sections.push({
          title: h3Match[1].trim(),
          content: h3Match[2].trim()
        });
      }
      
      // H3が見つからない場合は、全体をH2コンテンツとして扱う
      if (h3Sections.length === 0) {
        console.warn("No H3 sections found, using entire content as H2 intro");
        generatedSection = {
          h2Title,
          content: markdownContent.replace(/^##\s+.+$/m, '').trim(),
          h3Contents: section.h3Headings.map(h3 => ({
            title: h3,
            content: "コンテンツの生成に失敗しました。"
          }))
        };
      } else {
        generatedSection = {
          h2Title,
          content: h2Content,
          h3Contents: h3Sections
        };
      }
      
      console.log(`Parsed: H2="${h2Title}", H3 count=${h3Sections.length}`);
    } catch (parseError) {
      console.error("Failed to parse Markdown content:", parseError);
      console.error("Content that failed to parse:", content);
      return errorResponse("Failed to parse AI response", 500);
    }

    generatedSection.content = normalizeBubbleHtml(generatedSection.content || "");
    generatedSection.h3Contents = generatedSection.h3Contents?.map(h3 => ({
      ...h3,
      content: normalizeBubbleHtml(h3.content || "")
    })) || [];

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');
    let charCount = stripHtml(generatedSection.content || "").length;
    generatedSection.h3Contents?.forEach(h3 => {
      charCount += stripHtml(h3.content || "").length;
    });

    console.log(`Section ${(sectionIndex ?? 0) + 1} generated: ${charCount} characters`);

    return jsonResponse({ 
      success: true, 
      data: generatedSection,
      charCount 
    });
  } catch (error) {
    console.error("Generate section error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
