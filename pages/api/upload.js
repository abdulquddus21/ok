import { IncomingForm } from 'formidable';
import fs from 'fs-extra';
import path from 'path';

// Next.js body parserini o'chiramiz (fayl qabul qilish uchun kerak)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Faqat POST sorovlari qabul qilinadi' });
  }

  // Fayllarni saqlash joyi (Loyiha ichidagi public papkasi)
  // Eslatma: Bu faqat VPS yoki Local serverda ishlaydi (Vercel-da ishlamaydi)
  const uploadRoot = path.join(process.cwd(), 'public/uploads');
  
  // Papkalar borligini tekshirish va yaratish
  await fs.ensureDir(path.join(uploadRoot, 'image'));
  await fs.ensureDir(path.join(uploadRoot, 'video'));

  const form = new IncomingForm({
    keepExtensions: true, // Fayl kengaytmasini (.jpg, .png) saqlash
    uploadDir: uploadRoot, // Vaqtincha yuklash joyi
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Faylni o\'qishda xatolik' });
    }

    // Frontdan kelgan fayl (nomi "file" bo'lishi kerak)
    const uploadedFile = files.file?.[0] || files.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'Fayl yuklanmadi' });
    }

    // Fayl turi (mimetype) bo'yicha papkani aniqlash
    const mimeType = uploadedFile.mimetype;
    let subFolder = 'others';
    
    if (mimeType.startsWith('image/')) subFolder = 'image';
    else if (mimeType.startsWith('video/')) subFolder = 'video';

    // Faylning yakuniy joylashuvi
    const fileName = path.basename(uploadedFile.filepath); // formidable o'zi unikal nom beradi
    const finalPath = path.join(uploadRoot, subFolder, fileName);
    
    // Faylni to'g'ri papkaga ko'chiramiz
    await fs.move(uploadedFile.filepath, finalPath);

    // Frontendga URL qaytaramiz
    // Natija: /uploads/image/faylnomi.jpg
    const publicUrl = `/uploads/${subFolder}/${fileName}`;

    return res.status(200).json({ 
      url: publicUrl,
      type: subFolder
    });
  });
}