# -*- coding: utf-8 -*-
"""
アフィリエイトリンク生成メイン処理
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import json
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Windows環境でのエンコーディング設定
if sys.platform == "win32":
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'

from .extractor import (
    extract_amazon_products_from_html,
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


def generate_amazon_affiliate_links(
    html_path: Path,
    associate_id: str = "",
    skip_count: int = 4,
    fetch_details: bool = False
) -> List[Dict[str, str]]:
    """Amazon HTMLからアフィリエイトリンクを生成"""
    products_with_titles = extract_amazon_products_from_html(html_path)
    
    if not products_with_titles:
        print("⚠️ Amazon商品が見つかりませんでした")
        return []
    
    print(f"✅ {len(products_with_titles)}件のAmazon商品を抽出しました")
    
    product_asins = products_with_titles[skip_count:]
    
    if not product_asins:
        print("⚠️ 商品が見つかりませんでした（広告除外後）")
        return []
    
    print(f"📦 {len(product_asins)}件の商品を処理します（広告{skip_count}件を除外）")
    
    products = []
    
    if fetch_details:
        def fetch_product_info(asin: str, title_from_html: str) -> Tuple[str, Dict]:
            try:
                product_info = get_amazon_product_info(asin)
                if not product_info.get("title") or len(product_info.get("title", "")) < 5:
                    product_info["title"] = title_from_html
                return (asin, product_info)
            except Exception:
                return (asin, {
                    "asin": asin,
                    "title": title_from_html,
                    "url": f"https://www.amazon.co.jp/dp/{asin}",
                    "price": "",
                    "image_url": ""
                })
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(fetch_product_info, asin, title): (asin, title)
                for asin, title in product_asins
            }
            
            for future in as_completed(futures.keys()):
                asin, title = futures[future]
                asin_result, product_info = future.result()
                products.append({
                    "index": len(products) + 1,
                    "asin": asin,
                    "title": product_info.get("title", title),
                    "price": product_info.get("price", ""),
                    "image_url": product_info.get("image_url", ""),
                    "affiliate_link": create_amazon_affiliate_link(asin, associate_id),
                    "amazon_url": product_info.get("url", f"https://www.amazon.co.jp/dp/{asin}")
                })
    else:
        for idx, (asin, title) in enumerate(product_asins, 1):
            products.append({
                "index": idx,
                "asin": asin,
                "title": title,
                "price": "",
                "image_url": "",
                "affiliate_link": create_amazon_affiliate_link(asin, associate_id),
                "amazon_url": f"https://www.amazon.co.jp/dp/{asin}"
            })
    
    return products


def generate_rakuten_affiliate_links(
    html_path: Path,
    affiliate_id: str = "",
    skip_count: int = 0,
    fetch_details: bool = False
) -> List[Dict[str, str]]:
    """楽天HTMLからアフィリエイトリンクを生成"""
    products_with_info = extract_rakuten_products_from_html(html_path)
    
    if not products_with_info:
        print("⚠️ 楽天商品が見つかりませんでした")
        return []
    
    print(f"✅ {len(products_with_info)}件の楽天商品を抽出しました")
    
    product_items = products_with_info[skip_count:]
    
    if not product_items:
        print("⚠️ 商品が見つかりませんでした（広告除外後）")
        return []
    
    print(f"📦 {len(product_items)}件の商品を処理します（広告{skip_count}件を除外）")
    
    products = []
    
    if fetch_details:
        def fetch_product_info(item_id: str, shop_id: str, title_from_html: str) -> Tuple[str, Dict]:
            try:
                product_info = get_rakuten_product_info(item_id, shop_id)
                if not product_info.get("title") or len(product_info.get("title", "")) < 5:
                    product_info["title"] = title_from_html
                return (item_id, product_info)
            except Exception:
                url = f"https://item.rakuten.co.jp/{shop_id}/{item_id}/" if shop_id else f"https://item.rakuten.co.jp/c/{item_id}/"
                return (item_id, {
                    "item_id": item_id,
                    "shop_id": shop_id,
                    "title": title_from_html,
                    "url": url,
                    "price": "",
                    "image_url": ""
                })
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(fetch_product_info, item_id, shop_id, title): (item_id, shop_id, title)
                for item_id, shop_id, title in product_items
            }
            
            for future in as_completed(futures.keys()):
                item_id, shop_id, title = futures[future]
                item_id_result, product_info = future.result()
                products.append({
                    "index": len(products) + 1,
                    "item_id": item_id,
                    "shop_id": product_info.get("shop_id", shop_id),
                    "title": product_info.get("title", title),
                    "price": product_info.get("price", ""),
                    "image_url": product_info.get("image_url", ""),
                    "affiliate_link": create_rakuten_affiliate_link(
                        item_id,
                        product_info.get("shop_id", shop_id),
                        affiliate_id
                    ),
                    "rakuten_url": product_info.get("url", f"https://item.rakuten.co.jp/c/{item_id}/")
                })
    else:
        for idx, (item_id, shop_id, title) in enumerate(product_items, 1):
            products.append({
                "index": idx,
                "item_id": item_id,
                "shop_id": shop_id,
                "title": title,
                "price": "",
                "image_url": "",
                "affiliate_link": create_rakuten_affiliate_link(item_id, shop_id, affiliate_id),
                "rakuten_url": f"https://item.rakuten.co.jp/{shop_id}/{item_id}/" if shop_id else f"https://item.rakuten.co.jp/c/{item_id}/"
            })
    
    return products


def save_to_json(products: List[Dict[str, str]], output_path: Path):
    """JSONファイルに保存"""
    output_path.write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f"\n✅ JSONファイルを保存しました: {output_path}")


def save_to_csv(products: List[Dict[str, str]], output_path: Path, is_amazon: bool = True):
    """CSVファイルに保存"""
    import csv
    
    fieldnames = (
        ['index', 'asin', 'title', 'affiliate_link', 'amazon_url']
        if is_amazon
        else ['index', 'item_id', 'shop_id', 'title', 'affiliate_link', 'rakuten_url']
    )
    
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(products)
    
    print(f"\n✅ CSVファイルを保存しました: {output_path}")


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(description='Amazon/楽天商品一覧HTMLからアフィリエイトリンクを生成')
    parser.add_argument('html_file', nargs='?', default='', help='HTMLファイルのパス')
    parser.add_argument('--type', '-t', choices=['amazon', 'rakuten', 'auto'], default='auto', help='商品タイプ（auto=自動判定）')
    parser.add_argument('--associate-id', '-a', default='', help='アフィリエイトID（Amazon: tag, 楽天: s-id）')
    parser.add_argument('--skip', '-s', type=int, default=4, help='広告商品を除外する件数（デフォルト: 4）')
    parser.add_argument('--format', '-f', choices=['json', 'csv', 'both'], default='json', help='出力形式（デフォルト: json）')
    parser.add_argument('--output', '-o', default='', help='出力ファイル名（省略時は自動生成）')
    parser.add_argument('--fetch-details', action='store_true', help='商品詳細情報を取得（時間がかかります）')
    
    args = parser.parse_args()
    
    # HTMLファイルを決定
    if args.html_file:
        html_path = Path(args.html_file)
    else:
        script_dir = Path(__file__).parent.parent
        html_files = sorted(script_dir.glob("*.html"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not html_files:
            print("❌ HTMLファイルが見つかりません")
            return
        html_path = html_files[0]
        print(f"📄 使用するHTMLファイル: {html_path.name}")
    
    # 商品タイプを自動判定
    if args.type == 'auto':
        product_type = detect_product_type(html_path)
        if not product_type:
            print("⚠️ 商品タイプを自動判定できませんでした。--typeオプションで指定してください。")
            return
    else:
        product_type = args.type
    
    print(f"🛒 商品タイプ: {product_type}")
    
    # アフィリエイトリンクを生成
    if product_type == 'amazon':
        products = generate_amazon_affiliate_links(html_path, args.associate_id, args.skip, args.fetch_details)
        is_amazon = True
    else:
        products = generate_rakuten_affiliate_links(html_path, args.associate_id, args.skip, args.fetch_details)
        is_amazon = False
    
    if not products:
        print("❌ 商品が見つかりませんでした")
        return
    
    # 出力ファイル名を決定
    if args.output:
        output_base = Path(args.output)
    else:
        output_base = html_path.stem + f"_{product_type}_affiliate_links"
    
    # 保存
    if args.format in ['json', 'both']:
        json_path = html_path.parent / f"{output_base}.json"
        save_to_json(products, json_path)
    
    if args.format in ['csv', 'both']:
        csv_path = html_path.parent / f"{output_base}.csv"
        save_to_csv(products, csv_path, is_amazon)
    
    print(f"\n📊 処理完了: {len(products)}件の商品リンクを生成しました")


if __name__ == "__main__":
    main()
