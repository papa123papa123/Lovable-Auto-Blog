// -*- coding: utf-8 -*-
// Cloudflare Pages Function: Batch deploy multiple files to GitHub in a single commit
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

interface FileToUpload {
  path: string;
  content: string; // Base64エンコード済み
  encoding: "base64" | "utf-8";
}

interface BatchDeployRequest {
  owner: string;
  repo: string;
  branch?: string;
  files: FileToUpload[];
  commitMessage: string;
}

/**
 * GitHub Tree APIを使って複数ファイルを1つのコミットでデプロイ
 */
async function batchCreateOrUpdateFiles(
  owner: string,
  repo: string,
  branch: string,
  files: FileToUpload[],
  message: string,
  token: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. 現在のブランチの最新コミットSHAを取得
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'autoblog-builder',
        },
      }
    );

    if (!refResponse.ok) {
      const errorData = await refResponse.json() as { message?: string };
      return { success: false, error: `ブランチ情報取得失敗: ${errorData.message}` };
    }

    const refData = await refResponse.json() as { object: { sha: string } };
    const latestCommitSha = refData.object.sha;

    // 2. 最新コミットからベースツリーSHAを取得
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'autoblog-builder',
        },
      }
    );

    if (!commitResponse.ok) {
      const errorData = await commitResponse.json() as { message?: string };
      return { success: false, error: `コミット情報取得失敗: ${errorData.message}` };
    }

    const commitData = await commitResponse.json() as { tree: { sha: string } };
    const baseTreeSha = commitData.tree.sha;

    // 3. Blobを作成（各ファイル）
    const blobs = await Promise.all(
      files.map(async (file) => {
        const blobResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'autoblog-builder',
            },
            body: JSON.stringify({
              content: file.content,
              encoding: file.encoding,
            }),
          }
        );

        if (!blobResponse.ok) {
          const errorData = await blobResponse.json() as { message?: string };
          throw new Error(`Blob作成失敗 (${file.path}): ${errorData.message}`);
        }

        const blobData = await blobResponse.json() as { sha: string };
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blobData.sha,
        };
      })
    );

    // 4. 新しいツリーを作成
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'autoblog-builder',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobs,
        }),
      }
    );

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json() as { message?: string };
      return { success: false, error: `ツリー作成失敗: ${errorData.message}` };
    }

    const treeData = await treeResponse.json() as { sha: string };

    // 5. 新しいコミットを作成
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'autoblog-builder',
        },
        body: JSON.stringify({
          message,
          tree: treeData.sha,
          parents: [latestCommitSha],
        }),
      }
    );

    if (!newCommitResponse.ok) {
      const errorData = await newCommitResponse.json() as { message?: string };
      return { success: false, error: `コミット作成失敗: ${errorData.message}` };
    }

    const newCommitData = await newCommitResponse.json() as { sha: string; html_url: string };

    // 6. ブランチの参照を更新
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'autoblog-builder',
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
        }),
      }
    );

    if (!updateRefResponse.ok) {
      const errorData = await updateRefResponse.json() as { message?: string };
      return { success: false, error: `ブランチ更新失敗: ${errorData.message}` };
    }

    return { 
      success: true, 
      url: newCommitData.html_url 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Batch deploy error:', error);
    return { success: false, error: errorMessage };
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    console.log('[batch-deploy-to-github] Function invoked');
    
    const githubToken = context.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('[batch-deploy-to-github] GITHUB_TOKEN not configured');
      return errorResponse('GitHub token not configured', 500);
    }

    const { owner, repo, branch = 'main', files, commitMessage } = await context.request.json() as BatchDeployRequest;

    console.log(`[batch-deploy-to-github] Batch deploying to ${owner}/${repo}/${branch}: ${files.length} files`);

    // Validate required fields
    if (!owner || !repo || !files || files.length === 0) {
      console.error('[batch-deploy-to-github] Missing required fields:', { owner, repo, filesCount: files?.length });
      return errorResponse('Missing required fields: owner, repo, files', 400);
    }

    console.log('[batch-deploy-to-github] Starting batch create/update process');
    const result = await batchCreateOrUpdateFiles(
      owner,
      repo,
      branch,
      files,
      commitMessage || `Update ${files.length} files`,
      githubToken
    );

    if (!result.success) {
      console.error('[batch-deploy-to-github] Batch deploy failed:', result.error);
      return jsonResponse({ error: result.error }, 500);
    }

    console.log('[batch-deploy-to-github] Successfully batch deployed:', result.url);

    return jsonResponse({ 
      success: true, 
      url: result.url,
      message: `Successfully deployed ${files.length} files in 1 commit` 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[batch-deploy-to-github] Error in batch-deploy-to-github function:', error);
    return jsonResponse({ error: errorMessage }, 500);
  }
};

// デバッグ用: GETリクエストでヘルスチェック
export const onRequestGet: PagesFunction = async () => {
  return jsonResponse({ 
    status: 'ok', 
    endpoint: 'batch-deploy-to-github',
    message: 'This endpoint only accepts POST requests with file data' 
  });
};
