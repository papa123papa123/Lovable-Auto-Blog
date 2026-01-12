// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "../_types";

interface IconInfo {
  name: string;
  url: string;
  size: number;
}

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

    // R2バケットからオブジェクト一覧を取得
    const listed = await bucket.list({ limit: 1000 });
    
    const icons: IconInfo[] = [];
    
    for (const object of listed.objects) {
      // 画像ファイルのみをフィルタ
      if (/\.(webp|png|jpeg|jpg|svg)$/i.test(object.key)) {
        // R2のパブリックURL（カスタムドメインまたはR2.dev URL）
        // 実際のURLはCloudflareの設定に依存
        const url = `/api/icons/file/${encodeURIComponent(object.key)}`;
        
        icons.push({
          name: object.key,
          url,
          size: object.size,
        });
      }
    }

    console.log(`Listed ${icons.length} icons from R2`);
    
    return jsonResponse({ 
      success: true, 
      data: icons 
    });
  } catch (error) {
    console.error("List icons error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
