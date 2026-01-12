// -*- coding: utf-8 -*-
export interface IconInfo {
  name: string;
  url: string;
  dataUrl?: string; // Base64データURL（プレビュー用）
  keywords: string[];
}

// キーワードをアイコンファイル名から抽出
function extractKeywords(filename: string): string[] {
  // 拡張子を除去
  const nameWithoutExt = filename.replace(/\.(webp|png|jpeg|jpg|svg)$/i, "");
  // ハイフン、アンダースコア、スペースで分割
  const parts = nameWithoutExt.split(/[-_\s]+/);
  // 数字のみの部分は除外、小文字に変換
  return parts
    .filter(part => part.length > 0 && !/^\d+$/.test(part))
    .map(part => part.toLowerCase());
}

// 画像をBase64データURLに変換
async function fetchIconAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ストレージからアイコン一覧を取得
export async function fetchAllIcons(): Promise<IconInfo[]> {
  try {
    const response = await fetch("/api/icons/list");
    
    if (!response.ok) {
      console.error("Failed to fetch icons:", response.status);
      return [];
    }

    const result = await response.json() as { 
      success: boolean; 
      data?: Array<{ name: string; url: string; size: number }>;
      error?: string;
    };
    
    if (!result.success || !result.data) {
      console.error("Failed to fetch icons:", result.error);
      return [];
    }

    const icons: IconInfo[] = result.data
      .filter(file => /\.(webp|png|jpeg|jpg|svg)$/i.test(file.name))
      .map(file => ({
        name: file.name,
        url: file.url,
        keywords: extractKeywords(file.name),
      }));

    console.log(`Fetched ${icons.length} icons from storage`);
    return icons;
  } catch (err) {
    console.error("Error fetching icons:", err);
    return [];
  }
}

// アイコンをBase64データURL付きで取得（HTML埋め込み用）
export async function fetchIconsWithDataUrls(icons: IconInfo[], maxIcons: number = 20): Promise<IconInfo[]> {
  // ランダムに選択（全部取得すると重いので）
  const shuffled = [...icons].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, maxIcons);
  
  console.log(`Fetching ${selected.length} icons as data URLs...`);
  
  const iconsWithData = await Promise.all(
    selected.map(async (icon) => {
      const dataUrl = await fetchIconAsDataUrl(icon.url);
      return { ...icon, dataUrl: dataUrl || undefined };
    })
  );
  
  // dataUrlが取得できたものだけを返す
  const validIcons = iconsWithData.filter(icon => icon.dataUrl);
  console.log(`Got ${validIcons.length} icons with data URLs`);
  
  return validIcons;
}

