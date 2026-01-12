// -*- coding: utf-8 -*-
import { Env, jsonResponse, errorResponse, optionsResponse } from "./_types";

interface DeployRequest {
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  content: string;
  commitMessage: string;
}

async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Lovable-Auto-Blog',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json() as { sha?: string };
      return data.sha || null;
    }
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('File does not exist yet:', errorMessage);
    return null;
  }
}

async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  token: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const existingSha = await getFileSha(owner, repo, path, branch, token);
  
  // Base64エンコード（UTF-8対応・大容量対応）
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // 大きなデータでもスタックオーバーフローしないようにチャンク処理
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64Content = btoa(binary);
  
  const body: Record<string, string> = {
    message,
    content: base64Content,
    branch,
  };
  
  if (existingSha) {
    body.sha = existingSha;
  }
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-Auto-Blog',
      },
      body: JSON.stringify(body),
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json() as { message?: string };
    console.error('GitHub API error:', errorData);
    return { 
      success: false, 
      error: errorData.message || 'Failed to create/update file' 
    };
  }
  
  const responseData = await response.json() as { 
    content?: { html_url?: string }; 
    commit?: { html_url?: string } 
  };
  return { 
    success: true, 
    url: responseData.content?.html_url || responseData.commit?.html_url 
  };
}

export const onRequestOptions: PagesFunction = async () => {
  return optionsResponse();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const githubToken = context.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return errorResponse('GitHub token not configured', 500);
    }

    const { owner, repo, branch = 'main', filePath, content, commitMessage } = await context.request.json() as DeployRequest;

    console.log(`Deploying to ${owner}/${repo}/${branch}: ${filePath}`);

    // Validate required fields
    if (!owner || !repo || !filePath || !content) {
      return errorResponse('Missing required fields: owner, repo, filePath, content', 400);
    }

    const result = await createOrUpdateFile(
      owner,
      repo,
      filePath,
      content,
      commitMessage || `Update ${filePath}`,
      branch,
      githubToken
    );

    if (!result.success) {
      return jsonResponse({ error: result.error }, 500);
    }

    console.log('Successfully deployed:', result.url);

    return jsonResponse({ 
      success: true, 
      url: result.url,
      message: `Successfully deployed ${filePath}` 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in deploy-to-github function:', error);
    return jsonResponse({ error: errorMessage }, 500);
  }
};
