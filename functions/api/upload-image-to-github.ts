// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

interface UploadImageRequest {
  filePath: string; // 例: "sites/example.com/articles/slug/images/eyecatch-800.webp"
  content: string; // Base64エンコードされた画像データ
  domain: string;
  filename: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { filePath, content, domain, filename } = await context.request.json() as UploadImageRequest;

    if (!filePath || !content) {
      return errorResponse("File path and content are required", 400);
    }

    const githubToken = context.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error("GITHUB_TOKEN not configured");
      return errorResponse("GitHub token not configured", 500);
    }

    // トークン確認用ログ（最初の8文字のみ）
    console.log(`[DEBUG] Token prefix: ${githubToken.substring(0, 8)}...`);

    console.log(`Uploading image to GitHub: ${filePath}`);

    // GitHubリポジトリ情報（環境変数から取得、なければデフォルト値）
    const GITHUB_OWNER = "papa123papa123";
    const GITHUB_REPO = "Lovable-Auto-Blog";
    const GITHUB_BRANCH = "main";

    // 既存ファイルのSHAを取得（更新の場合に必要）
    let existingSha: string | undefined;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "autoblog-builder",
          },
        }
      );

      if (getResponse.ok) {
        const fileData = await getResponse.json() as { sha: string };
        existingSha = fileData.sha;
        console.log(`Existing file found, SHA: ${existingSha}`);
      }
    } catch (error) {
      // ファイルが存在しない場合は無視
      console.log("File does not exist yet, creating new file");
    }

    // ファイルをアップロード（または更新）
    const commitMessage = `Upload image: ${filename}`;
    
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "autoblog-builder",
        },
        body: JSON.stringify({
          message: commitMessage,
          content: content,
          branch: GITHUB_BRANCH,
          ...(existingSha && { sha: existingSha }),
        }),
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("GitHub upload error:", uploadResponse.status, errorText);
      
      // エラー詳細をクライアントに返す
      return errorResponse(
        `GitHub API エラー (${uploadResponse.status}): ${errorText}`,
        uploadResponse.status
      );
    }

    const uploadData = await uploadResponse.json();
    
    // GitHub APIのレスポンス構造を確認
    console.log("GitHub API response:", JSON.stringify(uploadData, null, 2));
    console.log("Upload status:", uploadResponse.status);
    console.log("File path:", filePath);
    console.log("Branch:", GITHUB_BRANCH);
    
    // アップロードが成功したか確認
    if (!uploadData.content) {
      console.error("⚠️ uploadData.content is missing!");
      console.error("Full response:", JSON.stringify(uploadData, null, 2));
    }
    
    // raw.githubusercontent.comのURLを直接使用（GitHub Pagesの設定に依存しない）
    let imageUrl: string;
    
    // GitHub APIのレスポンス構造に応じてdownload_urlを取得
    const downloadUrl = uploadData?.content?.download_url || uploadData?.download_url;
    
    if (downloadUrl) {
      // raw.githubusercontent.comのURLをそのまま使用
      imageUrl = downloadUrl;
      console.log(`Using download_url: ${imageUrl}`);
    } else {
      // フォールバック: raw.githubusercontent.comのURLを手動で生成
      imageUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
      console.log(`Using generated raw URL: ${imageUrl}`);
    }
    
    console.log(`Image uploaded successfully: ${imageUrl}`);
    console.log(`File path: ${filePath}`);

    return jsonResponse({
      success: true,
      url: imageUrl,
      githubUrl: uploadData.content?.html_url,
      downloadUrl: uploadData.content?.download_url,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
};
