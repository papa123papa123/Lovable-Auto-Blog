// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";
import type { ProductInfo, HtmlProduct, AffiliateIds } from "../../src/lib/api/affiliate";
import { buildProductFromHtmlAsin, createFallbackProduct } from "../../src/lib/api/affiliate";

// HTMLファイルから取得したASINをそのまま使用（検索はしない）
async function findProductFromHtml(
  htmlProducts: Array<HtmlProduct>,
  productKeyword: string,
  h3Title: string | undefined,
  h3Index: number,
  usedAsins: Set<string>,
  affiliateIds: AffiliateIds
): Promise<ProductInfo> {
  // HTMLから取得したASINを順番に使用（h3Indexで循環）
  const htmlProduct = htmlProducts[h3Index % htmlProducts.length];
  
  if (!htmlProduct || !htmlProduct.asin) {
    throw new Error("HTML商品情報が見つかりません");
  }
  
  console.log(`Using product from HTML (index ${h3Index}): ASIN=${htmlProduct.asin}`);
  
  // 共通ロジックを使用して商品情報を構築
  return buildProductFromHtmlAsin(htmlProduct, productKeyword, h3Index, affiliateIds);
}

// HTMLから商品情報を取得（検索は一切行わない）
async function findProduct(
  productKeyword: string,
  mainKeyword: string,
  h3Index: number,
  usedProductUrls: Set<string>,
  usedAsins: Set<string>,
  env: Env,
  htmlProducts: Array<HtmlProduct>,
  associateId?: string,
  rakutenAppId?: string,
  rakutenAffiliateId?: string
): Promise<ProductInfo> {
  const affiliateIds: AffiliateIds = {
    amazonAssociateId: associateId || env.AMAZON_ASSOCIATE_ID || "",
    rakutenAppId: rakutenAppId || env.RAKUTEN_APP_ID || "",
    rakutenAffiliateId: rakutenAffiliateId || env.RAKUTEN_AFFILIATE_ID || "",
  };
  
  // HTMLから商品情報を取得（検索は一切行わない）
  if (!htmlProducts || htmlProducts.length === 0) {
    throw new Error("HTML商品情報が提供されていません");
  }
  
  return await findProductFromHtml(htmlProducts, productKeyword, undefined, h3Index, usedAsins, affiliateIds);
}

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let requestData: {
    keyword?: string;
    h3Title?: string;
    mainKeyword?: string;
    h3Index?: number;
    usedUrls?: string[];
    usedAsins?: string[];
    htmlProducts?: Array<HtmlProduct>;
  } = {};
  
  try {
    requestData = await context.request.json() as typeof requestData;
  } catch (parseError) {
    console.error("Request parse error:", parseError);
    return errorResponse("リクエストの解析に失敗しました", 400);
  }

  const { keyword, h3Title, mainKeyword, h3Index = 0, usedUrls = [], usedAsins = [], htmlProducts = [] } = requestData;

  if (!keyword) {
    return errorResponse("商品検索キーワードは必須です", 400);
  }
  
  const productKeyword = keyword;
  const effectiveMainKeyword = mainKeyword || keyword;
  
  console.log(`\n=== Getting product from HTML for H3[${h3Index}] ===`);
  console.log(`Product keyword: ${productKeyword}`);
  console.log(`H3 title: ${h3Title?.substring(0, 40) || "N/A"}...`);
  
  if (!htmlProducts || htmlProducts.length === 0) {
    return errorResponse("HTML商品情報が提供されていません", 400);
  }
  
  console.log(`HTML products provided: ${htmlProducts.length} products`);

  try {
    const usedProductUrls = new Set<string>(usedUrls);
    const usedAsinSet = new Set<string>(usedAsins);
    const associateId = context.env.AMAZON_ASSOCIATE_ID || "";
    const rakutenAppId = context.env.RAKUTEN_APP_ID || "";
    const rakutenAffiliateId = context.env.RAKUTEN_AFFILIATE_ID || "";

    const product = await findProduct(
      productKeyword, 
      effectiveMainKeyword, 
      h3Index, 
      usedProductUrls,
      usedAsinSet,
      context.env,
      htmlProducts,
      associateId,
      rakutenAppId,
      rakutenAffiliateId
    );

    return jsonResponse({ success: true, data: product });
  } catch (error) {
    console.error("Search products error:", error);
    // エラー時はフォールバック商品を返す
    const fallbackProduct = createFallbackProduct(productKeyword || "商品");
    return jsonResponse({ success: true, data: fallbackProduct });
  }
};
