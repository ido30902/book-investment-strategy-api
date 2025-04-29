echo "Strategy Deploying..."

git checkout main

echo "Building..."
npm run build

echo "Deploying..."

scp -r build/* root@82.25.101.152:/var/www/investmentbookstrategy.com-api/

echo "Deployed!"

