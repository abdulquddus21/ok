import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FaPaperPlane, FaPaperclip, FaArrowLeft, FaEllipsisV, 
  FaCheck, FaCheckDouble, FaUserAstronaut, FaTimes, FaPlay, 
  FaTrash, FaPen, FaReply, FaCopy, FaDownload, FaSmile 
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- SOUNDS ---
const SEND_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//OEAAAAAAAAAAAAAAAAAAAAAAAAMGluZv////8AAAAAAAEgAAAAP8Y9JgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA';

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

// --- STICKERS LIST ---
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💩"];

export default function ChatWindow({ chatId, currentUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  
  // Media States
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [showPreview, setShowPreview] = useState(false); 
  const [uploadQueue, setUploadQueue] = useState({}); 
  const [mediaZoom, setMediaZoom] = useState(null); 
  
  // Interaction States
  const [contextMenu, setContextMenu] = useState(null); 
  const [replyTo, setReplyTo] = useState(null); 
  const [editingMsg, setEditingMsg] = useState(null); 
  const [showReactionPicker, setShowReactionPicker] = useState(false); // Sticker picker

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const longPressTimer = useRef(null);
  const inputRef = useRef(null);

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

    const presenceChannel = supabase.channel(`presence:${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = new Set();
        for (const id in state) state[id].forEach(p => users.add(p.user_id));
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

    if (editingMsg) {
      const { error } = await supabase.from('messages').update({ content: newMessage }).eq('id', editingMsg.id);
      if (error) toast.error("Tahrirlashda xatolik!");
      else { setEditingMsg(null); setNewMessage(''); }
      return;
    }

    setIsSending(true);
    const caption = newMessage;
    setNewMessage('');
    setShowPreview(false);
    setSelectedFiles([]);
    
    // Reply ma'lumotlarini nusxalash
    const currentReply = replyTo ? { ...replyTo } : null;
    setReplyTo(null); // Darhol tozalash, UI yangilanishi uchun

    playSound();

    // 1. Matn xabar
    if (selectedFiles.length === 0) {
      const tempId = Date.now();
      const optimistic = {
        id: tempId, tempId, content: caption, sender_id: currentUser.id,
        created_at: new Date().toISOString(), sender: { username: currentUser.username },
        is_read: false, status: 'sending', reply_to_id: currentReply?.id, reactions: {}
      };
      setMessages(prev => [...prev, optimistic]);
      
      const success = await sendSingleMessage(caption, null, null, tempId, currentReply);
      if (!success) setMessages(prev => prev.filter(m => m.tempId !== tempId));
      setIsSending(false);
      return;
    }

    // 2. Media xabarlar
    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];
      const isLast = index === selectedFiles.length - 1;
      const fileType = file.type.startsWith('video') ? 'video' : 'image';
      const tempId = Date.now() + Math.random();

      const optimistic = {
        id: tempId, tempId, content: isLast ? caption : '', sender_id: currentUser.id,
        created_at: new Date().toISOString(), sender: { username: currentUser.username },
        file_url: URL.createObjectURL(file), file_type: fileType,
        is_read: false, status: 'uploading', reply_to_id: isLast ? currentReply?.id : null, reactions: {}
      };

      setMessages(prev => [...prev, optimistic]);
      setUploadQueue(prev => ({ ...prev, [tempId]: 0 }));

      try {
        const url = await uploadToCatbox(file, (percent) => setUploadQueue(prev => ({ ...prev, [tempId]: percent })));
        await sendSingleMessage(isLast ? caption : '', url, fileType, tempId, isLast ? currentReply : null);
      } catch (error) {
        toast.error(`Yuklanmadi: ${file.name}`);
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
      reply_to_id: replyObj ? replyObj.id : null,
      reactions: {} // Yangi ustun uchun bo'sh obyekt
    };

    try {
      const { data, error } = await supabase.from('messages').insert([payload]).select().single();
      if (error) { console.error(error); return false; }
      if (data && tempId) {
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data, sender: { username: currentUser.username } } : m));
      }
      return true;
    } catch (err) { return false; }
  };

  const deleteMessage = async () => {
    if (!contextMenu?.msg) return;
    if (contextMenu.msg.sender_id !== currentUser.id) {
       toast.error("Faqat o'z xabaringizni o'chira olasiz!");
       setContextMenu(null);
       return;
    }
    const { error } = await supabase.from('messages').delete().eq('id', contextMenu.msg.id);
    if (!error) setMessages(prev => prev.filter(m => m.id !== contextMenu.msg.id));
    else toast.error("Xatolik yuz berdi");
    setContextMenu(null);
  };

  // --- REACTION LOGIC ---
  const handleReaction = async (emoji) => {
    const msg = contextMenu?.msg;
    if (!msg) return;

    // Current reactions
    const currentReactions = msg.reactions || {};
    const userReacted = currentReactions[emoji]?.includes(currentUser.id);

    let newReactions = { ...currentReactions };
    
    if (userReacted) {
      // Remove reaction
      newReactions[emoji] = newReactions[emoji].filter(id => id !== currentUser.id);
      if (newReactions[emoji].length === 0) delete newReactions[emoji];
    } else {
      // Add reaction (remove other reactions from this user if needed, or allow multiple)
      // Biz bitta userga bitta emojiga ruxsat beramiz.
      if (!newReactions[emoji]) newReactions[emoji] = [];
      newReactions[emoji].push(currentUser.id);
    }

    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m));
    setContextMenu(null);

    // Backend update
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id);
  };

  const startEdit = () => {
    if (!contextMenu?.msg) return;
    setEditingMsg(contextMenu.msg);
    setNewMessage(contextMenu.msg.content || '');
    setContextMenu(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const startReply = () => {
    if (!contextMenu?.msg) return;
    setReplyTo(contextMenu.msg);
    setContextMenu(null);
    setTimeout(() => inputRef.current?.focus(), 100);
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
    }, 500); 
  };

  const handleTouchEnd = () => clearTimeout(longPressTimer.current);
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
        {loading && <div className="spinner-center"><span className="loader"></span></div>}
        
        {messages.map((msg) => {
          const isMyMsg = msg.sender_id === currentUser.id;
          const showName = !isMyMsg && (chatInfo?.type === 'group' || isChannel);
          const uploadProgress = msg.tempId ? uploadQueue[msg.tempId] : null;
          const repliedMsg = msg.reply_to_id ? getReplyMessage(msg.reply_to_id) : null;
          
          // Reactions Count
          const reactions = msg.reactions || {};
          const hasReactions = Object.keys(reactions).length > 0;

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
                
                {/* REPLY PREVIEW */}
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

                {/* MEDIA */}
                {msg.file_url && (
                  <div className="media-container" onClick={() => !msg.status && setMediaZoom({ url: msg.file_url, type: msg.file_type })}>
                    {msg.status === 'uploading' && (
                      <div className="upload-overlay">
                        <div className="progress-ring"><span className="percent-text">{uploadProgress || 0}%</span></div>
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

                {/* REACTIONS DISPLAY */}
                {hasReactions && (
                  <div className="reactions-row">
                    {Object.entries(reactions).map(([emoji, userIds]) => (
                      <span key={emoji} className={`reaction-pill ${userIds.includes(currentUser.id) ? 'my-reaction' : ''}`}>
                        {emoji} {userIds.length > 1 && <span className="count">{userIds.length}</span>}
                      </span>
                    ))}
                  </div>
                )}

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
        <div className="footer-modern">
          {/* REPLY / EDIT BAR */}
          {(replyTo || editingMsg) && (
            <div className="reply-bar-floating">
              <div className="reply-icon-box">{editingMsg ? <FaPen /> : <FaReply />}</div>
              <div className="reply-info-box">
                <span className="reply-title">{editingMsg ? 'Tahrirlash' : `Javob: ${replyTo?.sender?.username}`}</span>
                <p className="reply-subtitle">{editingMsg ? editingMsg.content : (replyTo.content || 'Media fayl')}</p>
              </div>
              <button className="close-reply-btn" onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }}><FaTimes /></button>
            </div>
          )}

          <div className="input-area-modern">
            <button className="attach-btn" onClick={() => fileInputRef.current.click()}><FaPaperclip /></button>
            <input 
              type="file" multiple accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
              ref={fileInputRef} style={{display: 'none'}} 
              onChange={(e) => {
                const files = Array.from(e.target.files);
                const large = files.find(f => f.size > 200*1024*1024);
                if(large) return toast.error("200MB dan katta fayl mumkin emas!");
                if(files.length>0) { setSelectedFiles(files); setShowPreview(true); e.target.value = null; }
              }}
            />
            
            <textarea 
              ref={inputRef}
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Xabar yozing..." 
              className="modern-input"
              rows={1}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            
            {newMessage || selectedFiles.length > 0 ? (
              <button className="send-btn-modern" onClick={handleSend} disabled={isSending}>
                {isSending ? <span className="loader-mini"></span> : <FaPaperPlane />}
              </button>
            ) : (
              <button className="sticker-btn" onClick={() => setShowReactionPicker(!showReactionPicker)}><FaSmile /></button>
            )}
          </div>
        </div>
      ) : null}

      {/* STICKER PICKER (BASIC) */}
      {showReactionPicker && (
        <div className="emoji-picker-popover">
           {REACTION_EMOJIS.map(emoji => (
             <span key={emoji} onClick={() => setNewMessage(prev => prev + emoji)}>{emoji}</span>
           ))}
        </div>
      )}

      {/* CONTEXT MENUS */}
      {contextMenu?.type === 'desktop' && (
        <div className="context-menu" style={{ top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 180) }}>
          <div className="reaction-row">
             {REACTION_EMOJIS.slice(0,5).map(e => <span key={e} onClick={() => handleReaction(e)}>{e}</span>)}
          </div>
          <div className="menu-divider"></div>
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
            
            {/* REACTIONS IN SHEET */}
            <div className="sheet-reactions">
               {REACTION_EMOJIS.map(e => (
                 <button key={e} className="sheet-emoji-btn" onClick={() => handleReaction(e)}>{e}</button>
               ))}
            </div>

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

      {/* PREVIEW MODAL */}
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
                    {f.type.startsWith('video') ? <video src={URL.createObjectURL(f)} controls /> : <img src={URL.createObjectURL(f)} />}
                    <div className="preview-name">{f.name}</div>
                  </div>
                ))}
               </div>
            </div>
            <div className="preview-footer">
              <input type="text" placeholder="Izoh..." value={newMessage} onChange={e => setNewMessage(e.target.value)} autoFocus />
              <button onClick={handleSend} disabled={isSending}><FaPaperPlane /></button>
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
        /* GLOBAL RESET */
        :global(body) { overscroll-behavior: none; background: #0e1621;  /* Mobil scroll effektini yumshatish */
          -webkit-tap-highlight-color: transparent;}
        .chat-window { 
          display: flex; flex-direction: column; height: 100vh; 
          background-color: #0e1621; background-image: url("https://web.telegram.org/img/bg_0.png"); 
          background-size: cover; position: relative; overflow: hidden;
        }
        .mobile-window { height: 100dvh; width: 100vw; position: fixed; top: 0; left: 0; }

        /* HEADER */
        .glass-header {
          flex: 0 0 60px; display: flex; justify-content: space-between; align-items: center; padding: 0 15px;
          background: #17212b; border-bottom: 1px solid #000; z-index: 10;
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .avatar { 
          width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #cfab56, #a67c2e);
          color: #000; display: flex; align-items: center; justify-content: center; font-size: 18px; 
        }
        .info h3 { margin: 0; color: #fff; font-size: 16px; font-weight: 600; }
        .info p { margin: 0; font-size: 12px; color: #8899ac; }
        .status-online { color: #4aa3df; font-weight: bold; }
        .menu-btn, .back-btn { background: none; border: none; color: #8899ac; font-size: 20px; cursor: pointer; }

        /* MESSAGES */
        .messages-area { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .message-row { display: flex; width: 100%; user-select: none; }
        .my-row { justify-content: flex-end; }
        .other-row { justify-content: flex-start; }

        .bubble { 
          max-width: 80%; padding: 6px 10px; border-radius: 12px; position: relative; font-size: 15px; 
          box-shadow: 0 1px 2px rgba(0,0,0,0.3); min-width: 80px; 
        }
        .my-row .bubble { background: #2b5278; color: #fff; border-bottom-right-radius: 0; }
        .other-row .bubble { background: #182533; color: #fff; border-bottom-left-radius: 0; }

        .sender-name { color: #cfab56; font-size: 12px; font-weight: bold; display: block; margin-bottom: 3px; }
        .content { margin: 0; word-wrap: break-word; line-height: 1.4; white-space: pre-wrap; }

        /* REPLY DISPLAY IN MSG */
        .reply-preview-in-msg {
          display: flex; gap: 8px; margin-bottom: 6px; cursor: pointer;
          background: rgba(0,0,0,0.2); padding: 5px; border-radius: 4px; border-left: 3px solid #cfab56;
        }
        .reply-content-box { display: flex; flex-direction: column; overflow: hidden; justify-content: center; }
        .reply-sender-name { font-size: 11px; color: #cfab56; font-weight: bold; }
        .reply-text-truncate { font-size: 11px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8; }

        /* MEDIA */
        .media-container { margin-bottom: 5px; border-radius: 8px; overflow: hidden; position: relative; width: fit-content; }
        .media-container img, .media-container video { 
           display: block; max-width: 100%; max-height: 350px; 
           object-fit: cover; min-width: 150px; min-height: 150px;
        }
        .blur-media { filter: blur(5px); opacity: 0.6; }
        .upload-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .percent-text { font-weight: bold; color: #fff; text-shadow: 0 0 5px #000; }
        .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 30px; color: #fff; background: rgba(0,0,0,0.5); border-radius: 50%; padding: 10px; }

        /* REACTIONS */
        .reactions-row { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
        .reaction-pill { 
          background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2px 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 3px; border: 1px solid transparent; 
        }
        .my-reaction { background: rgba(111, 185, 246, 0.2); border-color: #6fb9f6; }
        .count { font-size: 10px; font-weight: bold; }

        /* FOOTER MODERN */
        .footer-modern { background: #17212b; padding: 8px 10px; border-top: 1px solid #000; position: relative; }
        
        .reply-bar-floating { 
          position: absolute; bottom: 100%; left: 0; right: 0; background: #17212b; 
          padding: 8px 15px; border-top: 1px solid #0e1621; display: flex; align-items: center; gap: 10px; animation: slideUp 0.2s;
        }
        .reply-icon-box { color: #cfab56; font-size: 18px; }
        .reply-info-box { flex: 1; overflow: hidden; }
        .reply-title { color: #cfab56; font-size: 13px; font-weight: bold; display: block; }
        .reply-subtitle { color: #8899ac; font-size: 12px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .close-reply-btn { background: none; border: none; color: #6c7a89; font-size: 16px; padding: 5px; }

        .input-area-modern { display: flex; align-items: flex-end; gap: 8px; background: #0e1621; padding: 6px; border-radius: 20px; }
        .attach-btn, .sticker-btn { background: none; border: none; color: #8899ac; font-size: 20px; padding: 10px; cursor: pointer; transition: 0.2s; }
        .attach-btn:hover, .sticker-btn:hover { color: #cfab56; }
        
        .modern-input {
          flex: 1; background: transparent; border: none; color: #fff; padding: 10px 5px; 
          font-size: 16px; outline: none; resize: none; max-height: 100px; font-family: inherit;
        }
        
        .send-btn-modern { 
          width: 45px; height: 45px; background: #4aa3df; border-radius: 50%; border: none; 
          color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin-left: 5px;
        }
        .send-btn-modern:disabled { background: #2f3a4b; color: #8899ac; cursor: default; }

        /* STICKER PICKER */
        .emoji-picker-popover {
          position: absolute; bottom: 70px; right: 10px; background: #17212b; border: 1px solid #2d3b55;
          padding: 10px; border-radius: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.5); font-size: 24px; z-index: 50;
        }
        .emoji-picker-popover span { cursor: pointer; padding: 5px; transition: 0.2s; }
        .emoji-picker-popover span:hover { transform: scale(1.2); }

        /* CONTEXT MENU */
        .context-menu { 
          position: fixed; background: #232e3c; border-radius: 8px; 
          box-shadow: 0 5px 20px rgba(0,0,0,0.6); z-index: 9999; min-width: 180px; padding: 5px 0;
        }
        .reaction-row { padding: 8px 10px; display: flex; justify-content: space-around; font-size: 20px; }
        .reaction-row span { cursor: pointer; transition: 0.2s; }
        .reaction-row span:hover { transform: scale(1.2); }
        .menu-divider { height: 1px; background: #17212b; margin: 5px 0; }
        .menu-item { padding: 10px 15px; color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; }
        .menu-item:hover { background: #17212b; }
        .delete { color: #ff595a; }

        /* MOBILE SHEET */
        .mobile-sheet-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: flex-end; }
        .mobile-sheet { width: 100%; background: #17212b; border-radius: 16px 16px 0 0; padding: 10px 0 20px; animation: slideUp 0.2s; }
        .sheet-handle { width: 40px; height: 4px; background: #4a5766; margin: 0 auto 15px; border-radius: 2px; }
        .sheet-reactions { display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; padding: 0 10px; }
        .sheet-emoji-btn { background: #232e3c; border: none; font-size: 24px; width: 45px; height: 45px; border-radius: 50%; }
        .sheet-item { padding: 15px 20px; display: flex; align-items: center; gap: 15px; font-size: 16px; color: #fff; }
        .sheet-item:active { background: #232e3c; }
        .delete-item { color: #ff595a; }

        /* NEW PREVIEW MODAL */
        .preview-container-new { width: 90%; max-width: 500px; background: #17212b; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; max-height: 80vh; }
        .preview-top-bar { padding: 12px 15px; background: #232e3c; display: flex; justify-content: space-between; color: #fff; font-weight: bold; }
        .preview-content-scroll { padding: 10px; overflow-y: auto; flex: 1; }
        .preview-grid-new { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
        .preview-card { position: relative; aspect-ratio: 1; background: #000; border-radius: 6px; overflow: hidden; }
        .preview-card img, .preview-card video { width: 100%; height: 100%; object-fit: cover; }
        .preview-footer { padding: 10px; background: #232e3c; display: flex; gap: 10px; }
        .preview-footer input { flex: 1; background: #0e1621; border: none; color: #fff; padding: 10px; border-radius: 8px; }
        .preview-footer button { background: #4aa3df; border: none; padding: 0 20px; border-radius: 8px; color: #fff; }
        .remove-preview-btn { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }

        .loader { width: 48px; height: 48px; border: 3px solid #FFF; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
        .loader-mini { width: 20px; height: 20px; border: 2px solid #FFF; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .meta { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 2px; }
        .time { font-size: 10px; color: #8faec5; }
        .checks { font-size: 11px; color: #4aa3df; }
      `}</style>
    </div>
  );
}