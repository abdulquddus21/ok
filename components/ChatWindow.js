import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaPaperPlane, FaPaperclip, FaArrowLeft, FaUsers } from 'react-icons/fa';
import styles from '../styles/Chat.module.css';

export default function ChatWindow({ chatId, currentUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Chat ma'lumotlarini va xabarlarni yuklash
  useEffect(() => {
    if (chatId) {
      fetchChatDetails();
      fetchMessages();
      subscribeToRealtime();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [chatId]);

  // 2. Chatga kirganda avtomatik pastga tushish
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchChatDetails = async () => {
    // Chat info
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', chatId)
      .single();
    
    // Agar bu Lichka (private) bo'lsa, narigi odam ismini topish kerak
    if (room && room.type === 'private') {
       const { data: partner } = await supabase
        .from('room_participants')
        .select('users(username)')
        .eq('room_id', chatId)
        .neq('user_id', currentUser.id)
        .single();
       if (partner?.users) room.name = partner.users.username;
    }

    // Obunachilar soni
    const { count } = await supabase
      .from('room_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', chatId);

    setChatInfo(room);
    setSubscribersCount(count || 0);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  const subscribeToRealtime = () => {
    supabase
      .channel(`room:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${chatId}` }, 
      (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const { error } = await supabase
      .from('messages')
      .insert([{
        room_id: chatId,
        sender_id: currentUser.id,
        content: newMessage.trim()
      }]);

    if (!error) setNewMessage('');
    setSending(false);
  };

  const joinChannel = async () => {
    await supabase.from('room_participants').insert([{ room_id: chatId, user_id: currentUser.id }]);
    setSubscribersCount(prev => prev + 1);
    alert("Siz kanalga obuna bo'ldingiz!");
  };

  // RENDER QISMI
  if (!chatId) return <div className={styles.placeholder}><div className={styles.bubble}>Chatni tanlang</div></div>;
  
  if (loading && !chatInfo) return <div className={styles.loadingOverlay}><div className={styles.spinner}></div></div>;

  // KANAL LOGIKASI: Faqat Owner yoza oladi
  const isChannel = chatInfo?.type === 'channel';
  const isOwner = chatInfo?.owner_id === currentUser.id;
  const canWrite = !isChannel || isOwner;

  return (
    <div className={styles.chatWindowContainer}>
      {/* HEADER */}
      <div className={styles.chatHeader}>
        {isMobile && (
          <button onClick={onBack} className={styles.backBtn}><FaArrowLeft /></button>
        )}
        <div className={styles.headerAvatar}>
          {chatInfo?.name?.[0]?.toUpperCase() || 'C'}
        </div>
        <div className={styles.headerInfo}>
          <h3>{chatInfo?.name}</h3>
          <p>
            {isChannel 
              ? `${subscribersCount} obunachi` 
              : (chatInfo?.type === 'group' ? `${subscribersCount} a'zo` : 'online')}
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      <div className={styles.messagesArea}>
        {loading ? (
          <div className={styles.loaderCenter}><div className={styles.spinner}></div></div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyChat}>Hozircha xabarlar yo'q</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`${styles.messageWrapper} ${msg.sender_id === currentUser.id ? styles.myMsg : styles.otherMsg}`}>
              <div className={styles.messageBubble}>
                {msg.file_url && (
                   msg.file_type === 'image' 
                   ? <img src={msg.file_url} className={styles.mediaImg} /> 
                   : <video src={msg.file_url} controls className={styles.mediaVideo} />
                )}
                <p>{msg.content}</p>
                <span className={styles.msgTime}>
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT OR JOIN BUTTON */}
      {canWrite ? (
        <form onSubmit={sendMessage} className={styles.inputBar}>
          <button type="button" className={styles.attachBtn}><FaPaperclip /></button>
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Xabar yozing..." 
            disabled={sending}
          />
          <button type="submit" className={styles.sendBtn} disabled={sending}>
            {sending ? '...' : <FaPaperPlane />}
          </button>
        </form>
      ) : (
        <div className={styles.joinBar}>
           <p>Bu kanalga faqat adminlar yoza oladi.</p>
           {/* Agar hali a'zo bo'lmasa Join tugmasi chiqishi mumkin (logika kerak bo'lsa) */}
        </div>
      )}
    </div>
  );
}