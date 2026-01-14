import Head from 'next/head'
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar' // Navbar komponentingiz manzili
import { 
  FaSearch, FaShieldAlt, FaMagic, FaFistRaised, 
  FaSkull, FaCrosshairs, FaHandsHelping, FaTimes, FaMask, FaPlay, FaImage
} from 'react-icons/fa'
import { supabase } from '../lib/supabaseClient' // Supabase manzili to'g'riligini tekshiring

const ROLES = [
  { name: 'All', icon: <FaMask />, label: 'Barchasi' },
  { name: 'Tank', icon: <FaShieldAlt />, label: 'Tank' },
  { name: 'Fighter', icon: <FaFistRaised />, label: 'Jangchi' },
  { name: 'Assassin', icon: <FaSkull />, label: 'Qotil' },
  { name: 'Mage', icon: <FaMagic />, label: 'Mage' },
  { name: 'Marksman', icon: <FaCrosshairs />, label: 'Otishma' },
  { name: 'Support', icon: <FaHandsHelping />, label: 'Yordam' },
];

export default function Heroes() {
  const [user, setUser] = useState(null);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedHero, setSelectedHero] = useState(null);
  
  // Modalda Rasm yoki Videoni ko'rsatish uchun state
  const [viewMode, setViewMode] = useState('image'); // 'image' or 'video'

  // --- FETCH DATA ---
  useEffect(() => {
    const initData = async () => {
      // 1. Userni tekshirish
      const storedUser = localStorage.getItem('mlbb_user');
      if (storedUser) setUser(JSON.parse(storedUser));

      // 2. Herolarni yuklash
      setLoading(true);
      const { data, error } = await supabase
        .from('heroes')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        setHeroes(data);
      }
      setLoading(false);
    };

    initData();
  }, []);

  // Modal ochilganda default holatga qaytarish
  useEffect(() => {
    if (selectedHero) setViewMode('image');
  }, [selectedHero]);

  // --- FILTER LOGIC ---
  const filteredHeroes = heroes.filter(hero => {
    const matchesRole = selectedRole === 'All' || hero.role === selectedRole;
    const matchesSearch = hero.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="container">
      <Head>
        <title>Qahramonlar - MLBB</title>
        <meta name="theme-color" content="#0b1120" />
      </Head>

      <div className="bg-decor"></div>
      
      {/* Navbar (Agar user bo'lsa) */}
      {user && <Navbar user={user} />}

      <main className="main-content">
        {/* HEADER */}
        <div className="header-box">
          <h1 className="title-gold">QAHRAMONLAR</h1>
          <p className="subtitle">O'z afsonangizni tanlang</p>
        </div>

        {/* CONTROLS */}
        <div className="controls-wrapper">
          <div className="controls-inner">
            {/* SEARCH */}
            <div className="search-container">
              <div className="icon-wrapper"><FaSearch /></div>
              <input 
                type="text" 
                className="search-input"
                placeholder="Qidirish..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* FILTERS */}
            <div className="filters-scroll">
              <div className="filters-container">
                {ROLES.map((role) => (
                  <button 
                    key={role.name}
                    className={`filter-chip ${selectedRole === role.name ? 'active' : ''}`}
                    onClick={() => setSelectedRole(role.name)}
                  >
                    <span className="chip-icon">{role.icon}</span>
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
           <div className="loader-box"><div className="spinner"></div></div>
        ) : (
          /* HERO GRID */
          <div className="heroes-grid">
            {filteredHeroes.length > 0 ? (
              filteredHeroes.map((hero) => (
                <div key={hero.id} className="hero-card" onClick={() => setSelectedHero(hero)}>
                  <div className="img-holder">
                    <img 
                      src={hero.image_url} 
                      alt={hero.name} 
                      loading="lazy"
                      onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} 
                    />
                    <div className="fallback-img">{hero.name[0]}</div>
                    <div className="gradient-overlay"></div>
                    
                    {/* Video Icon if exists */}
                    {hero.video_url && <div className="video-indicator"><FaPlay /></div>}
                  </div>
                  
                  <div className="card-info">
                    <span className="hero-role-badge">{hero.role}</span>
                    <h3 className="hero-name">{hero.name}</h3>
                  </div>
                  
                  <div className="gold-border"></div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FaMask size={50} color="#3a4b60" />
                <p>Hech narsa topilmadi...</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL */}
      {selectedHero && (
        <div className="modal-backdrop" onClick={() => setSelectedHero(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedHero(null)}>
              <FaTimes />
            </button>
            
            {/* LEFT SIDE: MEDIA (Image/Video) */}
            <div className="modal-media">
              {viewMode === 'video' && selectedHero.video_url ? (
                <video 
                  src={selectedHero.video_url} 
                  controls 
                  autoPlay 
                  className="media-content"
                />
              ) : (
                <>
                  <img 
                    src={selectedHero.image_url} 
                    alt={selectedHero.name} 
                    className="media-content img-cover" 
                    onError={(e) => e.target.src = 'https://via.placeholder.com/400'}
                  />
                  <div className="media-gradient"></div>
                </>
              )}
              
              {/* Media Toggle Buttons */}
              {selectedHero.video_url && (
                <div className="media-controls">
                  <button 
                    className={`media-btn ${viewMode === 'image' ? 'active' : ''}`} 
                    onClick={() => setViewMode('image')}
                  >
                    <FaImage /> Rasm
                  </button>
                  <button 
                    className={`media-btn ${viewMode === 'video' ? 'active' : ''}`} 
                    onClick={() => setViewMode('video')}
                  >
                    <FaPlay /> Intro
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: INFO */}
            <div className="modal-info">
              <div className="modal-header-content">
                <div className="header-top">
                   <span className="role-tag">{selectedHero.role}</span>
                   {selectedHero.specialty && <span className="spec-tag">{selectedHero.specialty}</span>}
                </div>
                <h2>{selectedHero.name}</h2>
              </div>

              <div className="modal-body">
                <p className="lore-text">
                  {selectedHero.description || "Bu qahramon haqida hali ma'lumot kiritilmagan."}
                </p>
                
                <div className="modal-footer">
                  <button className="select-btn">TANLASH</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- STYLES --- */}
      <style jsx global>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background-color: #0b1120; font-family: 'Roboto', sans-serif; color: #fff; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b1120; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <style jsx>{`
        .container { min-height: 100vh; position: relative; padding-bottom: 90px; background: #0b1120; overflow-x: hidden; }
        .bg-decor { position: fixed; top: -20%; left: 50%; transform: translateX(-50%); width: 150%; height: 60vh; pointer-events: none; z-index: 0; }
        .main-content { position: relative; z-index: 1; padding: 20px 16px; max-width: 1200px; margin: 0 auto; }

        /* HEADER */
        .header-box { text-align: center; margin: 20px 0 30px; }
        .title-gold { font-family: 'Rajdhani', sans-serif; font-size: 28px; color: #cfab56; margin: 0; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(207, 171, 86, 0.2); }
        .subtitle { color: #6c7a89; font-size: 13px; margin-top: 4px; }

        /* CONTROLS */
        .controls-wrapper { position: sticky; top: 0; z-index: 90; margin: 0 -16px 25px -16px; padding: 10px 16px; background: rgba(11, 17, 32, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .controls-inner { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        
        .search-container { position: relative; width: 100%; }
        .icon-wrapper { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #cfab56; pointer-events: none; }
        .search-input { width: 100%; height: 44px; background: #151d2e; border: 1px solid #232e3c; border-radius: 10px; padding: 0 15px 0 40px; color: #fff; outline: none; transition: 0.3s; }
        .search-input:focus { border-color: #cfab56; background: #1a2436; }

        .filters-scroll { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; margin-right: -16px; padding-right: 16px; }
        .filters-scroll::-webkit-scrollbar { display: none; }
        .filters-container { display: flex; gap: 8px; }
        .filter-chip { flex: 0 0 auto; background: #151d2e; border: 1px solid #232e3c; border-radius: 20px; padding: 8px 16px; color: #8899ac; font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .filter-chip.active { background: #cfab56; color: #000; border-color: #cfab56; font-weight: bold; }

        /* HERO GRID */
        .heroes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .hero-card { position: relative; background: #151d2e; border-radius: 12px; overflow: hidden; aspect-ratio: 3 / 4.2; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); transition: 0.3s; }
        .hero-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.4); z-index: 2; }
        .hero-card:hover .gold-border { border-color: #cfab56; box-shadow: inset 0 0 15px rgba(207, 171, 86, 0.3); }
        
        .img-holder { width: 100%; height: 100%; position: relative; overflow: hidden; }
        .img-holder img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .hero-card:hover img { transform: scale(1.1); }
        .fallback-img { display: none; width: 100%; height: 100%; background: #232e3c; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; color: #3a4b60; }
        .gradient-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 70%; background: linear-gradient(to top, rgba(11,17,32,1) 0%, transparent 100%); }
        
        .video-indicator { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: rgba(0,0,0,0.6); border-radius: 50%; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2); }

        .card-info { position: absolute; bottom: 12px; left: 12px; right: 12px; }
        .hero-role-badge { font-size: 10px; color: #cfab56; text-transform: uppercase; display: block; margin-bottom: 2px; font-weight: bold; }
        .hero-name { margin: 0; font-size: 16px; color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
        .gold-border { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 12px; border: 1px solid transparent; pointer-events: none; transition: 0.3s; }

        .empty-state, .loader-box { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #6c7a89; font-size: 18px; }
        .spinner { width: 40px; height: 40px; border: 3px solid #1e2a45; border-top-color: #cfab56; border-radius: 50%; animation: spin 1s infinite linear; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* MODAL */
        .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s; }
        .modal-card { width: 100%; max-width: 900px; background: #151d2e; border-radius: 16px; overflow: hidden; position: relative; border: 1px solid rgba(207, 171, 86, 0.3); box-shadow: 0 0 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 90vh; animation: zoomIn 0.3s; }
        
        .close-btn { position: absolute; top: 15px; right: 15px; z-index: 10; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .close-btn:hover { background: #cfab56; color: #000; }

        /* MODAL MEDIA */
        .modal-media { position: relative; height: 250px; background: #000; }
        .media-content { width: 100%; height: 100%; object-fit: cover; }
        .media-content.img-cover { object-fit: cover; }
        .media-gradient { position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to top, #151d2e 0%, transparent 100%); pointer-events: none; }
        
        .media-controls { position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 5; background: rgba(0,0,0,0.6); padding: 5px; border-radius: 20px; backdrop-filter: blur(5px); }
        .media-btn { background: transparent; border: none; color: #aaa; padding: 5px 12px; border-radius: 15px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 5px; transition: 0.2s; }
        .media-btn.active { background: #cfab56; color: #000; font-weight: bold; }

        /* MODAL INFO */
        .modal-info { padding: 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .modal-header-content { margin-bottom: 15px; }
        .header-top { display: flex; gap: 8px; margin-bottom: 5px; }
        .role-tag, .spec-tag { font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; }
        .role-tag { background: #cfab56; color: #000; }
        .spec-tag { background: #1e2a45; color: #4aa3df; border: 1px solid #232e3c; }
        .modal-header-content h2 { margin: 0; font-family: 'Rajdhani', sans-serif; font-size: 28px; color: #fff; letter-spacing: 1px; }
        
        .lore-text { font-size: 14px; line-height: 1.6; color: #ccc; margin: 0 0 20px; white-space: pre-wrap; }
        
        .modal-footer { margin-top: auto; }
        .select-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #cfab56, #b08d3e); border: none; border-radius: 8px; color: #000; font-weight: bold; font-size: 16px; cursor: pointer; letter-spacing: 1px; transition: 0.2s; }
        .select-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(207, 171, 86, 0.3); }

        /* RESPONSIVE */
        @media (min-width: 768px) {
          .title-gold { font-size: 42px; }
          .controls-wrapper { position: static; background: transparent; border: none; padding: 0; margin-bottom: 40px; }
          .controls-inner { flex-direction: row; align-items: center; justify-content: space-between; }
          .search-container { max-width: 300px; }
          .filters-scroll { overflow: visible; margin: 0; padding: 0; }
          .filters-container { flex-wrap: wrap; justify-content: flex-end; }
          
          .heroes-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
          
          .modal-card { flex-direction: row; height: 500px; max-height: none; }
          .modal-media { width: 45%; height: 100%; }
          .media-gradient { background: linear-gradient(to right, transparent 0%, #151d2e 100%); width: 50%; height: 100%; left: auto; right: 0; top: 0; }
          .modal-info { width: 55%; padding: 40px; }
          .modal-header-content h2 { font-size: 36px; }
        }
        @media (min-width: 1100px) {
          .heroes-grid { grid-template-columns: repeat(5, 1fr); gap: 25px; }
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}