# -*- coding: utf-8 -*-
"""
アフィリエイトリンク生成スクリプト（エントリーポイント）
統合版へのリダイレクト
"""

import sys
from pathlib import Path

# パッケージのパスを追加
sys.path.insert(0, str(Path(__file__).parent))

from affiliate.main import main

if __name__ == "__main__":
    main()
