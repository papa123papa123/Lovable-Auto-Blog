# -*- coding: utf-8 -*-
import os
import sys
if sys.platform == "win32":
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'

import requests
import base64

# ここにトークンを直接入力してテスト
GITHUB_TOKEN = input("GitHub Token を入力: ").strip()
GITHUB_OWNER = "papa123papa123"
GITHUB_REPO = "Lovable-Auto-Blog"

def test_token():
    """トークンの有効性をテスト"""
    print(f"\n[1] トークン確認: {GITHUB_TOKEN[:8]}...")
    
    # ユーザー情報取得でトークン有効性確認
    response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }
    )
    
    if response.ok:
        user = response.json()
        print(f"✓ トークン有効: ユーザー = {user.get('login')}")
        return True
    else:
        print(f"✗ トークン無効: {response.status_code} - {response.text}")
        return False

def test_repo_access():
    """リポジトリへのアクセス権限をテスト"""
    print(f"\n[2] リポジトリアクセス: {GITHUB_OWNER}/{GITHUB_REPO}")
    
    response = requests.get(
        f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}",
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }
    )
    
    if response.ok:
        repo = response.json()
        print(f"✓ リポジトリアクセス可能: {repo.get('full_name')}")
        print(f"  - permissions: {repo.get('permissions')}")
        return True
    else:
        print(f"✗ リポジトリアクセス失敗: {response.status_code} - {response.text}")
        return False

def test_upload():
    """テスト画像をアップロード"""
    print(f"\n[3] テスト画像アップロード")
    
    # 1x1の赤いピクセル（PNG）
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    file_path = "sites/test-domain.com/articles/test-slug/images/test-image.png"
    
    response = requests.put(
        f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/{file_path}",
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        json={
            "message": "Test upload from Python script",
            "content": test_image_base64,
            "branch": "main",
        }
    )
    
    if response.ok:
        result = response.json()
        print(f"✓ アップロード成功!")
        print(f"  - URL: {result.get('content', {}).get('html_url')}")
        return True
    else:
        print(f"✗ アップロード失敗: {response.status_code}")
        print(f"  - エラー: {response.text}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("GitHub Token テスト")
    print("=" * 50)
    
    if test_token():
        if test_repo_access():
            test_upload()
