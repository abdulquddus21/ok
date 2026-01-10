import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FaPaperPlane, FaPaperclip, FaArrowLeft, FaEllipsisV, 
  FaCheck, FaCheckDouble, FaUserAstronaut, FaTimes, FaPlay, 
  FaTrash, FaPen, FaReply, FaCopy 
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- SOUND ---
const SEND_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//OEAAAAAAAAAAAAAAAAAAAAAAAAMGluZv////8AAAAAAAEgAAAAP8Y9JgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA';

// --- CATBOX UPLOAD ---
const uploadToCatbox = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', '2f5d304c9d3a6788a634c9250'); 
    formData.append('fileToUpload', file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (onProgress) onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) resolve(xhr.responseText); 
      else reject(`Upload failed: ${xhr.status}`);
    };
    xhr.onerror = () => reject('Network error');
    xhr.open('POST', '/api/catbox', true);
    xhr.send(formData);
  });
};

export default function ChatWindow({ chatId, currentUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState(0);
  
  // States
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [showPreview, setShowPreview] = useState(false); 
  const [uploadQueue, setUploadQueue] = useState({}); 
  const [mediaZoom, setMediaZoom] = useState(null); 
  
  // Context Menu & Reply & Edit
  const [contextMenu, setContextMenu] = useState(null); // { x, y, msg }
  const [replyTo, setReplyTo] = useState(null); // Message object
  const [editingMsg, setEditingMsg] = useState(null); // Message object

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const longPressTimer = useRef(null);

  // 1. INITIAL LOAD & REALTIME
  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    fetchChatDetails();
    fetchMessages();

    const channel = supabase.channel(`room:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${chatId}` }, 
      (payload) => handleRealtimeEvent(payload))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId]);

  // 2. AUTO SCROLL
  useEffect(() => {
    if (!editingMsg) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) markMessagesAsRead();
  }, [messages, uploadQueue]);

  // --- API CALLS ---
  const fetchChatDetails = async () => {
    const { data: room } = await supabase.from('rooms').select('*').eq('id', chatId).single();
    if (room?.type === 'private') {
       const { data: partner } = await supabase.from('room_participants')
        .select('users(username)').eq('room_id', chatId).neq('user_id', currentUser.id).single();
       if (partner?.users) room.name = partner.users.username;
    }
    const { count } = await supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('room_id', chatId);
    setChatInfo(room);
    setSubscribersCount(count || 0);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:users(username)') // reply_to ni ham olish kerak aslida, lekin UI da ko'rsatamiz
      .eq('room_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    const unreadIds = messages.filter(m => !m.is_read && m.sender_id !== currentUser.id).map(m => m.id);
    if (unreadIds.length > 0) await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
  };

  // --- REALTIME HANDLER ---
  const handleRealtimeEvent = async (payload) => {
    const { eventType, new: newMsg, old: oldMsg } = payload;

    if (eventType === 'INSERT') {
      if (!newMsg.sender) {
        const { data: sender } = await supabase.from('users').select('username').eq('id', newMsg.sender_id).single();
        newMsg.sender = sender;
      }
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        // Ovoz faqat boshqadan kelsa
        if (newMsg.sender_id !== currentUser.id) playSound();
        return [...prev, newMsg];
      });
    } 
    else if (eventType === 'UPDATE') {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg, sender: m.sender } : m));
    }
    else if (eventType === 'DELETE') {
      setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
    }
  };

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {});
    }
  };

  // --- ACTIONS (SEND, EDIT, DELETE) ---
  const handleSend = async () => {
    if (selectedFiles.length === 0 && !newMessage.trim()) return;

    if (editingMsg) {
      // Tahrirlash rejimi
      await supabase.from('messages').update({ content: newMessage }).eq('id', editingMsg.id);
      setEditingMsg(null);
      setNewMessage('');
      return;
    }

    const caption = newMessage;
    setNewMessage('');
    setShowPreview(false);
    setSelectedFiles([]);
    setReplyTo(null);
    playSound();

    // Text Message
    if (selectedFiles.length === 0) {
      const tempId = Date.now();
      const optimistic = {
        id: tempId, tempId, content: caption, sender_id: currentUser.id,
        created_at: new Date().toISOString(), sender: { username: currentUser.username },
        is_read: false, status: 'sending', reply_to: replyTo
      };
      setMessages(prev => [...prev, optimistic]);
      await sendSingleMessage(caption, null, null, tempId, replyTo);
      return;
    }

    // Files
    selectedFiles.forEach(async (file, index) => {
      const isLast = index === selectedFiles.length - 1;
      const fileType = file.type.startsWith('video') ? 'video' : 'image';
      const tempId = Date.now() + Math.random();

      const optimistic = {
        id: tempId, tempId, content: isLast ? caption : '', sender_id: currentUser.id,
        created_at: new Date().toISOString(), sender: { username: currentUser.username },
        file_url: URL.createObjectURL(file), file_type: fileType,
        is_read: false, status: 'uploading', reply_to: replyTo
      };

      setMessages(prev => [...prev, optimistic]);
      setUploadQueue(prev => ({ ...prev, [tempId]: 0 }));

      try {
        const url = await uploadToCatbox(file, (percent) => setUploadQueue(prev => ({ ...prev, [tempId]: percent })));
        await sendSingleMessage(isLast ? caption : '', url, fileType, tempId, replyTo);
        setUploadQueue(prev => { const n = { ...prev }; delete n[tempId]; return n; });
      } catch (error) {
        toast.error("Yuklashda xatolik!");
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
      }
    });
  };

  const sendSingleMessage = async (content, fileUrl, fileType, tempId, replyObj) => {
    // Reply ma'lumotlarini content ichiga JSON qilib yozamiz (yoki alohida column kerak)
    // Hozir soddalik uchun contentni o'zida saqlaymiz yoki faqat UI da
    // Haqiqiy proyektda: reply_to_id columni bo'lishi kerak.
    
    const payload = {
      room_id: chatId,
      sender_id: currentUser.id,
      content: content ? content.trim() : '',
      file_url: fileUrl,
      file_type: fileType,
      is_read: false,
      // Supabase da reply_to column bo'lmasa, buni ignor qiladi yoki error beradi.
      // Agar error bersa bu qatorni olib tashlang.
      // reply_to_id: replyObj ? replyObj.id : null 
    };

    const { data, error } = await supabase.from('messages').insert([payload]).select().single();
    if (!error && data && tempId) {
      setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data, sender: { username: currentUser.username }, reply_to: replyObj } : m));
    }
  };

  const deleteMessage = async () => {
    if (!contextMenu?.msg) return;
    await supabase.from('messages').delete().eq('id', contextMenu.msg.id);
    setContextMenu(null);
  };

  const startEdit = () => {
    if (!contextMenu?.msg) return;
    setEditingMsg(contextMenu.msg);
    setNewMessage(contextMenu.msg.content || '');
    setContextMenu(null);
    fileInputRef.current?.focus();
  };

  const startReply = () => {
    if (!contextMenu?.msg) return;
    setReplyTo(contextMenu.msg);
    setContextMenu(null);
  };

  // --- CONTEXT MENU LOGIC ---
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (isMobile) return; // PC right click
    setContextMenu({ x: e.pageX, y: e.pageY, msg });
  };

  const handleTouchStart = (e, msg) => {
    if (!isMobile) return;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ x: e.touches[0].pageX, y: e.touches[0].pageY, msg });
    }, 800); // 800ms long press
  };

  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  // --- RENDER ---
  if (!chatId) return <div className="placeholder"><div className="bubble">Tanlang</div></div>;
  
  const isChannel = chatInfo?.type === 'channel';
  const isOwner = chatInfo?.owner_id === currentUser.id;
  const canWrite = !isChannel || isOwner;

  return (
    <div className="chat-window telegram-bg" onClick={() => setContextMenu(null)}>
      <ToastContainer position="top-center" theme="dark" autoClose={2000} />
      <audio ref={audioRef} src={SEND_SOUND} />

      {/* HEADER */}
      <div className="header glass-header">
        <div className="header-left">
          {isMobile && <button onClick={onBack} className="back-btn"><FaArrowLeft /></button>}
          <div className="avatar">
            {chatInfo?.name?.[0]?.toUpperCase() || <FaUserAstronaut />}
          </div>
          <div className="info">
            <h3>{chatInfo?.name || '...'}</h3>
            <p>{loading ? '...' : (isChannel ? `${subscribersCount} obunachi` : 'online')}</p>
          </div>
        </div>
        <button className="menu-btn"><FaEllipsisV /></button>
      </div>

      {/* MESSAGES */}
      <div className="messages-area">
        {loading && <div className="spinner-center"><div className="spinner"></div></div>}
        
        {messages.map((msg) => {
          const isMyMsg = msg.sender_id === currentUser.id;
          const showName = !isMyMsg && (chatInfo?.type === 'group' || isChannel);
          const uploadProgress = msg.tempId ? uploadQueue[msg.tempId] : null;

          return (
            <div 
              key={msg.id || msg.tempId} 
              className={`message-row ${isMyMsg ? 'my-row' : 'other-row'}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              onTouchStart={(e) => handleTouchStart(e, msg)}
              onTouchEnd={handleTouchEnd}
            >
              <div className="bubble">
                {showName && <span className="sender-name">{msg.sender?.username}</span>}
                
                {/* Reply Preview in Message */}
                {/* Agar bazada reply saqlansa shu yerda ko'rsatiladi */}
                
                {/* Media */}
                {msg.file_url && (
                  <div className="media-container" onClick={() => !msg.status && setMediaZoom({ url: msg.file_url, type: msg.file_type })}>
                    {msg.status === 'uploading' && (
                      <div className="upload-overlay">
                        <div className="progress-ring">
                           <span className="percent-text">{uploadProgress || 0}%</span>
                        </div>
                      </div>
                    )}
                    {msg.file_type === 'video' ? (
                      <div className="video-wrapper">
                         <video src={msg.file_url} className={msg.status === 'uploading' ? 'blur-media' : ''} />
                         <div className="play-overlay"><FaPlay /></div>
                      </div>
                    ) : (
                      <img src={msg.file_url} alt="media" className={msg.status === 'uploading' ? 'blur-media' : ''} />
                    )}
                  </div>
                )}

                {msg.content && <p className="content">{msg.content}</p>}

                <div className="meta">
                  <span className="time">
                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {isMyMsg && (
                    <span className="checks">
                       {msg.status === 'uploading' || msg.status === 'sending' ? '🕒' : (msg.is_read ? <FaCheckDouble className="read" /> : <FaCheck />)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER */}
      {canWrite ? (
        <div className="footer glass-footer">
          {/* Reply / Edit Indicator */}
          {(replyTo || editingMsg) && (
            <div className="reply-bar">
              <div className="reply-icon">{editingMsg ? <FaPen /> : <FaReply />}</div>
              <div className="reply-info">
                <span>{editingMsg ? 'Xabarni tahrirlash' : `Javob berilmoqda: ${replyTo.sender?.username}`}</span>
                <p>{editingMsg ? editingMsg.content : (replyTo.content || 'Media fayl')}</p>
              </div>
              <button onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }}><FaTimes /></button>
            </div>
          )}

          <div className="input-bar">
            <button className="icon-btn" onClick={() => fileInputRef.current.click()}><FaPaperclip /></button>
            <input 
              type="file" multiple accept="image/*,video/*" 
              ref={fileInputRef} style={{display: 'none'}} 
              onChange={(e) => {
                // 200MB Check
                const large = Array.from(e.target.files).find(f => f.size > 200*1024*1024);
                if(large) return toast.error("200MB dan katta fayl mumkin emas!");
                setSelectedFiles(Array.from(e.target.files));
                setShowPreview(true);
                e.target.value = null;
              }}
            />
            <input 
              type="text" value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Xabar yozing..." 
            />
            <button onClick={handleSend} className="send-btn"><FaPaperPlane /></button>
          </div>
        </div>
      ) : null}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div className="context-menu" style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 160) }}>
          <div className="menu-item" onClick={startReply}><FaReply /> Javob berish</div>
          <div className="menu-item" onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }}><FaCopy /> Nusxalash</div>
          {contextMenu.msg.sender_id === currentUser.id && (
            <>
              <div className="menu-item" onClick={startEdit}><FaPen /> Tahrirlash</div>
              <div className="menu-item delete" onClick={deleteMessage}><FaTrash /> O'chirish</div>
            </>
          )}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="preview-container">
            <div className="preview-header">
              <h3>Fayllar ({selectedFiles.length})</h3>
              <button onClick={() => {setShowPreview(false); setSelectedFiles([]);}}><FaTimes /></button>
            </div>
            <div className="preview-grid">
              {selectedFiles.map((f, i) => (
                <div key={i} className="p-item">
                  <button onClick={() => {
                    const n = [...selectedFiles]; n.splice(i,1); 
                    setSelectedFiles(n); if(n.length===0) setShowPreview(false);
                  }}><FaTimes /></button>
                  {f.type.startsWith('video') ? <video src={URL.createObjectURL(f)} /> : <img src={URL.createObjectURL(f)} />}
                </div>
              ))}
            </div>
            <div className="preview-bot">
              <input type="text" placeholder="Izoh..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
              <button onClick={handleSend}>YUBORISH</button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {mediaZoom && (
        <div className="lightbox" onClick={() => setMediaZoom(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            {mediaZoom.type === 'video' ? <video src={mediaZoom.url} controls autoPlay /> : <img src={mediaZoom.url} />}
          </div>
          <button className="close-lightbox" onClick={() => setMediaZoom(null)}><FaTimes /></button>
        </div>
      )}

      <style jsx>{`
        /* MOBILE FIX */
        .chat-window { 
          display: flex; flex-direction: column; height: 100dvh; 
          background-color: #0e1621; background-image: url("https://web.telegram.org/img/bg_0.png"); 
          background-size: cover; position: relative; overflow: hidden;
        }

        /* HEADER */
        .glass-header {
          height: 60px; display: flex; justify-content: space-between; align-items: center; padding: 0 15px;
          background: rgba(23, 33, 43, 0.95); border-bottom: 1px solid rgba(0,0,0,0.3); z-index: 10;
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .avatar { 
          width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #cfab56, #a67c2e);
          color: #000; display: flex; align-items: center; justify-content: center; font-size: 18px; 
        }
        .info h3 { margin: 0; color: #cfab56; font-size: 16px; font-weight: 600; }
        .info p { margin: 0; font-size: 12px; color: #8899ac; }
        .menu-btn, .back-btn { background: none; border: none; color: #cfab56; font-size: 20px; }

        /* MESSAGES */
        .messages-area { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .message-row { display: flex; width: 100%; user-select: none; } /* User select none for mobile long press feel */
        .my-row { justify-content: flex-end; }
        .other-row { justify-content: flex-start; }

        .bubble { 
          max-width: 80%; padding: 6px 10px; border-radius: 12px; position: relative; font-size: 15px; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.4); min-width: 80px; 
        }
        .my-row .bubble { background: #2b5278; color: #fff; border-bottom-right-radius: 0; }
        .other-row .bubble { background: #182533; color: #fff; border-bottom-left-radius: 0; }

        .sender-name { color: #cfab56; font-size: 12px; font-weight: bold; display: block; margin-bottom: 3px; }
        .content { margin: 0; word-wrap: break-word; line-height: 1.4; white-space: pre-wrap; }

        /* MEDIA */
        .media-container { margin-bottom: 5px; border-radius: 8px; overflow: hidden; position: relative; max-width: 300px; }
        .media-container img, .media-container video { width: 100%; height: auto; display: block; max-height: 350px; object-fit: cover; }
        .blur-media { filter: blur(5px); opacity: 0.6; }
        .upload-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .percent-text { font-weight: bold; color: #fff; text-shadow: 0 0 5px #000; }

        /* FOOTER */
        .glass-footer { background: #17212b; border-top: 1px solid rgba(0,0,0,0.5); padding: 5px 10px; }
        
        .reply-bar { 
          display: flex; align-items: center; gap: 10px; padding: 5px 10px; background: #0e1621; 
          border-left: 3px solid #cfab56; margin-bottom: 5px; border-radius: 4px;
        }
        .reply-info { flex: 1; overflow: hidden; }
        .reply-info span { color: #cfab56; font-size: 12px; font-weight: bold; }
        .reply-info p { margin: 0; font-size: 12px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .reply-icon { color: #cfab56; }

        .input-bar { display: flex; align-items: center; gap: 8px; padding-bottom: 5px; }
        .input-bar input[type="text"] { 
          flex: 1; background: #0e1621; border: none; color: #fff; padding: 12px; 
          border-radius: 20px; font-size: 16px; outline: none; 
        }
        .icon-btn { color: #8899ac; font-size: 24px; background: none; border: none; padding: 5px; }
        .send-btn { 
          background: #cfab56; width: 45px; height: 45px; border-radius: 50%; border: none; 
          color: #000; font-size: 18px; display: flex; align-items: center; justify-content: center; 
        }

        /* CONTEXT MENU */
        .context-menu { 
          position: fixed; background: #17212b; border-radius: 8px; 
          box-shadow: 0 5px 20px rgba(0,0,0,0.6); z-index: 9999; overflow: hidden; min-width: 180px;
          border: 1px solid #2d3b55;
        }
        .menu-item { padding: 12px 15px; color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .menu-item:hover { background: #232e3c; }
        .menu-item.delete { color: #ff595a; }

        /* PREVIEW MODAL */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .preview-container { background: #17212b; width: 95%; max-width: 450px; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 15px; }
        .preview-header { display: flex; justify-content: space-between; color: #fff; }
        .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 5px; max-height: 300px; overflow-y: auto; }
        .p-item { position: relative; height: 80px; border-radius: 5px; overflow: hidden; }
        .p-item img, .p-item video { width: 100%; height: 100%; object-fit: cover; }
        .p-item button { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.5); color: #fff; border: none; }
        
        .preview-bot { display: flex; gap: 10px; }
        .preview-bot input { flex: 1; padding: 10px; background: #0e1621; border: none; color: #fff; border-radius: 8px; }
        .preview-bot button { background: #cfab56; border: none; padding: 0 15px; font-weight: bold; border-radius: 8px; }

        /* LIGHTBOX */
        .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 3000; display: flex; align-items: center; justify-content: center; }
        .lightbox-content { max-width: 100%; max-height: 100%; display: flex; justify-content: center; align-items: center; }
        .lightbox-content img, .lightbox-content video { max-width: 100vw; max-height: 100vh; object-fit: contain; }
        .close-lightbox { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #fff; font-size: 30px; z-index: 3001; }

        .meta { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 2px; }
        .time { font-size: 10px; color: #8faec5; }
        .checks { font-size: 11px; color: #8faec5; }
        .read { color: #4aa3df; }
      `}</style>
    </div>
  );
}