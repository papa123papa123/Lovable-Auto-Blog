// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "../_types";

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const bucket = context.env.ICONS_BUCKET;
    
    if (!bucket) {
      console.error("ICONS_BUCKET not configured");
      return errorResponse("Storage not configured", 500);
    }

    const body = await context.request.json() as { names?: string[] };
    
    if (!body.names || !Array.isArray(body.names) || body.names.length === 0) {
      return errorResponse("names array is required", 400);
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = [];
    
    for (const name of body.names) {
      try {
        await bucket.delete(name);
        results.push({ name, success: true });
        console.log(`Deleted: ${name}`);
      } catch (deleteError) {
        console.error(`Failed to delete ${name}:`, deleteError);
        results.push({
          name,
          success: false,
          error: deleteError instanceof Error ? deleteError.message : "Delete failed"
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`Delete complete: ${successCount} success, ${failedCount} failed`);
    
    return jsonResponse({
      success: true,
      data: {
        results,
        successCount,
        failedCount
      }
    });
  } catch (error) {
    console.error("Delete icons error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
