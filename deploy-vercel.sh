#!/bin/bash

# VerifiAI Protocol Deployment Script for Vercel
# Run this from the project root

echo "🚀 Deploying VerifiAI Protocol to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login:"
    echo "vercel login"
    exit 1
fi

# Deploy dashboard
echo "📦 Deploying dashboard..."
cd apps/dashboard

# Link to Vercel project (first time only)
if [ ! -f ".vercel" ]; then
    echo "🔗 Linking dashboard to Vercel project..."
    vercel link --yes
fi

# Deploy
vercel --prod

echo "✅ Dashboard deployed successfully!"
echo "🌐 Your dashboard is now live at the URL shown above"

cd ../..

echo ""
echo "📋 Next Steps:"
echo "1. Copy the dashboard URL from above"
echo "2. Update your API .env.production with the dashboard URL in CORS_ORIGIN"
echo "3. Deploy your API to a service like Railway, Render, or Vercel Pro"
echo "4. Update the dashboard .env.production with the API URL"
echo "5. Redeploy dashboard with: cd apps/dashboard && vercel --prod"

echo ""
echo "🔧 For API deployment options:"
echo "- Railway: https://railway.app (easiest for Express apps)"
echo "- Render: https://render.com"
echo "- Vercel Pro: For serverless functions"
echo "- AWS/Heroku: Traditional hosting"