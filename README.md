digitalsafetyknights/
│
├── frontend/                  ← Website dosyaları
│   ├── index.html             ← Ana sayfa (tek dosya)
│   ├── assets/
│   │   ├── logo.png           ← DSK logosu (PDF'den export et)
│   │   ├── logo.svg           ← SVG versiyonu
│   │   └── favicon.ico        ← Tarayıcı ikonu
│   └── guides/                ← PDF rehberler (ileride eklenecek)
│
├── backend/                   ← Üyelik API (AWS Lambda)
│   ├── lambda_signup.py       ← Kayıt fonksiyonu
│   ├── lambda_email.py        ← E-posta gönderme
│   └── requirements.txt
│
├── infrastructure/            ← AWS kurulum kodları
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── s3.tf
│   │   ├── cloudfront.tf
│   │   ├── route53.tf
│   │   └── lambda.tf
│   └── deploy.sh              ← Tek komutla deploy
│
├── .github/
│   └── workflows/
│       └── deploy.yml         ← GitHub Actions (otomatik deploy)
│
├── .gitignore
└── README.md