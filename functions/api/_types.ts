// -*- coding: utf-8 -*-
// Cloudflare Pages Functions 共通型定義

export interface Env {
  GEMINI_API_KEY: string;
  FIRECRAWL_API_KEY?: string;
  AMAZON_ASSOCIATE_ID?: string;
  RAKUTEN_APP_ID?: string;
  RAKUTEN_AFFILIATE_ID?: string;
  GITHUB_TOKEN?: string;
  ICONS_BUCKET: R2Bucket;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status);
}

export function optionsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}
