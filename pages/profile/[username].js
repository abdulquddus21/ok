import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr' 
import { 
  FaCog, FaPen, FaCamera, FaTimes, 
  FaUserAstronaut, FaShieldAlt, FaGamepad, FaComments,
  FaKey, FaSignOutAlt, FaChevronRight 
} from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- FETCHER ---
const fetchProfileData = async (targetUsername) => {
  if (!targetUsername) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', targetUsername)
    .single();

  if (error || !user) throw new Error('User not found');

  const [channels, chats] = await Promise.all([
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('type', 'channel'),
    supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  ]);

  return {
    user,
    stats: { channels: channels.count || 0, chats: chats.count || 0 }
  };
};

// --- UPLOAD HELPER ---
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
  
  // Modals States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Edit Profile States
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // Password Change States
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
    } else {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const shouldFetch = router.isReady && username;
  const { data: profileFullData, isLoading } = useSWR(
    shouldFetch ? `profile-${username}` : null, 
    () => fetchProfileData(username),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const profileData = profileFullData?.user;
  const stats = profileFullData?.stats || { channels: 0, chats: 0 };

  useEffect(() => {
    if (profileData && currentUser?.id === profileData.id) {
      setEditName(profileData.username);
      setPreviewUrl(profileData.avatar_url);
    }
  }, [profileData, currentUser, showEditModal]);

  // --- HANDLERS ---
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
      if (editFile) {
        avatarUrl = await uploadToCatbox(editFile);
      }

      const { data, error } = await supabase
        .from('users')
        .update({ username: editName, avatar_url: avatarUrl })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem('mlbb_user', JSON.stringify(data));
      setCurrentUser(data);
      await mutate(`profile-${username}`); 
      setShowEditModal(false);
      toast.success("Profil yangilandi!");
      
      if (username !== editName) router.replace(`/profile/${editName}`);

    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi!");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPass.length < 4) return toast.warning("Parol juda qisqa!");
    if (newPass !== confirmPass) return toast.error("Parollar mos kelmadi!");
    
    setPassLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPass })
        .eq('id', currentUser.id);

      if (error) throw error;
      
      toast.success("Parol o'zgartirildi!");
      setShowPasswordModal(false);
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      toast.error("Xatolik!");
    }
    setPassLoading(false);
  };

  const logout = () => {
    if (confirm("Chiqishni xohlaysizmi?")) {
      localStorage.removeItem('mlbb_user');
      router.push('/');
    }
  };

  const isMyProfile = currentUser && profileData && currentUser.id === profileData.id;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="container">
      <Head>
        <title>{profileData ? `${profileData.username}` : 'Profile'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <ToastContainer theme="dark" position="top-center" autoClose={3000} />
      
      <div className="bg-glow"></div>

      <main className="main">
        {isLoading || !profileData ? (
          <div className="spinner"></div>
        ) : (
          <div className="profile-card">
            
            {/* HEADER ACTIONS */}
            <div className="card-header">
               <span className="status-badge">ONLINE</span>
               {isMyProfile && (
                 <button onClick={() => setShowSettingsModal(true)} className="settings-btn" title="Sozlamalar">
                   <FaCog />
                 </button>
               )}
            </div>

            {/* AVATAR */}
            <div className="avatar-container">
              <div className="avatar-frame">
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} alt="avatar" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">{profileData.username[0]?.toUpperCase()}</div>
                )}
              </div>
              {isMyProfile && (
                <button className="edit-icon-btn" onClick={() => setShowEditModal(true)}>
                  <FaPen />
                </button>
              )}
            </div>

            {/* INFO */}
            <div className="info-section">
              <h1 className="username-gold">{profileData.username}</h1>
              <p className="user-id">ID: {profileData.id.split('-')[0].toUpperCase()} • Global</p>
              
              <div className="joined-date">
                Afsona {new Date(profileData.created_at).toLocaleDateString()} dan beri
              </div>

              {/* STATS */}
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-icon"><FaGamepad /></div>
                  <div className="stat-value">{stats.channels}</div>
                  <div className="stat-label">Kanallar</div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon"><FaComments /></div>
                  <div className="stat-value">{stats.chats}</div>
                  <div className="stat-label">Suhbatlar</div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="actions">
                {isMyProfile && isAdmin && (
                  <button onClick={() => router.push('/admin')} className="btn btn-admin">
                    <FaShieldAlt /> Admin Panel
                  </button>
                )}
                {!isMyProfile && (
                  <button onClick={() => toast.info('Tez kunda!')} className="btn btn-gold">
                    Xabar yozish
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: EDIT PROFILE --- */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal animate-pop">
            <div className="modal-header">
              <h3>Profilni Sozlash</h3>
              <button onClick={() => setShowEditModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body">
              <label className="image-preview-box">
                {previewUrl ? <img src={previewUrl} /> : <FaUserAstronaut size={40} />}
                <div className="overlay"><FaCamera /></div>
                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
              </label>
              <div className="input-group">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={15} />
                <label>Taxallus (Nick)</label>
              </div>
              <button onClick={handleSaveProfile} className="btn btn-gold full-width" disabled={saving}>
                {saving ? <div className="spinner-sm"></div> : 'SAQLASH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: SETTINGS MENU --- */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}>
          <div className="modal animate-pop">
            <div className="modal-header">
              <h3>Sozlamalar</h3>
              <button onClick={() => setShowSettingsModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body p-0">
               <div className="menu-list">
                  <div className="menu-item" onClick={() => { setShowSettingsModal(false); setShowPasswordModal(true); }}>
                     <div className="menu-icon"><FaKey /></div>
                     <span className="menu-text">Parolni o'zgartirish</span>
                     <FaChevronRight className="arrow" />
                  </div>
                  
                  <div className="menu-item danger" onClick={logout}>
                     <div className="menu-icon"><FaSignOutAlt /></div>
                     <span className="menu-text">Hisobdan chiqish</span>
                     <FaChevronRight className="arrow" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CHANGE PASSWORD --- */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPasswordModal(false)}>
          <div className="modal animate-pop">
            <div className="modal-header">
              <h3>Xavfsizlik</h3>
              <button onClick={() => setShowPasswordModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">Iltimos, yangi parolni ikki marta kiriting.</p>
              
              <div className="input-group">
                <input type="password" placeholder=" " value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                <label>Yangi parol</label>
              </div>
              
              <div className="input-group">
                <input type="password" placeholder=" " value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
                <label>Parolni tasdiqlang</label>
              </div>

              <button onClick={handleChangePassword} className="btn btn-gold full-width" disabled={passLoading}>
                {passLoading ? <div className="spinner-sm"></div> : "O'ZGARTIRISH"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentUser && <Navbar user={currentUser} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=Roboto:wght@400;500&display=swap');
        
        body { margin: 0; background-color: #0b1120; color: #fff; font-family: 'Roboto', sans-serif; overflow-x: hidden; -webkit-tap-highlight-color: transparent; }
        * { box-sizing: border-box; }
        
        /* Scrollbar dizayni */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #cfab56; }
      `}</style>

      <style jsx>{`
        .container { 
          min-height: 100vh;
          min-height: 100dvh; /* Mobilda brauzer panelini hisobga olish */
          position: relative; 
          padding-bottom: 80px; 
          display: flex;
          flex-direction: column;
        }

        .bg-glow { 
          position: absolute; top: -150px; left: 50%; transform: translateX(-50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(200, 160, 83, 0.15) 0%, rgba(0,0,0,0) 70%); z-index: 0; pointer-events: none; 
        }

        .main { 
          flex: 1;
          display: flex; justify-content: center; align-items: center;
          padding: 20px; z-index: 1; position: relative; width: 100%;
        }

        /* PROFILE CARD */
        .profile-card {
          width: 100%; max-width: 500px;
          background: rgba(18, 26, 43, 0.75); backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-top: 1px solid rgba(200, 160, 83, 0.4); 
          border-bottom: 1px solid rgba(200, 160, 83, 0.4);
          border-radius: 24px; padding: 30px; text-align: center; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          position: relative; animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: -20px; }
        .status-badge { font-family: 'Rajdhani'; background: rgba(46, 204, 113, 0.2); color: #2ecc71; border: 1px solid #2ecc71; padding: 2px 8px; font-size: 10px; font-weight: bold; border-radius: 4px; letter-spacing: 1px; }

        .settings-btn { background: none; border: none; color: #8fa3b0; font-size: 22px; padding: 5px; cursor: pointer; transition: 0.3s; }
        .settings-btn:active { color: #cfab56; transform: rotate(45deg); }

        .avatar-container { position: relative; width: 120px; height: 120px; margin: 0 auto 20px; }
        .avatar-frame { width: 100%; height: 100%; border-radius: 50%; border: 3px solid #cfab56; padding: 3px; background: rgba(0,0,0,0.5); box-shadow: 0 0 15px rgba(207, 171, 86, 0.4); overflow: hidden; position: relative; z-index: 2; }
        .avatar-img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .avatar-placeholder { background: #1e2a45; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; color: #cfab56; font-family: 'Rajdhani'; }

        .edit-icon-btn { position: absolute; bottom: 0; right: 0; background: #cfab56; color: #000; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; box-shadow: 0 2px 5px rgba(0,0,0,0.5); transition: transform 0.2s; }
        .edit-icon-btn:active { transform: scale(0.9); }

        .username-gold { font-family: 'Rajdhani'; font-size: 30px; color: #cfab56; margin: 0; text-shadow: 0 0 10px rgba(207, 171, 86, 0.3); text-transform: uppercase; word-break: break-all; }
        .user-id { color: #8fa3b0; font-size: 13px; margin: 5px 0; }
        .joined-date { color: #58697a; font-size: 11px; margin-bottom: 25px; }

        .stats-grid { display: flex; gap: 12px; margin-bottom: 30px; }
        .stat-box { flex: 1; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px; transition: 0.3s; }
        .stat-box:active { background: rgba(207, 171, 86, 0.1); }
        .stat-icon { color: #cfab56; font-size: 18px; margin-bottom: 5px; }
        .stat-value { font-family: 'Rajdhani'; font-size: 22px; font-weight: bold; }
        .stat-label { font-size: 10px; color: #8fa3b0; text-transform: uppercase; }

        .actions { display: flex; flex-direction: column; gap: 12px; }
        .btn { width: 100%; padding: 14px; border: none; border-radius: 10px; font-family: 'Rajdhani'; font-weight: 700; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; min-height: 48px; /* Touch area fix */ }
        .btn-gold { background: linear-gradient(135deg, #cfab56 0%, #a67c2e 100%); color: #000; box-shadow: 0 4px 15px rgba(207, 171, 86, 0.3); }
        .btn-gold:active { transform: scale(0.98); }
        .btn-admin { background: rgba(220, 38, 38, 0.15); border: 1px solid #dc2626; color: #ef4444; }

        /* MODALS */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .modal { background: #121a2b; border: 1px solid #cfab56; width: 90%; max-width: 360px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
        
        .animate-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

        .modal-header { background: rgba(0,0,0,0.3); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .modal-header h3 { margin: 0; font-family: 'Rajdhani'; color: #cfab56; font-size: 18px; }
        .close-btn { background: none; border: none; color: #8fa3b0; font-size: 24px; padding: 0 5px; cursor: pointer; }

        .modal-body { padding: 25px 20px; display: flex; flex-direction: column; gap: 20px; }
        .modal-body.p-0 { padding: 0; }
        .modal-desc { color: #8fa3b0; font-size: 14px; text-align: center; margin: 0; line-height: 1.4; }

        .menu-list { display: flex; flex-direction: column; }
        .menu-item { padding: 16px 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .menu-item:active { background: rgba(255,255,255,0.08); }
        .menu-icon { color: #cfab56; font-size: 20px; width: 24px; text-align: center; }
        .menu-text { flex: 1; font-size: 15px; color: #ddd; }
        .arrow { font-size: 12px; color: #555; }
        .menu-item.danger .menu-icon, .menu-item.danger .menu-text { color: #ff4d4f; }

        .image-preview-box { width: 100px; height: 100px; margin: 0 auto; border-radius: 50%; overflow: hidden; position: relative; border: 2px dashed #444; cursor: pointer; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); }
        .image-preview-box img { width: 100%; height: 100%; object-fit: cover; }
        .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); color: white; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; font-size: 20px; }
        .image-preview-box:hover .overlay { opacity: 1; }

        .input-group { position: relative; text-align: left; }
        .input-group input { width: 100%; padding: 14px 12px; background: rgba(0,0,0,0.3); border: 1px solid #2d3b55; border-radius: 8px; color: #fff; outline: none; font-size: 16px; /* iOS zoom fix */ }
        .input-group input:focus { border-color: #cfab56; box-shadow: 0 0 0 2px rgba(207, 171, 86, 0.1); }
        .input-group label { position: absolute; top: -9px; left: 10px; background: #121a2b; padding: 0 5px; font-size: 12px; color: #cfab56; }

        .spinner, .spinner-sm { border: 2px solid rgba(0,0,0,0.3); border-top-color: #cfab56; border-radius: 50%; animation: spin 1s linear infinite; }
        .spinner { width: 40px; height: 40px; border-width: 3px; }
        .spinner-sm { width: 20px; height: 20px; border-top-color: #000; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* --- MOBILE MAXSUS RESPONSIVE TWEAKS --- */
        @media (max-width: 480px) {
          .profile-card {
            padding: 25px 20px;
            width: 100%;
          }

          .main{
          padding:0px 0px;
          }

          .profile-card{
          border-radius:0px;
          min-height:100%;
          }
          
          .username-gold { font-size: 26px; }
          .avatar-container { width: 110px; height: 110px; }
          
          .stats-grid { gap: 10px; }
          .stat-value { font-size: 20px; }
          
          .modal { width: 95%; max-width: none; }
          
          /* Inputlar telefonda qulayroq bo'lishi uchun */
          .input-group input { padding: 15px; }
        }
      `}</style>
    </div>
  )
}