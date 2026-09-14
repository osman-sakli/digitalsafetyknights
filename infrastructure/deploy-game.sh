#!/bin/bash
# Knight's Duel game — deploy script (mirrors deploy.sh, separate bucket/distribution)

set -e

BUCKET="play.digitalsafetyknights.org"
DISTRIBUTION_ID="ERHLU1QK7U8JM"

echo "⚔️  Knight's Duel Deploy Başlıyor..."
echo "======================================="

echo "📤 Dosyalar yükleniyor..."
aws s3 sync game-site/ s3://$BUCKET/ \
  --delete \
  --exclude ".DS_Store" \
  --exclude "*.html" \
  --exclude "*.json" \
  --cache-control "max-age=86400"

aws s3 sync game-site/ s3://$BUCKET/ \
  --delete \
  --exclude "*" \
  --include "*.html" \
  --include "*.json" \
  --cache-control "no-cache"

echo "♻️  CloudFront invalidation..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" > /dev/null

echo ""
echo "✅ Deploy tamamlandı!"
echo "🌍 Site URL: https://play.digitalsafetyknights.org"
