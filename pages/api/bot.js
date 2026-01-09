// pages/api/bot.js
import { createClient } from '@supabase/supabase-js';
import TelegramBot from 'node-telegram-bot-api';

// Konfiguratsiya
const token = '8352333952:AAEASE3GmGHneuEzCgmzY6EbznkojwExrZ8';
const supabaseUrl = 'https://vipmdvwkymqvczsejlsm.supabase.co';
const supabaseKey = 'sb_publishable_JbCYgR2DXpnN4Rp8QShEgw_8HzoYKze'; // Siz bergan kalit

// Botni pollingSIZ (faqat xabar yuborish uchun) ishga tushiramiz
const bot = new TelegramBot(token, { polling: false });
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Faqat POST so'rovlarni (Telegramdan kelgan yangilanishlarni) qabul qilamiz
  if (req.method === 'POST') {
    try {
      const { message } = req.body;

      // Agar xabar bo'lmasa yoki matn bo'lmasa, shunchaki OK qaytaramiz
      if (!message || !message.text) {
        return res.status(200).json({ message: 'No text message' });
      }

      const chatId = message.chat.id;
      const text = message.text;

      // /start komandasi bosilganda
      if (text === '/start') {
        // 1. 6 xonalik kod generatsiya qilish
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Kodni Supabase bazasiga yozish
        const { error } = await supabase
          .from('verification_codes')
          .insert([{ code: code }]);

        if (error) {
          console.error('Supabase Error:', error);
          await bot.sendMessage(chatId, "Tizimda xatolik yuz berdi. Birozdan so'ng urinib ko'ring.");
          return res.status(200).send('Error saved');
        }

        // 3. Foydalanuvchiga kodni yuborish
        await bot.sendMessage(
          chatId, 
          `Sizning tasdiqlash kodingiz: \`${code}\`\n\nBu kod 5 daqiqa davomida amal qiladi.`, 
          { parse_mode: 'Markdown' }
        );

        // 4. (Ixtiyoriy) Kodni tozalash logikasini bu yerda Serverless funksiyada 
        // setTimeout bilan qilish tavsiya etilmaydi, chunki funksiya o'chib qolishi mumkin.
        // Supabase-da "Row Level Security" yoki Cron orqali eski kodlarni o'chirish afzalroq.
      } else {
        // Boshqa har qanday so'z yozsa
        await bot.sendMessage(chatId, "Kod olish uchun /start ni bosing.");
      }

    } catch (error) {
      console.error('Bot Handler Error:', error);
    }

    // Telegramga doim 200 qaytarish kerak, aks holda u xabarni qayta-qayta yuboraveradi
    return res.status(200).send('OK');
  } 
  
  // Agar browserdan kirilsa (GET so'rov)
  else {
    res.status(200).json({ message: 'Bot webhook is active!' });
  }
}