// テキストからキーワードを抽出（日本語対応）
function extractTextKeywords(text: string): string[] {
  // HTMLタグを除去
  const plainText = text.replace(/<[^>]*>/g, "");
  
  // 一般的な日本語の単語パターン
  const patterns = [
    /[ぁ-んー]+/g,     // ひらがな
    /[ァ-ンー]+/g,     // カタカナ
    /[一-龯]+/g,       // 漢字
    /[a-zA-Z]+/g,      // 英語
  ];
  
  const keywords: string[] = [];
  patterns.forEach(pattern => {
    const matches = plainText.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  return keywords;
}

// テキストに最もマッチするアイコンを見つける
export function findMatchingIcon(
  text: string,
  icons: IconInfo[],
  usedIcons: Set<string> = new Set()
): IconInfo | null {
  if (icons.length === 0) return null;
  
  const textKeywords = extractTextKeywords(text);
  
  // 各アイコンのマッチスコアを計算
  const scoredIcons = icons.map(icon => {
    let score = 0;
    
    // アイコンのキーワードとテキストのキーワードを比較
    icon.keywords.forEach(iconKeyword => {
      textKeywords.forEach(textKeyword => {
        // 完全一致
        if (iconKeyword === textKeyword) {
          score += 10;
        }
        // 部分一致
        else if (iconKeyword.includes(textKeyword) || textKeyword.includes(iconKeyword)) {
          score += 5;
        }
      });
    });
    
    // 未使用アイコンを優先
    if (usedIcons.has(icon.name)) {
      score -= 2;
    }
    
    return { icon, score };
  });
  
  // スコアでソート
  scoredIcons.sort((a, b) => b.score - a.score);
  
  // スコアが0より大きいものがあればそれを返す
  if (scoredIcons[0].score > 0) {
    return scoredIcons[0].icon;
  }
  
  // マッチがない場合はランダムに選択
  const availableIcons = icons.filter(icon => !usedIcons.has(icon.name));
  if (availableIcons.length > 0) {
    return availableIcons[Math.floor(Math.random() * availableIcons.length)];
  }
  
  // すべて使用済みの場合はランダム
  return icons[Math.floor(Math.random() * icons.length)];
}

// アップロードされたアイコンからランダムに選択
function getRandomIcon(icons: IconInfo[], usedIcons: Set<string>): IconInfo | null {
  if (icons.length === 0) return null;
  
  // 未使用のアイコンを優先的に選択
  const availableIcons = icons.filter(icon => !usedIcons.has(icon.name));
  if (availableIcons.length > 0) {
    return availableIcons[Math.floor(Math.random() * availableIcons.length)];
  }
  
  // すべて使用済みの場合は全体からランダムに選択
  return icons[Math.floor(Math.random() * icons.length)];
}

// HTMLの吹き出しアイコンを実際のアイコン画像に置換
export function replaceIconsInHtml(html: string, icons: IconInfo[]): string {
  if (icons.length === 0) {
    console.log("No icons available for replacement");
    return html;
  }
  
  const usedIcons = new Set<string>();
  let result = html;
  let colorIndex = 0;
  
  // パステルカラーのバリエーション（8色）
  const pastelColors = [
    { class: 'bubble-color-1', bg: '#fce7f3' }, // Pink
    { class: 'bubble-color-2', bg: '#e0f2fe' }, // Sky Blue
    { class: 'bubble-color-3', bg: '#fef3c7' }, // Amber
    { class: 'bubble-color-4', bg: '#d1fae5' }, // Emerald
    { class: 'bubble-color-5', bg: '#ede9fe' }, // Violet
    { class: 'bubble-color-6', bg: '#ffedd5' }, // Orange
    { class: 'bubble-color-7', bg: '#f3e8ff' }, // Purple
    { class: 'bubble-color-8', bg: '#ecfccb' }, // Lime
  ];
  
  // 全ての吹き出しを検索して置換
  result = result.replace(
    /<div class="bubble-(left|right)"[^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div|<p|<ul|<table|<h|$|\n\n))/gi,
    (match, direction, innerContent) => {
      // bubble-text内のテキストを抽出
      const textMatch = innerContent.match(/<div class="bubble-text"[^>]*>([\s\S]*?)<\/div>/i);
      if (!textMatch) return match;
      
      // アップロードされたアイコンからランダムに選択
      const icon = getRandomIcon(icons, usedIcons);
      
      // ランダムカラーを選択（順番に回す）
      const color = pastelColors[colorIndex % pastelColors.length];
      colorIndex++;
      
      if (icon) {
        usedIcons.add(icon.name);
        // dataUrlがあればそれを使用（プレビュー対応）、なければ通常のURLを使用
        const imgSrc = icon.dataUrl || icon.url;
        // インラインスタイルで確実に横並び + 矢印用CSS変数
        const arrowStyle = direction === 'right' 
          ? `right:-8px;border-left:8px solid ${color.bg};border-right:none;`
          : `left:-8px;border-right:8px solid ${color.bg};border-left:none;`;
        
        return `<div class="bubble-${direction}" style="display:flex;flex-direction:${direction === 'right' ? 'row-reverse' : 'row'};align-items:flex-start;gap:12px;margin:20px 0;"><img src="${imgSrc}" alt="アイコン" class="bubble-icon-img" width="50" height="50" style="width:50px;height:50px;min-width:50px;border-radius:50%;object-fit:cover;border:2px solid #ddd;"><div class="bubble-text ${color.class}" style="position:relative;flex:1;padding:14px 18px;border-radius:16px;background:${color.bg};--bubble-bg:${color.bg};">${textMatch[1].trim()}</div></div>`;
      }
      return match;
    }
  );
  
  console.log(`Replaced ${usedIcons.size} bubble icons with random uploaded icons`);
  return result;
}

// アイコン画像用のCSSを追加
export function getIconImageCss(): string {
  return ``; // スタイルはarticle-generator.ts内で定義
}
