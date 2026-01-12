// -*- coding: utf-8 -*-
/**
 * アフィリエイトリンク生成モジュール
 */

/**
 * Amazonアフィリエイトリンクを生成
 */
export function createAmazonAffiliateLink(asin: string, associateId?: string): string {
  const baseUrl = `https://www.amazon.co.jp/dp/${asin}`;
  if (associateId) {
    return `${baseUrl}?tag=${associateId}`;
  }
  return baseUrl;
}

/**
 * 楽天アフィリエイトリンクを生成
 */
export function createRakutenAffiliateLink(itemId: string, shopId: string = "", affiliateId?: string): string {
  let baseUrl: string;
  if (shopId) {
    baseUrl = `https://item.rakuten.co.jp/${shopId}/${itemId}/`;
  } else {
    baseUrl = `https://item.rakuten.co.jp/c/${itemId}/`;
  }
  
  if (affiliateId) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}s-id=${affiliateId}`;
  }
  
  return baseUrl;
}

/**
 * 楽天検索URL生成用の追加キーワードリスト
 */
const RAKUTEN_BOOST_KEYWORDS = [
  "最安値", "送料無料", "ポイント10倍", "あす楽", "楽天1位",
  "即納", "正規品", "新型", "クーポン", "保証付",
  "レビュー件数順", "ランキング", "人気", "おすすめ", "セール",
  "特価", "限定", "まとめ買い", "初回限定", "期間限定"
];

/**
 * 楽天検索URLを生成
 */
export function createRakutenSearchUrl(productKeyword: string, h3Index: number = 0): string {
  const boostKeyword = RAKUTEN_BOOST_KEYWORDS[h3Index % RAKUTEN_BOOST_KEYWORDS.length];
  const rakutenKeyword = `${productKeyword} ${boostKeyword}`;
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(rakutenKeyword)}/`;
}
