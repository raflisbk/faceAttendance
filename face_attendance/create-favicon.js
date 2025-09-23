const fs = require('fs');

// Create a simple ICO file with pixel art face
function createPixelFavicon() {
    // ICO file header
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);  // Reserved
    header.writeUInt16LE(1, 2);  // Type (1 = ICO)
    header.writeUInt16LE(1, 4);  // Number of images

    // ICO directory entry (16 bytes)
    const dirEntry = Buffer.alloc(16);
    dirEntry.writeUInt8(16, 0);   // Width (16 pixels)
    dirEntry.writeUInt8(16, 1);   // Height (16 pixels)
    dirEntry.writeUInt8(0, 2);    // Color palette (0 = no palette)
    dirEntry.writeUInt8(0, 3);    // Reserved
    dirEntry.writeUInt16LE(1, 4); // Color planes
    dirEntry.writeUInt16LE(32, 6); // Bits per pixel
    dirEntry.writeUInt32LE(0, 8); // Image size (will be set later)
    dirEntry.writeUInt32LE(22, 12); // Offset to image data

    // Create 16x16 pixel data (RGBA format)
    const imageData = Buffer.alloc(16 * 16 * 4); // 16x16 pixels, 4 bytes per pixel (RGBA)

    // Fill with white background
    for (let i = 0; i < imageData.length; i += 4) {
        imageData[i] = 255;     // R
        imageData[i + 1] = 255; // G
        imageData[i + 2] = 255; // B
        imageData[i + 3] = 255; // A
    }

    // Helper function to set pixel
    function setPixel(x, y, r, g, b, a = 255) {
        if (x >= 0 && x < 16 && y >= 0 && y < 16) {
            const index = (y * 16 + x) * 4;
            imageData[index] = r;
            imageData[index + 1] = g;
            imageData[index + 2] = b;
            imageData[index + 3] = a;
        }
    }

    // Draw pixel face (scaled down for 16x16)
    // Face outline
    for (let i = 2; i < 14; i++) {
        setPixel(i, 1, 0, 0, 0); // Top
        setPixel(i, 14, 0, 0, 0); // Bottom
    }
    for (let i = 2; i < 14; i++) {
        setPixel(1, i, 0, 0, 0); // Left
        setPixel(14, i, 0, 0, 0); // Right
    }
    setPixel(2, 2, 0, 0, 0);
    setPixel(13, 2, 0, 0, 0);
    setPixel(2, 13, 0, 0, 0);
    setPixel(13, 13, 0, 0, 0);

    // Eyes
    setPixel(4, 5, 0, 0, 0);
    setPixel(11, 5, 0, 0, 0);

    // Nose
    setPixel(7, 7, 0, 0, 0);
    setPixel(8, 7, 0, 0, 0);

    // Mouth (smile)
    setPixel(5, 10, 0, 0, 0);
    setPixel(6, 11, 0, 0, 0);
    setPixel(7, 11, 0, 0, 0);
    setPixel(8, 11, 0, 0, 0);
    setPixel(9, 11, 0, 0, 0);
    setPixel(10, 10, 0, 0, 0);

    // Face recognition corners
    setPixel(0, 0, 0, 0, 0);
    setPixel(1, 0, 0, 0, 0);
    setPixel(0, 1, 0, 0, 0);
    setPixel(14, 0, 0, 0, 0);
    setPixel(15, 0, 0, 0, 0);
    setPixel(15, 1, 0, 0, 0);
    setPixel(0, 14, 0, 0, 0);
    setPixel(0, 15, 0, 0, 0);
    setPixel(1, 15, 0, 0, 0);
    setPixel(14, 15, 0, 0, 0);
    setPixel(15, 14, 0, 0, 0);
    setPixel(15, 15, 0, 0, 0);

    // PNG header for embedded image
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A // PNG signature
    ]);

    // For simplicity, let's create a BMP format inside ICO
    const bmpHeader = Buffer.alloc(40);
    bmpHeader.writeUInt32LE(40, 0);        // Header size
    bmpHeader.writeInt32LE(16, 4);         // Width
    bmpHeader.writeInt32LE(32, 8);         // Height (doubled for icon)
    bmpHeader.writeUInt16LE(1, 12);        // Planes
    bmpHeader.writeUInt16LE(32, 14);       // Bits per pixel
    bmpHeader.writeUInt32LE(0, 16);        // Compression
    bmpHeader.writeUInt32LE(16 * 16 * 4, 20); // Image size
    bmpHeader.writeUInt32LE(0, 24);        // X pixels per meter
    bmpHeader.writeUInt32LE(0, 28);        // Y pixels per meter
    bmpHeader.writeUInt32LE(0, 32);        // Colors used
    bmpHeader.writeUInt32LE(0, 36);        // Important colors

    // Create AND mask (all transparent)
    const andMask = Buffer.alloc(16 * 16 / 8); // 1 bit per pixel
    andMask.fill(0);

    // Flip image data vertically (BMP requirement)
    const flippedImageData = Buffer.alloc(imageData.length);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const srcIndex = (y * 16 + x) * 4;
            const dstIndex = ((15 - y) * 16 + x) * 4;
            flippedImageData[dstIndex] = imageData[srcIndex];
            flippedImageData[dstIndex + 1] = imageData[srcIndex + 1];
            flippedImageData[dstIndex + 2] = imageData[srcIndex + 2];
            flippedImageData[dstIndex + 3] = imageData[srcIndex + 3];
        }
    }

    // Combine all parts
    const imageSize = bmpHeader.length + flippedImageData.length + andMask.length;
    dirEntry.writeUInt32LE(imageSize, 8);

    const icoFile = Buffer.concat([header, dirEntry, bmpHeader, flippedImageData, andMask]);

    return icoFile;
}

// Generate and save favicon
const favicon = createPixelFavicon();
fs.writeFileSync('./public/favicon.ico', favicon);

console.log('Favicon created successfully!');
console.log('Files created:');
console.log('- public/favicon.ico');
console.log('- public/favicon.svg');