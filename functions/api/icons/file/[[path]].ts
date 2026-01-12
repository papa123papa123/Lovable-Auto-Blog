// -*- coding: utf-8 -*-
// R2からアイコンファイルを取得してレスポンス
import { Env, corsHeaders, errorResponse, optionsResponse } from "../../_types";

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const bucket = context.env.ICONS_BUCKET;
    
    if (!bucket) {
      console.error("ICONS_BUCKET not configured");
      return errorResponse("Storage not configured", 500);
    }

    // パスパラメータからファイル名を取得
    const path = context.params.path;
    const fileName = Array.isArray(path) ? path.join("/") : path;
    
    if (!fileName) {
      return errorResponse("File name is required", 400);
    }

    const decodedFileName = decodeURIComponent(fileName);
    
    // R2からオブジェクトを取得
    const object = await bucket.get(decodedFileName);
    
    if (!object) {
      return errorResponse("File not found", 404);
    }

    // Content-Typeを決定
    let contentType = object.httpMetadata?.contentType || "application/octet-stream";
    if (!contentType || contentType === "application/octet-stream") {
      const ext = decodedFileName.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'gif': 'image/gif',
      };
      contentType = mimeTypes[ext || ''] || 'application/octet-stream';
    }

    // レスポンスを返す
    return new Response(object.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // 1年キャッシュ
      },
    });
  } catch (error) {
    console.error("Get icon file error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
