import fs from 'fs';
import path from 'path';


export const deleteProfileImage = (fileName) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join('public/profile', fileName);
    
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist
          console.warn(`File not found: ${filePath}`);
          return resolve();
        }
        return reject(err);
      }
      console.log(`File deleted: ${filePath}`);
      resolve();
    });
  });
};
