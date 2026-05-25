import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const VIDEO_DIR = path.join(process.cwd(), 'public', 'frags-videos');

async function main() {
  console.log('Starting video upload to Cloudinary CDN...\n');
  
  if (!fs.existsSync(VIDEO_DIR)) {
    console.error('❌ Directory public/frags-videos does not exist!');
    process.exit(1);
  }

 const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
  const urlMap = {};

  for (const file of files) {
    const filePath = path.join(VIDEO_DIR, file);
    const baseName = path.parse(file).name;
    const ext = path.parse(file).ext.replace('.', ''); // 'webm' or 'mp4'
    
    console.log(`Uploading ${file}...`);
    
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'frags/videos',
        use_filename: true,
        unique_filename: false,
        resource_type: "video", // Critical: Tells Cloudinary this is a video
        overwrite: true
      });
      
      // Initialize the nested object if it doesn't exist
      if (!urlMap[baseName]) urlMap[baseName] = {};
      
      urlMap[baseName][ext] = result.secure_url;
    } catch (error) {
      console.error(`❌ Failed to upload ${file}:`, error);
    }
  }

  // Save the map so you can copy-paste the URLs into your code
  fs.writeFileSync('video-map.json', JSON.stringify(urlMap, null, 2));
  
  console.log('\n✅ Upload complete! Wrote CDN URLs to video-map.json');
}

main();