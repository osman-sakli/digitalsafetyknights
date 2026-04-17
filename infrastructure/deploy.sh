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
  --error-document index.html

# 5. Dosyaları yükle
echo "📤 Dosyalar yükleniyor..."
aws s3 sync frontend/ s3://$BUCKET/ \
  --delete \
  --acl public-read \
  --cache-control "max-age=86400"

echo ""
echo "✅ Deploy tamamlandı!"
echo "🌍 Site URL: http://$BUCKET.s3-website-$REGION.amazonaws.com"
echo ""
echo "⚠️  Sonraki adımlar:"
echo "   1. ACM SSL sertifikası al (us-east-1)"
echo "   2. CloudFront distribution oluştur"
echo "   3. Route 53'te A record ekle"