#!/bin/bash

# AWS S3 + CloudFront Deployment Script
# Usage: ./deploy/aws-s3-cloudfront.sh

set -e

# Configuration
BUCKET_NAME="central-analytics-pwa"
AWS_REGION="us-east-1"
CLOUDFRONT_DISTRIBUTION_ID=""  # Will be set after first deployment

echo "🚀 Starting deployment to AWS S3 + CloudFront"

# Build the application
echo "📦 Building application with Bun..."
bun run build

# Check if bucket exists, create if not
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "🪣 Creating S3 bucket..."
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$AWS_REGION"

    # Enable static website hosting
    aws s3 website "s3://$BUCKET_NAME/" \
        --index-document index.html \
        --error-document 404.html

    # Set bucket policy for public access
    cat > /tmp/bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

    aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --policy file:///tmp/bucket-policy.json

    rm /tmp/bucket-policy.json
    echo "✅ S3 bucket created and configured"
fi

# Sync built files to S3
echo "📤 Uploading files to S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "manifest.json" \
    --exclude "sw.js" \
    --exclude "workbox-*.js"

# Upload HTML files with no-cache headers
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --exclude "*" \
    --include "*.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

# Upload service worker and manifest with specific headers
aws s3 cp dist/manifest.json "s3://$BUCKET_NAME/manifest.json" \
    --cache-control "no-cache" \
    --content-type "application/manifest+json"

if [ -f "dist/sw.js" ]; then
    aws s3 cp dist/sw.js "s3://$BUCKET_NAME/sw.js" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

# Upload any workbox files
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --exclude "*" \
    --include "workbox-*.js" \
    --cache-control "public, max-age=31536000" \
    --content-type "application/javascript"

echo "✅ Files uploaded to S3"

# Create or update CloudFront distribution
if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "🌐 Creating CloudFront distribution..."

    cat > /tmp/cloudfront-config.json <<EOF
{
    "CallerReference": "$(date +%s)",
    "Comment": "Central Analytics PWA",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 2,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            },
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100",
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
    }
}
EOF

    DISTRIBUTION_ID=$(aws cloudfront create-distribution \
        --distribution-config file:///tmp/cloudfront-config.json \
        --query 'Distribution.Id' \
        --output text)

    rm /tmp/cloudfront-config.json

    echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"
    echo "⚠️  Please update CLOUDFRONT_DISTRIBUTION_ID in this script with: $DISTRIBUTION_ID"

    CLOUDFRONT_URL=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query 'Distribution.DomainName' \
        --output text)

    echo "🌍 Your app will be available at: https://$CLOUDFRONT_URL"
    echo "⏳ CloudFront deployment may take 15-30 minutes to complete"
else
    # Invalidate CloudFront cache
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text

    echo "✅ CloudFront cache invalidated"
fi

echo "🎉 Deployment complete!"