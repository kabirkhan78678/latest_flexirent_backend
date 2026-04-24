import multer from 'multer';
import path from 'path';

const storageProduct = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/profile/');
    },
    filename: (req, file, cb) => {
        console.log('file', file);
        const ext = path.extname(file.originalname)
        const fileName = `${file.fieldname}${Date.now()}${ext}`;
        cb(null, fileName);
    },
});

export const uploadProfile = multer({ storage: storageProduct });