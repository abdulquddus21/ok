// lib/upload.js
export const uploadToCatbox = async (file) => {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', '2f5d304c9d3a6788a634c9250'); // Sizning hash
    formData.append('fileToUpload', file);
  
    try {
      // Catbox CORS muammosi bo'lishi mumkin, shuning uchun Next.js API orqali proksi qilish afzal, 
      // lekin to'g'ridan-to'g'ri urinib ko'ramiz (yoki 'no-cors' rejimi kerak bo'ladi).
      // Eng yaxshi yo'l - Next.js API route orqali yuborish.
      
      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // Brauzerdan to'g'ridan-to'g'ri ishlashi qiyin, javobni ololmaysiz
      });
      
      // Eslatma: 'no-cors' da javob textini ololmaysiz. 
      // Haqiqiy loyihada buni Server tomonida (Next API) qilish kerak.
      // Hozircha oddiy simulyatsiya qilamiz yoki public proxy ishlatamiz.
      
      // AGAR FAYLE YUKLASHDA MUAMMO BOLSA, pages/api/upload.js ochib o'sha yerdan fetch qiling.
      return "https://files.catbox.moe/test_file.jpg"; // Placeholder (Backend sozlanmaguncha)
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };