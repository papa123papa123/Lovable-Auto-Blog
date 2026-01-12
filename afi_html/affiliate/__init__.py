# -*- coding: utf-8 -*-
"""
アフィリエイトリンク生成パッケージ
"""

from .extractor import (
    extract_amazon_products_from_html,
    extract_amazon_products_with_details,
    extract_rakuten_products_from_html,
    detect_product_type
)
from .link_generator import (
    create_amazon_affiliate_link,
    create_rakuten_affiliate_link
)
from .product_fetcher import (
    get_amazon_product_info,
    get_rakuten_product_info
)

__all__ = [
    'extract_amazon_products_from_html',
    'extract_amazon_products_with_details',
    'extract_rakuten_products_from_html',
    'detect_product_type',
    'create_amazon_affiliate_link',
    'create_rakuten_affiliate_link',
    'get_amazon_product_info',
    'get_rakuten_product_info',
]
