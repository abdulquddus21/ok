import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import { 
  FaSignOutAlt, FaCalendarAlt, FaPen, FaCamera, FaTimes, 
  FaBullhorn, FaComments, FaFingerprint, FaUserAstronaut 
} from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- CATBOX UPLOAD FUNCTION ---
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
    xhr.onerror = () => reject('Network error');
    xhr.open('POST', '/api/catbox', true);
    xhr.send(formData);
  });
};

export default function Profile() {
  const router = useRouter();
  const { username } = router.query;
  
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState({ channels: 0, chats: 0 });
  const [loading, setLoading] = useState(true);
  
  // Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    if (username) {
      fetchProfile(username);
    }
  }, [username]);

  const fetchProfile = async (targetUsername) => {
    setLoading(true);
    
    // 1. User ma'lumotlari
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', targetUsername)
      .single();
    
    if (user) {
      setProfileData(user);
      setEditName(user.username);
      setPreviewUrl(user.avatar_url);

      // 2. Statistika: Yaratgan kanallari soni
      const { count: channelsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('type', 'channel');

      // 3. Statistika: Qo'shilgan chatlari soni
      const { count: chatsCount } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        channels: channelsCount || 0,
        chats: chatsCount || 0
      });
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return toast.warning("Ism bo'sh bo'lmasin!");
    setSaving(true);

    try {
      let avatarUrl = profileData.avatar_url;

      // Agar yangi rasm yuklangan bo'lsa
      if (editFile) {
        avatarUrl = await uploadToCatbox(editFile);
      }

      // Bazani yangilash
      const { data, error } = await supabase
        .from('users')
        .update({ username: editName, avatar_url: avatarUrl })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // LocalStorage va State ni yangilash
      localStorage.setItem('mlbb_user', JSON.stringify(data));
      setCurrentUser(data);
      setProfileData(data);
      setShowEditModal(false);
      toast.success("Profil yangilandi!");
      
      // Agar username o'zgargan bo'lsa URLni to'g'irlash
      if (username !== editName) {
        router.push(`/profile/${editName}`);
      }

    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi!");
    }
    setSaving(false);
  };

  const logout = () => {
    if (confirm("Haqiqatan ham chiqmoqchimisiz?")) {
      localStorage.removeItem('mlbb_user');
      router.push('/');
    }
  };

  if (loading) return (
    <div className="container center-screen">
      <div className="spinner"></div>
    </div>
  );

  const isMyProfile = currentUser?.id === profileData?.id;

  return (
    <div className="container">
      <Head>
        <title>Profil: {profileData?.username}</title>
      </Head>
      <ToastContainer theme="dark" />

      <div className="bg-glow"></div>

      <main className="main">
        
        {/* PROFILE CARD */}
        <div className="card profile-card">
          
          {/* TOP SECTION */}
          <div className="profile-header">
            <div className="avatar-wrapper">
              <div className="avatar-frame">
                {profileData?.avatar_url ? (
                  <img src={profileData.avatar_url} alt="ava" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">{profileData?.username?.[0]?.toUpperCase()}</div>
                )}
                
                {/* Agar o'z profili bo'lsa edit knopkasi */}
                {isMyProfile && (
                  <button className="edit-avatar-btn" onClick={() => setShowEditModal(true)}>
                    <FaCamera />
                  </button>
                )}
              </div>
            </div>
            
            <div className="header-info">
              <h1 className="profile-name">
                {profileData?.username} 
                {isMyProfile && <FaPen className="edit-name-icon" onClick={() => setShowEditModal(true)} />}
              </h1>
              <div className="id-badge">
                <FaFingerprint /> ID: {profileData?.id?.slice(0, 8)}
              </div>
            </div>
          </div>

          {/* REAL STATS GRID */}
          <div className="stats-grid">
            <div className="stat-item">
              <div className="icon-circle gold"><FaBullhorn /></div>
              <span className="stat-value">{stats.channels}</span>
              <span className="stat-label">Kanallar</span>
            </div>
            <div className="stat-item">
              <div className="icon-circle blue"><FaComments /></div>
              <span className="stat-value">{stats.chats}</span>
              <span className="stat-label">Suhbatlar</span>
            </div>
            <div className="stat-item">
              <div className="icon-circle green"><FaCalendarAlt /></div>
              <span className="stat-value date-val">
                {new Date(profileData?.created_at).toLocaleDateString()}
              </span>
              <span className="stat-label">Qo'shilgan</span>
            </div>
          </div>

          {/* LOGOUT */}
          {isMyProfile && (
            <div className="action-area">
              <button onClick={logout} className="btn-logout">
                <FaSignOutAlt /> Tizimdan Chiqish
              </button>
            </div>
          )}

        </div>
      </main>

      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Profilni Tahrirlash</h3>
              <button onClick={() => setShowEditModal(false)}><FaTimes /></button>
            </div>
            
            <div className="modal-body">
              <label htmlFor="file-upload" className="image-preview">
                {previewUrl ? <img src={previewUrl} /> : <FaUserAstronaut />}
                <div className="overlay"><FaCamera /> Rasm Tanlash</div>
              </label>
              <input id="file-upload" type="file" hidden onChange={handleFileChange} accept="image/*" />
              
              <div className="input-group">
                <label>Foydalanuvchi nomi</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  maxLength={15}
                />
              </div>

              <button onClick={handleSaveProfile} className="save-btn" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'SAQLASH'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar user={currentUser} />

      {/* --- STYLES --- */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Roboto:wght@400;500&display=swap');
        body { margin: 0; background: #0b1120; color: #fff; font-family: 'Roboto', sans-serif; }
      `}</style>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: radial-gradient(circle at top, #1b263b 0%, #0b1120 100%);
          position: relative;
          overflow-x: hidden;
        }

        .center-screen { display: flex; align-items: center; justify-content: center; height: 100vh; }
        
        .bg-glow {
          position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
          width: 100%; height: 400px;
          background: radial-gradient(circle, rgba(207, 171, 86, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .main {
          padding: 20px;
          padding-bottom: 100px;
          display: flex; justify-content: center;
          position: relative; z-index: 1;
        }

        /* CARD */
        .card {
          width: 100%; max-width: 500px;
          background: rgba(23, 33, 48, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 2px solid #cfab56;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          overflow: hidden;
          animation: slideUp 0.5s ease;
        }

        /* HEADER */
        .profile-header {
          padding: 30px 20px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          background: linear-gradient(to bottom, rgba(207, 171, 86, 0.08), transparent);
        }

        .avatar-frame {
          width: 110px; height: 110px;
          border-radius: 50%;
          border: 3px solid #cfab56;
          padding: 3px;
          position: relative;
          box-shadow: 0 0 20px rgba(207, 171, 86, 0.3);
        }

        .avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .avatar-placeholder { 
          width: 100%; height: 100%; border-radius: 50%; background: #2d3b55; 
          display: flex; align-items: center; justify-content: center; font-size: 40px; color: #cfab56; font-weight: bold;
        }

        .edit-avatar-btn {
          position: absolute; bottom: 0; right: 0;
          background: #cfab56; color: #000;
          border: none; border-radius: 50%;
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }

        .profile-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px; color: #fff; margin: 15px 0 5px 0;
          display: flex; align-items: center; gap: 10px; justify-content: center;
        }

        .edit-name-icon { font-size: 16px; color: #6c7a89; cursor: pointer; transition: 0.2s; }
        .edit-name-icon:hover { color: #cfab56; }

        .id-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 12px;
          font-size: 13px; color: #a0aab5; letter-spacing: 1px;
        }

        /* STATS */
        .stats-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;
          padding: 20px;
        }

        .stat-item {
          background: rgba(11, 17, 32, 0.6);
          border-radius: 12px; padding: 15px 5px;
          display: flex; flex-direction: column; align-items: center;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .icon-circle {
          width: 35px; height: 35px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px; font-size: 16px;
        }
        .gold { background: rgba(207, 171, 86, 0.2); color: #cfab56; }
        .blue { background: rgba(74, 163, 223, 0.2); color: #4aa3df; }
        .green { background: rgba(0, 255, 170, 0.2); color: #00ffaa; }

        .stat-value { font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: bold; color: #fff; }
        .date-val { font-size: 16px; }
        .stat-label { font-size: 11px; color: #8899ac; text-transform: uppercase; margin-top: 2px; }

        /* BUTTONS */
        .action-area { padding: 0 20px 25px 20px; }
        .btn-logout {
          width: 100%; padding: 14px;
          background: rgba(255, 77, 79, 0.15); border: 1px solid rgba(255, 77, 79, 0.4);
          color: #ff4d4f; border-radius: 10px; font-weight: bold;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; transition: 0.3s;
        }
        .btn-logout:hover { background: rgba(255, 77, 79, 0.25); }

        /* MODAL */
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8); z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(5px);
        }

        .modal {
          background: #17212b; width: 90%; max-width: 400px;
          border-radius: 16px; padding: 25px;
          border: 1px solid #cfab56;
          box-shadow: 0 0 30px rgba(207, 171, 86, 0.2);
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header h3 { margin: 0; color: #cfab56; font-family: 'Rajdhani', sans-serif; }
        .modal-header button { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }

        .image-preview {
          width: 100px; height: 100px; margin: 0 auto 20px;
          border-radius: 50%; background: #232e3c; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          position: relative; cursor: pointer; border: 2px dashed #cfab56;
        }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); color: #fff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          opacity: 0; transition: 0.3s; font-size: 12px; gap: 5px;
        }
        .image-preview:hover .overlay { opacity: 1; }

        .input-group label { display: block; color: #8899ac; margin-bottom: 5px; font-size: 14px; }
        .input-group input {
          width: 100%; padding: 12px; background: #0b1120; border: 1px solid #2d3b55;
          border-radius: 8px; color: #fff; outline: none; margin-bottom: 20px; font-size: 16px;
          box-sizing: border-box;
        }
        .input-group input:focus { border-color: #cfab56; }

        .save-btn {
          width: 100%; padding: 12px; background: #cfab56; border: none;
          color: #000; font-weight: bold; border-radius: 8px; cursor: pointer;
        }

        .spinner {
          width: 40px; height: 40px; border: 4px solid rgba(207, 171, 86, 0.3);
          border-top-color: #cfab56; border-radius: 50%;
          animation: spin 1s infinite linear;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}