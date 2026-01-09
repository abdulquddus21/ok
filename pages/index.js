import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router' // Router qo'shildi
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/Home.module.css'

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

  // 1. Sahifa yuklanganda LocalStorage ni tekshirish
  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
      setMessage("Kod noto'g'ri yoki muddati tugagan!");
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ username, password }])
      .select()
      .single();

    if (userError) {
      setLoading(false);
      setMessage("Bu foydalanuvchi nomi band yoki xatolik!");
      return;
    }

    await supabase.from('verification_codes').delete().eq('code', verifyCode);

    setLoading(false);
    saveUser(userData); // Saqlash funksiyasini chaqiramiz
    setMessage("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
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
      saveUser(data); // Saqlash funksiyasini chaqiramiz
    }
  };

  // 2. Userni State va LocalStorage ga saqlash
  const saveUser = (userData) => {
    setUser(userData);
    localStorage.setItem('mlbb_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mlbb_user'); // O'chirish
    setStep('auth');
    setIsLogin(true);
    setUsername('');
    setPassword('');
  };

  // Profilga o'tish funksiyasi
  const goToProfile = () => {
    if (user) {
      router.push(`/profile/${user.username}`);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>MLBB News & Auth</title>
        <meta name="description" content="MLBB Style App" />
      </Head>

      <main className={styles.main}>
        
        {/* TIZIMGA KIRGAN HOLAT (NEWS PAGE) */}
        {user ? (
          <div className={styles.dashboard}> {/* CSS da dashboard stili authCard bilan o'xshash bo'lishi kerak */}
            <div className={styles.authCard} style={{maxWidth: '600px'}}>
              <h1 className={styles.goldText}>YANGILIKLAR</h1>
              
              <div style={{textAlign: 'left', color: '#8899aa', margin: '20px 0'}}>
                <div style={{marginBottom: '15px', borderBottom: '1px solid #334455', paddingBottom: '10px'}}>
                  <h3 style={{color: '#fff'}}>Yangi Qahramon: Arlott</h3>
                  <p>Mobile Legends dunyosiga yangi qahramon qo'shildi. Batafsil ma'lumot tez orada...</p>
                </div>
                <div style={{marginBottom: '15px', borderBottom: '1px solid #334455', paddingBottom: '10px'}}>
                  <h3 style={{color: '#fff'}}>M4 Chempionati</h3>
                  <p>Jahon chempionati yakunlandi. G'oliblarni tabriklaymiz!</p>
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button onClick={goToProfile} className={styles.buttonPrimary} style={{flex: 1}}>
                   Mening Profilim
                </button>
                <button onClick={logout} className={styles.buttonSecondary} style={{marginTop: '10px'}}>
                  Chiqish
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* LOGIN / REGISTER FORM (AVVALGI KOD) */
          <div className={styles.authCard}>
            <h1 className={styles.title}>
              {step === 'verify' ? 'TASDIQLASH' : (isLogin ? 'KIRISH' : "RO'YXATDAN O'TISH")}
            </h1>

            {message && <div className={styles.error}>{message}</div>}

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