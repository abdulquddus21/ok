import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr' 
import { 
  FaCog, FaPen, FaCamera, FaTimes, 
  FaUserAstronaut, FaShieldAlt, FaGamepad, FaComments,
  FaKey, FaSignOutAlt, FaChevronRight, FaPlus, FaTrash, FaImage
} from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- FETCHER ---
const fetchProfileData = async (targetUsername) => {
  if (!targetUsername) return null;

  // 1. User ma'lumotlari
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', targetUsername)
    .single();

  if (error || !user) throw new Error('User not found');

  // 2. Statistika
  const [channels, chats] = await Promise.all([
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('type', 'channel'),
    supabase.from('room_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  ]);

  // 3. Postlar (Rasmlar)
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return {
    user,
    posts: posts || [],
    stats: { channels: channels.count || 0, chats: chats.count || 0, posts: posts?.length || 0 }
  };
};

// --- FILE UPLOAD (LOCAL API) ---
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url; // /uploads/image/nomi.jpg
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default function Profile() {
  const router = useRouter();
  const { username } = router.query;
  
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modals States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false); // New Post
  const [viewPost, setViewPost] = useState(null); // View Full Post

  // Edit Profile States
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // New Post States
  const [postFile, setPostFile] = useState(null);
  const [postCaption, setPostCaption] = useState('');
  const [postPreview, setPostPreview] = useState(null);
  const [uploadingPost, setUploadingPost] = useState(false);

  // Password Change
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) router.push('/');
    else setCurrentUser(JSON.parse(storedUser));
  }, []);

  const shouldFetch = router.isReady && username;
  const { data: profileFullData, isLoading } = useSWR(
    shouldFetch ? `profile-${username}` : null, 
    () => fetchProfileData(username),
    { revalidateOnFocus: false }
  );

  const profileData = profileFullData?.user;
  const posts = profileFullData?.posts || [];
  const stats = profileFullData?.stats || { channels: 0, chats: 0, posts: 0 };

  // Sync Edit Form
  useEffect(() => {
    if (profileData && currentUser?.id === profileData.id) {
      setEditName(profileData.username);
      setPreviewUrl(profileData.avatar_url);
    }
  }, [profileData, currentUser, showEditModal]);

  // --- HANDLERS ---
  
  // 1. Update Profile
  const handleSaveProfile = async () => {
    if (!editName.trim()) return toast.warning("Ism bo'sh bo'lmasin!");
    setSaving(true);
    try {
      let avatarUrl = profileData.avatar_url;
      if (editFile) {
        avatarUrl = await uploadFile(editFile); // Local API upload
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
      toast.error("Xatolik yuz berdi!");
    }
    setSaving(false);
  };

  // 2. Create Post
  const handleCreatePost = async () => {
    if (!postFile) return toast.warning("Rasm tanlang!");
    setUploadingPost(true);
    try {
      const imageUrl = await uploadFile(postFile); // Local API upload
      
      const { error } = await supabase.from('posts').insert([{
        user_id: currentUser.id,
        image_url: imageUrl,
        caption: postCaption
      }]);

      if (error) throw error;

      toast.success("Post yuklandi!");
      setPostFile(null); setPostCaption(''); setPostPreview(null);
      setShowPostModal(false);
      mutate(`profile-${username}`); // Refresh data
    } catch (error) {
      toast.error("Post yuklashda xatolik: " + error.message);
    }
    setUploadingPost(false);
  };

  const handlePostFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPostFile(file);
      setPostPreview(URL.createObjectURL(file));
    }
  };

  // 3. Delete Post
  const handleDeletePost = async (postId) => {
    if (!confirm("Postni o'chirmoqchimisiz?")) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
       toast.success("O'chirildi");
       setViewPost(null);
       mutate(`profile-${username}`);
    } else {
       toast.error("Xatolik!");
    }
  };

  // 4. Change Password & Logout
  const handleChangePassword = async () => { /* ... same as before ... */ };
  const logout = () => { /* ... same as before ... */ };

  const isMyProfile = currentUser && profileData && currentUser.id === profileData.id;
  const isAdmin = profileData && profileData.role === 'admin';

  return (
    <div className="container">
      <Head>
        <title>{profileData ? `${profileData.username}` : 'Profile'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <ToastContainer theme="dark" position="top-center" autoClose={2000} />
      
      <div className="bg-glow"></div>

      <main className="main">
        {isLoading || !profileData ? (
          <div className="spinner-container"><div className="spinner"></div></div>
        ) : (
          <div className="content-wrapper">
            
            {/* PROFILE HEADER */}
            <div className="profile-card">
              <div className="card-header">
                 <span className="status-badge">ONLINE</span>
                 {isMyProfile && (
                   <button onClick={() => setShowSettingsModal(true)} className="settings-btn"><FaCog /></button>
                 )}
              </div>

              <div className="avatar-section">
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

              <div className="info-section">
                <h1 className="username-gold">{profileData.username}</h1>
                <p className="user-id">ID: {profileData.id.slice(0, 8)}</p>
                
                <div className="stats-row">
                  <div className="stat-item">
                    <b>{stats.posts}</b> <span>Postlar</span>
                  </div>
                  <div className="stat-item">
                    <b>{stats.channels}</b> <span>Kanallar</span>
                  </div>
                  <div className="stat-item">
                    <b>{stats.chats}</b> <span>Chatlar</span>
                  </div>
                </div>

                {isMyProfile ? (
                  <div className="action-buttons">
                    <button className="btn-action primary" onClick={() => setShowPostModal(true)}>
                      <FaPlus /> Post Yuklash
                    </button>
                    {isAdmin && (
                      <button className="btn-action admin" onClick={() => router.push('/admin')}>
                        <FaShieldAlt /> Admin Panel
                      </button>
                    )}
                  </div>
                ) : (
                  <button className="btn-action secondary" onClick={() => toast.info('Xabar yozish tez kunda!')}>
                     Xabar Yozish
                  </button>
                )}
              </div>
            </div>

            {/* POSTS GRID */}
            <div className="posts-section">
               <h3 className="section-title"><FaImage /> Galereya</h3>
               {posts.length > 0 ? (
                 <div className="posts-grid">
                   {posts.map(post => (
                     <div key={post.id} className="post-item" onClick={() => setViewPost(post)}>
                       <img src={post.image_url} alt="post" loading="lazy" />
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="empty-posts">
                    <p>Hozircha postlar yo'q</p>
                 </div>
               )}
            </div>

          </div>
        )}
      </main>

      {/* --- MODAL: CREATE POST --- */}
      {showPostModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPostModal(false)}>
          <div className="modal animate-pop">
            <div className="modal-header">
              <h3>Yangi Post</h3>
              <button onClick={() => setShowPostModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body">
              <label className="post-upload-area">
                {postPreview ? (
                  <img src={postPreview} className="post-preview-img" />
                ) : (
                  <div className="upload-placeholder">
                    <FaCamera size={30} />
                    <span>Rasm tanlash</span>
                  </div>
                )}
                <input type="file" hidden accept="image/*" onChange={handlePostFileChange} />
              </label>
              
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Izoh yozing..." 
                  value={postCaption} 
                  onChange={(e) => setPostCaption(e.target.value)} 
                />
              </div>

              <button onClick={handleCreatePost} className="btn-gold full-width" disabled={uploadingPost}>
                {uploadingPost ? 'Yuklanmoqda...' : 'CHOP ETISH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW POST --- */}
      {viewPost && (
        <div className="modal-overlay backdrop-blur" onClick={() => setViewPost(null)}>
          <div className="post-modal animate-zoom" onClick={(e) => e.stopPropagation()}>
             <div className="post-modal-img-container">
               <img src={viewPost.image_url} alt="Full post" />
             </div>
             <div className="post-modal-footer">
                <p className="post-caption">{viewPost.caption}</p>
                <div className="post-meta">
                   <span>{new Date(viewPost.created_at).toLocaleDateString()}</span>
                   {isMyProfile && (
                     <button className="delete-post-btn" onClick={() => handleDeletePost(viewPost.id)}>
                       <FaTrash /> O'chirish
                     </button>
                   )}
                </div>
             </div>
             <button className="close-absolute" onClick={() => setViewPost(null)}><FaTimes /></button>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT PROFILE --- */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal animate-pop">
            <div className="modal-header">
              <h3>Profilni Tahrirlash</h3>
              <button onClick={() => setShowEditModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body">
              <label className="image-preview-box">
                {previewUrl ? <img src={previewUrl} /> : <FaUserAstronaut size={40} />}
                <div className="overlay"><FaCamera /></div>
                <input type="file" hidden onChange={(e) => {
                   if (e.target.files[0]) {
                     setEditFile(e.target.files[0]);
                     setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                   }
                }} accept="image/*" />
              </label>
              <div className="input-group">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={15} />
              </div>
              <button onClick={handleSaveProfile} className="btn-gold full-width" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'SAQLASH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: SETTINGS --- */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}>
           <div className="modal animate-pop">
              <div className="modal-header"><h3>Sozlamalar</h3></div>
              <div className="modal-body p-0">
                 <div className="menu-list">
                    <div className="menu-item danger" onClick={() => { localStorage.removeItem('mlbb_user'); router.push('/'); }}>
                       <FaSignOutAlt /> Chiqish
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {currentUser && <Navbar user={currentUser} />}

      <style jsx global>{`
        body { margin: 0; background-color: #0b1120; color: #fff; font-family: 'Roboto', sans-serif; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <style jsx>{`
        .container { min-height: 100vh; padding-bottom: 80px; position: relative; }
        .bg-glow { position: fixed; top: -200px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; height: 600px; background: radial-gradient(circle, rgba(207, 171, 86, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0; }
        
        .main { padding: 20px; display: flex; justify-content: center; z-index: 1; position: relative; }
        .content-wrapper { width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 20px; }
        .spinner-container { min-height: 80vh; display: flex; align-items: center; justify-content: center; }

        /* PROFILE CARD */
        .profile-card {
          background: rgba(21, 29, 46, 0.8); backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-radius: 20px; padding: 25px; text-align: center; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .card-header { display: flex; justify-content: space-between; margin-bottom: -10px; }
        .status-badge { background: rgba(46, 204, 113, 0.2); color: #2ecc71; border: 1px solid #2ecc71; padding: 6px; font-size: 10px; font-weight: bold; border-radius: 4px; }
        .settings-btn { background: none; border: none; color: #8899ac; font-size: 20px; cursor: pointer; }

        .avatar-section { position: relative; width: 100px; height: 100px; margin: 0 auto 15px; }
        .avatar-frame { width: 100%; height: 100%; border-radius: 50%; border: 3px solid #cfab56; padding: 3px; background: rgba(0,0,0,0.5); overflow: hidden; }
        .avatar-img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .avatar-placeholder { background: #1e2a45; display: flex; align-items: center; justify-content: center; font-size: 35px; color: #cfab56; }
        .edit-icon-btn { position: absolute; bottom: 0; right: 0; background: #cfab56; color: #000; border: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }

        .info-section h1 { margin: 0; font-family: 'Rajdhani', sans-serif; font-size: 26px; color: #cfab56; letter-spacing: 1px; }
        .user-id { color: #8899ac; font-size: 12px; margin: 5px 0 15px; font-family: monospace; }
        
        .stats-row { display: flex; justify-content: space-around; margin-bottom: 20px; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .stat-item { display: flex; flex-direction: column; }
        .stat-item b { font-size: 18px; color: #fff; }
        .stat-item span { font-size: 11px; color: #8899ac; }

        .action-buttons { display: flex; flex-direction: column; gap: 10px; }
        .btn-action { width: 100%; padding: 12px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; transition: all 0.3s; }
        .primary { background: linear-gradient(135deg, #cfab56 0%, #b08d3e 100%); color: #000; }
        .admin { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; }
        .secondary { background: rgba(255,255,255,0.1); color: #fff; }
        .btn-action:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

        /* POSTS GRID */
        .posts-section { margin-top: 10px; }
        .section-title { font-size: 16px; color: #cfab56; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
        .posts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
        .post-item { aspect-ratio: 1/1; background: #151d2e; cursor: pointer; overflow: hidden; position: relative; border-radius: 4px; }
        .post-item img { width: 100%; height: 100%; object-fit: cover; transition: 0.3s; }
        .post-item:hover img { transform: scale(1.1); filter: brightness(1.1); }
        .empty-posts { text-align: center; padding: 40px; color: #666; font-size: 14px; background: rgba(255,255,255,0.02); border-radius: 10px; }

        /* MODALS */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal { background: #151d2e; border: 1px solid rgba(207, 171, 86, 0.3); width: 90%; max-width: 400px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        .modal-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); }
        .modal-header h3 { margin: 0; color: #cfab56; font-size: 16px; }
        .close-btn { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; }
        .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }

        .post-upload-area { width: 100%; height: 250px; background: #0f1623; border: 2px dashed #2d3b55; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; position: relative; }
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 10px; color: #666; }
        .post-preview-img { width: 100%; height: 100%; object-fit: contain; }

        .input-group input { width: 100%; padding: 12px; background: #0f1623; border: 1px solid #2d3b55; border-radius: 8px; color: #fff; outline: none; }
        .btn-gold { padding: 12px; background: #cfab56; border: none; border-radius: 8px; color: #000; font-weight: bold; cursor: pointer; width: 100%; }
        
        /* VIEW POST MODAL */
        .post-modal { width: 100%; max-width: 500px; background: #000; position: relative; display: flex; flex-direction: column; max-height: 90vh; border-radius: 10px; overflow: hidden; }
        .post-modal-img-container { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; }
        .post-modal-img-container img { width: 100%; height: auto; max-height: 70vh; object-fit: contain; }
        .post-modal-footer { padding: 15px; background: #151d2e; }
        .post-caption { margin: 0 0 10px; font-size: 14px; color: #fff; }
        .post-meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888; }
        .delete-post-btn { background: none; border: none; color: #ff4d4f; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .close-absolute { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 10; }

        .image-preview-box { width: 100px; height: 100px; margin: 0 auto; border-radius: 50%; overflow: hidden; position: relative; border: 2px dashed #444; cursor: pointer; }
        .image-preview-box img { width: 100%; height: 100%; object-fit: cover; }
        .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; }
        .image-preview-box:hover .overlay { opacity: 1; }

        .menu-list { display: flex; flex-direction: column; }
        .menu-item { padding: 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .menu-item.danger { color: #ff4d4f; }

        .spinner { width: 30px; height: 30px; border: 3px solid #151d2e; border-top-color: #cfab56; border-radius: 50%; animation: spin 1s infinite linear; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-pop { animation: pop 0.3s ease; }
        @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}