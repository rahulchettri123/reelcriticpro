#!/bin/bash

# Ensure out directory exists
mkdir -p out

# Copy static 404 page
cp public/404.html out/404.html

# Run Next.js build
npm run build

# Copy public folder contents to out
cp -r public/* out/

# Create a netlify.toml in the output directory
cat > out/_redirects << EOL
/*    /index.html   200
EOL

echo "Build completed successfully!" 