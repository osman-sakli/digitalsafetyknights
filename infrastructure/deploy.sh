#!/bin/bash
# Digital Safety Knights — AWS Deploy Script
# Kullanım: chmod +x deploy.sh && ./deploy.sh

set -e  # Hata varsa dur

BUCKET="digitalsafetyknights.org"
REGION="us-east-1"

echo "🛡️  DSK Website Deploy Başlıyor..."
echo "======================================="

# 1. S3 Bucket oluştur (zaten varsa hata vermez)
echo "📦 S3 bucket kontrol ediliyor..."
aws s3 mb s3://$BUCKET --region $REGION 2>/dev/null || echo "Bucket zaten mevcut."

# 2. Public access ayarla
echo "🔓 Public access ayarlanıyor..."
aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 3. Bucket policy uygula
echo "📋 Bucket policy uygulanıyor..."
aws s3api put-bucket-policy \
  --bucket $BUCKET \
  --policy file://infrastructure/s3-policy.json

# 4. Website hosting aktif et
echo "🌐 Website hosting aktif ediliyor..."
aws s3 website s3://$BUCKET \
  --index-document index.html \
  --error-document 404.html

# 5. Dosyaları yükle
# Not: bucket "Bucket owner enforced" (ACL'ler kapalı) modunda; public erişim
# tamamen s3-policy.json'daki bucket policy'den geliyor, --acl kullanmıyoruz.
#
# HTML/JSON her deploy'da değişebilir, o yüzden "no-cache" (tarayıcı her
# seferinde sunucuya sorar) — aksi halde ziyaretçiler 24 saat eski sayfa
# görmeye devam eder. Görsel/PDF gibi değişmeyen dosyalar uzun cache'lenir.
# Regenerate sitemap.xml / robots.txt and refresh canonical tags so they can
# never drift from the actual set of pages being deployed.
echo "🔎 SEO dosyalari uretiliyor..."
python3 infrastructure/build-seo.py

echo "📤 Dosyalar yükleniyor..."
# videos/ holds the daily shorts, copied in by sync-video-library.py rather
# than living in this repo. Without this exclusion --delete would wipe the
# entire video library on the next deploy.
aws s3 sync frontend/ s3://$BUCKET/ \
  --delete \
  --exclude ".DS_Store" \
  --exclude "*.html" \
  --exclude "*.json" \
  --exclude "videos/*" \
  --cache-control "max-age=86400"

# content/news-feed.json and content/news-archive.json are written by the
# dsk-news-feed Lambda every 12h, not from this repo. They must be excluded
# here — otherwise --delete would wipe the live feed and the whole news
# archive on every site deploy.
aws s3 sync frontend/ s3://$BUCKET/ \
  --delete \
  --exclude "*" \
  --include "*.html" \
  --include "*.json" \
  --exclude "content/news-feed.json" \
  --exclude "content/news-archive.json" \
  --exclude "content/video-library.json" \
  --cache-control "no-cache"

echo ""
echo "✅ Deploy tamamlandı!"
echo "🌍 Site URL: http://$BUCKET.s3-website-$REGION.amazonaws.com"
echo ""
echo "⚠️  Sonraki adımlar:"
echo "   1. ACM SSL sertifikası al (us-east-1)"
echo "   2. CloudFront distribution oluştur"
echo "   3. Route 53'te A record ekle"