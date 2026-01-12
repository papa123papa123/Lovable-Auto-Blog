# -*- coding: utf-8 -*-
"""
商品詳細情報取得モジュール（オプション機能）
"""

import re
from typing import Dict, Optional

try:
    from bs4 import BeautifulSoup
    import requests
    HAS_REQUESTS = True
    HAS_BEAUTIFULSOUP = True
except ImportError:
    HAS_REQUESTS = False
    HAS_BEAUTIFULSOUP = False

from .extractor import _get_headers


def get_amazon_product_info(asin: str) -> Dict[str, str]:
    """ASINから商品情報を取得"""
    default_info = {
        "asin": asin,
        "title": "",
        "url": f"https://www.amazon.co.jp/dp/{asin}",
        "price": "",
        "image_url": ""
    }
    
    if not asin or len(asin) != 10 or not HAS_REQUESTS or not HAS_BEAUTIFULSOUP:
        return default_info
    
    try:
        url = f"https://www.amazon.co.jp/dp/{asin}"
        response = requests.get(url, headers=_get_headers(), timeout=5)
        if response.status_code != 200:
            return {**default_info, "url": url}
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = ""
        title_elem = soup.find("span", id="productTitle")
        if title_elem:
            title = title_elem.get_text(strip=True)[:200]
        
        price = ""
        price_elem = soup.find("span", class_=re.compile(".*a-price-whole.*", re.I))
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            symbol_elem = price_elem.find_parent().find("span", class_=re.compile(".*a-price-symbol.*", re.I))
            symbol = symbol_elem.get_text(strip=True) if symbol_elem else "¥"
            price = symbol + price_text
        
        image_url = ""
        img_elem = soup.find("img", id="landingImage")
        if img_elem:
            image_url = img_elem.get("src", "") or img_elem.get("data-src", "")
            if image_url and "_AC_SL" in image_url:
                image_url = re.sub(r'_AC_SL\d+_', '_AC_SL200_', image_url)
        
        return {
            "asin": asin,
            "title": title,
            "url": url,
            "price": price,
            "image_url": image_url
        }
    except Exception:
        return default_info


def get_rakuten_product_info(item_id: str, shop_id: str = "") -> Dict[str, str]:
    """商品IDから楽天商品情報を取得"""
    if shop_id:
        url = f"https://item.rakuten.co.jp/{shop_id}/{item_id}/"
    else:
        url = f"https://item.rakuten.co.jp/c/{item_id}/"
    
    default_info = {
        "item_id": item_id,
        "shop_id": shop_id,
        "title": "",
        "url": url,
        "price": "",
        "image_url": ""
    }
    
    if not HAS_REQUESTS or not HAS_BEAUTIFULSOUP:
        return default_info
    
    try:
        response = requests.get(url, headers=_get_headers(), timeout=5)
        if response.status_code != 200:
            return default_info
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = ""
        title_elem = soup.find("h1", class_=re.compile(".*itemName.*", re.I)) or soup.find("h1")
        if title_elem:
            title = title_elem.get_text(strip=True)[:200]
        
        price = ""
        price_elem = soup.find("span", class_=re.compile(".*price.*", re.I))
        if price_elem:
            price = price_elem.get_text(strip=True)
        
        image_url = ""
        img_elem = soup.find("img", class_=re.compile(".*itemImage.*", re.I)) or soup.find("img", id=re.compile(".*image.*", re.I))
        if img_elem:
            image_url = img_elem.get("src", "") or img_elem.get("data-src", "")
        
        return {
            "item_id": item_id,
            "shop_id": shop_id,
            "title": title,
            "url": url,
            "price": price,
            "image_url": image_url
        }
    except Exception:
        return default_info
