import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { 
  FaArrowLeft, FaUsers, FaComments, FaTrash, 
  FaShieldAlt, FaSearch, FaUserCheck, FaUserTimes 
} from 'react-icons/fa'
import { supabase } from '../lib/supabaseClient'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data States
  const [users, setUsers] = useState([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'rooms'

  // --- AUTH CHECK ---
  useEffect(() => {
    const checkAdmin = async () => {
      const storedUser = localStorage.getItem('mlbb_user');
      if (!storedUser) {
        router.push('/');
        return;
      }
      
      const parsedUser = JSON.parse(storedUser);
      
      // Bazadan qayta tekshiramiz (Xavfsizlik uchun)
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', parsedUser.id)
        .single();

      if (!dbUser || dbUser.role !== 'admin') {
        toast.error("Siz Admin emassiz!");
        router.push('/');
        return;
      }

      setCurrentUser(parsedUser);
      fetchData();
    };

    checkAdmin();
  }, []);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setUsers(usersData);

      // Rooms Count
      const { count, error: roomsError } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true });
        
      if (roomsError) throw roomsError;
      setRoomsCount(count || 0);

    } catch (error) {
      console.error(error);
      toast.error("Ma'lumotlarni yuklashda xatolik");
    }
    setLoading(false);
  };

  // --- ACTIONS ---
  const handleDeleteUser = async (userId) => {
    if (!confirm("Foydalanuvchini butunlay o'chirib tashlamoqchimisiz?")) return;

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      toast.error("O'chirishda xatolik!");
    } else {
      setUsers(users.filter(u => u.id !== userId));
      toast.success("Foydalanuvchi o'chirildi");
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    // O'zini o'zi user qilib qo'ymasligi uchun
    if (userId === currentUser.id) {
        toast.warning("O'z huquqingizni o'zgartira olmaysiz!");
        return;
    }

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast.error("Xatolik yuz berdi");
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role o'zgardi: ${newRole.toUpperCase()}`);
    }
  };

  // --- FILTER ---
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="loader-container">
       <div className="spinner"></div>
    </div>
  );

  return (
    <div className="admin-container">
      <Head>
        <title>Admin Dashboard - MLBB</title>
      </Head>
      <ToastContainer theme="dark" />

      {/* HEADER */}
      <header className="admin-header">
        <div className="header-content">
          <button onClick={() => router.push('/')} className="back-btn">
            <FaArrowLeft /> Ortga
          </button>
          <h1 className="admin-title">ADMIN PANEL 🛡️</h1>
          <div className="header-placeholder"></div> {/* Balans uchun */}
        </div>
      </header>

      <main className="main-content">
        
        {/* STATS CARDS */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon gold"><FaUsers /></div>
            <div className="stat-info">
              <h3>{users.length}</h3>
              <p>Foydalanuvchilar</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><FaComments /></div>
            <div className="stat-info">
              <h3>{roomsCount}</h3>
              <p>Aktive Xonalar</p>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="search-box">
             <FaSearch className="search-icon" />
             <input 
               type="text" 
               placeholder="Foydalanuvchini qidirish..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="badge-info">
            Jami: {filteredUsers.length}
          </div>
        </div>

        {/* USERS LIST (RESPONSIVE) */}
        <div className="data-section">
          <h2 className="section-title">Foydalanuvchilar Ro'yxati</h2>
          
          {/* DESKTOP TABLE */}
          <div className="desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Username</th>
                  <th>ID</th>
                  <th>Role</th>
                  <th>Sana</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className={user.role === 'admin' ? 'row-admin' : ''}>
                    <td>
                      <div className="table-avatar">
                        {user.avatar_url ? <img src={user.avatar_url} /> : user.username[0]}
                      </div>
                    </td>
                    <td className="username-cell">{user.username}</td>
                    <td className="id-cell">{user.id.slice(0, 8)}...</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="actions">
                        <button 
                          className="btn-icon role-btn" 
                          title="Rolni o'zgartirish"
                          onClick={() => handleToggleRole(user.id, user.role)}
                        >
                          {user.role === 'admin' ? <FaUserTimes /> : <FaUserCheck />}
                        </button>
                        <button 
                          className="btn-icon delete-btn" 
                          title="O'chirish"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mobile-cards">
            {filteredUsers.map(user => (
              <div key={user.id} className={`user-card ${user.role === 'admin' ? 'card-admin' : ''}`}>
                <div className="card-top">
                  <div className="card-avatar">
                    {user.avatar_url ? <img src={user.avatar_url} /> : user.username[0]}
                  </div>
                  <div className="card-info">
                    <h3 className="card-name">
                      {user.username} 
                      {user.role === 'admin' && <FaShieldAlt className="admin-icon" />}
                    </h3>
                    <span className="card-id">ID: {user.id.slice(0, 8)}</span>
                  </div>
                  <span className={`role-badge ${user.role}`}>{user.role}</span>
                </div>
                
                <div className="card-footer">
                  <span className="card-date">{new Date(user.created_at).toLocaleDateString()}</span>
                  <div className="card-actions">
                    <button 
                      className={`action-btn ${user.role === 'admin' ? 'demote' : 'promote'}`}
                      onClick={() => handleToggleRole(user.id, user.role)}
                    >
                      {user.role === 'admin' ? 'User qilish' : 'Admin qilish'}
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* STYLES */}
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background-color: #0b1120; color: #fff; font-family: 'Roboto', sans-serif; }
      `}</style>

      <style jsx>{`
        .admin-container {
          min-height: 100vh;
          background: #0b1120;
          display: flex; flex-direction: column;
        }

        /* HEADER */
        .admin-header {
          background: rgba(23, 33, 43, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 15px 20px;
          position: sticky; top: 0; z-index: 100;
        }
        .header-content {
          max-width: 1200px; margin: 0 auto;
          display: flex; justify-content: space-between; align-items: center;
        }
        .admin-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px; color: #cfab56; margin: 0; letter-spacing: 2px;
        }
        .back-btn {
          background: none; border: none; color: #aaa;
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; font-size: 14px;
        }
        .header-placeholder { width: 60px; } /* Balans uchun */

        /* MAIN */
        .main-content {
          flex: 1;
          padding: 20px;
          max-width: 1200px; margin: 0 auto; width: 100%;
        }

        /* STATS */
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px; margin-bottom: 30px;
        }
        .stat-card {
          background: #151d2e; border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; padding: 20px;
          display: flex; align-items: center; gap: 15px;
        }
        .stat-icon {
          width: 50px; height: 50px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 24px;
        }
        .stat-icon.gold { background: rgba(207, 171, 86, 0.2); color: #cfab56; }
        .stat-icon.blue { background: rgba(74, 163, 223, 0.2); color: #4aa3df; }
        .stat-info h3 { margin: 0; font-size: 24px; color: #fff; font-family: 'Rajdhani', sans-serif; }
        .stat-info p { margin: 0; font-size: 12px; color: #8899ac; }

        /* TOOLBAR */
        .toolbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px; gap: 15px; flex-wrap: wrap;
        }
        .search-box {
          position: relative; flex: 1; max-width: 400px;
        }
        .search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: #cfab56;
        }
        .search-box input {
          width: 100%; padding: 12px 12px 12px 35px;
          background: #1e2a45; border: 1px solid #2d3b55;
          border-radius: 8px; color: #fff; outline: none;
        }
        .search-box input:focus { border-color: #cfab56; }
        .badge-info {
          background: #1e2a45; padding: 8px 15px; border-radius: 20px;
          font-size: 12px; color: #aaa; border: 1px solid rgba(255,255,255,0.1);
        }

        /* TABLE (DESKTOP) */
        .desktop-table {
          display: none; /* Mobilda yashiringan */
          background: #151d2e; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
          background: #1e2a45; color: #8899ac; font-size: 12px; text-transform: uppercase;
          text-align: left; padding: 15px;
        }
        td {
          padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05);
          color: #e0e0e0; font-size: 14px;
        }
        tr:last-child td { border-bottom: none; }
        .row-admin { background: rgba(207, 171, 86, 0.05); }

        .table-avatar {
          width: 35px; height: 35px; border-radius: 50%; background: #232e3c;
          overflow: hidden; display: flex; align-items: center; justify-content: center;
          color: #cfab56; font-weight: bold;
        }
        .table-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .username-cell { font-weight: 600; color: #fff; }
        .id-cell { font-family: monospace; color: #8899ac; }
        
        .role-badge {
          padding: 4px 10px; border-radius: 4px; font-size: 10px;
          font-weight: bold; text-transform: uppercase;
        }
        .role-badge.admin { background: rgba(207, 171, 86, 0.2); color: #cfab56; }
        .role-badge.user { background: rgba(255, 255, 255, 0.1); color: #aaa; }

        .actions { display: flex; gap: 8px; }
        .btn-icon {
          width: 32px; height: 32px; border-radius: 6px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.2s;
        }
        .role-btn { background: #1e2a45; color: #4aa3df; }
        .role-btn:hover { background: #4aa3df; color: #fff; }
        .delete-btn { background: #1e2a45; color: #ff4d4f; }
        .delete-btn:hover { background: #ff4d4f; color: #fff; }

        /* CARDS (MOBILE) */
        .mobile-cards { display: flex; flex-direction: column; gap: 12px; }
        .user-card {
          background: #151d2e; border-radius: 12px; padding: 15px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .card-admin { border-left: 3px solid #cfab56; }

        .card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .card-avatar {
          width: 45px; height: 45px; border-radius: 50%; background: #232e3c;
          overflow: hidden; display: flex; align-items: center; justify-content: center;
          color: #cfab56; font-weight: bold; font-size: 18px; flex-shrink: 0;
        }
        .card-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .card-info { flex: 1; }
        .card-name { margin: 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .admin-icon { color: #cfab56; font-size: 12px; }
        .card-id { font-size: 11px; color: #8899ac; font-family: monospace; }

        .card-footer {
          display: flex; justify-content: space-between; align-items: center;
          border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;
        }
        .card-date { font-size: 11px; color: #666; }
        .card-actions { display: flex; gap: 8px; }

        .action-btn {
          padding: 6px 12px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .action-btn.promote { background: #1e2a45; color: #4aa3df; }
        .action-btn.demote { background: #1e2a45; color: #cfab56; }
        .action-btn.delete { background: rgba(255, 77, 79, 0.1); color: #ff4d4f; }

        /* LOADER */
        .loader-container {
          min-height: 100vh; display: flex; justify-content: center; align-items: center; background: #0b1120;
        }
        .spinner {
          width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #cfab56; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* RESPONSIVE MEDIA QUERIES */
        @media (min-width: 768px) {
          .desktop-table { display: block; }
          .mobile-cards { display: none; }
          .admin-title { font-size: 28px; }
        }
      `}</style>
    </div>
  )
}