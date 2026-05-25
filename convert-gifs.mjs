import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define your directories
const inputDir = path.join(process.cwd(), 'public', 'frags-gifs');
const outputDir = path.join(process.cwd(), 'public', 'frags-videos');

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Grab all .gif files
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.gif'));

console.log(`Found ${files.length} GIFs. Starting compression engine...\n`);

files.forEach((file, index) => {
  const inputPath = path.join(inputDir, file);
  const baseName = path.parse(file).name;
  
  const webmOutput = path.join(outputDir, `${baseName}.webm`);
  const mp4Output = path.join(outputDir, `${baseName}.mp4`);

  console.log(`[${index + 1}/${files.length}] Crushing: ${file}`);

  try {
    // 1. Convert to WebM (Best compression, used by Chrome/Firefox)
    console.log(`  -> Generating WebM...`);
    execSync(`ffmpeg -y -i "${inputPath}" -c:v libvpx-vp9 -crf 30 -b:v 0 -an -pix_fmt yuv420p "${webmOutput}"`, { stdio: 'ignore' });

    // 2. Convert to MP4 (Maximum compatibility, used by Safari)
    console.log(`  -> Generating MP4...`);
    execSync(`ffmpeg -y -i "${inputPath}" -c:v libx264 -crf 25 -preset fast -profile:v baseline -level 3.0 -an -pix_fmt yuv420p -movflags +faststart "${mp4Output}"`, { stdio: 'ignore' });

    console.log(`  ✅ Done.`);
  } catch (err) {
    console.error(`  ❌ Failed to convert ${file}.`);
    console.error(`  Make sure you have FFmpeg installed on your machine!`);
  }
});

console.log(`\n🎉 Conversion complete! Go check the file sizes in /public/frags-videos!`);