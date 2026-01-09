// pages/profile/[username].js
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/Home.module.css' // Style ni import qilish

export default function Profile() {
  const router = useRouter();
  const { username } = router.query; // URL dan username ni olish
  
  const [currentUser, setCurrentUser] = useState(null); // Tizimga kirgan odam
  const [profileData, setProfileData] = useState(null); // Profil egasi ma'lumotlari
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Tizimga kirgan userni tekshirish
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/'); // Login qilmagan bo'lsa bosh sahifaga otish
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    // 2. Agar URL da username bo'lsa, bazadan ma'lumot olish
    if (username) {
      fetchProfile(username);
    }
  }, [username]); // username o'zgarganda qayta ishlaydi

  const fetchProfile = async (targetUsername) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('username, created_at, id') // Parolni olmang!
      .eq('username', targetUsername)
      .single();
    
    if (data) {
      setProfileData(data);
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('mlbb_user');
    router.push('/');
  };

  if (loading) return (
    <div className={styles.container}>
      <h1 className={styles.goldText}>Yuklanmoqda...</h1>
    </div>
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>Profil: {username}</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.authCard}>
          
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
             {/* Oddiy Avatar o'rniga doira */}
             <div style={{
               width: '80px', height: '80px', 
               background: '#1a2639', borderRadius: '50%', 
               border: '2px solid #cfae5f', margin: '0 auto 15px',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: '2rem', color: '#cfae5f'
             }}>
               {profileData?.username?.[0].toUpperCase()}
             </div>
             
             <h1 className={styles.goldText}>{profileData?.username}</h1>
             <p className={styles.silverText}>ID: {profileData?.id.slice(0, 8)}...</p>
          </div>

          <div style={{borderTop: '1px solid #334455', paddingTop: '20px'}}>
            <div className={styles.inputGroup}>
              <label>Ro'yxatdan o'tgan sana:</label>
              <div style={{color: '#fff', padding: '10px 0'}}>
                {new Date(profileData?.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className={styles.inputGroup} style={{marginTop: '10px'}}>
              <label>Daraja (Rank):</label>
              <div style={{color: '#cfae5f', fontWeight: 'bold', padding: '10px 0'}}>
                Epic II (Misol uchun)
              </div>
            </div>
          </div>

          <div style={{marginTop: '30px', display: 'flex', gap: '10px', flexDirection: 'column'}}>
            <button onClick={() => router.push('/')} className={styles.buttonSecondary}>
              &larr; Yangiliklarga qaytish
            </button>
            
            {/* Faqat o'z profili bo'lsa chiqish tugmasini ko'rsatish */}
            {currentUser?.username === profileData?.username && (
              <button onClick={logout} className={styles.buttonPrimary} style={{backgroundColor: '#8b0000', color: '#fff'}}>
                Akkountdan chiqish
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}