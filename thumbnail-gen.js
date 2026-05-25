const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define your paths based on your Next.js public folder
const inputDir = path.join(__dirname, 'public', 'frags-gifs');
const outputDir = path.join(__dirname, 'public', 'frags-static');

// 1. Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created directory: ${outputDir}`);
}

// 2. Read all the GIFs in the input folder
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.gif'));

if (files.length === 0) {
  console.log('⚠️ No GIFs found in public/frags-gifs!');
  process.exit(0);
}

console.log(`🚀 Found ${files.length} GIFs. Extracting first frames...`);

// 3. Loop through and extract the first frame of each
files.forEach(file => {
  const inputPath = path.join(inputDir, file);
  // Swap .gif for .jpg
  const outputPath = path.join(outputDir, file.replace('.gif', '.jpg'));
  
  try {
    // -y: overwrite existing files
    // -i: input file
    // -vframes 1: grab exactly 1 frame
    // -q:v 2: high-quality jpeg compression
    execSync(`ffmpeg -y -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' });
    console.log(`✅ Saved: ${file.replace('.gif', '.jpg')}`);
  } catch (error) {
    console.error(`❌ Failed to process ${file}. Check if FFmpeg is installed.`);
  }
});

console.log('🎉 All done! Your static thumbnails are ready.');