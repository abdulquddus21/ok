import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FaPaperPlane, FaPaperclip, FaArrowLeft, FaEllipsisV, 
  FaCheck, FaCheckDouble, FaUserAstronaut, FaTimes, FaPlay, 
  FaTrash, FaPen, FaReply, FaCopy, FaSmile, FaInfoCircle, FaBan,
  FaCamera, FaEdit
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- SOUNDS ---
const SEND_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//OEAAAAAAAAAAAAAAAAAAAAAAAAMGluZv////8AAAAAAAEgAAAAP8Y9JgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA';

// --- CHUNKED UPLOAD FUNCTION ---
const uploadChunked = async (file, onProgress) => {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`; // Unikal nom

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('fileName', fileName);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);

    try {
      const response = await fetch('/api/upload-chunk', { // Yangi API route kerak bo'ladi
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Chunk upload failed');
      
      const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      if (onProgress) onProgress(percent);
      
      // Agar oxirgi chunk bo'lsa, serverdan URL qaytadi
      if (chunkIndex === totalChunks - 1) {
        const data = await response.json();
        return data.url; 
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};

// Agar /api/upload-chunk yo'q bo'lsa oddiy yuklash uchun fallback
const uploadSimple = async (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (onProgress) onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.url);
      } else {
        reject(`Server xatosi: ${xhr.status}`);
      }
    };
    xhr.onerror = () => reject('Tarmoq xatosi');
    xhr.open('POST', '/api/upload', true); 
    xhr.send(formData);
  });
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💩"];

export default function ChatWindow({ chatId, currentUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  
  // Media & UI States
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [showPreview, setShowPreview] = useState(false); 
  const [uploadQueue, setUploadQueue] = useState({}); 
  const [mediaZoom, setMediaZoom] = useState(null); 
  
  // Interaction States
  const [contextMenu, setContextMenu] = useState(null); 
  const [headerMenu, setHeaderMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null); 
  const [editingMsg, setEditingMsg] = useState(null); 
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // MODAL UCHUN STATE (Tanlangan user yoki kanal info)
  const [viewProfile, setViewProfile] = useState(null); 
  
  // EDIT CHANNEL STATES
  const [isEditingChannel, setIsEditingChannel] = useState(false);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelBio, setEditChannelBio] = useState('');
  const [editChannelAvatar, setEditChannelAvatar] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const inputRef = useRef(null);
  const channelAvatarInputRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    setMessages([]); 
    setChatInfo(null);
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
        .select('users(username, id, avatar_url)') 
        .eq('room_id', chatId)
        .neq('user_id', currentUser.id)
        .single();
       if (partner?.users) {
         room.name = partner.users.username;
         room.partnerId = partner.users.id;
         room.avatar_url = partner.users.avatar_url; 
         room.bio = "edutoon foydalanuvchisi"; 
       }
    } else {
        room.avatar_url = room.image_url || null; 
        room.bio = room.description || "Kanal tavsifi mavjud emas";
    }
    
    const { count } = await supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('room_id', chatId);
    setChatInfo(room);
    setSubscribersCount(count || 0);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:users(username, id, avatar_url)') 
      .eq('room_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    const unreadIds = messages.filter(m => !m.is_read && m.sender_id !== currentUser.id).map(m => m.id);
    if (unreadIds.length > 0) await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
  };

  const handleRealtimeEvent = async (payload) => {
    const { eventType, new: newMsg, old: oldMsg } = payload;
    if (eventType === 'INSERT') {
      if (!newMsg.sender) {
        const { data: sender } = await supabase.from('users').select('username, id, avatar_url').eq('id', newMsg.sender_id).single();
        newMsg.sender = sender;
      }
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } else if (eventType === 'UPDATE') {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg, sender: m.sender } : m));
    } else if (eventType === 'DELETE') {
      setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
    }
  };

  const playSendSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {});
    }
  };

  // --- SEND MESSAGE LOGIC ---
  const handleSend = async () => {
    if (isSending) return; 
    if (selectedFiles.length === 0 && !newMessage.trim()) return;

    if (editingMsg) {
      const { error } = await supabase.from('messages').update({ content: newMessage }).eq('id', editingMsg.id);
      if (error) toast.error("Xatolik!");
      else { setEditingMsg(null); setNewMessage(''); }
      return;
    }

    playSendSound();
    setIsSending(true);
    const caption = newMessage;
    setNewMessage('');
    setShowPreview(false);
    setSelectedFiles([]);
    
    const currentReply = replyTo ? { ...replyTo } : null;
    setReplyTo(null);

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

    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];
      const isLast = index === selectedFiles.length - 1;
      const fileType = file.type.startsWith('video') ? 'video' : 'image';
      
      // Hajm tekshiruvi (300MB)
      if (file.size > 300 * 1024 * 1024) {
          toast.error(`${file.name} juda katta (Max: 300MB)`);
          continue;
      }

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
        // Chunk upload yoki oddiy uploadni tanlaymiz
        let url;
        if(file.size > 5 * 1024 * 1024) { // 5MB dan katta bo'lsa chunk
            url = await uploadChunked(file, (percent) => setUploadQueue(prev => ({ ...prev, [tempId]: percent })));
        } else {
            url = await uploadSimple(file, (percent) => setUploadQueue(prev => ({ ...prev, [tempId]: percent })));
        }

        await sendSingleMessage(isLast ? caption : '', url, fileType, tempId, isLast ? currentReply : null);
      } catch (error) {
        console.error(error);
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
      reactions: {}
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

  // --- ACTIONS ---
  const deleteMessage = async () => {
    if (!contextMenu?.msg) return;
    const { error } = await supabase.from('messages').delete().eq('id', contextMenu.msg.id);
    if (!error) setMessages(prev => prev.filter(m => m.id !== contextMenu.msg.id));
    setContextMenu(null);
  };

  const handleReaction = async (emoji) => {
    const msg = contextMenu?.msg;
    if (!msg) return;
    const currentReactions = msg.reactions || {};
    const userReacted = currentReactions[emoji]?.includes(currentUser.id);
    let newReactions = { ...currentReactions };
    
    if (userReacted) {
      newReactions[emoji] = newReactions[emoji].filter(id => id !== currentUser.id);
      if (newReactions[emoji].length === 0) delete newReactions[emoji];
    } else {
      if (!newReactions[emoji]) newReactions[emoji] = [];
      newReactions[emoji].push(currentUser.id);
    }
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m));
    setContextMenu(null);
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id);
  };

  const handleDeleteChatOrUser = async () => {
    if(!window.confirm("Chatni o'chirishni tasdiqlaysizmi?")) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', chatId);
      if(error) throw error;
      toast.success("Chat o'chirildi");
      onBack();
    } catch (e) {
      toast.error("Xatolik!");
    }
  };
  
  // --- EDIT CHANNEL LOGIC ---
  const openEditChannel = () => {
      setEditChannelName(chatInfo.name || '');
      setEditChannelBio(chatInfo.bio || '');
      setEditAvatarPreview(chatInfo.avatar_url);
      setEditChannelAvatar(null);
      setIsEditingChannel(true);
      setHeaderMenu(false);
  };

  const handleSaveChannel = async () => {
      if(!editChannelName.trim()) return toast.warning("Kanal nomi bo'sh bo'lmasin!");
      
      let imageUrl = chatInfo.avatar_url; // Eski rasm qoladi agar yangisi bo'lmasa

      if (editChannelAvatar) {
          try {
             toast.info("Rasm yuklanmoqda...");
             imageUrl = await uploadSimple(editChannelAvatar); // Oddiy rasm upload
          } catch(e) {
             toast.error("Rasm yuklashda xato!");
             return;
          }
      }

      const { error } = await supabase.from('rooms')
        .update({ name: editChannelName, description: editChannelBio, image_url: imageUrl })
        .eq('id', chatId);

      if(error) {
          toast.error("Yangilashda xato!");
      } else {
          toast.success("Kanal yangilandi!");
          setChatInfo(prev => ({...prev, name: editChannelName, bio: editChannelBio, avatar_url: imageUrl}));
          setIsEditingChannel(false);
      }
  };

  // --- RENDER HELPERS ---
  const renderAvatar = (info, size = 40, onClick = null) => {
    const style = {
        width: size, height: size, minWidth: size, minHeight: size, 
        borderRadius: '50%', objectFit: 'cover', 
        cursor: onClick ? 'pointer' : 'default',
        fontSize: size/2.2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #6a9cc5, #3d6a91)',
        color: '#fff', fontWeight: 'bold'
    };

    if (info?.avatar_url) {
        return <img src={info.avatar_url} alt="avatar" style={style} onClick={onClick} />;
    }
    return (
        <div style={style} onClick={onClick}>
            {info?.name?.[0]?.toUpperCase() || info?.username?.[0]?.toUpperCase() || <FaUserAstronaut />}
        </div>
    );
  };

  const handleUserClick = (user, e) => {
      e.stopPropagation();
      setViewProfile({
          name: user.username || user.name,
          avatar_url: user.avatar_url,
          id: user.id,
          bio: user.id === chatInfo?.partnerId ? chatInfo.bio : "Guruh a'zosi",
          type: 'user'
      });
  };

  const handleHeaderClick = () => {
      setViewProfile({ ...chatInfo, type: chatInfo.type });
  };

  const isPartnerOnline = chatInfo?.type === 'private' && onlineUsers.has(chatInfo.partnerId);
  const isChannel = chatInfo?.type === 'channel';
  const isOwner = chatInfo?.owner_id === currentUser.id;
  const canWrite = !isChannel || isOwner;

  // --- JSX RENDER ---
  if (!chatId) return <div className="placeholder">Chatni tanlang</div>;

  return (
    <div className={`tg-window ${isMobile ? 'mobile' : ''}`} onClick={() => {setContextMenu(null); setHeaderMenu(false);}}>
      <ToastContainer position="top-center" theme="dark" autoClose={2000} />
      <audio ref={audioRef} src={SEND_SOUND} />

      {/* BACKGROUND PATTERN */}
      <div className="tg-bg-pattern"></div>

      {/* HEADER */}
      <div className="tg-header">
        <div className="tg-header-left" onClick={handleHeaderClick}>
          {isMobile && <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="tg-back-btn"><FaArrowLeft /></button>}
          {renderAvatar(chatInfo)}
          <div className="tg-header-info">
            <h3>{chatInfo?.name || '...'}</h3>
            <p className={isPartnerOnline ? 'online' : ''}>
              {loading ? '...' : (
                chatInfo?.type === 'private' 
                ? (isPartnerOnline ? 'online' : 'yaqinda kirgan') 
                : (isChannel ? `${subscribersCount} obunachi` : `${subscribersCount} a'zo`)
              )}
            </p>
          </div>
        </div>
        <div className="tg-header-right">
             <button className="tg-icon-btn" onClick={(e) => {e.stopPropagation(); setHeaderMenu(!headerMenu);}}><FaEllipsisV /></button>
             {headerMenu && (
                 <div className="tg-dropdown">
                     <div className="tg-menu-item" onClick={handleHeaderClick}><FaInfoCircle /> Profil</div>
                     {(isChannel || chatInfo?.type === 'group') && isOwner && (
                         <div className="tg-menu-item" onClick={openEditChannel}><FaEdit /> Tahrirlash</div>
                     )}
                     <div className="tg-menu-item delete" onClick={handleDeleteChatOrUser}><FaBan /> O'chirish</div>
                 </div>
             )}
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="tg-messages-scroll">
        {loading && <div className="tg-spinner-container"><div className="tg-spinner"></div></div>}
        
        {!loading && messages.map((msg, index) => {
          const isMyMsg = msg.sender_id === currentUser.id;
          const showName = !isMyMsg && (chatInfo?.type === 'group' || isChannel);
          const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
          
          return (
            <div 
              key={msg.id || msg.tempId} 
              className={`tg-message-row ${isMyMsg ? 'me' : 'other'}`}
              onContextMenu={(e) => { e.preventDefault(); if(!isMobile) setContextMenu({x: e.pageX, y: e.pageY, msg, type: 'desktop'}); }}
            >
              {!isMyMsg && chatInfo?.type === 'group' && (
                  <div className="tg-message-avatar">
                      {renderAvatar(msg.sender, 34, (e) => handleUserClick(msg.sender, e))}
                  </div>
              )}

              <div className="tg-bubble">
                {showName && <span className="tg-sender-name" onClick={(e) => handleUserClick(msg.sender, e)}>{msg.sender?.username}</span>}
                
                {repliedMsg && (
                  <div className="tg-reply-preview" onClick={() => document.getElementById(repliedMsg.id)?.scrollIntoView({ behavior: 'smooth' })}>
                    <div className="tg-reply-bar"></div>
                    <div className="tg-reply-info">
                      <span className="tg-reply-user">{repliedMsg.sender?.username}</span>
                      <span className="tg-reply-text">{repliedMsg.file_type ? 'Media' : repliedMsg.content}</span>
                    </div>
                  </div>
                )}

                {msg.file_url && (
                  <div className="tg-media-wrapper" onClick={() => !msg.status && setMediaZoom({ url: msg.file_url, type: msg.file_type })}>
                    {msg.status === 'uploading' && (
                        <div className="tg-upload-overlay"><div className="tg-progress-text">{uploadQueue[msg.tempId] || 0}%</div></div>
                    )}
                    {msg.file_type === 'video' ? (
                      <div className="tg-video-cont">
                         <video src={msg.file_url} className={msg.status === 'uploading' ? 'blur' : ''} />
                         <div className="tg-play-icon"><FaPlay /></div>
                      </div>
                    ) : (
                      <img src={msg.file_url} alt="media" className={msg.status === 'uploading' ? 'blur' : ''} />
                    )}
                  </div>
                )}

                {msg.content && <p className="tg-text">{msg.content}</p>}

                {Object.keys(msg.reactions || {}).length > 0 && (
                  <div className="tg-reactions">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                      <span key={emoji} className={`tg-reaction-pill ${userIds.includes(currentUser.id) ? 'active' : ''}`}>
                        {emoji} {userIds.length > 1 && <span className="count">{userIds.length}</span>}
                      </span>
                    ))}
                  </div>
                )}

                <div className="tg-meta">
                  <span className="tg-time">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  {isMyMsg && (
                     <span className="tg-check">
                        {msg.status === 'uploading' ? '🕒' : (msg.is_read ? <FaCheckDouble/> : <FaCheck/>)}
                     </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER INPUT */}
      {canWrite && (
      <div className="tg-footer">
          {(replyTo || editingMsg) && (
            <div className="tg-reply-panel">
              <div className="tg-reply-icon">{editingMsg ? <FaPen /> : <FaReply />}</div>
              <div className="tg-reply-details">
                <span className="tg-reply-title">{editingMsg ? 'Xabarni tahrirlash' : `Javob: ${replyTo?.sender?.username}`}</span>
                <p className="tg-reply-subtitle">{editingMsg ? editingMsg.content : (replyTo.content || 'Media')}</p>
              </div>
              <button className="tg-close-reply" onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }}><FaTimes /></button>
            </div>
          )}

          <div className="tg-input-wrapper">
            <button className="tg-attach-btn" onClick={() => fileInputRef.current.click()}><FaPaperclip /></button>
            <input 
              type="file" multiple 
              accept="image/*,video/*"
              ref={fileInputRef} style={{display: 'none'}} 
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if(files.length > 0) { setSelectedFiles(prev => [...prev, ...files]); setShowPreview(true); }
                e.target.value = null;
              }}
            />
            <textarea 
              ref={inputRef} 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Xabar yozing..." 
              className="tg-textarea" 
              rows={1}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              style={{height: newMessage.length > 50 ? 'auto' : '20px'}}
            />
            {newMessage || selectedFiles.length > 0 ? (
              <button className="tg-send-btn active" onClick={handleSend} disabled={isSending}>
                {isSending ? <span className="tg-loader"></span> : <FaPaperPlane />}
              </button>
            ) : (
              <button className="tg-emoji-btn" onClick={() => setShowReactionPicker(!showReactionPicker)}><FaSmile /></button>
            )}
          </div>
      </div>
      )}

      {/* MODAL - PROFILE / INFO */}
      {viewProfile && !isEditingChannel && (
        <div className="tg-modal-overlay" onClick={() => setViewProfile(null)}>
           <div className="tg-profile-card" onClick={e => e.stopPropagation()}>
               <div className="tg-profile-header">
                    <button className="tg-modal-close" onClick={() => setViewProfile(null)}><FaTimes /></button>
                    <div className="tg-profile-title">Profil ma'lumotlari</div>
                    <div style={{width: 30}}></div> 
               </div>
               
               <div className="tg-profile-content">
                   <div className="tg-profile-avatar">
                        {renderAvatar(viewProfile, 120)}
                   </div>
                   
                   <div className="tg-profile-names">
                       <h2>{viewProfile.name || viewProfile.username}</h2>
                       <span className="tg-status">
                           {viewProfile.type === 'private' || viewProfile.type === 'user' 
                             ? (onlineUsers.has(viewProfile.id) ? 'Online' : 'Yaqinda kirgan') 
                             : 'Kanal / Guruh'}
                       </span>
                   </div>

                   <div className="tg-info-block">
                       <div className="tg-info-item">
                           <div className="tg-icon-box"><FaInfoCircle /></div>
                           <div className="tg-info-text">
                               <label>Haqida</label>
                               <p>{viewProfile.bio || "Ma'lumot yo'q"}</p>
                           </div>
                       </div>
                       {viewProfile.username && (
                           <div className="tg-info-item">
                                <div className="tg-icon-box">@</div>
                                <div className="tg-info-text">
                                    <label>Username</label>
                                    <p>@{viewProfile.username}</p>
                                </div>
                           </div>
                       )}
                   </div>

                   {viewProfile.id !== currentUser.id && (
                    <div className="tg-action-buttons">
                        <button className="tg-act-btn msg" onClick={() => setViewProfile(null)}><FaPaperPlane /> Xabar</button>
                    </div>
                   )}
                   {isOwner && (viewProfile.type === 'channel' || viewProfile.type === 'group') && (
                       <div className="tg-action-buttons" style={{marginTop: 5}}>
                           <button className="tg-act-btn edit" onClick={() => { setViewProfile(null); openEditChannel(); }}><FaEdit /> Tahrirlash</button>
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}

      {/* MODAL - EDIT CHANNEL */}
      {isEditingChannel && (
          <div className="tg-modal-overlay">
              <div className="tg-profile-card">
                  <div className="tg-profile-header">
                      <button className="tg-modal-close" onClick={() => setIsEditingChannel(false)}><FaTimes /></button>
                      <div className="tg-profile-title">Tahrirlash</div>
                      <button className="tg-save-btn" onClick={handleSaveChannel}><FaCheck /></button>
                  </div>
                  <div className="tg-profile-content">
                      <label className="tg-avatar-edit">
                          {editAvatarPreview ? <img src={editAvatarPreview} alt="prev" /> : (chatInfo.avatar_url ? <img src={chatInfo.avatar_url} /> : <FaCamera />)}
                          <div className="tg-cam-overlay"><FaCamera /></div>
                          <input type="file" hidden accept="image/*" onChange={(e) => {
                              if(e.target.files[0]) { setEditChannelAvatar(e.target.files[0]); setEditAvatarPreview(URL.createObjectURL(e.target.files[0])); }
                          }} />
                      </label>
                      <input 
                        type="text" className="tg-edit-input" placeholder="Kanal nomi" 
                        value={editChannelName} onChange={(e) => setEditChannelName(e.target.value)} 
                      />
                      <textarea 
                        className="tg-edit-textarea" placeholder="Tavsif (Bio)" 
                        value={editChannelBio} onChange={(e) => setEditChannelBio(e.target.value)}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="tg-modal-overlay">
          <div className="tg-preview-box">
            <div className="tg-preview-header">
                <span>Tanlangan ({selectedFiles.length})</span>
                <button onClick={() => {setShowPreview(false); setSelectedFiles([]);}}><FaTimes /></button>
            </div>
            <div className="tg-preview-grid">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="tg-preview-item">
                    <button className="tg-remove-media" onClick={() => {
                      const n = [...selectedFiles]; n.splice(i,1); setSelectedFiles(n); if(n.length===0) setShowPreview(false);
                    }}><FaTimes /></button>
                    {f.type.startsWith('video') ? <video src={URL.createObjectURL(f)} /> : <img src={URL.createObjectURL(f)} />}
                  </div>
                ))}
            </div>
            <div className="tg-preview-send" onClick={handleSend}>
                 <FaPaperPlane /> Yuborish
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {mediaZoom && (
        <div className="tg-lightbox" onClick={() => setMediaZoom(null)}>
          <button className="tg-close-lightbox"><FaTimes /></button>
          <div className="tg-lightbox-content" onClick={e => e.stopPropagation()}>
            {mediaZoom.type === 'video' ? <video src={mediaZoom.url} controls autoPlay /> : <img src={mediaZoom.url} />}
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu?.type === 'desktop' && (
        <div className="tg-context-menu" style={{ top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 180) }}>
          <div className="tg-emoji-row">{REACTION_EMOJIS.slice(0,5).map(e => <span key={e} onClick={() => handleReaction(e)}>{e}</span>)}</div>
          <div className="tg-ctx-item" onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}><FaReply /> Javob berish</div>
          <div className="tg-ctx-item" onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }}><FaCopy /> Nusxa olish</div>
          {contextMenu.msg.sender_id === currentUser.id && (
             <>
               <div className="tg-ctx-item" onClick={() => { setEditingMsg(contextMenu.msg); setContextMenu(null); setNewMessage(contextMenu.msg.content); }}><FaPen /> Tahrirlash</div>
               <div className="tg-ctx-item delete" onClick={deleteMessage}><FaTrash /> O'chirish</div>
             </>
          )}
        </div>
      )}

      <style jsx>{`
        /* --- TELEGRAM THEME VARIABLES --- */
        :root {
            --bg-color: #17212b;
            --chat-bg: #0e1621;
            --header-bg: #17212b;
            --text-primary: #ffffff;
            --text-secondary: #8faec5;
            --accent: #4aa3df;
            --bubble-in: #182533;
            --bubble-out: #2b5278;
            --input-bg: #17212b;
            --hover-bg: #202b36;
            --border-color: #0b1016;
            --red: #ff595a;
        }

        :global(body) { 
            margin: 0; padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--chat-bg);
            color: var(--text-primary);
            overscroll-behavior: none;
        }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }

        .tg-window { 
            display: flex; flex-direction: column; height: 100vh; position: relative; overflow: hidden; 
        }
        .tg-bg-pattern {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: var(--chat-bg);
            background-image: url("https://web.telegram.org/img/bg_0.png");
            background-size: cover; z-index: 0;
            opacity: 1; pointer-events: none;
        }
        
        /* HEADER */
        .tg-header {
            flex: 0 0 56px; display: flex; align-items: center; justify-content: space-between;
            background: #19223b; padding: 0 16px; z-index: 10;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            border-bottom: 1px solid #000000;
        }
        .tg-header-left { display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; }
        .tg-header-info h3 { margin: 0; font-size: 16px; font-weight: 600; color: #fff; }
        .tg-header-info p { margin: 0; font-size: 13px; color: #8faec5; }
        .tg-header-info p.online { color: #4aa3df; }
        .tg-icon-btn { background: none; border: none; color: #8faec5; font-size: 18px; padding: 8px; cursor: pointer; border-radius: 50%; }
        .tg-icon-btn:hover { background: var(--hover-bg); color: #fff; }
        .tg-back-btn { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; margin-right: 5px; }

        .tg-dropdown {
            position: absolute; top: 50px; right: 10px; background: #232e3c;
            border-radius: 6px; padding: 6px 0; min-width: 180px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 100;
        }
        .tg-menu-item {
            padding: 8px 16px; display: flex; align-items: center; gap: 12px;
            color: #fff; font-size: 14px; cursor: pointer;
        }
        .tg-menu-item:hover { background: #17212b; }
        .tg-menu-item.delete { color: var(--red); }

        /* MESSAGES */
        .tg-messages-scroll {
            flex: 1; overflow-y: auto; padding: 10px 16px 10px 16px;
            display: flex; flex-direction: column; gap: 4px; z-index: 1;
        }
        .tg-message-row { display: flex; width: 100%; margin-bottom: 4px; }
        .tg-message-row.me { justify-content: flex-end; }
        
        .tg-message-avatar { margin-right: 8px; align-self: flex-end; padding-bottom: 4px; }

        .tg-bubble {
            max-width: 75%; min-width: 80px; position: relative;
            padding: 6px 10px 6px 10px;
            border-radius: 12px; 
            box-shadow: 0 1px 1px rgba(0,0,0,0.3);
            display: flex; flex-direction: column;
        }
        .tg-message-row.other .tg-bubble {
            background: #202020;
            color:white;
            border-bottom-left-radius: 0;
        }
        .tg-message-row.me .tg-bubble {
            background: #19223b;
            border-bottom-right-radius: 0;
            color:white;
        }
        
        .tg-sender-name {
            font-size: 13px; font-weight: 600; color: var(--accent);
            cursor: pointer; margin-bottom: 4px;
        }
        
        .tg-text {
            margin: 0; font-size: 15px; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap;
            padding-right: 10px; /* Space for time if short */
        }

        /* MEDIA */
        .tg-media-wrapper {
            margin: 2px -4px 6px -4px; /* Slight breakout */
            border-radius: 8px; overflow: hidden; position: relative;
            cursor: pointer;
        }
        .tg-media-wrapper img, .tg-media-wrapper video {
            display: block; width: 100%; height: auto; max-height: 350px; object-fit: cover;
        }
        .tg-upload-overlay {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4); display: flex; align-items: center; justifyContent: center;
        }
        .tg-progress-text { color: #fff; font-weight: bold; font-size: 14px; }
        .tg-play-icon {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 40px; height: 40px; background: rgba(0,0,0,0.5); border-radius: 50%;
            display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px;
        }
        .blur { filter: blur(3px); }

        /* META (Time & Checks) */
        .tg-meta {
            align-self: flex-end; display: flex; align-items: center; gap: 4px;
            margin-top: -8px; /* Pull up into text line if possible, simplistic here */
            margin-left: auto; padding-top: 4px;
            opacity: 0.7;
        }
        .tg-time { font-size: 11px; color: #8faec5; }
        .me .tg-time { color: #8faec5; } /* lighter in blue bubble */
        .tg-check { font-size: 12px; color: #6fb9f6; }

        /* REPLY PREVIEW */
        .tg-reply-preview {
            display: flex; gap: 8px; margin-bottom: 4px; cursor: pointer;
        }
        .tg-reply-bar { width: 2px; background: var(--accent); border-radius: 2px; }
        .tg-reply-info { display: flex; flex-direction: column; overflow: hidden; }
        .tg-reply-user { color: var(--accent); font-size: 12px; font-weight: 600; }
        .tg-reply-text { color: #fff; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8; }

        /* FOOTER */
        .tg-footer {
            background: #19223b; padding: 8px 10px; z-index: 10;
        }
        .tg-reply-panel {
            display: flex; align-items: center; gap: 10px; padding: 6px 10px;
            border-bottom: 1px solid rgba(0,0,0,0.1); margin-bottom: 4px;
        }
        .tg-reply-icon { color: var(--accent); font-size: 18px; }
        .tg-reply-details { flex: 1; overflow: hidden; }
        .tg-reply-title { color: var(--accent); font-size: 13px; font-weight: 600; display: block; }
        .tg-reply-subtitle { color: #8faec5; font-size: 12px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tg-close-reply { background: none; border: none; color: #8faec5; cursor: pointer; }

        .tg-input-wrapper {
            display: flex; align-items: flex-end; gap: 10px;
            background: #00000000; /* Wrapper itself is transparent */
        }
        .tg-attach-btn, .tg-emoji-btn {
            background: none; border: none; color: #8faec5; 
            font-size: 22px; padding: 8px; cursor: pointer; transition: 0.2s;
        }
        .tg-attach-btn:hover, .tg-emoji-btn:hover { color: #fff; }
        
        .tg-textarea {
            flex: 1; background: var(--chat-bg); border: none; border-radius: 6px;
            color: #fff; padding: 10px 12px; font-size: 16px; outline: none;
            resize: none; max-height: 120px;
            font-family: inherit; line-height: 1.4;
        }
        
        .tg-send-btn {
            background: none; border: none; color: #4aa3df;
            font-size: 24px; padding: 8px; cursor: pointer; transition: transform 0.2s;
        }
        .tg-send-btn.active:hover { transform: scale(1.1); }
        .tg-send-btn:disabled { opacity: 0.5; cursor: default; }

        /* PROFILE MODAL (Telegram Style) */
        .tg-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 2000;
            display: flex; align-items: center; justify-content: center;
        }
        .tg-profile-card {
            width: 360px; background: #17212b; border-radius: 10px;
            overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
            display: flex; flex-direction: column;
            color:wheat;
        }
        .tg-profile-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 16px; background: #17212b;
        }
        .tg-modal-close { background: none; border: none; color: #8faec5; font-size: 18px; cursor: pointer; }
        .tg-profile-title { color: #fff; font-weight: 600; font-size: 18px; }
        
        .tg-profile-content { padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .tg-profile-avatar { margin-bottom: 15px; }
        .tg-profile-names { text-align: center; margin-bottom: 20px; }
        .tg-profile-names h2 { margin: 0; font-size: 20px; font-weight: 600; }
        .tg-status { color: #8faec5; font-size: 14px; }

        .tg-info-block { width: 100%; background: #232e3c; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
        .tg-info-item { display: flex; align-items: center; gap: 15px; padding: 12px 16px; border-bottom: 1px solid #17212b; }
        .tg-info-item:last-child { border-bottom: none; }
        .tg-icon-box { color: #8faec5; font-size: 20px; width: 24px; text-align: center; }
        .tg-info-text { display: flex; flex-direction: column; }
        .tg-info-text label { font-size: 12px; color: #8faec5; margin-bottom: 2px; }
        .tg-info-text p { margin: 0; font-size: 15px; }
        
        .tg-action-buttons { width: 100%; display: flex; flex-direction: column; gap: 8px; }
        .tg-act-btn {
            width: 100%; padding: 12px; border: none; border-radius: 6px;
            font-size: 15px; font-weight: 600; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .tg-act-btn.msg { background: #4aa3df; color: #fff; }
        .tg-act-btn.block { background: transparent; color: #ff595a; border: 1px solid #ff595a; }
        .tg-act-btn.edit { background: #232e3c; color: #fff; }

        /* PREVIEW BOX */
        .tg-preview-box {
            background: #17212b; padding: 15px; border-radius: 10px; max-width: 500px; width: 90%;
            max-height: 80vh; display: flex; flex-direction: column;
        }
        .tg-preview-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #fff; font-weight: 600; }
        .tg-preview-header button { background: none; border: none; color: #8faec5; font-size: 18px; cursor: pointer; }
        .tg-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; overflow-y: auto; }
        .tg-preview-item { position: relative; aspect-ratio: 1; background: #000; border-radius: 6px; overflow: hidden; }
        .tg-preview-item img, .tg-preview-item video { width: 100%; height: 100%; object-fit: cover; }
        .tg-remove-media {
            position: absolute; top: 4px; right: 4px; width: 20px; height: 20px;
            background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px;
        }
        .tg-preview-send {
            margin-top: 15px; background: #4aa3df; color: #fff; padding: 12px;
            text-align: center; border-radius: 8px; cursor: pointer; font-weight: 600;
            display: flex; align-items: center; justify-content: center; gap: 8px;
        }

        /* CONTEXT MENU */
        .tg-context-menu {
            position: fixed; background: rgba(35, 46, 60, 0.95); backdrop-filter: blur(10px);
            border-radius: 8px; padding: 6px; width: 220px; z-index: 3000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .tg-emoji-row { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px; }
        .tg-emoji-row span { font-size: 20px; cursor: pointer; transition: transform 0.1s; }
        .tg-emoji-row span:hover { transform: scale(1.2); }
        .tg-ctx-item {
            padding: 8px 12px; color: #fff; display: flex; align-items: center; gap: 12px;
            border-radius: 6px; cursor: pointer; font-size: 14px;
        }
        .tg-ctx-item:hover { background: rgba(255,255,255,0.05); }
        .tg-ctx-item.delete { color: #ff595a; }

        /* LIGHTBOX */
        .tg-lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 5000; display: flex; align-items: center; justify-content: center; }
        .tg-lightbox-content { max-width: 95%; max-height: 95%; }
        .tg-lightbox-content img, .tg-lightbox-content video { max-width: 100%; max-height: 90vh; border-radius: 4px; }
        .tg-close-lightbox { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #fff; font-size: 30px; cursor: pointer; }

        .tg-spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #4aa3df; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
        .tg-loader { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #4aa3df; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* EDIT MODAL STYLES */
        .tg-save-btn { background: none; border: none; color: #4aa3df; font-size: 18px; cursor: pointer; }
        .tg-avatar-edit { 
            width: 100px; height: 100px; border-radius: 50%; background: #232e3c; 
            margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;
            font-size: 30px; color: #4aa3df; cursor: pointer; position: relative; overflow: hidden;
            border: 2px dashed #4aa3df;
        }
        .tg-avatar-edit img { width: 100%; height: 100%; object-fit: cover; }
        .tg-cam-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
            color: #fff; opacity: 0; transition: 0.2s;
        }
        .tg-avatar-edit:hover .tg-cam-overlay { opacity: 1; }
        .tg-edit-input, .tg-edit-textarea {
            width: 100%; background: #232e3c; border: 1px solid #17212b;
            color: #fff; padding: 12px; border-radius: 8px; margin-bottom: 12px;
            font-size: 15px; outline: none;
        }
        .tg-edit-input:focus, .tg-edit-textarea:focus { border-color: #4aa3df; }

        /* Mobile specific adjustments */
        .mobile .tg-header { padding: 0 10px; }
        .mobile .tg-bubble { max-width: 85%; }
        
        .tg-reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .tg-reaction-pill { 
            background: #2b3947; padding: 2px 6px; border-radius: 10px; 
            font-size: 12px; display: inline-flex; align-items: center; gap: 4px;
            border: 1px solid transparent;
        }
        .tg-reaction-pill.active {
            background: rgba(74, 163, 223, 0.2); border-color: #4aa3df;
        }
      `}</style>
    </div>
  );
}