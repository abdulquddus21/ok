import Head from 'next/head'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true); // Login yoki Register holati
  const [step, setStep] = useState('auth'); // 'auth' yoki 'verify'
  
  // Inputlar
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null); // Tizimga kirgan user

  // Ro'yxatdan o'tishni boshlash
  const handleRegisterStart = (e) => {
    e.preventDefault();
    if (password !== confirmPass) {
      setMessage("Parollar mos kelmadi!");
      return;
    }
    if (username.length < 3 || password.length < 4) {
      setMessage("Ism yoki parol juda qisqa!");
      return;
    }
    // Agar hamma narsa to'g'ri bo'lsa, kod kiritish bosqichiga o'tamiz
    setMessage('');
    setStep('verify');
  };

  // Kodni tekshirish va User yaratish
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // 1. Kodni bazadan tekshirish
    const { data: codeData, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', verifyCode)
      .single();

    if (codeError || !codeData) {
      setLoading(false);
      setMessage("Kod noto'g'ri yoki muddati tugagan!");
      return;
    }

    // 2. Userni yaratish
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ username, password }]) // Eslatma: Real loyihada parolni shifrlang!
      .select()
      .single();

    if (userError) {
      setLoading(false);
      setMessage("Bu foydalanuvchi nomi band yoki xatolik: " + userError.message);
      return;
    }

    // 3. Kodni o'chirish (bir martalik)
    await supabase.from('verification_codes').delete().eq('code', verifyCode);

    setLoading(false);
    setUser(userData);
    setMessage("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
  };

  // Login qilish
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Real loyihada hashni tekshirish kerak
      .single();

    setLoading(false);
    if (error || !data) {
      setMessage("Login yoki parol noto'g'ri!");
    } else {
      setUser(data);
    }
  };

  const logout = () => {
    setUser(null);
    setStep('auth');
    setIsLogin(true);
    setUsername('');
    setPassword('');
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>MLBB Style Auth</title>
        <meta name="description" content="MLBB Style Login" />
      </Head>

      <main className={styles.main}>
        
        {/* Agar foydalanuvchi tizimga kirgan bo'lsa */}
        {user ? (
          <div className={styles.dashboard}>
            <h1 className={styles.goldText}>Xush kelibsiz, {user.username}!</h1>
            <p className={styles.silverText}>Siz muvaffaqiyatli tizimga kirdingiz.</p>
            <button onClick={logout} className={styles.buttonSecondary}>Chiqish</button>
          </div>
        ) : (
          /* AUTH FORM */
          <div className={styles.authCard}>
            <h1 className={styles.title}>
              {step === 'verify' ? 'TASDIQLASH' : (isLogin ? 'KIRISH' : "RO'YXATDAN O'TISH")}
            </h1>

            {/* ERROR MESSAGE */}
            {message && <div className={styles.error}>{message}</div>}

            {/* LOGIN / REGISTER FORM */}
            {step === 'auth' && (
              <form onSubmit={isLogin ? handleLogin : handleRegisterStart} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Foydalanuvchi nomi</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Parol</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>

                {!isLogin && (
                  <div className={styles.inputGroup}>
                    <label>Parolni tasdiqlang</label>
                    <input 
                      type="password" 
                      value={confirmPass} 
                      onChange={(e) => setConfirmPass(e.target.value)} 
                      required 
                    />
                  </div>
                )}

                <button type="submit" className={styles.buttonPrimary} disabled={loading}>
                  {loading ? 'Yuklanmoqda...' : (isLogin ? 'TIZIMGA KIRISH' : "RO'YXATDAN O'TISH")}
                </button>
              </form>
            )}

            {/* VERIFICATION FORM */}
            {step === 'verify' && (
              <div className={styles.verifyBox}>
                <p className={styles.instruction}>
                  Ro'yxatdan o'tishni yakunlash uchun Telegram botimizdan kod oling.
                </p>
                <a 
                  href="https://t.me/Edutoon_bot" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.botLink}
                >
                  Kod olish (Botga o'tish)
                </a>
                
                <form onSubmit={handleVerifyAndRegister} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label>6 xonalik kodni kiriting</label>
                    <input 
                      type="text" 
                      placeholder="123456"
                      value={verifyCode} 
                      onChange={(e) => setVerifyCode(e.target.value)} 
                      maxLength={6}
                      required 
                    />
                  </div>
                  <button type="submit" className={styles.buttonPrimary} disabled={loading}>
                    {loading ? 'Tekshirilmoqda...' : 'TASDIQLASH'}
                  </button>
                </form>
                <button onClick={() => setStep('auth')} className={styles.backButton}>Ortga qaytish</button>
              </div>
            )}

            {/* SWITCH LOGIN/REGISTER */}
            {step === 'auth' && (
              <p className={styles.switchText}>
                {isLogin ? "Akkountingiz yo'qmi?" : "Akkountingiz bormi?"}{' '}
                <span onClick={() => {setMessage(''); setIsLogin(!isLogin)}} className={styles.link}>
                  {isLogin ? "Ro'yxatdan o'tish" : "Kirish"}
                </span>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}