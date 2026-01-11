import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { FaArrowLeft, FaPaperPlane, FaPaperclip, FaVideo, FaImage, FaFile } from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'

export default function ChatRoom() {
  const router = useRouter();
  const { id, name, type } = router.query; // id = Room ID (UUID), name = Chat nomi
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]); // Haqiqiy xabarlar
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Userni aniqlash va xabarlarni yuklash
  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const currentUser = JSON.parse(storedUser);
    setUser(currentUser);

    if (id) {
      fetchMessages(id);
      subscribeToRealtime(id);
    }

    // Tozalash
    return () => {
      supabase.removeAllChannels();
    };
  }, [id]);

  // 2. Avtomatik pastga tushish
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Xabarlarni bazadan olish
  const fetchMessages = async (roomId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  // 4. Jonli xabarlarni eshitish (Realtime)
  const subscribeToRealtime = (roomId) => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();
  };

  // 5. Catbox.moe ga fayl yuklash
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 200MB cheklov
    if (file.size > 200 * 1024 * 1024) {
      alert("Fayl hajmi 200MB dan oshmasligi kerak!");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('userhash', '2f5d304c9d3a6788a634c9250'); // Sizning HASH
      formData.append('fileToUpload', file);

      // Eslatma: Brauzerdan Catboxga to'g'ridan-to'g'ri so'rov yuborishda CORS muammosi bo'lishi mumkin.
      // Agar ishlamasa, 'no-cors' rejimi yoki Next.js API route kerak bo'ladi.
      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const fileUrl = await response.text(); // Catbox URL qaytaradi
        const fileType = file.type.startsWith('image') ? 'image' : 'video';
        await sendMessage(null, fileUrl, fileType);
      } else {
        alert("Fayl yuklashda xatolik yuz berdi (Catbox Server Error).");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Internet xatosi yoki CORS bloklandi.");
    } finally {
      setUploading(false);
    }
  };

  // 6. Xabar yuborish (Matn yoki Fayl)
  const sendMessage = async (e, fileUrl = null, fileType = null) => {
    if (e) e.preventDefault();
    
    const content = newMessage.trim();
    if (!content && !fileUrl) return;

    // Bazaga yozish
    const { error } = await supabase
      .from('messages')
      .insert([{
        room_id: id,
        sender_id: user.id,
        content: content,
        file_url: fileUrl,
        file_type: fileType
      }]);

    if (error) {
      alert("Xabar yuborilmadi!");
    } else {
      setNewMessage('');
    }
  };

  if (!user || !id) return <div className="loading">Yuklanmoqda...</div>;

  return (
    <div className="chat-container">
      <Head><title>{name || 'Chat'}</title></Head>

      {/* HEADER */}
      <div className="chat-header">
        <button onClick={() => router.push('/chat')} className="back-btn">
          <FaArrowLeft />
        </button>
        <div className="header-info">
          <div className="avatar">
            {name ? name[0].toUpperCase() : 'C'}
          </div>
          <div className="title-box">
            <h2>{name || 'Noma\'lum'}</h2>
            <p>{type === 'channel' ? 'kanal' : 'online'}</p>
          </div>
        </div>
      </div>

      {/* MESSAGES BODY */}
      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Hozircha xabarlar yo'q.</p>
            <span>Birinchi xabarni yozing!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`message-wrapper ${isMe ? 'my-msg' : 'other-msg'}`}>
                <div className="message-bubble">
                  {/* Agar Fayl bo'lsa */}
                  {msg.file_url && (
                    <div className="media-content">
                      {msg.file_type === 'image' ? (
                        <img src={msg.file_url} alt="image" loading="lazy" />
                      ) : (
                        <video src={msg.file_url} controls playsInline />
                      )}
                    </div>
                  )}
                  
                  {/* Matn */}
                  {msg.content && <p className="text-content">{msg.content}</p>}
                  
                  <span className="msg-time">
                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={(e) => sendMessage(e)} className="input-bar">
        {/* Fayl yuklash tugmasi */}
        <label className={`attach-btn ${uploading ? 'disabled' : ''}`}>
          <FaPaperclip />
          <input 
            type="file" 
            hidden 
            accept="image/*,video/*" 
            onChange={handleFileUpload} 
            disabled={uploading}
          />
        </label>

        <input 
          type="text" 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={uploading ? "Fayl yuklanmoqda..." : "Xabar yozing..."}
          className="text-input"
          disabled={uploading}
        />

        <button type="submit" className="send-btn" disabled={uploading}>
          <FaPaperPlane />
        </button>
      </form>

      {/* STYLES (Ichki CSS) */}
      <style jsx>{`
        /* Global Reset for this component */
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #0e1621; /* Telegram Dark Background */
          background-image: url('https://w.wallhaven.cc/full/lm/wallhaven-lm5kql.jpg'); /* Pattern */
          background-size: cover;
          background-blend-mode: overlay;
          font-family: 'Segoe UI', sans-serif;
          position: relative;
           /* Mobil scroll effektini yumshatish */
          -webkit-tap-highlight-color: transparent;
        }

        .loading {
          color: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: #0e1621;
        }

        /* --- HEADER --- */
        .chat-header {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          background-color: #17212b; /* Darker header */
          border-bottom: 1px solid #000;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }

        .back-btn {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.2rem;
          margin-right: 15px;
          cursor: pointer;
          padding: 5px;
        }

        .header-info {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #cfae5f, #b3934b);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 12px;
        }

        .title-box h2 {
          margin: 0;
          font-size: 1rem;
          color: #fff;
        }

        .title-box p {
          margin: 0;
          font-size: 0.8rem;
          color: #6c7883;
        }

        /* --- MESSAGES AREA --- */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .empty-chat {
          margin: auto;
          text-align: center;
          background: rgba(23, 33, 43, 0.6);
          padding: 20px;
          border-radius: 12px;
          color: #fff;
        }

        .message-wrapper {
          display: flex;
          width: 100%;
        }

        .my-msg {
          justify-content: flex-end;
        }

        .other-msg {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 300px;
          padding: 8px 12px;
          border-radius: 12px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          word-wrap: break-word;
        }

        .my-msg .message-bubble {
          background-color: #2b5278; /* Telegram Blue msg */
          color: #fff;
          border-bottom-right-radius: 0;
        }

        .other-msg .message-bubble {
          background-color: #182533; /* Dark Grey msg */
          color: #fff;
          border-bottom-left-radius: 0;
        }

        .media-content {
          margin-bottom: 5px;
        }
        
        .media-content img, .media-content video {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          display: block;
        }

        .text-content {
          margin: 0;
          font-size: 1rem;
          line-height: 1.4;
        }

        .msg-time {
          display: block;
          text-align: right;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.5);
          margin-top: 2px;
        }

        /* --- INPUT BAR --- */
        .input-bar {
          display: flex;
          align-items: center;
          padding: 10px;
          background-color: #17212b;
          border-top: 1px solid #000;
          gap: 10px;
        }

        .attach-btn {
          color: #6c7883;
          font-size: 1.3rem;
          cursor: pointer;
          padding: 5px;
          transition: color 0.2s;
        }

        .attach-btn:hover {
          color: #cfae5f;
        }

        .attach-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .text-input {
          flex: 1;
          background-color: #0e1621; /* Input background */
          border: none;
          padding: 12px;
          border-radius: 20px;
          color: #fff;
          font-size: 1rem;
          outline: none;
        }

        .send-btn {
          background: none;
          border: none;
          color: #5288c1;
          font-size: 1.3rem;
          cursor: pointer;
          padding: 5px;
          transition: transform 0.2s;
        }

        .send-btn:hover {
          color: #cfae5f;
          transform: scale(1.1);
        }

        .send-btn:disabled {
          opacity: 0.5;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .message-bubble {
            max-width: 85%;
          }
        }
      `}</style>
    </div>
  )
}