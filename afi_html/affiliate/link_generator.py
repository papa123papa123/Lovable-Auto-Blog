# -*- coding: utf-8 -*-
"""
アフィリエイトリンク生成モジュール
"""


def create_amazon_affiliate_link(asin: str, associate_id: str = "") -> str:
    """Amazonアフィリエイトリンクを生成"""
    base_url = f"https://www.amazon.co.jp/dp/{asin}"
    if associate_id:
        return f"{base_url}?tag={associate_id}"
    return base_url


def create_rakuten_affiliate_link(item_id: str, shop_id: str = "", affiliate_id: str = "") -> str:
    """楽天アフィリエイトリンクを生成"""
    if shop_id:
        base_url = f"https://item.rakuten.co.jp/{shop_id}/{item_id}/"
    else:
        base_url = f"https://item.rakuten.co.jp/c/{item_id}/"
    
    if affiliate_id:
        separator = "&" if "?" in base_url else "?"
        return f"{base_url}{separator}s-id={affiliate_id}"
    
    return base_url
