// -*- coding: utf-8 -*-
/**
 * アフィリエイト関連モジュール統合エクスポート
 */

// リンク生成
export {
  createAmazonAffiliateLink,
  createRakutenAffiliateLink,
  createRakutenSearchUrl
} from "./link-generator";

// 商品情報構築
export {
  buildProductFromHtmlAsin,
  createFallbackProduct
} from "./product-builder";

export type {
  ProductInfo,
  HtmlProduct,
  AffiliateIds
} from "./product-builder";

// HTML挿入
export {
  getPochippStyles,
  generatePochippHtml
} from "./html-inserter";
