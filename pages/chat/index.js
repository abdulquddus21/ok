import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { FaSearch, FaPen, FaUserFriends, FaBullhorn, FaTimes, FaCamera } from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import ChatWindow from '../../components/ChatWindow' // Yangi komponent importi
import styles from '../../styles/Chat.module.css'

export default function ChatList() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]); 
  const [searchResults, setSearchResults] = useState([]); 
  const [selectedChatId, setSelectedChatId] = useState(null); // PC uchun tanlangan chat
  const [isMobileView, setIsMobileView] = useState(false); // Mobile rejimdami?

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('group');
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mobile yoki Desktop ekanini aniqlash
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const currentUser = JSON.parse(storedUser);
    setUser(currentUser);
    fetchMyChats(currentUser.id);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMyChats = async (userId) => {
    setLoading(true);
    const { data } = await supabase
      .from('room_participants')
      .select(`room:rooms (id, name, type, created_at)`)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false }); // Eng oxirgi qo'shilganlar

    if (data) {
      const formatted = data.map(item => item.room);
      setChats(formatted);
    }
    setLoading(false);
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 2) {
      // Yangi SQL funksiyani chaqiramiz (rpc)
      const { data, error } = await supabase
        .rpc('search_global', { search_query: query });

      if (data) setSearchResults(data);
    } else {
      setSearchResults([]);
    }
  };

  const handleChatSelect = async (chat) => {
    if (chat.type === 'user') {
      // User bilan chat boshlash (Private yaratish yoki borini topish)
      const { data: room } = await supabase
        .from('rooms')
        .insert([{ type: 'private' }]) // Soddalashtirilgan: Har doim yangi yaratishga urinadi (haqiqiy loyihada tekshirish kerak)
        .select()
        .single();
        
      if (room) {
        await supabase.from('room_participants').insert([
          { room_id: room.id, user_id: user.id },
          { room_id: room.id, user_id: chat.id }
        ]);
        setSelectedChatId(room.id);
      }
    } else {
      // Kanal yoki Guruhni tanlash
      // Agar qidiruvdan kelgan bo'lsa va hali a'zo bo'lmasa, avtomatik a'zo qilish (Join)
      const isMember = chats.some(c => c.id === chat.id);
      if (!isMember) {
        await supabase.from('room_participants').insert([{ room_id: chat.id, user_id: user.id }]);
        fetchMyChats(user.id); // Ro'yxatni yangilash
      }
      setSelectedChatId(chat.id);
    }
    
    // Qidiruvni tozalash
    setSearchQuery('');
    setSearchResults([]);
  };

  const createItem = async () => {
    if (!newItemName.trim()) return;
    const { data: room } = await supabase
      .from('rooms')
      .insert([{ name: newItemName, type: modalType, owner_id: user.id }])
      .select().single();

    if (room) {
      await supabase.from('room_participants').insert([{ room_id: room.id, user_id: user.id }]);
      setShowModal(false);
      setNewItemName('');
      fetchMyChats(user.id);
      setSelectedChatId(room.id);
    }
  };

  if (!user) return null;

  // AGAR MOBILE BO'LSA VA CHAT TANLANGAN BO'LSA -> FAQAT CHAT OYNASINI KO'RSATISH
  if (isMobileView && selectedChatId) {
    return (
      <div className={styles.telegramLayout}>
        <ChatWindow 
          chatId={selectedChatId} 
          currentUser={user} 
          isMobile={true} 
          onBack={() => setSelectedChatId(null)} 
        />
      </div>
    );
  }

  return (
    <div className={styles.telegramLayout}>
      <Head><title>Telegram Clone</title></Head>

      {/* LEFT SIDEBAR (Desktop: 30%, Mobile: 100%) */}
      <div className={styles.sidebar} style={{ display: (isMobileView && selectedChatId) ? 'none' : 'flex' }}>
        <div className={styles.header}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Qidiruv..." 
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className={styles.chatList}>
          {/* SEARCH RESULTS */}
          {searchQuery.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Global Qidiruv</h4>
              {searchResults.map((item) => (
                <div key={item.id} className={styles.chatItem} onClick={() => handleChatSelect(item)}>
                  <div className={styles.avatar}>
                    {item.type === 'user' ? (item.username?.[0] || 'U') : (item.type === 'channel' ? <FaBullhorn /> : <FaUserFriends />)}
                  </div>
                  <div className={styles.info}>
                    <h3>{item.name || item.username}</h3>
                    <p>{item.type === 'user' ? 'Foydalanuvchi' : `${item.count || 0} a'zo`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MY CHATS */}
          {searchQuery.length === 0 && (
            <div className={styles.section}>
              {loading && <div className={styles.loaderCenter}><div className={styles.spinner}></div></div>}
              {chats.map((chat) => (
                <div 
                  key={chat.id} 
                  className={`${styles.chatItem} ${selectedChatId === chat.id ? styles.activeChat : ''}`} 
                  onClick={() => setSelectedChatId(chat.id)}
                >
                  <div className={styles.avatar}>
                    {chat.type === 'channel' ? <FaBullhorn /> : (chat.type === 'group' ? <FaUserFriends /> : 'U')}
                  </div>
                  <div className={styles.info}>
                    <h3>{chat.name || 'Chat'}</h3>
                    <p>{chat.type === 'channel' ? 'Kanal' : 'Xabar...'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className={styles.fab} onClick={() => setShowModal(true)}><FaPen /></button>
        <div className={styles.mobileNavWrapper}><Navbar user={user} /></div>
      </div>

      {/* RIGHT SIDE (Content Area) - Faqat Desktop da ko'rinadi */}
      {!isMobileView && (
        <div className={styles.contentArea}>
          <ChatWindow 
            chatId={selectedChatId} 
            currentUser={user} 
            isMobile={false} 
          />
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.closeBtn} onClick={() => setShowModal(false)}><FaTimes /></button>
            <h2>Yangi yaratish</h2>
            <div className={styles.typeSelector}>
              <button className={modalType === 'group' ? styles.activeType : ''} onClick={() => setModalType('group')}><FaUserFriends /> Guruh</button>
              <button className={modalType === 'channel' ? styles.activeType : ''} onClick={() => setModalType('channel')}><FaBullhorn /> Kanal</button>
            </div>
            <input type="text" placeholder="Nomi..." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={styles.modalInput} />
            <button onClick={createItem} className={styles.createBtn}>Yaratish</button>
          </div>
        </div>
      )}
    </div>
  )
}