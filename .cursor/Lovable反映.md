#mangaverse-hub の場合

# 1. 最新を取得してビルド
cd C:\Users\ktmno\Desktop\Lobvavle\mangaverse-hub
git pull origin main
npm run build

# 2. ビルド結果をコピー
cd ..\autoblog-builder
Remove-Item -Path sites\comic-review-navi.com\assets -Recurse -Force
Copy-Item -Path ..\mangaverse-hub\dist\index.html -Destination sites\comic-review-navi.com\index.html -Force
New-Item -ItemType Directory -Path sites\comic-review-navi.com\assets -Force
Copy-Item -Path ..\mangaverse-hub\dist\assets\* -Destination sites\comic-review-navi.com\assets\ -Recurse -Force

# 3. GitHubにプッシュ
git add sites\comic-review-navi.com\index.html sites\comic-review-navi.com\assets\
git commit -m "Update toppage"
git push