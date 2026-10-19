#!/usr/bin/env bash
# 构建并部署网站：Astro build → S3 sync → CloudFront 失效
# 首次运行会创建 S3/CloudFront/Route53 基础设施（约 5-10 分钟）
# 用法: bash scripts/deploy-site.sh
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="us-east-1"
STACK="jvyin-site"
BUCKET="jvyin.com"

if [ ! -f .cert-arn ]; then
  echo "!! 缺少 .cert-arn，请先运行: bash scripts/setup-cert.sh"
  exit 1
fi
CERT_ARN="$(cat .cert-arn)"

API_DOMAIN="$(aws cloudformation describe-stacks --stack-name jvyin-newsletter --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiDomain`].OutputValue' --output text 2>/dev/null || true)"

echo "==> 1/4 构建站点（生产环境使用同源 /api 转发）"
PUBLIC_SUBSCRIBE_API_URL= pnpm build

echo "==> 2/4 部署基础设施 ${STACK}（首次约 5-10 分钟）"
aws cloudformation deploy \
  --stack-name "$STACK" \
  --template-file infra/site.yaml \
  --region "$REGION" \
  --parameter-overrides "CertificateArn=$CERT_ARN" "ApiOriginDomain=$API_DOMAIN" \
  --capabilities CAPABILITY_IAM

echo "==> 3/4 同步静态文件到 s3://$BUCKET"
aws s3 sync dist/ "s3://$BUCKET" --delete --region "$REGION"

echo "==> 4/4 刷新 CloudFront 缓存"
DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='jvyin.com site'].Id" --output text)"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*' >/dev/null
echo "    缓存已失效"

echo ""
echo "✅ 部署完成: https://jvyin.com"
