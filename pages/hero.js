import Head from 'next/head'
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { 
  FaSearch, FaShieldAlt, FaMagic, FaFistRaised, 
  FaSkull, FaCrosshairs, FaHandsHelping, FaTimes, FaMask 
} from 'react-icons/fa'

// --- MOCK DATA ---
const HEROES_DATA = [
  { id: 1, name: 'Tigreal', role: 'Tank', specialty: 'Nazorat', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzYBcyae8VLwkJ8ttWId9N1T1tOXkD5eNjLH5URUUhJD1GyqnokU7f29kSZAsdb6PjhOCAesXYwNngwjX_v2rwyePG7nwSslfghzFDQt8&s=10', desc: "Moniyan imperiyasining sodiq himoyachisi, yorug'lik ritsarlari sardori." },
  { id: 2, name: 'Layla', role: 'Marksman', specialty: 'Portlash', image: 'https://preview.redd.it/layla-is-spoiling-the-less-skilled-players-v0-03e013tiplhe1.jpeg?width=1080&crop=smart&auto=webp&s=14bf27aefb271f1ef79fd82b5974791636615d25', desc: "Malefic Gun energiyasi bilan dushmanlarni uzoq masofadan yo'q qiladi." },
  { id: 3, name: 'Eudora', role: 'Mage', specialty: 'Sehrli', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFbS8pSuxTiwK2EzfT2b2Fwxv8xx1M_EJK7w&s', desc: "Chaqmoqlar malikasi, uning g'azabidan hech kim qochib qutula olmaydi." },
  { id: 4, name: 'Saber', role: 'Assassin', specialty: 'Hujum', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8W0qc26IgWxEHViCLsfDUJzWcOrA8DFpuyQ&s', desc: "Fazoviy qilich ustasi, dushman safiga yorib kirib, nishonni yo'q qiladi." },
  { id: 5, name: 'Alucard', role: 'Fighter', specialty: 'Jang', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_2Ru3qlIzhDC_qrHT1EnysMOXV_rTsP3Wlw&s', desc: "Demon ovchisi, zulmatga qarshi yolg'iz kurashuvchi jangchi." },
  { id: 6, name: 'Rafaela', role: 'Support', specialty: 'Yordam', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCLkovo_uFgOEFgfySLXCwseH1A8qAwBheSw&s', desc: "Osmondan tushgan farishta, ittifoqchilariga shifo va umid baxsh etadi." },
  { id: 7, name: 'Gusion', role: 'Assassin', specialty: 'Tezlik', image: 'https://liquipedia.net/commons/images/4/46/Gusion_infobox.jpg', desc: "Paxion oilasining isyonkor o'g'li, xanjar va sehrni mukammal uyg'unlashtiradi." },
  { id: 8, name: 'Franco', role: 'Tank', specialty: 'Tortish', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmmGqIlZDK-GU1YfLsHbzzLH-h3ut2cU_Jnw&s', desc: "Muzli dengizlar qaroqchisi, uning temir changagidan qochib bo'lmaydi." },
  { id: 9, name: 'Miya', role: 'Marksman', specialty: 'Yashirinish', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNqwVGC2WCQFmLeZi3gzUGj-Tvfk2ylqC7eA&s', desc: "Oy ibodatxonasining ruhoniysi." },
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedHero, setSelectedHero] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const filteredHeroes = HEROES_DATA.filter(hero => {
    const matchesRole = selectedRole === 'All' || hero.role === selectedRole;
    const matchesSearch = hero.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="container">
      <Head>
        <title>Qahramonlar - MLBB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#0b1120" />
      </Head>

      <div className="bg-decor"></div>
      
      {user && <Navbar user={user} />}

      <main className="main-content">
        {/* HEADER */}
        <div className="header-box">
          <h1 className="title-gold">QAHRAMONLAR</h1>
          <p className="subtitle">O'z afsonangizni tanlang</p>
        </div>

        {/* CONTROLS (Sticky on Mobile / Centered on Desktop) */}
        <div className="controls-wrapper">
          {/* SEARCH */}
          <div className="search-container">
            <div className="icon-wrapper">
               <FaSearch />
            </div>
            <input 
              type="text" 
              className="search-input"
              placeholder="Qahramonni qidirish..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* FILTERS */}
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

        {/* HERO GRID */}
        <div className="heroes-grid">
          {filteredHeroes.length > 0 ? (
            filteredHeroes.map((hero) => (
              <div key={hero.id} className="hero-card" onClick={() => setSelectedHero(hero)}>
                <div className="img-holder">
                  {hero.image ? (
                     <img 
                       src={hero.image} 
                       alt={hero.name} 
                       loading="lazy"
                       onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} 
                     />
                  ) : null}
                  <div className="fallback-img" style={{display: hero.image ? 'none' : 'flex'}}>
                    {hero.name[0]}
                  </div>
                  <div className="gradient-overlay"></div>
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
      </main>

      {/* MODAL */}
      {selectedHero && (
        <div className="modal-backdrop" onClick={() => setSelectedHero(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedHero(null)}>
              <FaTimes />
            </button>
            
            {/* Desktopda chap taraf (Rasm) */}
            <div className="modal-left">
              {selectedHero.image ? (
                <img src={selectedHero.image} alt={selectedHero.name} className="modal-bg-img" />
              ) : (
                <div className="modal-fallback-bg">{selectedHero.name[0]}</div>
              )}
              <div className="modal-gradient-desktop"></div>
            </div>

            {/* Desktopda o'ng taraf (Info) */}
            <div className="modal-right">
              <div className="modal-header-content">
                <span className="role-tag">{selectedHero.role}</span>
                <h2>{selectedHero.name}</h2>
              </div>

              <div className="modal-body">
                <div className="stat-row">
                  <div className="stat-item">
                    <span className="stat-label">Mutaxassislik</span>
                    <span className="stat-val">{selectedHero.specialty}</span>
                  </div>
                  <div className="stat-item">
                     <span className="stat-label">Sinf</span>
                     <span className="stat-val">{selectedHero.role}</span>
                  </div>
                </div>
                
                <div className="divider"></div>
                
                <p className="lore-text">{selectedHero.desc}</p>
                
                <button className="select-btn">TANLASH</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- STYLES --- */}
      <style jsx global>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background-color: #0b1120; font-family: 'Roboto', sans-serif; }
        
        /* Scrollbar dizayni (Desktop) */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0b1120; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #cfab56; }
      `}</style>

      <style jsx>{`
        .container {
          min-height: 100vh;
          position: relative;
          padding-bottom: 90px;
          background: #0b1120;
          overflow-x: hidden;
        }

        .bg-decor {
          position: fixed;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 150%;
          height: 60vh;
          background: radial-gradient(circle, rgba(207, 171, 86, 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .main-content {
          position: relative;
          z-index: 1;
          padding: 20px 16px;
          max-width: 1200px; /* Desktopda markazlashish */
          margin: 0 auto;
        }

        /* HEADER */
        .header-box { text-align: center; margin: 15px 0 30px; }
        .title-gold {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          color: #cfab56;
          margin: 0;
          letter-spacing: 2px;
          text-shadow: 0 2px 10px rgba(207, 171, 86, 0.2);
        }
        @media (min-width: 768px) {
           .title-gold { font-size: 42px; letter-spacing: 4px; }
           .subtitle { font-size: 16px; }
        }
        .subtitle { color: #6c7a89; font-size: 13px; margin-top: 4px; }

        /* CONTROLS WRAPPER */
        .controls-wrapper {
          position: sticky;
          top: 0;
          z-index: 90;
          background: rgba(11, 17, 32, 0.95);
          backdrop-filter: blur(10px);
          margin: 0 -16px 25px -16px;
          padding: 15px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        /* Desktop Controls */
        @media (min-width: 768px) {
          .controls-wrapper {
            position: relative; /* Desktopda sticky shart emas */
            background: transparent;
            border-bottom: none;
            margin: 0 0 40px 0;
            padding: 0;
            align-items: center;
          }
        }

        /* SEARCH (Bug Fixed) */
        .search-container {
          position: relative;
          width: 100%;
          max-width: 500px; /* Desktopda juda cho'zilib ketmasligi uchun */
          margin: 0 auto;
        }
        
        .icon-wrapper {
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cfab56;
          font-size: 16px;
          pointer-events: none; /* Inputni bosishga xalaqit bermaydi */
          z-index: 2;
        }

        .search-input {
          width: 100%;
          height: 46px; /* Aniq balandlik */
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0 15px 0 45px; /* Chapdan icon uchun joy */
          color: #fff;
          font-size: 16px;
          outline: none;
          transition: all 0.3s ease;
        }
        .search-input:focus {
          border-color: #cfab56;
          background: rgba(255,255,255,0.12);
          box-shadow: 0 0 15px rgba(207, 171, 86, 0.15);
        }

        /* FILTERS */
        .filters-container {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 5px;
          scrollbar-width: none;
        }
        .filters-container::-webkit-scrollbar { display: none; }

        /* Desktop Filters */
        @media (min-width: 768px) {
          .filters-container {
            flex-wrap: wrap;
            justify-content: center;
            overflow-x: visible;
          }
        }

        .filter-chip {
          flex: 0 0 auto;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 8px 18px;
          color: #8899ac;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .filter-chip.active {
          background: #cfab56;
          color: #000;
          font-weight: bold;
          border-color: #cfab56;
          box-shadow: 0 0 12px rgba(207, 171, 86, 0.4);
          transform: scale(1.05);
        }

        /* GRID SYSTEM */
        .heroes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr); 
          gap: 12px;
        }
        
        /* Responsive Grid Steps */
        @media (min-width: 500px) {
           .heroes-grid { grid-template-columns: repeat(3, 1fr); gap: 15px; }
        }
        @media (min-width: 800px) {
           .heroes-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        }
        @media (min-width: 1100px) {
           .heroes-grid { grid-template-columns: repeat(5, 1fr); gap: 25px; }
        }

        .hero-card {
          position: relative;
          background: #151d2e;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 3 / 4.2;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        
        /* Desktop Hover Effect */
        @media (min-width: 768px) {
          .hero-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 15px 30px rgba(0,0,0,0.5);
            z-index: 2;
          }
          .hero-card:hover .gold-border {
            border-color: #cfab56;
            box-shadow: inset 0 0 15px rgba(207, 171, 86, 0.3);
          }
          .hero-card:hover .img-holder img {
            transform: scale(1.1);
          }
        }
        
        .hero-card:active { transform: scale(0.97); }

        .img-holder {
          width: 100%; height: 100%; position: relative; overflow: hidden;
        }
        .img-holder img { 
          width: 100%; height: 100%; object-fit: cover; 
          transition: transform 0.5s ease;
        }
        
        .fallback-img {
          width: 100%; height: 100%; background: #232e3c;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; font-weight: bold; color: #3a4b60;
        }

        .gradient-overlay {
          position: absolute; bottom: 0; left: 0; width: 100%; height: 80%;
          background: linear-gradient(to top, rgba(11,17,32,1) 0%, transparent 100%);
        }

        .card-info {
          position: absolute; bottom: 12px; left: 12px; right: 12px;
        }
        
        .hero-role-badge {
          font-size: 10px; color: #cfab56; text-transform: uppercase; letter-spacing: 0.5px;
          display: block; margin-bottom: 2px;
        }
        .hero-name {
          margin: 0; font-size: 16px; color: #fff; font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        
        .gold-border {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          border-radius: 12px;
          border: 1px solid transparent;
          transition: all 0.3s;
          pointer-events: none;
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px; color: #6c7a89; gap: 15px; font-size: 18px;
        }

        /* MODAL STYLES */
        .modal-backdrop {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s;
        }

        .modal-card {
          width: 100%; max-width: 340px;
          background: #182235;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 10px 50px rgba(0,0,0,0.8);
          border: 1px solid rgba(207, 171, 86, 0.3);
          animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
        }

        /* Desktop Modal Layout */
        @media (min-width: 768px) {
          .modal-card {
            max-width: 750px; /* Kengroq */
            flex-direction: row; /* Yonma-yon */
            height: 450px;
          }
          .modal-left {
            width: 40%;
            height: 100%;
            position: relative;
          }
          .modal-right {
            width: 60%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
          }
          .modal-bg-img {
            height: 100% !important;
          }
          /* Desktopda title o'ng tarafda bo'ladi */
          .modal-header-content {
            position: relative !important;
            bottom: auto !important; left: auto !important;
            padding: 30px 30px 10px 30px;
          }
          .modal-gradient-desktop {
             position: absolute; top: 0; right: 0; bottom: 0; width: 50%;
             background: linear-gradient(to right, transparent, #182235);
          }
        }

        .close-btn {
          position: absolute; top: 15px; right: 15px;
          background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 10; transition: 0.2s;
        }
        .close-btn:hover { background: #cfab56; color: #000; }

        /* Mobile Layout default */
        .modal-left { position: relative; height: 220px; width: 100%; }
        @media (min-width: 768px) { .modal-left { height: 100%; } }

        .modal-bg-img { width: 100%; height: 100%; object-fit: cover; }
        .modal-fallback-bg { 
          width: 100%; height: 100%; background: #232e3c; 
          display: flex; align-items: center; justify-content: center;
          font-size: 80px; color: #3a4b60; font-weight: bold;
        }

        /* Mobile gradient */
        @media (max-width: 767px) {
            .modal-left::after {
              content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 120px;
              background: linear-gradient(to top, #182235 0%, transparent 100%);
            }
            .modal-header-content {
              position: absolute; bottom: 15px; left: 20px; z-index: 2;
            }
        }

        .role-tag {
          background: #cfab56; color: #000; font-size: 11px; font-weight: bold;
          padding: 4px 10px; border-radius: 4px; text-transform: uppercase;
        }
        .modal-header-content h2 {
          margin: 8px 0 0; font-size: 32px; color: #fff; font-family: 'Rajdhani', sans-serif;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .modal-body { padding: 20px; width: 100%; }
        @media (min-width: 768px) { .modal-body { padding: 0 30px 30px 30px; } }
        
        .stat-row { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
        .stat-item {
          flex: 1; background: rgba(255,255,255,0.05); padding: 12px;
          border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.05);
        }
        .stat-label { font-size: 11px; color: #8899ac; display: block; margin-bottom: 5px; }
        .stat-val { font-size: 15px; color: #cfab56; font-weight: bold; }

        .divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 15px; }
        
        .lore-text {
          font-size: 14px; line-height: 1.6; color: #ccc; margin: 0 0 25px;
          font-style: italic; text-align: center;
        }
        @media (min-width: 768px) { .lore-text { text-align: left; margin-bottom: 30px; } }

        .select-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #cfab56 0%, #a67c2e 100%);
          border: none; border-radius: 12px;
          color: #000; font-weight: 800; font-size: 16px;
          letter-spacing: 1px; cursor: pointer;
          box-shadow: 0 5px 20px rgba(207, 171, 86, 0.3);
          transition: 0.2s;
        }
        .select-btn:hover {
            box-shadow: 0 8px 25px rgba(207, 171, 86, 0.5);
            transform: translateY(-2px);
        }
        .select-btn:active { transform: scale(0.98); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}