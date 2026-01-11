import { useRouter } from 'next/router';
import { FaHome, FaNewspaper, FaComments, FaUserAstronaut } from 'react-icons/fa';

export default function Navbar({ user }) {
  const router = useRouter();

  if (!user) return null;

  // Hozirgi sahifani tekshirish
  const isActive = (path) => {
    if (path === '/') return router.pathname === '/';
    return router.pathname.startsWith(path);
  };

  // Chat sahifasida ekanligini tekshirish
  const isChatPage = router.pathname.startsWith('/chat');

  const navItems = [
    { name: 'Asosiy', path: '/', icon: <FaHome /> },
    { name: 'Yangilik', path: '/news', icon: <FaNewspaper /> },
    { name: 'Chat', path: '/chat', icon: <FaComments /> },
    { name: 'Profil', path: `/profile/${user.username}`, icon: <FaUserAstronaut /> },
  ];

  return (
    <>
      <nav className={`navbar ${isChatPage ? 'chat-mode' : ''}`}>
        <div className={`nav-container ${isChatPage ? 'chat-mode' : ''}`}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <button 
                key={item.name}
                onClick={() => router.push(item.path)} 
                className={`nav-item ${active ? 'active' : ''} ${isChatPage ? 'chat-mode' : ''}`}
              >
                {/* Aktiv holatdagi chiziqcha (Vertical holatda chap tomonda bo'ladi) */}
                {active && <span className={`active-indicator ${isChatPage ? 'chat-mode' : ''}`}></span>}
                
                <span className="icon-wrapper">
                  {item.icon}
                </span>
                <span className="nav-text">{item.name}</span>
                
                {/* Orqa fon yorug'ligi */}
                {active && <div className="glow-effect"></div>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* STYLES */}
      <style jsx>{`
        /* Navbar asosi */
        .navbar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          padding: 0;
          display: flex;
          justify-content: center;
          pointer-events: none;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
           /* Mobil scroll effektini yumshatish */
          -webkit-tap-highlight-color: transparent;
        }

        /* Konteyner (Ichki quti) */
        .nav-container {
          pointer-events: auto;
          display: flex;
          justify-content: space-around;
          align-items: center;
          width: 100%;
          height: 70px;
          background: rgba(11, 17, 32, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(207, 171, 86, 0.3);
          box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.5);
          position: relative;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* --- DESKTOP REJIM --- */
        @media (min-width: 768px) {
          /* Oddiy holat (Asosiy, Yangilik, Profil) */
          .navbar {
            bottom: 20px;
            left: 0;
            right: 0;
            justify-content: center;
            align-items: flex-end;
            width: 100%;
            height: auto;
          }
          
          .nav-container {
            width: 400px;
            height: 65px;
            border-radius: 35px;
            border: 1px solid rgba(207, 171, 86, 0.3);
            background: rgba(11, 17, 32, 0.85);
            flex-direction: row;
          }

          /* --- CHAT REJIMI (Vertikal O'ng Tomon) --- */
          .navbar.chat-mode {
            bottom: 0;
            top: 0;
            left: auto; /* Chapni bekor qilish */
            right: 20px; /* O'ngdan joy tashlash */
            width: auto;
            height: 100vh;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .nav-container.chat-mode {
            width: 70px; /* Ingichka vertikal */
            height: auto;
            min-height: 400px; /* Balandroq */
            flex-direction: column; /* Elementlar ustma-ust */
            border-radius: 35px;
            padding: 20px 0;
            gap: 20px;
            border-top: 1px solid rgba(207, 171, 86, 0.3); /* Chegarani qayta tiklash */
            box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
          }
        }

        /* Tugmalar */
        .nav-item {
          flex: 1;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #8899ac;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }

        /* Chat rejimida tugmalar */
        @media (min-width: 768px) {
          .nav-item.chat-mode {
            width: 100%;
            height: 60px; /* Fiks balandlik */
            flex: none;
          }
        }

        .nav-item:hover {
          color: #e0e0e0;
        }

        .nav-item.active {
          color: #cfab56;
        }

        /* Ikonkalar */
        .icon-wrapper {
          font-size: 22px;
          margin-bottom: 4px;
          z-index: 2;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .nav-item.active .icon-wrapper {
          transform: translateY(-2px);
          filter: drop-shadow(0 0 8px rgba(207, 171, 86, 0.6));
        }

        /* Matn */
        .nav-text {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          z-index: 2;
          transition: opacity 0.3s;
        }

        /* Chat rejimida matnni yashirish (sig'maydi) */
        @media (min-width: 768px) {
           .nav-item.chat-mode .nav-text {
             display: none;
           }
           .nav-item.chat-mode .icon-wrapper {
             margin-bottom: 0;
             font-size: 24px;
           }
        }

        /* Aktiv indikator (Default: Tepa chiziqcha) */
        .active-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 3px;
          background: #cfab56;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 0 10px #cfab56;
          animation: slideDown 0.3s ease-out;
          transition: all 0.3s;
        }

        /* Aktiv indikator (Chat Mode: Chap yon chiziqcha) */
        @media (min-width: 768px) {
          .active-indicator.chat-mode {
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            width: 3px;
            height: 30px;
            border-radius: 0 4px 4px 0;
          }
        }

        /* Glow effekti */
        .glow-effect {
          position: absolute;
          width: 50px;
          height: 50px;
          background: radial-gradient(circle, rgba(207, 171, 86, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
          animation: pulse 2s infinite;
        }

        @keyframes slideDown {
          from { top: -5px; opacity: 0; }
          to { top: 0; opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.5; }
        }

        @media (max-width: 320px) {
          .nav-text { display: none; }
          .icon-wrapper { font-size: 24px; margin-bottom: 0; }
        }
      `}</style>
    </>
  );
}