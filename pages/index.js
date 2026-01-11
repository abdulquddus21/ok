import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('auth');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const saveUser = (userData) => {
    setUser(userData);
    localStorage.setItem('mlbb_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mlbb_user');
    setStep('auth');
    setIsLogin(true);
    setUsername('');
    setPassword('');
  };

  // --- LOGIK QISMLAR ---
  const handleRegisterStart = (e) => { 
    e.preventDefault(); 
    if (password !== confirmPass) { setMessage("Parollar mos kelmadi!"); return; } 
    if (username.length < 3 || password.length < 4) { setMessage("Ism yoki parol juda qisqa!"); return; } 
    setMessage(''); 
    setStep('verify'); 
  };

  const handleVerifyAndRegister = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    setMessage(''); 
    
    const { data: codeData, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', verifyCode)
      .single(); 
      
    if (codeError || !codeData) { 
      setLoading(false); 
      setMessage("Kod noto'g'ri!"); 
      return; 
    } 
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ username, password }])
      .select()
      .single(); 
      
    if (userError) { 
      setLoading(false); 
      setMessage("Xatolik yuz berdi! (Nom band bo'lishi mumkin)"); 
      return; 
    } 
    
    await supabase.from('verification_codes').delete().eq('code', verifyCode); 
    setLoading(false); 
    saveUser(userData); 
    setMessage("Muvaffaqiyatli!"); 
  };

  const handleLogin = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    setMessage(''); 
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single(); 
      
    setLoading(false); 
    if (error || !data) { 
      setMessage("Login yoki parol noto'g'ri!"); 
    } else { 
      saveUser(data); 
    } 
  };

  return (
    <div className="container">
      <Head>
        <title>MLBB Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      
      {/* Orqa fon uchun dekoratsiya */}
      <div className="bg-glow"></div>

      {user && <Navbar user={user} />}

      <main className="main">
        {user ? (
          // --- DASHBOARD VIEW ---
          <div className="card dashboard-card">
            <div className="header-box">
              <h1 className="gold-text">Xush Kelibsiz, {user.username}!</h1>
              <p className="silver-text">Afsonalar safiga qaytganingizdan xursandmiz.</p>
            </div>
            
            <div className="action-grid">
              <button onClick={() => router.push('/news')} className="btn btn-primary">
                <span className="icon">📰</span> Yangiliklar
              </button>
              <button onClick={() => router.push('/chat')} className="btn btn-primary">
                <span className="icon">💬</span> Umumiy Chat
              </button>
              <button onClick={logout} className="btn btn-danger">
                Chiqish
              </button>
            </div>
          </div>
        ) : (
          // --- AUTH CARD ---
          <div className="card auth-card">
            <h1 className="title">
              {step === 'verify' ? 'KODNI TASDIQLASH' : (isLogin ? 'TIZIMGA KIRISH' : "RO'YXATDAN O'TISH")}
            </h1>
            
            {message && <div className="error-msg">{message}</div>}
            
            {step === 'auth' && (
              <form onSubmit={isLogin ? handleLogin : handleRegisterStart} className="form">
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder=" " 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                  />
                  <label>Foydalanuvchi nomi</label>
                </div>
                
                <div className="input-group">
                  <input 
                    type="password" 
                    placeholder=" " 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                  <label>Parol</label>
                </div>
                
                {!isLogin && (
                  <div className="input-group">
                    <input 
                      type="password" 
                      placeholder=" " 
                      value={confirmPass} 
                      onChange={(e) => setConfirmPass(e.target.value)} 
                      required 
                    />
                    <label>Parolni tasdiqlang</label>
                  </div>
                )}

                <button type="submit" className="btn btn-gold" disabled={loading}>
                  {loading ? <div className="spinner"></div> : (isLogin ? 'KIRISH' : "DAVOM ETISH")}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <div className="verify-box">
                <p className="instruction">Tasdiqlash kodi Telegram botimizga yuborildi.</p>
                <a href="https://t.me/Edutoon_bot" target="_blank" rel="noreferrer" className="bot-link">
                   🤖 Botdan kod olish
                </a>
                
                <form onSubmit={handleVerifyAndRegister} className="form">
                  <div className="input-group">
                    <input 
                      type="text" 
                      placeholder=" "
                      value={verifyCode} 
                      onChange={(e) => setVerifyCode(e.target.value)} 
                      required 
                    />
                    <label>Kod (123456)</label>
                  </div>
                  <button type="submit" className="btn btn-gold">TASDIQLASH</button>
                </form>
                
                <button onClick={() => setStep('auth')} className="btn-link">
                  Ortga qaytish
                </button>
              </div>
            )}

            {step === 'auth' && (
              <div className="switch-text">
                {isLogin ? "Hisobingiz yo'qmi?" : "Allaqachon bormi?"} 
                <span onClick={() => {setMessage(''); setIsLogin(!isLogin)}} className="link-toggle">
                  {isLogin ? " Ro'yxatdan o'tish" : " Kirish"}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- STYLES --- */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=Roboto:wght@400;500&display=swap');

        html, body {
          margin: 0;
          padding: 0;
          background-color: #0b1120;
          color: #fff;
          font-family: 'Roboto', sans-serif;
          overflow-x: hidden;
          /* Mobil scroll effektini yumshatish */
          -webkit-tap-highlight-color: transparent;
        }
        
        * { box-sizing: border-box; }
      `}</style>

      <style jsx>{`
        /* Container va Background */
        .container {
          min-height: 100vh;
          /* Mobilda manzil qatori hisobga olinishi uchun */
          min-height: 100dvh; 
          display: flex;
          flex-direction: column;
          position: relative;
          background: radial-gradient(circle at top center, #1e2a45 0%, #0b1120 80%);
          overflow: hidden;
        }

        .bg-glow {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(200, 160, 83, 0.15) 0%, rgba(0,0,0,0) 70%);
          z-index: 0;
          pointer-events: none;
        }

        .main {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 1;
          width: 100%;
        }

        /* CARD STYLES (Glassmorphism) */
        .card {
          background: rgba(18, 26, 43, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 1px solid rgba(200, 160, 83, 0.3);
          border-bottom: 1px solid rgba(200, 160, 83, 0.3);
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .dashboard-card {
          max-width: 600px;
        }

        /* Typography */
        .title {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 28px;
          letter-spacing: 2px;
          color: #f0f0f0;
          margin-bottom: 30px;
          text-transform: uppercase;
          background: linear-gradient(to right, #fff, #cfab56);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gold-text {
          color: #cfab56;
          font-family: 'Rajdhani', sans-serif;
          font-size: 32px;
          margin-bottom: 5px;
          line-height: 1.2;
        }
        
        .silver-text {
          color: #a0aab5;
          font-size: 14px;
        }

        .instruction {
          color: #ccc;
          font-size: 14px;
          margin-bottom: 10px;
        }

        /* INPUTS */
        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          position: relative;
          text-align: left;
        }

        .input-group input {
          width: 100%;
          padding: 12px 10px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid #2d3b55;
          border-radius: 6px;
          color: white;
          font-size: 16px; /* iOS zoom issue fix */
          outline: none;
          transition: all 0.3s ease;
        }

        .input-group input:focus {
          border-color: #cfab56;
          box-shadow: 0 0 8px rgba(207, 171, 86, 0.2);
        }

        .input-group label {
          position: absolute;
          left: 12px;
          top: 12px;
          color: #6c7a89;
          font-size: 16px;
          pointer-events: none;
          transition: 0.3s ease;
        }

        /* Input label animatsiyasi */
        .input-group input:focus ~ label,
        .input-group input:not(:placeholder-shown) ~ label {
          top: -10px;
          left: 8px;
          font-size: 12px;
          background: #121a2b;
          padding: 0 4px;
          color: #cfab56;
        }

        /* BUTTONS */
        .btn {
          padding: 14px;
          border: none;
          border-radius: 6px;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          text-transform: uppercase;
          letter-spacing: 1px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          /* Mobil click area yaxshilash */
          min-height: 48px;
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn-gold {
          background: linear-gradient(135deg, #cfab56 0%, #a67c2e 100%);
          color: #000;
          box-shadow: 0 4px 15px rgba(207, 171, 86, 0.4);
        }
        
        .btn-gold:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(207, 171, 86, 0.6);
        }

        .btn-primary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
          margin-bottom: 10px;
        }
        
        .btn-primary:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #fff;
        }

        .btn-danger {
          background: transparent;
          border: 1px solid #ff4d4f;
          color: #ff4d4f;
          margin-top: 20px;
        }
        
        .btn-danger:hover {
          background: #ff4d4f;
          color: #fff;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-link {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          margin-top: 15px;
          text-decoration: underline;
          font-size: 14px;
        }

        /* LINKS & EXTRAS */
        .bot-link {
          display: inline-block;
          color: #4aa3df;
          text-decoration: none;
          margin-bottom: 20px;
          font-weight: bold;
          border: 1px dashed #4aa3df;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
        }

        .switch-text {
          margin-top: 25px;
          font-size: 14px;
          color: #aaa;
          line-height: 1.5;
        }

        .link-toggle {
          color: #cfab56;
          cursor: pointer;
          font-weight: bold;
          transition: color 0.3s;
          display: inline-block;
          padding: 5px;
        }
        
        .link-toggle:hover {
          color: #e6c885;
          text-decoration: underline;
        }

        .error-msg {
          background: rgba(255, 77, 79, 0.15);
          border: 1px solid #ff4d4f;
          color: #ff4d4f;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.4;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* --- MOBILE RESPONSIVE TWEAKS --- */
        @media (max-width: 600px) {
          .bg-glow {
            width: 100%;
            height: 400px;
            top: -50px;
          }

          .card {
            padding: 25px 20px;
            width: 95%; /* Ekranning 95% ini egallaydi */
            margin: 0 auto;
          }

          .title {
            font-size: 24px;
            margin-bottom: 25px;
          }

          .gold-text {
            font-size: 26px;
          }

          .form {
            gap: 18px;
          }

          .input-group input {
            padding: 14px 12px; /* Kattaroq touch area */
          }
          
          .btn {
            font-size: 15px;
            padding: 16px;
          }
        }
        
        @media (max-height: 700px) {
           /* Past bo'yli telefonlar uchun (landscape) */
           .container {
             justify-content: flex-start;
             overflow-y: auto;
           }
           .main {
             padding-top: 40px;
             padding-bottom: 40px;
           }
        }
      `}</style>
    </div>
  )
}