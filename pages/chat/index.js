import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { 
  FaSearch, FaPen, FaUserFriends, FaBullhorn, FaTimes, 
  FaUserAstronaut, FaArrowLeft, FaCamera, FaTrash, FaBan, FaPlus 
} from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import ChatWindow from '../../components/ChatWindow' 

// Catbox ga rasm yuklash
const uploadToCatbox = (file) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', '2f5d304c9d3a6788a634c9250'); 
    formData.append('fileToUpload', file);
    xhr.onload = () => {
      if (xhr.status === 200) resolve(xhr.responseText);
      else reject('Upload failed');
    };
    xhr.open('POST', '/api/catbox', true);
    xhr.send(formData);
  });
};

export default function ChatList() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Data States
  const [chats, setChats] = useState([]); 
  const [suggestedUsers, setSuggestedUsers] = useState([]); // Tavsiya etilganlar
  const [searchResults, setSearchResults] = useState([]); 
  const [selectedChatId, setSelectedChatId] = useState(null); 
  const [loading, setLoading] = useState(false);

  // UI States
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('group');
  const [createName, setCreateName] = useState('');
  const [createBio, setCreateBio] = useState('');
  const [createAvatar, setCreateAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [creating, setCreating] = useState(false);

  // Context Menu & Long Press
  const [contextMenu, setContextMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const longPressTimer = useRef(null); // Bosib turish uchun timer

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('click', () => setContextMenu(null));

    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const currentUser = JSON.parse(storedUser);
    setUser(currentUser);
    fetchMyChats(currentUser.id);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', () => setContextMenu(null));
    };
  }, []);

  const fetchMyChats = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('room_participants')
      .select(`room:rooms (id, name, type, created_at, image_url, description)`)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (data && data.length > 0) {
      const formatted = data.map(item => ({
        ...item.room,
        last_message: "Suhbat...", // Real loyihada DB dan olinadi
        time: new Date(item.room.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }));
      setChats(formatted);
    } else {
      // Agar chatlar yo'q bo'lsa, takliflarni yuklaymiz
      setChats([]);
      fetchSuggestions(userId);
    }
    setLoading(false);
  };

  const fetchSuggestions = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('id', userId)
      .limit(5);
    
    if (data) {
      setSuggestedUsers(data.map(u => ({ ...u, type: 'user', name: u.username })));
    }
  };

  // --- LONG PRESS LOGIC (MOBILE) ---
  const handleTouchStart = (e, chat) => {
    if (!isMobileView) return;
    longPressTimer.current = setTimeout(() => {
      // 800ms bosib tursa menyu ochiladi
      setContextMenu({
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
        chat: chat
      });
    }, 800);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // --- QIDIRUV ---
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 1) {
      const { data: users } = await supabase.from('users').select('*').ilike('username', `%${query}%`).limit(5);
      const { data: rooms } = await supabase.from('rooms').select('*').neq('type', 'private').ilike('name', `%${query}%`).limit(5);

      const formattedUsers = users?.map(u => ({ ...u, type: 'user', name: u.username })) || [];
      const formattedRooms = rooms || [];
      
      setSearchResults([...formattedUsers, ...formattedRooms]);
    } else {
      setSearchResults([]);
    }
  };

  const handleChatSelect = async (chat) => {
    if (chat.type === 'user') {
      const { data: room } = await supabase.from('rooms').insert([{ type: 'private', name: chat.username }]).select().single();
      if (room) {
        await supabase.from('room_participants').insert([
          { room_id: room.id, user_id: user.id },
          { room_id: room.id, user_id: chat.id }
        ]);
        setSelectedChatId(room.id);
        fetchMyChats(user.id);
      }
    } else {
      const isMember = chats.some(c => c.id === chat.id);
      if (!isMember) {
        await supabase.from('room_participants').insert([{ room_id: chat.id, user_id: user.id }]);
        fetchMyChats(user.id);
      }
      setSelectedChatId(chat.id);
    }
    setIsSearching(false);
    setSearchQuery('');
  };

  // --- YARATISH ---
  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCreateAvatar(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const createItem = async () => {
    if (!createName.trim()) return;
    setCreating(true);

    let imageUrl = null;
    if (createAvatar) {
      try { imageUrl = await uploadToCatbox(createAvatar); } catch (err) {}
    }

    const { data: room } = await supabase
      .from('rooms')
      .insert([{ 
        name: createName, type: createType, owner_id: user.id,
        description: createBio, image_url: imageUrl
      }])
      .select().single();

    if (room) {
      await supabase.from('room_participants').insert([{ room_id: room.id, user_id: user.id }]);
      setShowCreateModal(false);
      setCreateName(''); setCreateBio(''); setCreateAvatar(null); setPreviewAvatar(null);
      fetchMyChats(user.id);
      setSelectedChatId(room.id);
    }
    setCreating(false);
  };

  // --- CONTEXT MENU ---
  const handleContextMenu = (e, chat) => {
    if (isMobileView) return; 
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, chat: chat });
  };

  const handleDeleteChat = async () => {
    if (!showDeleteConfirm) return;
    await supabase.from('room_participants').delete().eq('room_id', showDeleteConfirm.id).eq('user_id', user.id);
    setShowDeleteConfirm(null);
    setSelectedChatId(null);
    fetchMyChats(user.id);
  };

  if (!user) return null;

  if (isMobileView && selectedChatId) {
    return (
      <div className="mobile-layout">
        <ChatWindow chatId={selectedChatId} currentUser={user} isMobile={true} onBack={() => setSelectedChatId(null)} />
        <style jsx>{`.mobile-layout { height: 100vh; background: #0b1120; }`}</style>
      </div>
    );
  }

  return (
    <div className="layout">
      <Head><title>Chat | MLBB</title></Head>

      <div className="sidebar">
        
        {/* HEADER (Gold Style) */}
        <div className="sidebar-header">
          {!isSearching ? (
            <div className="header-default">
              <h2 className="app-title">MLBB CHAT</h2>
              <button className="search-btn" onClick={() => setIsSearching(true)}><FaSearch /></button>
            </div>
          ) : (
            <div className="header-search">
              <button className="back-btn" onClick={() => { setIsSearching(false); setSearchQuery(''); }}><FaArrowLeft /></button>
              <input 
                autoFocus type="text" placeholder="Qidiruv..." value={searchQuery}
                onChange={handleSearch} className="search-input"
              />
              {searchQuery && <button className="clear-btn" onClick={() => {setSearchQuery(''); setSearchResults([]);}}><FaTimes /></button>}
            </div>
          )}
        </div>

        {/* LIST CONTAINER */}
        <div className="chat-list-container">
          
          {/* SEARCH RESULTS */}
          {isSearching && searchQuery.length > 0 && (
            <div className="list-section">
              <h4 className="section-title">GLOBAL QIDIRUV</h4>
              {searchResults.length === 0 && <p className="no-result">Topilmadi</p>}
              {searchResults.map((item) => (
                <div key={item.id} className="chat-item" onClick={() => handleChatSelect(item)}>
                  <div className="avatar global">
                     {item.image_url ? <img src={item.image_url} /> : (item.name[0])}
                  </div>
                  <div className="info">
                    <h3>{item.name}</h3>
                    <p className="status-text">{item.type === 'user' ? 'Foydalanuvchi' : 'Guruh/Kanal'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MY CHATS & SUGGESTIONS */}
          {!isSearching && (
            <div className="list-section">
              {loading && <div className="spinner"></div>}
              
              {/* Agar Chatlar bo'lsa */}
              {chats.length > 0 && chats.map((chat) => (
                <div 
                  key={chat.id} 
                  className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`} 
                  onClick={() => setSelectedChatId(chat.id)}
                  onContextMenu={(e) => handleContextMenu(e, chat)}
                  onTouchStart={(e) => handleTouchStart(e, chat)}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className={`avatar ${chat.type}`}>
                    {chat.image_url ? (
                      <img src={chat.image_url} alt="ava" className="avatar-img"/>
                    ) : (
                      chat.type === 'channel' ? <FaBullhorn /> : (chat.type === 'group' ? <FaUserFriends /> : <FaUserAstronaut />)
                    )}
                  </div>
                  <div className="info">
                    <div className="top-row">
                      <h3>{chat.name || 'Nomsiz'}</h3>
                      <span className="time">{chat.time}</span>
                    </div>
                    <p className="last-msg">
                       {chat.description ? chat.description.slice(0, 25) + '...' : 'Suhbat...'}
                    </p>
                  </div>
                </div>
              ))}

              {/* Agar Chatlar Bo'sh bo'lsa -> TAKLIFLAR */}
              {chats.length === 0 && !loading && (
                <div className="suggestions-box">
                  <div className="empty-state">
                    <p>Sizda hali suhbatlar yo'q</p>
                  </div>
                  <h4 className="section-title gold-text">MAVJUD FOYDALANUVCHILAR</h4>
                  {suggestedUsers.map((u) => (
                     <div key={u.id} className="chat-item suggestion" onClick={() => handleChatSelect(u)}>
                        <div className="avatar global"><FaUserAstronaut /></div>
                        <div className="info">
                          <h3>{u.username}</h3>
                          <p className="status-text">Yangi suhbat boshlash</p>
                        </div>
                        <FaPlus className="plus-icon" />
                     </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAB */}
        <button className="fab" onClick={() => setShowCreateModal(true)}><FaPen /></button>
        <div className="navbar-wrapper"><Navbar user={user} /></div>
      </div>

      {/* CONTENT AREA */}
      {!isMobileView && (
        <div className="content-area">
          {selectedChatId ? (
            <ChatWindow chatId={selectedChatId} currentUser={user} isMobile={false} />
          ) : (
            <div className="no-chat-selected">
              <div className="placeholder-content">
                <div className="placeholder-icon"><FaUserFriends /></div>
                <h2>Chatni tanlang</h2>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal create-modal">
            <div className="modal-header">
              <h3>YANGI OCHISH</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}><FaTimes /></button>
            </div>
            <div className="avatar-upload-section">
              <label htmlFor="avatar-upload" className="avatar-preview">
                {previewAvatar ? <img src={previewAvatar} /> : <FaCamera />}
              </label>
              <input type="file" id="avatar-upload" hidden onChange={handleAvatarChange} accept="image/*"/>
            </div>
            <div className="type-selector">
              <button className={`type-btn ${createType === 'group' ? 'active' : ''}`} onClick={() => setCreateType('group')}><FaUserFriends /> Guruh</button>
              <button className={`type-btn ${createType === 'channel' ? 'active' : ''}`} onClick={() => setCreateType('channel')}><FaBullhorn /> Kanal</button>
            </div>
            <input type="text" placeholder="Nomini kiriting..." value={createName} onChange={(e) => setCreateName(e.target.value)} className="modal-input"/>
            <textarea placeholder="Bio (Tavsif)..." value={createBio} onChange={(e) => setCreateBio(e.target.value)} className="modal-textarea"/>
            <button onClick={createItem} className="create-btn" disabled={creating}>{creating ? '...' : 'YARATISH'}</button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="menu-item delete" onClick={() => { setShowDeleteConfirm(contextMenu.chat); setContextMenu(null); }}><FaTrash /> O'chirish</div>
          <div className="menu-item block" onClick={() => setContextMenu(null)}><FaBan /> Bloklash</div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <h3>DIQQAT!</h3>
            <p>Rostan ham <b>{showDeleteConfirm.name}</b> ni o'chirmoqchimisiz?</p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteConfirm(null)}>Bekor</button>
              <button className="delete-btn" onClick={handleDeleteChat}>HA, O'CHIRISH</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Roboto:wght@400;500&display=swap');
        body { margin: 0; background: #0b1120; color: #fff; font-family: 'Roboto', sans-serif; overflow: hidden; }
      `}</style>

      <style jsx>{`
        .layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
        .sidebar { 
          width: 100%; height: 100%; background: #0b1120; 
          display: flex; flex-direction: column; border-right: 1px solid #2d3b55; position: relative; 
        }
        @media (min-width: 768px) { .sidebar { width: 350px; min-width: 350px; } }

        /* HEADER (GOLD THEME) */
        .sidebar-header { height: 60px; background: #0f172a; flex-shrink: 0; border-bottom: 1px solid #2d3b55; }
        .header-default { display: flex; align-items: center; justify-content: space-between; padding: 0 15px; height: 100%; }
        .app-title { font-family: 'Rajdhani', sans-serif; color: #cfab56; font-size: 22px; letter-spacing: 1px; margin: 0; }
        .search-btn { background: none; border: none; color: #cfab56; font-size: 20px; cursor: pointer; }

        .header-search { display: flex; align-items: center; height: 100%; padding: 0 10px; background: #0f172a; }
        .back-btn { background: none; border: none; color: #cfab56; font-size: 20px; cursor: pointer; padding: 10px; }
        .search-input { flex: 1; background: transparent; border: none; color: #fff; font-size: 16px; padding: 10px; outline: none; }
        .clear-btn { background: none; border: none; color: #6c7a89; font-size: 16px; cursor: pointer; }

        /* LIST */
        .chat-list-container { flex: 1; overflow-y: auto; padding: 5px; }
        .chat-item { 
          display: flex; align-items: center; padding: 12px; border-radius: 12px; 
          cursor: pointer; transition: 0.2s; position: relative; margin-bottom: 4px;
        }
        .chat-item:hover { background: rgba(255, 255, 255, 0.05); }
        .chat-item.active { background: rgba(207, 171, 86, 0.15); border-left: 3px solid #cfab56; }

        .avatar { 
          width: 50px; height: 50px; border-radius: 50%; background: #1e2a45; 
          display: flex; align-items: center; justify-content: center; margin-right: 15px; 
          font-size: 22px; color: #cfab56; border: 1px solid #2d3b55; flex-shrink: 0; overflow: hidden;
        }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
        
        .info { flex: 1; overflow: hidden; }
        .info h3 { margin: 0; font-size: 16px; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .time { font-size: 11px; color: #6c7a89; }
        .last-msg { margin: 2px 0 0 0; font-size: 13px; color: #8899ac; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chat-item.active .last-msg { color: #cfab56; }

        /* SUGGESTIONS */
        .suggestions-box { padding: 10px; }
        .empty-state { text-align: center; color: #6c7a89; padding: 20px 0; }
        .gold-text { color: #cfab56; font-size: 12px; margin-bottom: 10px; letter-spacing: 1px; }
        .suggestion { border: 1px dashed #2d3b55; }
        .plus-icon { color: #cfab56; font-size: 14px; }

        /* FAB */
        .fab { 
          position: absolute; bottom: 90px; right: 20px; width: 55px; height: 55px; 
          border-radius: 50%; background: linear-gradient(135deg, #cfab56, #a67c2e); border: none; color: #000; 
          font-size: 20px; display: flex; align-items: center; justify-content: center; 
          cursor: pointer; box-shadow: 0 4px 15px rgba(207, 171, 86, 0.4); 
        }

        /* DESKTOP CONTENT */
        .content-area { flex: 1; background: #0b1120; display: flex; flex-direction: column; border-left: 1px solid #2d3b55; }
        .no-chat-selected { height: 100%; display: flex; align-items: center; justify-content: center; color: #8899ac; }
        .placeholder-icon { font-size: 80px; color: #1e2a45; margin-bottom: 20px; }
        .placeholder-content h2 { margin: 0; color: #cfab56; }

        /* CONTEXT MENU */
        .context-menu { 
          position: fixed; background: #1e2a45; border: 1px solid #cfab56; border-radius: 8px; 
          box-shadow: 0 5px 20px rgba(0,0,0,0.5); z-index: 3000; overflow: hidden; min-width: 160px;
        }
        .menu-item { padding: 12px 15px; display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: #fff; }
        .menu-item:hover { background: rgba(207, 171, 86, 0.1); }
        .menu-item.delete { color: #ff595a; }

        /* MODALS (GOLD THEME) */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(5px); }
        .modal { background: #121a2b; padding: 25px; border-radius: 16px; width: 90%; max-width: 380px; border: 1px solid #cfab56; box-shadow: 0 0 30px rgba(207, 171, 86, 0.15); }
        .modal-header h3 { margin: 0; color: #cfab56; font-family: 'Rajdhani', sans-serif; }
        .close-btn { background: none; border: none; color: #6c7a89; font-size: 20px; cursor: pointer; }
        
        .avatar-preview { 
          width: 80px; height: 80px; border-radius: 50%; background: #1e2a45; border: 2px dashed #cfab56;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; 
          font-size: 30px; color: #cfab56; cursor: pointer; overflow: hidden;
        }
        .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }

        .type-selector { display: flex; gap: 10px; margin-bottom: 15px; }
        .type-btn { flex: 1; padding: 10px; background: #0b1120; border: 1px solid #2d3b55; color: #8899ac; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .type-btn.active { background: rgba(207, 171, 86, 0.1); border-color: #cfab56; color: #cfab56; }

        .modal-input, .modal-textarea { 
          width: 100%; padding: 12px; background: #0b1120; border: 1px solid #2d3b55; 
          border-radius: 8px; color: #fff; outline: none; margin-bottom: 15px; box-sizing: border-box;
        }
        .modal-input:focus, .modal-textarea:focus { border-color: #cfab56; }

        .create-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #cfab56, #a67c2e); border: none; color: #000; font-weight: bold; border-radius: 8px; cursor: pointer; }

        .confirm-modal { text-align: center; }
        .confirm-actions { display: flex; gap: 10px; margin-top: 20px; }
        .confirm-actions button { flex: 1; padding: 10px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
        .cancel-btn { background: #1e2a45; color: #fff; }
        .delete-btn { background: #ff595a; color: #fff; }

        .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #cfab56; border-radius: 50%; animation: spin 0.8s infinite linear; margin: 20px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}