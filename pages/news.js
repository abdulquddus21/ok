import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { FaBullhorn, FaGamepad, FaTrophy, FaCalendarAlt, FaArrowRight, FaTag } from 'react-icons/fa'

export default function News() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) return null;

  // Yangiliklar bazasi (Mock Data)
  const newsData = [
    {
      id: 1,
      title: "Yangi Qahramon: Arlott",
      category: "HERO",
      date: "10 Yanvar, 2024",
      desc: "Mobile Legends dunyosiga 'Yolg'iz Nayza' - Arlott qo'shildi. Uning qobiliyatlari dushmanni boshqarish va yuqori darajadagi jismoniy zarar yetkazishga qaratilgan.",
      color: "#ff4d4f", // Qizil
      icon: <FaGamepad />
    },
    {
      id: 2,
      title: "M5 Jahon Chempionati",
      category: "ESPORTS",
      date: "08 Yanvar, 2024",
      desc: "M5 Jahon chempionati saralash bosqichlari o'z yakuniga yetmoqda. O'zbekiston mintaqasidan qatnashayotgan jamoalar uchun ovoz berishni unutmang!",
      color: "#cfab56", // Tilla
      icon: <FaTrophy />
    },
    {
      id: 3,
      title: "Yangilanish 1.7.94",
      category: "UPDATE",
      date: "05 Yanvar, 2024",
      desc: "Katta balans o'zgarishlari: Layla va Hanabi 'Revamp' qilindi. Fanny energiyasi biroz kamaytirildi. Yangi 'Mythic' darajalari qo'shildi.",
      color: "#4aa3df", // Moviy
      icon: <FaBullhorn />
    }
  ];

  return (
    <div className="container">
      <Head>
        <title>Yangiliklar | MLBB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="bg-glow"></div>
      
      <Navbar user={user} />
      
      <main className="main">
        <div className="content-wrapper">
          
          {/* Header */}
          <div className="page-header">
            <h1 className="title">O'YIN YANGILIKLARI</h1>
            <p className="subtitle">Land of Dawn dunyosidagi so'nggi o'zgarishlardan xabardor bo'ling.</p>
          </div>

          {/* News Grid */}
          <div className="news-grid">
            {newsData.map((item) => (
              <div key={item.id} className="news-card">
                
                {/* Card Header (Icon & Category) */}
                <div className="card-top">
                  <div className="icon-box" style={{ backgroundColor: `${item.color}20`, color: item.color, border: `1px solid ${item.color}` }}>
                    {item.icon}
                  </div>
                  <span className="category-badge" style={{ color: item.color, borderColor: item.color }}>
                    <FaTag style={{fontSize: 10}}/> {item.category}
                  </span>
                </div>

                {/* Content */}
                <h2 className="news-title">{item.title}</h2>
                <div className="news-date">
                  <FaCalendarAlt /> {item.date}
                </div>
                <p className="news-desc">{item.desc}</p>

                {/* Footer / Button */}
                <div className="card-footer">
                  <button className="read-more">
                    Batafsil <FaArrowRight />
                  </button>
                </div>

                {/* Dekorativ chiziq */}
                <div className="card-border-bottom" style={{ background: item.color }}></div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* --- STYLES --- */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Roboto:wght@400;500&display=swap');
        body { margin: 0; background: #0b1120; color: #fff; font-family: 'Roboto', sans-serif; }
      `}</style>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: radial-gradient(circle at top center, #1e2a45 0%, #0b1120 80%);
          position: relative;
          overflow-x: hidden;
        }

        .bg-glow {
          position: absolute;
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          height: 500px;
          background: radial-gradient(circle, rgba(207, 171, 86, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .main {
          padding: 20px;
          padding-bottom: 100px; /* Navbar joyi */
          display: flex;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .content-wrapper {
          width: 100%;
          max-width: 800px;
        }

        /* HEADER */
        .page-header {
          text-align: center;
          margin-bottom: 40px;
          animation: fadeIn 0.8s ease-out;
        }

        .title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #cfab56;
          text-transform: uppercase;
          margin-bottom: 5px;
          text-shadow: 0 0 20px rgba(207, 171, 86, 0.3);
        }

        .subtitle {
          color: #8899ac;
          font-size: 14px;
        }

        /* GRID */
        .news-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* CARD */
        .news-card {
          background: rgba(18, 26, 43, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 25px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          animation: slideUp 0.5s ease-out;
          animation-fill-mode: backwards;
        }

        /* Card animatsiyasi ketma-ket chiqishi uchun */
        .news-card:nth-child(1) { animation-delay: 0.1s; }
        .news-card:nth-child(2) { animation-delay: 0.2s; }
        .news-card:nth-child(3) { animation-delay: 0.3s; }

        .news-card:hover {
          transform: translateY(-5px);
          background: rgba(18, 26, 43, 0.8);
          box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Card Top */
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .icon-box {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .category-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* Text Content */
        .news-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          color: #f0f0f0;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }

        .news-date {
          font-size: 12px;
          color: #6c7a89;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 15px;
        }

        .news-desc {
          color: #a0aab5;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        /* Button */
        .read-more {
          background: transparent;
          border: none;
          color: #cfab56;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          transition: gap 0.2s;
        }

        .news-card:hover .read-more {
          gap: 12px;
          text-shadow: 0 0 10px rgba(207, 171, 86, 0.4);
        }

        /* Pastki rangli chiziq */
        .card-border-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          opacity: 0.5;
        }

        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive */
        @media (min-width: 768px) {
          .news-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }
          .title { font-size: 42px; }
        }
      `}</style>
    </div>
  )
}