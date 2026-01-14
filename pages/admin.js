import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { 
  FaHome, FaUsers, FaGamepad, FaComments, FaPlus, 
  FaSearch, FaTrash, FaPen, FaSignOutAlt, FaTimes, 
  FaVideo, FaImage, FaPlay 
} from 'react-icons/fa';
import { supabase } from './../lib/supabaseClient'; // Yo'lni o'zingizga moslang
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [loading, setLoading] = useState(false);
  
  // MODAL STATES
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // DATA STATES
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [stats, setStats] = useState({ users: 0, rooms: 0, heroes: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  // FORM & FILES
  const [heroForm, setHeroForm] = useState({
    name: '', role: 'Tank', specialty: '', description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  // --- AUTH CHECK ---
  useEffect(() => {
    const checkAdmin = async () => {
      const storedUser = localStorage.getItem('mlbb_user');
      if (!storedUser) { router.push('/'); return; }
      
      const parsedUser = JSON.parse(storedUser);
      const { data: dbUser } = await supabase
        .from('users').select('role').eq('id', parsedUser.id).single();

      if (!dbUser || dbUser.role !== 'admin') {
        router.push('/'); return;
      }
      setCurrentUser(parsedUser);
      loadStats();
    };
    checkAdmin();
  }, []);

  // --- DATA LOADING ---
  const loadStats = async () => {
    const { count: u } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: r } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
    const { count: h } = await supabase.from('heroes').select('*', { count: 'exact', head: true });
    setStats({ users: u || 0, rooms: r || 0, heroes: h || 0 });
  };

  const loadData = async () => {
    setLoading(true);
    let query;
    if (activeTab === 'users') query = supabase.from('users').select('*').order('created_at', { ascending: false });
    else if (activeTab === 'rooms') query = supabase.from('rooms').select('*').order('created_at', { ascending: false });
    else if (activeTab === 'heroes') query = supabase.from('heroes').select('*').order('created_at', { ascending: false });
    
    if (query) {
      const { data } = await query;
      if (activeTab === 'users') setUsers(data);
      if (activeTab === 'rooms') setRooms(data);
      if (activeTab === 'heroes') setHeroes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    setSearchTerm('');
    if (activeTab !== 'dashboard') loadData();
    else loadStats();
  }, [activeTab]);

  // --- FILE UPLOAD LOGIC ---
  const handleFileUpload = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Yuklashda xato");
      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error(error);
      toast.error(`${file.name} yuklanmadi!`);
      return null;
    }
  };

  // --- SAVE HERO (ADD / EDIT) ---
  const handleSaveHero = async (e) => {
    e.preventDefault();
    if (!heroForm.name) return toast.warning("Hero nomi yozilishi shart!");
    if (!isEditing && !imageFile) return toast.warning("Rasm tanlanishi shart!");

    setUploading(true);

    // 1. Fayllarni yuklash
    let uploadedImgUrl = null;
    let uploadedVideoUrl = null;

    if (imageFile) uploadedImgUrl = await handleFileUpload(imageFile);
    if (videoFile) uploadedVideoUrl = await handleFileUpload(videoFile);

    // 2. Ma'lumot tayyorlash
    const newData = { ...heroForm };
    if (uploadedImgUrl) newData.image_url = uploadedImgUrl;
    if (uploadedVideoUrl) newData.video_url = uploadedVideoUrl;

    let error;
    if (isEditing) {
      // UPDATE
      const { error: err } = await supabase.from('heroes').update(newData).eq('id', editId);
      error = err;
    } else {
      // INSERT
      if (!uploadedImgUrl) { setUploading(false); return; } // Yangi qo'shishda rasm majburiy
      const { error: err } = await supabase.from('heroes').insert([newData]);
      error = err;
    }

    setUploading(false);

    if (error) {
      toast.error("Xatolik: " + error.message);
    } else {
      toast.success(isEditing ? "Hero yangilandi!" : "Yangi Hero qo'shildi!");
      resetModal();
      loadData();
      loadStats();
    }
  };

  // --- EDIT / DELETE ACTIONS ---
  const openEditModal = (hero) => {
    setHeroForm({
      name: hero.name,
      role: hero.role,
      specialty: hero.specialty || '',
      description: hero.description || ''
    });
    setEditId(hero.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const resetModal = () => {
    setModalOpen(false);
    setIsEditing(false);
    setEditId(null);
    setHeroForm({ name: '', role: 'Tank', specialty: '', description: '' });
    setImageFile(null);
    setVideoFile(null);
  };

  const handleDelete = async (table, id) => {
    if (!confirm("O'chirib tashlansinmi?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      toast.success("Muvaffaqiyatli o'chirildi");
      loadData();
      loadStats();
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    if (userId === currentUser.id) return toast.warning("O'zingizni o'zgartira olmaysiz!");
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
    loadData();
    toast.success("Role o'zgardi");
  };

  // --- FILTER ---
  const filteredData = () => {
    const term = searchTerm.toLowerCase();
    const list = activeTab === 'users' ? users : activeTab === 'rooms' ? rooms : heroes;
    return list.filter(item => (item.name || item.username || '').toLowerCase().includes(term));
  };

  return (
    <div className="admin-layout">
      <Head><title>MLBB Admin Panel</title></Head>
      <ToastContainer theme="dark" />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <h1>MLBB<span>ADMIN</span></h1>
        </div>
        <nav className="nav-menu">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            <FaHome /> <span>Dashboard</span>
          </button>
          <button className={activeTab === 'heroes' ? 'active' : ''} onClick={() => setActiveTab('heroes')}>
            <FaGamepad /> <span>Heroes</span>
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            <FaUsers /> <span>Foydalanuvchilar</span>
          </button>
          <button className={activeTab === 'rooms' ? 'active' : ''} onClick={() => setActiveTab('rooms')}>
            <FaComments /> <span>Active Xonalar</span>
          </button>
        </nav>
        <div className="logout-area">
          <button onClick={() => router.push('/')}><FaSignOutAlt /> Chiqish</button>
        </div>
      </aside>

      <main className="main-content">
        {/* TOP BAR */}
        <header className="top-bar">
          <h2 className="page-title">{activeTab.toUpperCase()}</h2>
          {activeTab !== 'dashboard' && (
            <div className="search-wrap">
              <FaSearch />
              <input type="text" placeholder="Qidirish..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          )}
          {activeTab === 'heroes' && (
            <button className="add-btn" onClick={() => { resetModal(); setModalOpen(true); }}>
              <FaPlus /> Hero Qo'shish
            </button>
          )}
        </header>

        <div className="content-scroll">
          {/* DASHBOARD STATS */}
          {activeTab === 'dashboard' && (
            <div className="stats-grid">
              <div className="stat-card gold">
                <div className="icon"><FaGamepad /></div>
                <div><h3>{stats.heroes}</h3><p>Jami Herolar</p></div>
              </div>
              <div className="stat-card blue">
                <div className="icon"><FaUsers /></div>
                <div><h3>{stats.users}</h3><p>Foydalanuvchilar</p></div>
              </div>
              <div className="stat-card purple">
                <div className="icon"><FaComments /></div>
                <div><h3>{stats.rooms}</h3><p>Xonalar</p></div>
              </div>
            </div>
          )}

          {/* LOADING */}
          {loading && <div className="loader"><div className="spinner"></div></div>}

          {/* HERO CARDS (PREMIUM DESIGN) */}
          {!loading && activeTab === 'heroes' && (
            <div className="hero-grid">
              {filteredData().map(hero => (
                <div key={hero.id} className="hero-card">
                  <div className="card-media">
                    <img src={hero.image_url} alt={hero.name} />
                    <div className="role-badge">{hero.role}</div>
                    {hero.video_url && <div className="video-badge"><FaPlay /></div>}
                    <div className="card-overlay"></div>
                  </div>
                  <div className="card-content">
                    <h3>{hero.name}</h3>
                    <p>{hero.specialty || 'Unknown'}</p>
                    <div className="card-actions">
                      <button className="btn-edit" onClick={() => openEditModal(hero)}><FaPen /></button>
                      <button className="btn-delete" onClick={() => handleDelete('heroes', hero.id)}><FaTrash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* USERS LIST */}
          {!loading && activeTab === 'users' && (
            <div className="users-grid">
              {filteredData().map(user => (
                <div key={user.id} className={`user-card ${user.role}`}>
                  <div className="user-avatar">
                    <img src={user.avatar_url || 'https://via.placeholder.com/150'} onError={(e)=>e.target.src='https://via.placeholder.com/150'} />
                  </div>
                  <div className="user-info">
                    <h4>{user.username} {user.role === 'admin' && '🛡️'}</h4>
                    <span>ID: {user.id.slice(0, 8)}</span>
                  </div>
                  <div className="user-actions">
                    <button className="role-btn" onClick={() => handleToggleRole(user.id, user.role)}>
                      {user.role === 'admin' ? 'User' : 'Admin'}
                    </button>
                    <button className="del-btn" onClick={() => handleDelete('users', user.id)}><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ROOMS LIST */}
          {!loading && activeTab === 'rooms' && (
            <div className="rooms-list">
               {filteredData().map(room => (
                 <div key={room.id} className="room-item">
                    <div className="room-icon"><FaComments /></div>
                    <div className="room-info">
                      <h4>{room.name || 'Nomsiz Xona'}</h4>
                      <p>{new Date(room.created_at).toLocaleDateString()}</p>
                    </div>
                    <button className="del-btn-icon" onClick={() => handleDelete('rooms', room.id)}><FaTrash /></button>
                 </div>
               ))}
            </div>
          )}
        </div>
      </main>

      {/* MOBILE NAV */}
      <div className="mobile-nav">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}><FaHome /></button>
          <button className={activeTab === 'heroes' ? 'active' : ''} onClick={() => setActiveTab('heroes')}><FaGamepad /></button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}><FaUsers /></button>
          <button className={activeTab === 'rooms' ? 'active' : ''} onClick={() => setActiveTab('rooms')}><FaComments /></button>
      </div>

      {/* MODAL FORM */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditing ? 'Heroni Tahrirlash' : 'Yangi Hero'}</h3>
              <button onClick={resetModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSaveHero}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nomi</label>
                  <input type="text" value={heroForm.name} onChange={e=>setHeroForm({...heroForm, name: e.target.value})} placeholder="Gusion" />
                </div>
                <div className="form-group">
                  <label>Roli</label>
                  <select value={heroForm.role} onChange={e=>setHeroForm({...heroForm, role: e.target.value})}>
                    <option>Tank</option><option>Fighter</option><option>Assassin</option>
                    <option>Mage</option><option>Marksman</option><option>Support</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Xususiyati</label>
                <input type="text" value={heroForm.specialty} onChange={e=>setHeroForm({...heroForm, specialty: e.target.value})} placeholder="Burst / Magic" />
              </div>

              {/* FILE UPLOADS */}
              <div className="file-section">
                <div className="file-input">
                  <label><FaImage /> Rasm {isEditing ? '(O\'zgartirish)' : '(Majburiy)'}</label>
                  <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])} />
                  {imageFile && <span className="file-name">{imageFile.name}</span>}
                </div>
                <div className="file-input">
                  <label><FaVideo /> Video (Intro)</label>
                  <input type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files[0])} />
                  {videoFile && <span className="file-name">{videoFile.name}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Tavsif</label>
                <textarea rows="3" value={heroForm.description} onChange={e=>setHeroForm({...heroForm, description: e.target.value})}></textarea>
              </div>

              <button type="submit" className="submit-btn" disabled={uploading}>
                {uploading ? 'Yuklanmoqda...' : 'Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx global>{`
        body { margin: 0; background: #090e17; font-family: 'Roboto', sans-serif; color: #fff; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b1120; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <style jsx>{`
        .admin-layout { display: flex; height: 100vh; overflow: hidden; }
        
        /* SIDEBAR & NAV */
        .sidebar { width: 260px; background: #0b1120; border-right: 1px solid #1e2a45; display: flex; flex-direction: column; }
        .logo-area { height: 80px; display: flex; align-items: center; justify-content: center; }
        .logo-area h1 { font-family: 'Rajdhani', sans-serif; font-size: 28px; letter-spacing: 2px; margin: 0; 
          background: linear-gradient(to right, #cfab56, #f0d488); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-menu { flex: 1; padding: 20px 0; }
        .nav-menu button { width: 100%; padding: 16px 30px; background: none; border: none; color: #8899ac; 
          text-align: left; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.3s; }
        .nav-menu button:hover, .nav-menu button.active { background: rgba(207,171,86,0.08); color: #cfab56; border-right: 3px solid #cfab56; }
        .logout-area button { width: 100%; padding: 20px; color: #ff4d4f; background: none; border: none; cursor: pointer; display: flex; justify-content: center; gap: 10px; border-top: 1px solid #1e2a45; }

        /* MAIN CONTENT */
        .main-content { flex: 1; display: flex; flex-direction: column; background: #090e17; position: relative; }
        .top-bar { height: 80px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; 
          background: rgba(9,14,23,0.8); backdrop-filter: blur(10px); border-bottom: 1px solid #1e2a45; z-index: 10; }
        .page-title { font-family: 'Rajdhani', sans-serif; font-size: 24px; color: #e0e0e0; margin: 0; letter-spacing: 1px; }
        
        .search-wrap { position: relative; width: 350px; }
        .search-wrap svg { position: absolute; left: 15px; top: 13px; color: #666; }
        .search-wrap input { width: 100%; padding: 12px 12px 12px 40px; background: #151d2e; border: 1px solid #232e3c; color: #fff; border-radius: 8px; outline: none; }
        .search-wrap input:focus { border-color: #cfab56; }

        .add-btn { background: linear-gradient(135deg, #cfab56, #b08d3e); color: #000; padding: 10px 24px; border-radius: 6px; 
          border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
        .add-btn:hover { transform: translateY(-2px); box-shadow: 0 0 15px rgba(207,171,86,0.4); }

        .content-scroll { flex: 1; overflow-y: auto; padding: 40px; }

        /* DASHBOARD STATS */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; }
        .stat-card { background: #151d2e; padding: 30px; border-radius: 16px; display: flex; align-items: center; gap: 20px; border: 1px solid rgba(255,255,255,0.03); transition: 0.3s; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .stat-card .icon { width: 60px; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .gold .icon { background: rgba(207,171,86,0.15); color: #cfab56; }
        .blue .icon { background: rgba(74,163,223,0.15); color: #4aa3df; }
        .purple .icon { background: rgba(168,85,247,0.15); color: #a855f7; }
        .stat-card h3 { font-size: 36px; margin: 0; font-family: 'Rajdhani', sans-serif; }
        .stat-card p { margin: 5px 0 0; color: #8899ac; }

        /* --- HERO CARD DESIGN (PREMIUM) --- */
        .hero-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 25px; }
        .hero-card {
          background: #151d2e; border-radius: 12px; overflow: hidden; position: relative;
          border: 1px solid #1e2a45; transition: all 0.3s ease;
          display: flex; flex-direction: column;
        }
        .hero-card:hover {
          transform: translateY(-8px);
          border-color: #cfab56;
          box-shadow: 0 10px 25px rgba(207,171,86,0.15);
        }
        .card-media {
          height: 280px; position: relative; overflow: hidden;
        }
        .card-media img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .hero-card:hover .card-media img { transform: scale(1.1); }
        
        .role-badge {
          position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          padding: 4px 8px; border-radius: 4px; color: #cfab56; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid rgba(207,171,86,0.3);
        }
        .video-badge {
          position: absolute; top: 10px; left: 10px; width: 24px; height: 24px; background: rgba(255,0,0,0.7);
          border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px;
        }
        .card-overlay {
          position: absolute; bottom: 0; left: 0; width: 100%; height: 50%;
          background: linear-gradient(to top, #151d2e 0%, transparent 100%);
        }
        .card-content {
          padding: 15px; background: #151d2e; position: relative; z-index: 2;
          border-top: 1px solid rgba(255,255,255,0.05); flex: 1; display: flex; flex-direction: column;
        }
        .card-content h3 { margin: 0; font-size: 18px; color: #fff; font-family: 'Rajdhani', sans-serif; letter-spacing: 0.5px; }
        .card-content p { font-size: 12px; color: #8899ac; margin: 4px 0 15px; }
        
        .card-actions { margin-top: auto; display: flex; gap: 8px; }
        .btn-edit, .btn-delete { flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer; transition: 0.2s; color: #fff; }
        .btn-edit { background: #1e2a45; color: #4aa3df; }
        .btn-edit:hover { background: #4aa3df; color: #fff; }
        .btn-delete { background: rgba(255,77,79,0.1); color: #ff4d4f; }
        .btn-delete:hover { background: #ff4d4f; color: #fff; }

        /* USER & ROOM LIST STYLES */
        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .user-card { background: #151d2e; padding: 15px; border-radius: 10px; display: flex; align-items: center; gap: 15px; border: 1px solid #1e2a45; }
        .user-card.admin { border-color: #cfab56; background: rgba(207,171,86,0.02); }
        .user-avatar { width: 45px; height: 45px; border-radius: 50%; overflow: hidden; background: #000; flex-shrink: 0; }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .user-info h4 { margin: 0; color: #fff; font-size: 14px; }
        .user-info span { font-size: 11px; color: #666; font-family: monospace; }
        .user-actions { margin-left: auto; display: flex; gap: 8px; }
        .role-btn { padding: 5px 10px; background: #1e2a45; color: #cfab56; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; }
        .del-btn { padding: 5px; background: none; color: #ff4d4f; border: none; cursor: pointer; }

        .rooms-list { display: flex; flex-direction: column; gap: 10px; }
        .room-item { background: #151d2e; padding: 15px 20px; border-radius: 8px; display: flex; align-items: center; gap: 15px; border: 1px solid #1e2a45; }
        .room-icon { width: 40px; height: 40px; border-radius: 50%; background: #232e3c; color: #4aa3df; display: flex; align-items: center; justify-content: center; }
        .room-info h4 { margin: 0; font-size: 16px; }
        .room-info p { margin: 2px 0 0; font-size: 12px; color: #666; }
        .del-btn-icon { margin-left: auto; background: none; border: none; color: #ff4d4f; cursor: pointer; font-size: 16px; opacity: 0.5; transition: 0.2s; }
        .del-btn-icon:hover { opacity: 1; }

        /* MODAL */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .modal-content { background: #151d2e; width: 500px; max-width: 90%; padding: 30px; border-radius: 16px; border: 1px solid #cfab56; box-shadow: 0 0 40px rgba(207,171,86,0.1); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .modal-header h3 { margin: 0; color: #cfab56; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; letter-spacing: 1px; }
        .modal-header button { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 12px; color: #8899ac; margin-bottom: 6px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; background: #0b1120; border: 1px solid #232e3c; color: #fff; padding: 10px; border-radius: 6px; outline: none; }
        .form-group input:focus { border-color: #cfab56; }
        
        .file-section { background: #0b1120; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px dashed #232e3c; }
        .file-input { margin-bottom: 10px; }
        .file-input:last-child { margin-bottom: 0; }
        .file-input label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #cfab56; margin-bottom: 5px; }
        .file-input input { padding: 5px; border: none; background: #151d2e; font-size: 12px; }
        .file-name { display: block; font-size: 10px; color: #aaa; margin-top: 2px; }

        .submit-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #cfab56, #b08d3e); color: #000; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; transition: 0.3s; }
        .submit-btn:hover { filter: brightness(1.1); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .loader { display: flex; justify-content: center; padding: 50px; }
        .spinner { width: 40px; height: 40px; border: 3px solid #1e2a45; border-top-color: #cfab56; border-radius: 50%; animation: spin 1s infinite linear; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .mobile-nav { display: none; }

        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; }
          .sidebar { display: none; }
          .mobile-nav { position: fixed; bottom: 0; left: 0; width: 100%; height: 60px; background: #151d2e; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-around; align-items: center; z-index: 100; }
          .mobile-nav button { background: none; border: none; font-size: 20px; color: #666; width: 100%; height: 100%; }
          .mobile-nav button.active { color: #cfab56; }
          .main-content { margin-bottom: 60px; }
          .top-bar { padding: 0 20px; height: 60px; }
          .page-title { font-size: 18px; }
          .search-wrap { display: none; }
          .add-btn span { display: none; }
          .hero-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; }
        }
        @media (max-width: 400px) {
          .hero-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}