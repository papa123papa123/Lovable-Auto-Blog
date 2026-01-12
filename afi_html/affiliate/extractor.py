# -*- coding: utf-8 -*-
"""
HTMLからの商品情報抽出モジュール（Amazon/楽天共通）
"""

import re
from pathlib import Path
from typing import List, Tuple, Dict, Optional

try:
    from bs4 import BeautifulSoup
    HAS_BEAUTIFULSOUP = True
except ImportError:
    HAS_BEAUTIFULSOUP = False


def _get_headers() -> Dict[str, str]:
    """リクエスト用のヘッダーを取得"""
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    }


def _extract_title_from_amazon_item(item) -> str:
    """Amazon商品カード要素から商品名を抽出"""
    patterns = [
        ("h2", None, "span"),
        ("h2", re.compile(".*a-size-base-plus.*", re.I), None),
        ("span", re.compile(".*a-text-normal.*", re.I), None),
        ("h2", re.compile(".*a-size-mini.*", re.I), None),
        ("a", re.compile(".*a-link-normal.*", re.I), None),
    ]
    
    for tag, class_pattern, child_tag in patterns:
        if child_tag:
            parent = item.find(tag)
            if parent:
                child = parent.find(child_tag)
                if child:
                    return child.get_text(strip=True)
        else:
            elem = item.find(tag, class_=class_pattern) if class_pattern else item.find(tag)
            if elem:
                return elem.get_text(strip=True)
    
    return ""


def extract_amazon_products_from_html(html_path: Path) -> List[Tuple[str, str]]:
    """Amazon HTMLから全商品のASINと商品名を抽出"""
    if not HAS_BEAUTIFULSOUP or not html_path.exists():
        return []
    
    try:
        html_content = html_path.read_text(encoding='utf-8')
        soup = BeautifulSoup(html_content, 'html.parser')
        results = []
        seen_asins = set()
        
        for item in soup.find_all(attrs={"data-asin": True}):
            asin = item.get("data-asin", "").strip()
            if len(asin) != 10 or not asin.isalnum() or asin in seen_asins:
                continue
            
            title = _extract_title_from_amazon_item(item)
            if title:
                seen_asins.add(asin)
                results.append((asin, title[:200]))
        
        if not results:
            for link in soup.find_all("a", href=re.compile(r"/dp/[A-Z0-9]{10}")):
                match = re.search(r'/dp/([A-Z0-9]{10})', link.get("href", ""), re.IGNORECASE)
                if not match:
                    continue
                
                asin = match.group(1).upper()
                if asin in seen_asins:
                    continue
                
                title = link.get_text(strip=True)
                if title:
                    seen_asins.add(asin)
                    results.append((asin, title[:200]))
        
        return results
    except Exception as e:
        print(f"⚠️ Amazon HTMLからの商品抽出エラー: {e}")
        return []


