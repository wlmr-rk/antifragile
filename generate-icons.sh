#!/bin/bash

# Generate PWA icons from AppLogo.png
# Requires ImageMagick (install with: sudo apt install imagemagick)

if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Install it with:"
    echo "  sudo apt install imagemagick"
    exit 1
fi

if [ ! -f "AppLogo.png" ]; then
    echo "AppLogo.png not found in current directory"
    exit 1
fi

echo "Generating PWA icons..."

# Generate 192x192 icon
convert AppLogo.png -resize 192x192 static/icon-192.png
echo "✓ Generated icon-192.png"

# Generate 512x512 icon (already exists but regenerate for consistency)
convert AppLogo.png -resize 512x512 static/icon-512.png
echo "✓ Generated icon-512.png"

# Generate maskable icon (with padding for safe area)
convert AppLogo.png -resize 410x410 -gravity center -extent 512x512 -background "#000000" static/icon-maskable-512.png
echo "✓ Generated icon-maskable-512.png"

# Generate favicon
convert AppLogo.png -resize 32x32 static/favicon.ico
echo "✓ Generated favicon.ico"

# Generate Apple touch icon
convert AppLogo.png -resize 180x180 static/apple-touch-icon.png
echo "✓ Generated apple-touch-icon.png"

echo ""
echo "All icons generated successfully!"
echo "You can now use the app as a PWA."
