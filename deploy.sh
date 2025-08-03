#!/bin/bash
# Comprehensive deployment script for Walton Trailers Configurator

echo "=== Walton Trailers Deployment Script ==="
echo "This script ensures your application deploys correctly"
echo

# Step 1: Build the application
echo "Step 1: Building the application..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi
echo "✓ Build completed successfully"
echo

# Step 2: Run post-build fixes
echo "Step 2: Running post-build fixes..."
node postbuild.js
if [ $? -ne 0 ]; then
    echo "ERROR: Post-build fixes failed!"
    exit 1
fi
echo "✓ Post-build fixes applied"
echo

# Step 3: Verify static files
echo "Step 3: Verifying static files..."
if [ ! -d "dist/public" ]; then
    echo "ERROR: dist/public directory not found!"
    exit 1
fi

if [ ! -f "dist/public/index.html" ]; then
    echo "ERROR: dist/public/index.html not found!"
    exit 1
fi

echo "✓ Static files verified"
echo

# Step 4: Test production server locally
echo "Step 4: Testing production server..."
NODE_ENV=production timeout 10s node dist/index.js &
SERVER_PID=$!
sleep 3

# Test health endpoint
if curl -s http://localhost:5000/health | grep -q "OK"; then
    echo "✓ Health check passed"
    kill $SERVER_PID 2>/dev/null
else
    echo "ERROR: Health check failed!"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
echo

# Step 5: Create deployment start script
echo "Step 5: Creating deployment start script..."
cat > start.sh << 'EOF'
#!/bin/bash
# Production start script
node start-production.js
EOF
chmod +x start.sh
echo "✓ Start script created"
echo

echo "=== Deployment preparation complete! ==="
echo
echo "Your application is ready for deployment with the following structure:"
echo "  - Server: dist/index.js"
echo "  - Static files: dist/public/"
echo "  - Symlinks: server/public -> dist/public"
echo "              public -> dist/public"
echo
echo "To deploy on Replit:"
echo "  1. The deployment will run: npm run build"
echo "  2. Then it will run: npm run start"
echo "  3. Your app will be available at the deployment URL"
echo
echo "Health check endpoints available:"
echo "  - /health"
echo "  - /healthz"
echo "  - /ping"
echo "  - /status"
echo "  - / (with Accept: application/json header)"
echo