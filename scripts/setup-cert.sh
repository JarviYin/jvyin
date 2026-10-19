#!/usr/bin/env bash
# 申请 ACM 证书（us-east-1，CloudFront 要求）并自动写入 DNS 验证记录
# 用法: bash scripts/setup-cert.sh
set -euo pipefail

REGION="us-east-1"
DOMAIN="jvyin.com"
HOSTED_ZONE_ID="Z07178802NZXJVAG1M8HF"

echo "==> 申请证书: $DOMAIN + www.$DOMAIN"
ARN="$(aws acm request-certificate \
  --region "$REGION" \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --subject-alternative-names "www.$DOMAIN" \
  --query CertificateArn --output text)"
echo "    CertificateArn: $ARN"
echo "$ARN" > .cert-arn

echo "==> 等待验证选项生成"
for i in $(seq 1 30); do
  OPTS="$(aws acm describe-certificate --region "$REGION" --certificate-arn "$ARN" \
    --query 'Certificate.DomainValidationOptions[].ResourceRecord' 2>/dev/null || true)"
  if echo "$OPTS" | jq -e '.[0].Name != null' >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "$OPTS" | jq -c '.[]' | while read -r REC; do
  NAME="$(echo "$REC" | jq -r '.Name')"
  VALUE="$(echo "$REC" | jq -r '.Value')"
  echo "    验证记录: $NAME -> $VALUE"
  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$NAME\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$VALUE\"}]}}]}" \
    --query 'ChangeInfo.Status' --output text >/dev/null
done

echo "==> 等待证书签发（通常 1-5 分钟）"
aws acm wait certificate-validated --region "$REGION" --certificate-arn "$ARN"
echo "✅ 证书已签发: $ARN"