def extract_amazon_products_with_details(html_path: Path) -> List[Dict[str, str]]:
    """Amazon HTMLから商品の詳細情報（ASIN、タイトル、画像、価格）を抽出"""
    if not HAS_BEAUTIFULSOUP or not html_path.exists():
        return []
    
    try:
        html_content = html_path.read_text(encoding='utf-8')
        soup = BeautifulSoup(html_content, 'html.parser')
        results = []
        seen_asins = set()
        
        for item in soup.find_all(attrs={"data-asin": True}):
            asin = item.get("data-asin", "").strip()
            if len(asin) != 10 or not asin.isalnum() or asin in seen_asins:
                continue
            
            # タイトル抽出
            title = _extract_title_from_amazon_item(item)
            if not title:
                continue
            
            # 画像URL抽出
            image_url = ""
            img = item.find("img", class_=re.compile(r"s-image"))
            if img:
                raw_url = img.get("src", "")
                # 相対パスまたはローカルパスの場合、Amazon CDNのURLに変換
                if raw_url.startswith("./") or "_files/" in raw_url:
                    # ファイル名から画像IDを抽出（例: 81YSJXsB8NL._AC_UL320_.jpg）
                    image_filename_match = re.search(r'([A-Z0-9+_-]{10,}\.[A-Z0-9_.-]+\.jpg)', raw_url, re.IGNORECASE)
                    if image_filename_match:
                        image_filename = image_filename_match.group(1)
                        image_url = f"https://m.media-amazon.com/images/I/{image_filename}"
                    else:
                        image_url = ""
                else:
                    image_url = raw_url
            
            # 価格抽出
            price = ""
            price_whole = item.find("span", class_="a-price-whole")
            if price_whole:
                price_text = price_whole.get_text(strip=True)
                # カンマとドットを削除して数字のみに
                price = price_text.replace(',', '').replace('.', '')
            
            seen_asins.add(asin)
            results.append({
                "asin": asin,
                "title": title[:200],
                "imageUrl": image_url,
                "price": price
            })
        
        return results
    except Exception as e:
        print(f"⚠️ Amazon HTMLからの商品抽出エラー: {e}")
        return []


def _extract_title_from_rakuten_item(item) -> str:
    """楽天商品カード要素から商品名を抽出"""
    patterns = [
        ("h3", None, None),
        ("a", re.compile(".*itemName.*", re.I), None),
        ("div", re.compile(".*itemName.*", re.I), None),
        ("span", re.compile(".*itemName.*", re.I), None),
    ]
    
    for tag, class_pattern, child_tag in patterns:
        elem = item.find(tag, class_=class_pattern) if class_pattern else item.find(tag)
        if elem:
            text = elem.get_text(strip=True)
            if text and len(text) > 5:
                return text
    
    return ""


def extract_rakuten_products_from_html(html_path: Path) -> List[Tuple[str, str, str]]:
    """楽天HTMLから全商品の商品ID、ショップID、商品名を抽出"""
    if not HAS_BEAUTIFULSOUP or not html_path.exists():
        return []
    
    try:
        html_content = html_path.read_text(encoding='utf-8')
        soup = BeautifulSoup(html_content, 'html.parser')
        results = []
        seen_items = set()
        
        for link in soup.find_all("a", href=re.compile(r"item\.rakuten\.co\.jp/[^/]+/[^/]+/")):
            href = link.get("href", "")
            match = re.search(r'item\.rakuten\.co\.jp/([^/]+)/([^/]+)/', href)
            if not match:
                continue
            
            shop_id = match.group(1)
            item_id = match.group(2)
            
            if len(item_id) < 5 or (shop_id, item_id) in seen_items:
                continue
            
            title = _extract_title_from_rakuten_item(link.find_parent()) or link.get_text(strip=True)
            if title:
                seen_items.add((shop_id, item_id))
                results.append((item_id, shop_id, title[:200]))
        
        for link in soup.find_all("a", href=re.compile(r"/item/[^/]+/")):
            href = link.get("href", "")
            match = re.search(r'/item/([^/]+)/', href)
            if not match:
                continue
            
            item_id = match.group(1)
            if len(item_id) < 5 or item_id in [r[0] for r in results]:
                continue
            
            title = link.get_text(strip=True)
            if title:
                results.append((item_id, "", title[:200]))
        
        return results
    except Exception as e:
        print(f"⚠️ 楽天HTMLからの商品抽出エラー: {e}")
        return []


def detect_product_type(html_path: Path) -> Optional[str]:
    """HTMLファイルから商品タイプを自動判定"""
    if not html_path.exists():
        return None
    
    try:
        html_content = html_path.read_text(encoding='utf-8').lower()
        if 'amazon.co.jp' in html_content or 'data-asin' in html_content:
            return 'amazon'
        elif 'rakuten.co.jp' in html_content or 'item.rakuten' in html_content:
            return 'rakuten'
    except Exception:
        pass
    
    return None
