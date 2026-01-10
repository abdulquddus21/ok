import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/Home.module.css'
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

  // ... (handleLogin, handleRegisterStart, handleVerifyAndRegister funksiyalari avvalgidek qoladi)
  // Joyni tejash uchun ularni qisqartirib yozmadim, eski kodingizdagi login funksiyalarini shu yerda ishlating.
  
  // LOGIN LOGIKASI (Eski kod bilan bir xil)
  const handleRegisterStart = (e) => { e.preventDefault(); if (password !== confirmPass) { setMessage("Parollar mos kelmadi!"); return; } if (username.length < 3 || password.length < 4) { setMessage("Ism yoki parol juda qisqa!"); return; } setMessage(''); setStep('verify'); };
  const handleVerifyAndRegister = async (e) => { e.preventDefault(); setLoading(true); setMessage(''); const { data: codeData, error: codeError } = await supabase.from('verification_codes').select('*').eq('code', verifyCode).single(); if (codeError || !codeData) { setLoading(false); setMessage("Kod noto'g'ri!"); return; } const { data: userData, error: userError } = await supabase.from('users').insert([{ username, password }]).select().single(); if (userError) { setLoading(false); setMessage("Xatolik!"); return; } await supabase.from('verification_codes').delete().eq('code', verifyCode); setLoading(false); saveUser(userData); setMessage("Muvaffaqiyatli!"); };
  const handleLogin = async (e) => { e.preventDefault(); setLoading(true); setMessage(''); const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single(); setLoading(false); if (error || !data) { setMessage("Login yoki parol noto'g'ri!"); } else { saveUser(data); } };


  return (
    <div className={styles.container}>
      <Head>
        <title>MLBB Dashboard</title>
      </Head>
      
      {/* Agar login qilgan bo'lsa Navbar chiqadi */}
      {user && <Navbar user={user} />}

      <main className={styles.main}>
        {user ? (
          <div className={styles.dashboard}>
            <div className={styles.authCard}>
              <h1 className={styles.goldText}>Xush Kelibsiz, {user.username}!</h1>
              <p className={styles.silverText}>Boshqaruv paneliga marhamat.</p>
              
              <div style={{display: 'grid', gap: '15px', marginTop: '20px'}}>
                <button onClick={() => router.push('/news')} className={styles.buttonPrimary}>
                  📰 Yangiliklarni o'qish
                </button>
                <button onClick={() => router.push('/chat')} className={styles.buttonPrimary}>
                  💬 Chatga kirish
                </button>
                <button onClick={logout} className={styles.buttonSecondary}>
                  Chiqish
                </button>
              </div>
            </div>
          </div>
        ) : (
           /* LOGIN FORM (O'zgarmagan) */
          <div className={styles.authCard}>
            <h1 className={styles.title}>
              {step === 'verify' ? 'TASDIQLASH' : (isLogin ? 'KIRISH' : "RO'YXATDAN O'TISH")}
            </h1>
            {message && <div className={styles.error}>{message}</div>}
            {step === 'auth' && (
              <form onSubmit={isLogin ? handleLogin : handleRegisterStart} className={styles.form}>
                <div className={styles.inputGroup}><label>Foydalanuvchi nomi</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
                <div className={styles.inputGroup}><label>Parol</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                {!isLogin && (<div className={styles.inputGroup}><label>Parolni tasdiqlang</label><input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} required /></div>)}
                <button type="submit" className={styles.buttonPrimary} disabled={loading}>{loading ? '...' : (isLogin ? 'KIRISH' : "RO'YXATDAN O'TISH")}</button>
              </form>
            )}
            {step === 'verify' && (
              <div className={styles.verifyBox}>
                <p className={styles.instruction}>Telegram botdan kod oling.</p>
                <a href="https://t.me/Edutoon_bot" target="_blank" className={styles.botLink}>Kod olish</a>
                <form onSubmit={handleVerifyAndRegister} className={styles.form}>
                  <div className={styles.inputGroup}><input type="text" placeholder="Kod" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} required /></div>
                  <button type="submit" className={styles.buttonPrimary}>TASDIQLASH</button>
                </form>
                <button onClick={() => setStep('auth')} className={styles.backButton}>Ortga</button>
              </div>
            )}
            {step === 'auth' && (
              <p className={styles.switchText}>{isLogin ? "Yo'qmi?" : "Bormi?"} <span onClick={() => {setMessage(''); setIsLogin(!isLogin)}} className={styles.link}>{isLogin ? "Ro'yxatdan o'tish" : "Kirish"}</span></p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}