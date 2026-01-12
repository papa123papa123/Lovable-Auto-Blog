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

    const contentType = context.request.headers.get("content-type") || "";
    
    // multipart/form-data の場合
    if (contentType.includes("multipart/form-data")) {
      const formData = await context.request.formData();
      const uploadedFiles: Array<{ name: string; url: string; success: boolean; error?: string }> = [];
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const file = value;
          
          // ファイルタイプの検証
          const validTypes = ["image/webp", "image/png", "image/jpeg", "image/svg+xml"];
          if (!validTypes.includes(file.type)) {
            uploadedFiles.push({
              name: file.name,
              url: "",
              success: false,
              error: "Invalid file type"
            });
            continue;
          }
          
          // ファイルサイズの検証（5MB）
          if (file.size > 5 * 1024 * 1024) {
            uploadedFiles.push({
              name: file.name,
              url: "",
              success: false,
              error: "File too large (max 5MB)"
            });
            continue;
          }
          
          // ユニークなファイル名を生成
          const timestamp = Date.now();
          const ext = file.name.split('.').pop() || 'png';
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const safeName = baseName.replace(/[^a-zA-Z0-9\-_]/g, "_").substring(0, 50);
          const fileName = `${safeName}_${timestamp}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          
          try {
            // R2にアップロード
            const arrayBuffer = await file.arrayBuffer();
            await bucket.put(fileName, arrayBuffer, {
              httpMetadata: {
                contentType: file.type,
              },
            });
            
            const url = `/api/icons/file/${encodeURIComponent(fileName)}`;
            
            uploadedFiles.push({
              name: fileName,
              url,
              success: true
            });
            
            console.log(`Uploaded: ${fileName}`);
          } catch (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
            uploadedFiles.push({
              name: file.name,
              url: "",
              success: false,
              error: uploadError instanceof Error ? uploadError.message : "Upload failed"
            });
          }
        }
      }
      
      const successCount = uploadedFiles.filter(f => f.success).length;
      const failedCount = uploadedFiles.filter(f => !f.success).length;
      
      console.log(`Upload complete: ${successCount} success, ${failedCount} failed`);
      
      return jsonResponse({
        success: true,
        data: {
          uploaded: uploadedFiles,
          successCount,
          failedCount
        }
      });
    }
    
    // JSON形式の場合（単一ファイル、base64）
    const body = await context.request.json() as {
      fileName?: string;
      contentType?: string;
      data?: string; // base64
    };
    
    if (!body.fileName || !body.data) {
      return errorResponse("fileName and data are required", 400);
    }
    
    const validTypes = ["image/webp", "image/png", "image/jpeg", "image/svg+xml"];
    if (body.contentType && !validTypes.includes(body.contentType)) {
      return errorResponse("Invalid file type", 400);
    }
    
    // base64をデコード
    const binaryString = atob(body.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // ユニークなファイル名を生成
    const timestamp = Date.now();
    const ext = body.fileName.split('.').pop() || 'png';
    const baseName = body.fileName.replace(/\.[^/.]+$/, "");
    const safeName = baseName.replace(/[^a-zA-Z0-9\-_]/g, "_").substring(0, 50);
    const fileName = `${safeName}_${timestamp}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    
    // R2にアップロード
    await bucket.put(fileName, bytes, {
      httpMetadata: {
        contentType: body.contentType || "image/png",
      },
    });
    
    const url = `/api/icons/file/${encodeURIComponent(fileName)}`;
    
    console.log(`Uploaded via JSON: ${fileName}`);
    
    return jsonResponse({
      success: true,
      data: {
        name: fileName,
        url
      }
    });
  } catch (error) {
    console.error("Upload icon error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
