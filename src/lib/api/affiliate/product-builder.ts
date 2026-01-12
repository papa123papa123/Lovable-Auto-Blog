// -*- coding: utf-8 -*-
/**
 * 商品情報構築モジュール
 */

import { createAmazonAffiliateLink, createRakutenSearchUrl } from "./link-generator";

// 商品情報の型定義
export interface ProductInfo {
  title: string;
  imageUrl: string;
  amazonUrl: string;
  rakutenUrl: string;
  description?: string;
  asin?: string;
  price?: string;
}

// HTMLから取得した商品情報
export interface HtmlProduct {
  asin: string;
  title?: string;
  imageUrl?: string;
  price?: string;
}

// アフィリエイトID設定
export interface AffiliateIds {
  amazonAssociateId?: string;
  rakutenAffiliateId?: string;
  rakutenAppId?: string;
}

/**
 * HTMLから取得したASINを使用して商品情報を構築
 */
export function buildProductFromHtmlAsin(
  htmlProduct: HtmlProduct,
  productKeyword: string,
  h3Index: number,
  affiliateIds: AffiliateIds
): ProductInfo {
  const { asin } = htmlProduct;
  const { amazonAssociateId, rakutenAffiliateId } = affiliateIds;
  
  // Amazon URL生成
  const amazonUrl = createAmazonAffiliateLink(asin, amazonAssociateId);
  
  // 楽天検索URL生成
  const rakutenUrl = createRakutenSearchUrl(productKeyword, h3Index);
  
  // HTMLから取得した実際の商品情報を使用（フォールバックあり）
  const title = htmlProduct.title || `${productKeyword} (${asin})`;
  const imageUrl = htmlProduct.imageUrl || `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ.jpg`;
  const description = htmlProduct.title || `${productKeyword}の商品です。`;
  const price = htmlProduct.price;
  
  return {
    title,
    imageUrl,
    amazonUrl,
    rakutenUrl,
    description,
    asin,
    price
  };
}

/**
 * フォールバック商品情報を生成（エラー時用）
 */
export function createFallbackProduct(productKeyword: string): ProductInfo {
  return {
    title: productKeyword,
    imageUrl: "",
    amazonUrl: `https://www.amazon.co.jp/s?k=${encodeURIComponent(productKeyword)}`,
    rakutenUrl: `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(productKeyword)}/`,
    description: `${productKeyword}の商品を検索`,
  };
}
