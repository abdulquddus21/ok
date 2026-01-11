import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FaPaperPlane, FaPaperclip, FaArrowLeft, FaEllipsisV, 
  FaCheck, FaCheckDouble, FaUserAstronaut, FaTimes, FaPlay, 
  FaTrash, FaPen, FaReply, FaCopy, FaDownload 
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- SOUND ---
const SEND_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//OEAAAAAAAAAAAAAAAAAAAAAAAAMGluZv////8AAAAAAAEgAAAAP8Y9JgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA';

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
    // Proxy yoki direct linkni tekshiring. 
    // Agar next.config.js da proxy bo'lmasa, to'g'ridan-to'g'ri ishlashi uchun CORS muammo bo'lishi mumkin.
    // Hozirgi holatda /api/catbox deb qoldiraman (proxy bor deb hisoblab).
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
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  
  // States
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [showPreview, setShowPreview] = useState(false); 
  const [uploadQueue, setUploadQueue] = useState({}); 
  const [mediaZoom, setMediaZoom] = useState(null); 
  
  // Context Menu & Reply & Edit
  const [contextMenu, setContextMenu] = useState(null); 
  const [replyTo, setReplyTo] = useState(null); 
  const [editingMsg, setEditingMsg] = useState(null); 

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

    // -- Messages Channel --
    const channel = supabase.channel(`room:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${chatId}` }, 
      (payload) => handleRealtimeEvent(payload))
      .subscribe();

    // -- Presence (Online Status) --
    const presenceChannel = supabase.channel(`presence:${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = new Set();
        for (const id in state) {
           state[id].forEach(p => users.add(p.user_id));
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
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
        .select('users(username, id)').eq('room_id', chatId).neq('user_id', currentUser.id).single();
       if (partner?.users) {
         room.name = partner.users.username;
         room.partnerId = partner.users.id;
       }
    }
    const { count } = await supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('room_id', chatId);
    setChatInfo(room);
    setSubscribersCount(count || 0);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:users(username)')
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
        if (newMsg.sender_id !== currentUser.id) playSound();
        return [...prev, newMsg];
      });
    } else if (eventType === 'UPDATE') {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg, sender: m.sender } : m));
    } else if (eventType === 'DELETE') {
      setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
    }
  };

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {});
    }
  };

  // --- ACTIONS ---
  const handleSend = async () => {
    if (isSending) return; 
    if (selectedFiles.length === 0 && !newMessage.trim()) return;

    // --- TAHRIRLASH (EDIT) ---
    if (editingMsg) {
      const { error } = await supabase.from('messages').update({ content: newMessage }).eq('id', editingMsg.id);
      if (error) {
        toast.error("Tahrirlashda xatolik!");
      } else {
        setEditingMsg(null);
        setNewMessage('');
      }
      return;
    }

    setIsSending(true);
    const caption = newMessage;
    setNewMessage('');
    setShowPreview(false);
    setSelectedFiles([]);
    
    // Reply ma'lumotlarini saqlab olamiz
    const currentReplyTo = replyTo;
    setReplyTo(null);

    playSound();

    // 1. Text xabar yuborish
    if (selectedFiles.length === 0) {
      const tempId = Date.now();
      const optimistic = {
        id: tempId, tempId, content: caption, sender_id: currentUser.id,
        created_at: new Date().toISOString(), sender: { username: currentUser.username },
        is_read: false, status: 'sending', reply_to_id: currentReplyTo?.id
      };
      setMessages(prev => [...prev, optimistic]);
      
      const success = await sendSingleMessage(caption, null, null, tempId, currentReplyTo);
      if (!success) setMessages(prev => prev.filter(m => m.tempId !== tempId));
      setIsSending(false);
      return;
    }

    // 2. Media xabarlar yuborish
    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];
      const isLast = index === selectedFiles.length - 1;
      const fileType = file.type.startsWith('video') ? 'video' : 'image';
      const tempId = Date.now() + Math.random();

      // Video optimistik UI
      const optimistic = {
        id: tempId, tempId, content: isLast ? caption : '', sender_id: currentUser.id,
        created_at: new Date().toISOString(), sender: { username: currentUser.username },
        file_url: URL.createObjectURL(file), file_type: fileType,
        is_read: false, status: 'uploading', reply_to_id: isLast ? currentReplyTo?.id : null
      };

      setMessages(prev => [...prev, optimistic]);
      setUploadQueue(prev => ({ ...prev, [tempId]: 0 }));

      try {
        const url = await uploadToCatbox(file, (percent) => setUploadQueue(prev => ({ ...prev, [tempId]: percent })));
        await sendSingleMessage(isLast ? caption : '', url, fileType, tempId, isLast ? currentReplyTo : null);
      } catch (error) {
        toast.error(`Fayl yuklanmadi: ${file.name}`);
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
      } finally {
        setUploadQueue(prev => { const n = { ...prev }; delete n[tempId]; return n; });
      }
    }
    setIsSending(false);
  };

  const sendSingleMessage = async (content, fileUrl, fileType, tempId, replyObj) => {
    const payload = {
      room_id: chatId,
      sender_id: currentUser.id,
      content: content ? content.trim() : '',
      file_url: fileUrl,
      file_type: fileType,
      is_read: false,
    };

    if (replyObj && replyObj.id) {
        payload.reply_to_id = replyObj.id;
    }

    try {
      const { data, error } = await supabase.from('messages').insert([payload]).select().single();
      if (error) {
        console.error(error);
        toast.error("Yuborishda xatolik");
        return false;
      }
      if (data && tempId) {
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data, sender: { username: currentUser.username } } : m));
      }
      return true;
    } catch (err) {
      toast.error("Tarmoq xatoligi");
      return false;
    }
  };

  const deleteMessage = async () => {
    if (!contextMenu?.msg) return;
    
    // O'chirish logikasi: Faqat o'z xabarini va bazaga tushgan xabarni
    if (contextMenu.msg.sender_id !== currentUser.id) {
       toast.error("Faqat o'z xabaringizni o'chira olasiz!");
       return;
    }

    const { error } = await supabase.from('messages').delete().eq('id', contextMenu.msg.id);
    if (error) {
        console.error(error);
        toast.error("O'chirib bo'lmadi (ruxsat yo'q yoki tarmoq xatosi)");
    } else {
        // UI dan darhol olib tashlash (Realtime kelguniga qadar)
        setMessages(prev => prev.filter(m => m.id !== contextMenu.msg.id));
    }
    setContextMenu(null);
  };

  const startEdit = () => {
    if (!contextMenu?.msg) return;
    setEditingMsg(contextMenu.msg);
    setNewMessage(contextMenu.msg.content || '');
    setContextMenu(null);
    setTimeout(() => fileInputRef.current?.focus(), 100);
  };

  const startReply = () => {
    if (!contextMenu?.msg) return;
    setReplyTo(contextMenu.msg);
    setContextMenu(null);
  };

  // --- CONTEXT MENU HANDLERS ---
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (isMobile) return; 
    setContextMenu({ x: e.pageX, y: e.pageY, msg, type: 'desktop' });
  };

  const handleTouchStart = (e, msg) => {
    if (!isMobile) return;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ msg, type: 'mobile' });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600); 
  };

  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  // Helper
  const getReplyMessage = (id) => messages.find(m => m.id === id);
  const isPartnerOnline = chatInfo?.type === 'private' && onlineUsers.has(chatInfo.partnerId);

  // --- RENDER ---
  if (!chatId) return <div className="placeholder"><div className="bubble">Chatni tanlang</div></div>;
  
  const isChannel = chatInfo?.type === 'channel';
  const isOwner = chatInfo?.owner_id === currentUser.id;
  const canWrite = !isChannel || isOwner;

  return (
    <div className={`chat-window telegram-bg ${isMobile ? 'mobile-window' : ''}`} onClick={() => setContextMenu(null)}>
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
            <p className={isPartnerOnline ? 'status-online' : ''}>
              {loading ? '...' : (
                chatInfo?.type === 'private' 
                ? (isPartnerOnline ? 'online' : 'yaqinda kirgan') 
                : (isChannel ? `${subscribersCount} obunachi` : `${subscribersCount} a'zo`)
              )}
            </p>
          </div>
        </div>
        <button className="menu-btn"><FaEllipsisV /></button>
      </div>

      {/* MESSAGES */}
      <div className="messages-area">
        {loading && (
           <div className="spinner-center">
             <span className="loader"></span>
           </div>
        )}
        
        {messages.map((msg) => {
          const isMyMsg = msg.sender_id === currentUser.id;
          const showName = !isMyMsg && (chatInfo?.type === 'group' || isChannel);
          const uploadProgress = msg.tempId ? uploadQueue[msg.tempId] : null;
          const repliedMsg = msg.reply_to_id ? getReplyMessage(msg.reply_to_id) : null;

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
                
                {/* JAVOB XABARI (REPLY) */}
                {repliedMsg && (
                  <div className="reply-preview-in-msg" onClick={() => document.getElementById(repliedMsg.id)?.scrollIntoView({ behavior: 'smooth' })}>
                    <div className="reply-line"></div>
                    <div className="reply-content-box">
                      <span className="reply-sender-name">{repliedMsg.sender?.username}</span>
                      <span className="reply-text-truncate">
                        {repliedMsg.file_type ? (repliedMsg.file_type === 'video' ? '🎥 Video' : '📷 Rasm') : repliedMsg.content}
                      </span>
                    </div>
                  </div>
                )}

                {/* MEDIA (Rasm/Video) */}
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
          {/* REPLY INDICATOR */}
          {(replyTo || editingMsg) && (
            <div className="reply-bar">
              <div className="reply-icon">{editingMsg ? <FaPen /> : <FaReply />}</div>
              <div className="reply-info">
                <span>{editingMsg ? 'Xabarni tahrirlash' : `Javob: ${replyTo?.sender?.username}`}</span>
                <p>{editingMsg ? editingMsg.content : (replyTo.content || (replyTo.file_type ? 'Media fayl' : '...'))}</p>
              </div>
              <button onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }}><FaTimes /></button>
            </div>
          )}

          <div className="input-bar">
            <button className="icon-btn" onClick={() => fileInputRef.current.click()}><FaPaperclip /></button>
            {/* INPUT ACCEPT O'ZGARTIRILDI (VIDEO QO'SHILDI) */}
            <input 
              type="file" multiple accept="image/*,video/mp4,video/webm,video/ogg" 
              ref={fileInputRef} style={{display: 'none'}} 
              onChange={(e) => {
                const files = Array.from(e.target.files);
                const large = files.find(f => f.size > 200*1024*1024);
                if(large) return toast.error("200MB dan katta fayl mumkin emas!");
                if(files.length > 0) {
                   setSelectedFiles(files);
                   setShowPreview(true);
                   e.target.value = null; 
                }
              }}
            />
            <input 
              type="text" value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Xabar yozing..." 
            />
            <button onClick={handleSend} className="send-btn" disabled={isSending}>
              {isSending ? (
                  <span className="loader" style={{width: 20, height: 20, border: '2px solid #000'}}></span> 
                ) : <FaPaperPlane />}
            </button>
          </div>
        </div>
      ) : null}

      {/* CONTEXT MENUS */}
      {contextMenu?.type === 'desktop' && (
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

      {contextMenu?.type === 'mobile' && (
        <div className="mobile-sheet-overlay" onClick={() => setContextMenu(null)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div className="sheet-item" onClick={startReply}><FaReply /> Javob berish</div>
            <div className="sheet-item" onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }}><FaCopy /> Nusxalash</div>
            {contextMenu.msg.sender_id === currentUser.id ? (
              <>
                 <div className="sheet-item" onClick={startEdit}><FaPen /> Tahrirlash</div>
                 <div className="sheet-item delete-item" onClick={deleteMessage}><FaTrash /> O'chirish</div>
              </>
            ) : (
                 <div className="sheet-item disabled"><FaTrash /> O'chirish (ruxsat yo'q)</div>
            )}
          </div>
        </div>
      )}

      {/* YANGILANGAN PREVIEW MODAL */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="preview-container-new">
            <div className="preview-top-bar">
              <span>Tanlanganlar ({selectedFiles.length})</span>
              <button onClick={() => {setShowPreview(false); setSelectedFiles([]);}}><FaTimes /></button>
            </div>
            
            <div className="preview-content-scroll">
               <div className="preview-grid-new">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="preview-card">
                    <button className="remove-preview-btn" onClick={() => {
                      const n = [...selectedFiles]; n.splice(i,1); 
                      setSelectedFiles(n); if(n.length===0) setShowPreview(false);
                    }}><FaTimes /></button>
                    
                    {f.type.startsWith('video') ? (
                       <video src={URL.createObjectURL(f)} controls />
                    ) : (
                       <img src={URL.createObjectURL(f)} alt="preview" />
                    )}
                    <div className="preview-name">{f.name}</div>
                  </div>
                ))}
               </div>
            </div>

            <div className="preview-footer">
              <input 
                type="text" 
                placeholder="Izoh qo'shish..." 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                autoFocus
              />
              <button onClick={handleSend} disabled={isSending}>
                 {isSending ? '...' : <FaPaperPlane />}
              </button>
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
          <a href={mediaZoom.url} download className="download-btn" onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer"><FaDownload /></a>
          <button className="close-lightbox" onClick={() => setMediaZoom(null)}><FaTimes /></button>
        </div>
      )}

      <style jsx>{`
        /* GLOBAL & RESET */
        :global(body) { overscroll-behavior: none; background: #0e1621; }
        .chat-window { 
          display: flex; flex-direction: column; height: 100vh; 
          background-color: #0e1621; background-image: url("https://web.telegram.org/img/bg_0.png"); 
          background-size: cover; position: relative; overflow: hidden;
        }
        .mobile-window { height: 100dvh; width: 100vw; position: fixed; top: 0; left: 0; }

        /* HEADER */
        .glass-header {
          flex: 0 0 60px; display: flex; justify-content: space-between; align-items: center; padding: 0 15px;
          background: rgba(23, 33, 43, 0.95); border-bottom: 1px solid rgba(0,0,0,0.3); z-index: 10;
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .avatar { 
          width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #cfab56, #a67c2e);
          color: #000; display: flex; align-items: center; justify-content: center; font-size: 18px; 
        }
        .info h3 { margin: 0; color: #cfab56; font-size: 16px; font-weight: 600; }
        .info p { margin: 0; font-size: 12px; color: #8899ac; }
        .info p.status-online { color: #4aa3df; font-weight: bold; }
        .menu-btn, .back-btn { background: none; border: none; color: #cfab56; font-size: 20px; }

        /* MESSAGES */
        .messages-area { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .message-row { display: flex; width: 100%; user-select: none; }
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

        /* REPLY IN MSG */
        .reply-preview-in-msg {
          display: flex; gap: 8px; margin-bottom: 8px; cursor: pointer;
          background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 6px; border-left: 3px solid #cfab56;
        }
        .reply-content-box { display: flex; flex-direction: column; overflow: hidden; justify-content: center; }
        .reply-sender-name { font-size: 11px; color: #cfab56; font-weight: bold; margin-bottom: 2px; }
        .reply-text-truncate { font-size: 12px; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.9; }

        /* MEDIA */
        .media-container { margin-bottom: 5px; border-radius: 8px; overflow: hidden; position: relative; max-width: 100%; width: fit-content; }
        .media-container img, .media-container video { 
           display: block; max-width: 100%; max-height: 350px; 
           object-fit: cover; min-width: 150px; min-height: 150px;
        }
        .blur-media { filter: blur(5px); opacity: 0.6; }
        .upload-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .percent-text { font-weight: bold; color: #fff; text-shadow: 0 0 5px #000; }

        /* FOOTER */
        .glass-footer { background: #17212b; border-top: 1px solid rgba(0,0,0,0.5); padding: 5px 10px; flex-shrink: 0; }
        .reply-bar { 
          display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #0e1621; 
          border-left: 3px solid #cfab56; margin-bottom: 5px; border-radius: 6px;
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
        .send-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* CONTEXT MENU */
        .context-menu { 
          position: fixed; background: #17212b; border-radius: 8px; 
          box-shadow: 0 5px 20px rgba(0,0,0,0.6); z-index: 9999; overflow: hidden; min-width: 180px;
          border: 1px solid #2d3b55;
        }
        .menu-item { padding: 12px 15px; color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .menu-item:hover { background: #232e3c; }
        .menu-item.delete { color: #ff595a; }

        /* MOBILE SHEET */
        .mobile-sheet-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); z-index: 10000;
          display: flex; align-items: flex-end;
        }
        .mobile-sheet {
          width: 100%; background: #1c242f;
          border-radius: 12px 12px 0 0;
          padding: 10px 0 20px 0;
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-handle { width: 40px; height: 4px; background: #3b4655; border-radius: 2px; margin: 0 auto 15px auto; }
        .sheet-item { padding: 14px 20px; color: #fff; display: flex; align-items: center; gap: 15px; font-size: 16px; cursor: pointer; }
        .sheet-item:active { background: #151a21; }
        .delete-item { color: #ff595a; }
        .disabled { opacity: 0.5; pointer-events: none; }

        /* --- PREVIEW MODAL NEW DESIGN --- */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .preview-container-new {
           width: 90%; max-width: 500px; background: #17212b; border-radius: 16px; 
           display: flex; flex-direction: column; overflow: hidden; border: 1px solid #333;
           max-height: 80vh;
        }
        .preview-top-bar {
           padding: 15px; background: #1e2a38; display: flex; justify-content: space-between; align-items: center; color: #fff; font-weight: bold; border-bottom: 1px solid #333;
        }
        .preview-top-bar button { background: none; border: none; color: #8899ac; font-size: 20px; cursor: pointer; }
        
        .preview-content-scroll { flex: 1; overflow-y: auto; padding: 15px; }
        .preview-grid-new { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; }
        .preview-card { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1; background: #000; }
        .preview-card img, .preview-card video { width: 100%; height: 100%; object-fit: cover; }
        .preview-name { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; font-size: 10px; padding: 2px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remove-preview-btn { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }

        .preview-footer { padding: 10px; display: flex; gap: 10px; background: #1e2a38; border-top: 1px solid #333; }
        .preview-footer input { flex: 1; background: #0e1621; border: none; color: #fff; padding: 12px; border-radius: 8px; outline: none; }
        .preview-footer button { width: 50px; background: #cfab56; border: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #000; }

        /* LIGHTBOX */
        .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 3000; display: flex; align-items: center; justify-content: center; }
        .lightbox-content { max-width: 100%; max-height: 100%; display: flex; justify-content: center; align-items: center; }
        .lightbox-content img, .lightbox-content video { max-width: 100vw; max-height: 100vh; object-fit: contain; }
        .close-lightbox { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #fff; font-size: 30px; z-index: 3001; }
        .download-btn { position: absolute; bottom: 30px; right: 30px; color: #fff; font-size: 24px; z-index: 3001; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 50%; display: flex; }

        .meta { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 2px; }
        .time { font-size: 10px; color: #8faec5; }
        .checks { font-size: 11px; color: #8faec5; }
        .read { color: #4aa3df; }
        
        .spinner-center { width: 100%; height: 50px; display: flex; justify-content: center; align-items: center; margin-top: 20px; }
        
        /* --- LOADER CSS --- */
        .loader {
          width: 48px;
          height: 48px;
          display: inline-block;
          position: relative;
        }
        .loader::after,
        .loader::before {
          content: '';  
          box-sizing: border-box;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid #FFF;
          position: absolute;
          left: 0;
          top: 0;
          animation: animloader 2s linear infinite;
        }
        .loader::after {
          animation-delay: 1s;
        }

        @keyframes animloader {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}