import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FaPaperPlane, FaPaperclip, FaArrowLeft, FaEllipsisV, 
  FaCheck, FaCheckDouble, FaUserAstronaut, FaTimes, FaPlay, 
  FaTrash, FaPen, FaReply, FaCopy, FaSmile, FaMicrophone, FaStop 
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- SOUNDS ---
const SEND_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//OEAAAAAAAAAAAAAAAAAAAAAAAAMGluZv////8AAAAAAAEgAAAAP8Y9JgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA//OGZAAAAAAAGQAAAAAAACAAAP/zhmQAAAAAABkAAAAAAAAgAAD/84ZkAAAAAAAZAAAAAAAAIAAA';

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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💩"];

export default function ChatWindow({ chatId, currentUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  
  // Media & Voice
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [showPreview, setShowPreview] = useState(false); 
  const [uploadQueue, setUploadQueue] = useState({}); 
  const [mediaZoom, setMediaZoom] = useState(null); 
  
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Interaction
  const [contextMenu, setContextMenu] = useState(null); 
  const [replyTo, setReplyTo] = useState(null); 
  const [editingMsg, setEditingMsg] = useState(null); 
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const longPressTimer = useRef(null);
  const inputRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    fetchChatDetails();
    fetchMessages();

    // Realtime channel
    const channel = supabase.channel(`room:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${chatId}` }, 
      (payload) => handleRealtimeEvent(payload))
      .subscribe();

    // Presence channel
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
    if (!editingMsg) scrollToBottom();
    if (messages.length > 0) markMessagesAsRead();
  }, [messages, uploadQueue]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // --- API CALLS ---
  const fetchChatDetails = async () => {
    const { data: room } = await supabase.from('rooms').select('*').eq('id', chatId).single();
    if (room) {
      if (room.type === 'private') {
        const { data: partner } = await supabase.from('room_participants')
          .select('users(username, id, avatar_url)').eq('room_id', chatId).neq('user_id', currentUser.id).single();
        if (partner?.users) {
          room.name = partner.users.username;
          room.partnerId = partner.users.id;
          room.image_url = partner.users.avatar_url; // Private chat rasm
        }
      }
      setChatInfo(room);
    }
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
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg, sender: m.sender || prev.find(pm => pm.id === newMsg.id)?.sender } : m));
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

  // --- VOICE RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newRecorder = new MediaRecorder(stream);
      setRecorder(newRecorder);
      setAudioChunks([]);

      newRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks((prev) => [...prev, e.data]);
      };

      newRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Mikrofonga ruxsat berilmadi!");
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], "voice_message.mp3", { type: 'audio/mp3' });
        await sendFileMessage(audioFile, 'voice');
        setIsRecording(false);
        setAudioChunks([]);
      };
    }
  };

  // --- SENDING LOGIC ---
  const handleSend = async () => {
    if (isSending) return;
    if (selectedFiles.length === 0 && !newMessage.trim()) return;

    if (editingMsg) {
      const { error } = await supabase.from('messages').update({ content: newMessage }).eq('id', editingMsg.id);
      if (error) toast.error("Xatolik!");
      else { setEditingMsg(null); setNewMessage(''); }
      return;
    }

    setIsSending(true);
    const textToSend = newMessage;
    setNewMessage('');
    setShowPreview(false);
    
    const currentReply = replyTo ? { ...replyTo } : null;
    setReplyTo(null);

    // 1. Text Message
    if (selectedFiles.length === 0) {
      await sendSingleMessage(textToSend, null, null, currentReply);
    } 
    // 2. Media Messages
    else {
      // Rasmlarni yuborish
      const filesToSend = [...selectedFiles];
      setSelectedFiles([]);
      
      // Har bir fayl uchun alohida so'rov
      for (let i = 0; i < filesToSend.length; i++) {
        const file = filesToSend[i];
        const isLast = i === filesToSend.length - 1;
        const caption = isLast ? textToSend : ''; // Izoh faqat oxirgisiga
        
        const fileType = file.type.startsWith('video') ? 'video' : 'image';
        await sendFileMessage(file, fileType, caption, isLast ? currentReply : null);
      }
    }

    setIsSending(false);
    playSound();
  };

  const sendFileMessage = async (file, type, caption = '', replyObj = null) => {
    const tempId = Date.now() + Math.random();
    
    // Optimistic UI
    const optimistic = {
      id: tempId, tempId, content: caption, sender_id: currentUser.id,
      created_at: new Date().toISOString(), sender: { username: currentUser.username },
      file_url: URL.createObjectURL(file), file_type: type,
      is_read: false, status: 'uploading', reply_to_id: replyObj?.id, reactions: {}
    };
    setMessages(prev => [...prev, optimistic]);
    setUploadQueue(prev => ({ ...prev, [tempId]: 0 }));

    try {
      const url = await uploadToCatbox(file, (percent) => setUploadQueue(prev => ({ ...prev, [tempId]: percent })));
      const { data, error } = await supabase.from('messages').insert([{
        room_id: chatId,
        sender_id: currentUser.id,
        content: caption,
        file_url: url,
        file_type: type,
        is_read: false,
        reply_to_id: replyObj?.id,
        reactions: {}
      }]).select().single();

      if (data) {
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data, sender: { username: currentUser.username } } : m));
      } else throw error;

    } catch (error) {
      toast.error("Yuklashda xatolik!");
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
    } finally {
      setUploadQueue(prev => { const n = { ...prev }; delete n[tempId]; return n; });
    }
  };

  const sendSingleMessage = async (content, fileUrl, fileType, replyObj) => {
    const { error } = await supabase.from('messages').insert([{
      room_id: chatId, sender_id: currentUser.id, content: content,
      file_url: fileUrl, file_type: fileType, is_read: false,
      reply_to_id: replyObj?.id, reactions: {}
    }]);
    if (error) toast.error("Xabar ketmadi!");
  };

  // --- REACTION & DELETE ---
  const handleReaction = async (emoji) => {
    const msg = contextMenu?.msg;
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    // User oldin boshqa reaksiyani bosgan bo'lsa o'chirish
    let newReactions = { ...currentReactions };
    
    // Hamma joydan userni o'chiramiz (faqat bitta reaksiya mumkin)
    Object.keys(newReactions).forEach(key => {
      newReactions[key] = newReactions[key].filter(id => id !== currentUser.id);
      if(newReactions[key].length === 0) delete newReactions[key];
    });

    // Yangi reaksiyani qo'shamiz (agar oldin bosmagan bo'lsa)
    const wasReacted = currentReactions[emoji]?.includes(currentUser.id);
    if (!wasReacted) {
      if (!newReactions[emoji]) newReactions[emoji] = [];
      newReactions[emoji].push(currentUser.id);
    }

    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m));
    setContextMenu(null);
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id);
  };

  const deleteMessage = async () => {
    if (!contextMenu?.msg) return;
    await supabase.from('messages').delete().eq('id', contextMenu.msg.id);
    setMessages(prev => prev.filter(m => m.id !== contextMenu.msg.id));
    setContextMenu(null);
  };

  const startEdit = () => {
    setEditingMsg(contextMenu.msg);
    setNewMessage(contextMenu.msg.content || '');
    setContextMenu(null);
  };

  const startReply = () => {
    setReplyTo(contextMenu.msg);
    setContextMenu(null);
  };

  // --- HELPER FOR GROUPING ---
  const getMessageGroups = () => {
    const groups = [];
    let currentGroup = [];

    messages.forEach((msg, index) => {
      const prevMsg = messages[index - 1];
      
      // Group logic: Same sender, same minute, both consist of media (image/video)
      const isMedia = msg.file_type === 'image' || msg.file_type === 'video';
      const isPrevMedia = prevMsg?.file_type === 'image' || prevMsg?.file_type === 'video';
      const sameSender = prevMsg && prevMsg.sender_id === msg.sender_id;
      const timeDiff = prevMsg ? (new Date(msg.created_at) - new Date(prevMsg.created_at)) / 1000 : 999;

      if (isMedia && isPrevMedia && sameSender && timeDiff < 60 && currentGroup.length > 0) {
        currentGroup.push(msg);
      } else {
        if (currentGroup.length > 0) groups.push({ type: 'group', msgs: currentGroup });
        if (isMedia) {
           currentGroup = [msg];
        } else {
           groups.push({ type: 'single', msg });
           currentGroup = [];
        }
      }
    });
    if (currentGroup.length > 0) groups.push({ type: 'group', msgs: currentGroup });
    return groups;
  };

  // --- RENDER HELPERS ---
  const isPartnerOnline = chatInfo?.type === 'private' && onlineUsers.has(chatInfo.partnerId);
  const groupedMessages = getMessageGroups();

  return (
    <div className={`chat-window telegram-bg ${isMobile ? 'mobile-window' : ''}`} onClick={() => setContextMenu(null)}>
      <ToastContainer position="top-center" theme="dark" autoClose={2000} />
      <audio ref={audioRef} src={SEND_SOUND} />

      {/* HEADER */}
      <div className="header glass-header">
        <div className="header-left">
          {isMobile && <button onClick={onBack} className="back-btn"><FaArrowLeft /></button>}
          <div className="avatar">
            {chatInfo?.image_url ? <img src={chatInfo.image_url} alt="ava" /> : (chatInfo?.name?.[0] || <FaUserAstronaut />)}
          </div>
          <div className="info">
            <h3>{chatInfo?.name || '...'}</h3>
            <p className={isPartnerOnline ? 'status-online' : ''}>
              {loading ? '...' : (
                 chatInfo?.type === 'private' 
                 ? (isPartnerOnline ? 'online' : 'yaqinda kirgan') 
                 : (chatInfo?.type === 'channel' ? 'Kanal' : 'Guruh')
              )}
            </p>
          </div>
        </div>
        <button className="menu-btn"><FaEllipsisV /></button>
      </div>

      {/* MESSAGES */}
      <div className="messages-area">
        {loading && <div className="spinner-center"><span className="loader"></span></div>}
        
        {groupedMessages.map((group, gIdx) => {
          if (group.type === 'single') {
            return <MessageBubble key={group.msg.id || group.msg.tempId} msg={group.msg} currentUser={currentUser} onContext={setContextMenu} uploadQueue={uploadQueue} setMediaZoom={setMediaZoom} />;
          } else {
            // MEDIA GRID
            const isMyGroup = group.msgs[0].sender_id === currentUser.id;
            return (
              <div key={gIdx} className={`media-group-row ${isMyGroup ? 'my-row' : 'other-row'}`}>
                 <div className="media-grid-bubble">
                    <div className={`media-grid count-${Math.min(group.msgs.length, 4)}`}>
                      {group.msgs.map(m => (
                        <div key={m.id || m.tempId} className="media-grid-item" onClick={() => setMediaZoom({url: m.file_url, type: m.file_type})}>
                           {m.file_type === 'video' ? <video src={m.file_url} className="grid-video" /> : <img src={m.file_url} className="grid-img" />}
                           {m.status === 'uploading' && <div className="upload-overlay"><span className="percent-text">{uploadQueue[m.tempId]}%</span></div>}
                        </div>
                      ))}
                    </div>
                    {/* Caption for the last item in group if exists */}
                    {group.msgs[group.msgs.length-1].content && (
                       <p className="grid-caption">{group.msgs[group.msgs.length-1].content}</p>
                    )}
                    <div className="grid-meta">
                       <span className="time">{new Date(group.msgs[0].created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                 </div>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER */}
      <div className="footer-modern">
        {isRecording && (
           <div className="recording-bar">
              <span className="rec-dot"></span>
              <span>Yozilmoqda...</span>
              <button className="stop-rec-btn" onClick={stopRecording}><FaStop /></button>
           </div>
        )}

        {(replyTo || editingMsg) && !isRecording && (
          <div className="reply-bar-floating">
            <div className="reply-icon-box">{editingMsg ? <FaPen /> : <FaReply />}</div>
            <div className="reply-info-box">
              <span className="reply-title">{editingMsg ? 'Tahrirlash' : `Javob: ${replyTo?.sender?.username}`}</span>
              <p className="reply-subtitle">{editingMsg ? editingMsg.content : (replyTo.content || 'Media fayl')}</p>
            </div>
            <button className="close-reply-btn" onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }}><FaTimes /></button>
          </div>
        )}

        {!isRecording && (
          <div className="input-area-modern">
            <button className="attach-btn" onClick={() => fileInputRef.current.click()}><FaPaperclip /></button>
            <input 
              type="file" multiple accept="image/*,video/*"
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
            />
            
            {newMessage || selectedFiles.length > 0 ? (
              <button className="send-btn-modern" onClick={handleSend} disabled={isSending}>
                {isSending ? <span className="loader-mini"></span> : <FaPaperPlane />}
              </button>
            ) : (
              <button className="voice-btn" onClick={startRecording}><FaMicrophone /></button>
            )}
          </div>
        )}
      </div>

      {/* MODALS & MENUS */}
      {contextMenu && (
        <ContextMenu 
           contextMenu={contextMenu} currentUser={currentUser} 
           onReaction={handleReaction} onDelete={deleteMessage} 
           onReply={startReply} onEdit={startEdit} onClose={() => setContextMenu(null)} 
        />
      )}

      {showPreview && (
        <div className="modal-overlay">
          <div className="preview-container-new">
            <div className="preview-top-bar">
              <span>{selectedFiles.length} ta fayl</span>
              <button onClick={() => {setShowPreview(false); setSelectedFiles([]);}}><FaTimes /></button>
            </div>
            <div className="preview-content-scroll">
               <div className="preview-grid-new">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="preview-card">
                    <button className="remove-preview-btn" onClick={() => {
                      const n = [...selectedFiles]; n.splice(i,1); setSelectedFiles(n); if(n.length===0) setShowPreview(false);
                    }}><FaTimes /></button>
                    {f.type.startsWith('video') ? <video src={URL.createObjectURL(f)} /> : <img src={URL.createObjectURL(f)} />}
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

      {mediaZoom && (
        <div className="lightbox" onClick={() => setMediaZoom(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            {mediaZoom.type === 'video' ? <video src={mediaZoom.url} controls autoPlay /> : <img src={mediaZoom.url} />}
          </div>
          <button className="close-lightbox" onClick={() => setMediaZoom(null)}><FaTimes /></button>
        </div>
      )}

      <style jsx>{`
        /* --- STYLES --- */
        :global(body) { overscroll-behavior: none; background: #0e1621; -webkit-tap-highlight-color: transparent;}
        .chat-window { display: flex; flex-direction: column; height: 100vh; background: #0e1621; background-image: url("https://web.telegram.org/img/bg_0.png"); background-size: cover; }
        .mobile-window { height: 100dvh; width: 100vw; position: fixed; top: 0; left: 0; }
        
        /* HEADER */
        .glass-header { flex: 0 0 60px; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; background: #17212b; border-bottom: 1px solid #000; z-index: 10; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: #cfab56; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .info h3 { margin: 0; color: #fff; font-size: 16px; }
        .info p { margin: 0; font-size: 12px; color: #8899ac; }
        .status-online { color: #4aa3df; }
        .menu-btn, .back-btn { background: none; border: none; color: #8899ac; font-size: 20px; cursor: pointer; }

        /* MESSAGES */
        .messages-area { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .message-row, .media-group-row { display: flex; width: 100%; }
        .my-row { justify-content: flex-end; }
        .other-row { justify-content: flex-start; }

        /* BUBBLES */
        .bubble { max-width: 80%; padding: 6px 10px; border-radius: 12px; position: relative; font-size: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.3); background: #182533; color: #fff; }
        .my-row .bubble { background: #2b5278; border-bottom-right-radius: 0; }
        .other-row .bubble { border-bottom-left-radius: 0; }

        /* MEDIA GRID (New Feature) */
        .media-grid-bubble { max-width: 320px; background: transparent; padding: 2px; }
        .media-grid { display: grid; gap: 2px; border-radius: 12px; overflow: hidden; }
        .count-1 { grid-template-columns: 1fr; }
        .count-2 { grid-template-columns: 1fr 1fr; }
        .count-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
        .count-3 .media-grid-item:first-child { grid-row: span 2; }
        .count-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
        
        .media-grid-item { position: relative; cursor: pointer; height: 150px; }
        .grid-img, .grid-video { width: 100%; height: 100%; object-fit: cover; }
        .grid-caption { background: rgba(0,0,0,0.5); color: #fff; padding: 5px; border-radius: 0 0 8px 8px; margin: 0; font-size: 13px; }
        .grid-meta { text-align: right; color: #ccc; font-size: 10px; padding-right: 5px; text-shadow: 0 1px 2px #000; }

        /* VOICE MSG */
        .voice-msg { display: flex; align-items: center; gap: 10px; padding: 5px 0; min-width: 200px; }
        .voice-icon { font-size: 24px; color: #cfab56; }
        .voice-player { flex: 1; height: 30px; }

        /* FOOTER & RECORDER */
        .footer-modern { background: #17212b; padding: 8px 10px; border-top: 1px solid #000; }
        .recording-bar { display: flex; align-items: center; gap: 15px; color: #ff595a; padding: 10px; font-weight: bold; animation: pulse 1s infinite; }
        .rec-dot { width: 12px; height: 12px; background: #ff595a; border-radius: 50%; }
        .stop-rec-btn { margin-left: auto; background: none; border: 1px solid #ff595a; color: #ff595a; border-radius: 50%; padding: 5px; }

        .input-area-modern { display: flex; align-items: flex-end; gap: 8px; background: #0e1621; padding: 6px; border-radius: 20px; }
        .attach-btn, .voice-btn { background: none; border: none; color: #8899ac; font-size: 20px; padding: 10px; cursor: pointer; }
        .voice-btn:hover { color: #cfab56; }
        .modern-input { flex: 1; background: transparent; border: none; color: #fff; padding: 10px 5px; font-size: 16px; outline: none; resize: none; max-height: 100px; }
        .send-btn-modern { width: 45px; height: 45px; background: #4aa3df; border-radius: 50%; border: none; color: #fff; display: flex; align-items: center; justify-content: center; margin-left: 5px; }

        /* PREVIEW GRID */
        .preview-container-new { width: 90%; max-width: 500px; background: #17212b; border-radius: 12px; overflow: hidden; max-height: 80vh; display: flex; flex-direction: column; }
        .preview-content-scroll { padding: 10px; overflow-y: auto; flex: 1; }
        .preview-grid-new { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
        .preview-card { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; }
        .preview-card img, .preview-card video { width: 100%; height: 100%; object-fit: cover; }
        .preview-footer { padding: 10px; background: #232e3c; display: flex; gap: 10px; }
        .preview-footer input { flex: 1; background: #0e1621; border: none; color: #fff; padding: 10px; border-radius: 8px; }

        /* MISC */
        .sender-name { color: #cfab56; font-size: 12px; font-weight: bold; display: block; }
        .reactions-row { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
        .reaction-pill { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 2px 6px; font-size: 11px; cursor: pointer; }
        .my-reaction { background: rgba(74, 163, 223, 0.4); border: 1px solid #4aa3df; }
        
        .upload-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; }
        .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 20000; display: flex; align-items: center; justify-content: center; }
        .lightbox video, .lightbox img { max-width: 100%; max-height: 90%; }
        .close-lightbox { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #fff; font-size: 30px; cursor: pointer; }

        .loader { width: 30px; height: 30px; border: 3px solid #FFF; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

        /* MOBILE SHEET & CONTEXT MENU styles here (same as previous but refined) */
        .mobile-sheet-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: flex-end; }
        .mobile-sheet { width: 100%; background: #17212b; border-radius: 16px 16px 0 0; padding: 15px 0; }
        .context-menu { position: fixed; background: #232e3c; border-radius: 8px; z-index: 9999; min-width: 180px; padding: 5px; box-shadow: 0 5px 15px #000; }
        .menu-item { padding: 10px; color: #fff; display: flex; gap: 10px; cursor: pointer; }
        .menu-item:hover { background: #17212b; }
      `}</style>
    </div>
  );
}

// --- SUB COMPONENTS ---
const MessageBubble = ({ msg, currentUser, onContext, uploadQueue, setMediaZoom }) => {
  const isMyMsg = msg.sender_id === currentUser.id;
  const reactions = msg.reactions || {};
  
  return (
    <div 
      className={`message-row ${isMyMsg ? 'my-row' : 'other-row'}`}
      onContextMenu={(e) => { e.preventDefault(); if(!msg.tempId) onContext({ x: e.pageX, y: e.pageY, msg, type: 'desktop' }); }}
      onTouchStart={(e) => { if(!msg.tempId) onContext({ msg, type: 'mobile' }); }}
    >
      <div className="bubble">
        {!isMyMsg && <span className="sender-name">{msg.sender?.username}</span>}
        
        {/* REPLY */}
        {msg.reply_to_id && <div className="reply-preview">Reply...</div>}

        {/* CONTENT */}
        {msg.file_type === 'voice' ? (
           <div className="voice-msg">
              <FaMicrophone className="voice-icon" />
              <audio controls src={msg.file_url} className="voice-player" />
           </div>
        ) : (
           <>
             {msg.file_url && (
               <div className="media-container" onClick={() => setMediaZoom({url: msg.file_url, type: msg.file_type})}>
                  {msg.file_type === 'video' ? <video src={msg.file_url} /> : <img src={msg.file_url} />}
                  {msg.status === 'uploading' && <div className="upload-overlay">{uploadQueue[msg.tempId]}%</div>}
               </div>
             )}
             {msg.content && <p style={{margin: '4px 0', whiteSpace: 'pre-wrap'}}>{msg.content}</p>}
           </>
        )}

        {/* REACTIONS */}
        {Object.keys(reactions).length > 0 && (
           <div className="reactions-row">
             {Object.entries(reactions).map(([emoji, uids]) => (
                <span key={emoji} className={`reaction-pill ${uids.includes(currentUser.id) ? 'my-reaction' : ''}`}>
                   {emoji} {uids.length}
                </span>
             ))}
           </div>
        )}

        {/* META */}
        <div style={{display:'flex', justifyContent:'flex-end', fontSize:'10px', color:'#8faec5', gap:'4px'}}>
           {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
           {isMyMsg && (msg.is_read ? <FaCheckDouble style={{color:'#4aa3df'}}/> : <FaCheck/>)}
        </div>
      </div>
    </div>
  )
}

const ContextMenu = ({ contextMenu, currentUser, onReaction, onDelete, onReply, onEdit, onClose }) => {
   const isMobile = contextMenu.type === 'mobile';
   const style = isMobile ? {} : { top: Math.min(contextMenu.y, window.innerHeight-250), left: Math.min(contextMenu.x, window.innerWidth-200) };
   const Wrapper = isMobile ? 'div' : 'div';
   const wrapperClass = isMobile ? 'mobile-sheet-overlay' : '';

   const Content = (
      <div className={isMobile ? 'mobile-sheet' : 'context-menu'} style={style} onClick={e => e.stopPropagation()}>
         <div style={{display:'flex', justifyContent:'center', gap:'10px', padding:'10px'}}>
            {REACTION_EMOJIS.map(e => <span key={e} style={{fontSize:'24px', cursor:'pointer'}} onClick={() => onReaction(e)}>{e}</span>)}
         </div>
         <div className="menu-item" onClick={onReply}><FaReply/> Javob berish</div>
         <div className="menu-item" onClick={() => {navigator.clipboard.writeText(contextMenu.msg.content); onClose();}}><FaCopy/> Nusxalash</div>
         {contextMenu.msg.sender_id === currentUser.id && (
            <>
               <div className="menu-item" onClick={onEdit}><FaPen/> Tahrirlash</div>
               <div className="menu-item" style={{color:'#ff595a'}} onClick={onDelete}><FaTrash/> O'chirish</div>
            </>
         )}
      </div>
   );

   if (isMobile) return <div className="mobile-sheet-overlay" onClick={onClose}>{Content}</div>;
   return <>{Content}<div style={{position:'fixed', inset:0, zIndex:9998}} onClick={onClose}/></>;
}