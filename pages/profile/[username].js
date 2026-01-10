import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { FaSignOutAlt, FaCalendarAlt, FaGamepad, FaTrophy, FaMedal, FaStar } from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/Home.module.css'
import Navbar from '../../components/Navbar'

export default function Profile() {
  const router = useRouter();
  const { username } = router.query;
  
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('mlbb_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const user = JSON.parse(storedUser);
    setCurrentUser(user);

    if (username) {
      fetchProfile(username);
    }
  }, [username]);

  const fetchProfile = async (targetUsername) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('username, created_at, id')
      .eq('username', targetUsername)
      .single();
    
    if (data) {
      setProfileData(data);
    }
    setLoading(false);
  };

  const logout = () => {
    if (confirm("Haqiqatan ham chiqmoqchimisiz?")) {
      localStorage.removeItem('mlbb_user');
      router.push('/');
    }
  };

  if (loading) return (
    <div className={styles.container}>
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner}></div>
        <h2 className={styles.goldText}>Yuklanmoqda...</h2>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>Profil: {username}</title>
      </Head>

      <main className={styles.main} style={{paddingBottom: '80px'}}> {/* Navbar joyi */}
        
        {/* PROFILE HEADER CARD */}
        <div className={styles.profileCard}>
          
          {/* Avatar Section */}
          <div className={styles.profileHeader}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarImg}>
                 {profileData?.username?.[0].toUpperCase()}
              </div>
              <div className={styles.rankBadge}>
                <FaStar /> 12
              </div>
            </div>
            
            <h1 className={styles.profileName}>{profileData?.username}</h1>
            <p className={styles.profileId}>ID: {profileData?.id?.split('-')[0] || '123456'} (Server 1)</p>
            
            {/* Rank Display */}
            <div className={styles.rankDisplay}>
               <FaTrophy className={styles.rankIcon} />
               <span>Mythic Glory</span>
            </div>
          </div>

          {/* GAME STATS (MOCK DATA - O'xshatish uchun) */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>O'yinlar</span>
              <span className={styles.statValue}>1,204</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Win Rate</span>
              <span className={styles.statValue} style={{color: '#cfae5f'}}>58.4%</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>MVP</span>
              <span className={styles.statValue}>342</span>
            </div>
          </div>

          {/* DETAILS LIST */}
          <div className={styles.detailsList}>
            <div className={styles.detailRow}>
              <div className={styles.detailIconBox}><FaCalendarAlt /></div>
              <div className={styles.detailContent}>
                <span>Ro'yxatdan o'tgan sana</span>
                <strong>{new Date(profileData?.created_at).toLocaleDateString()}</strong>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailIconBox}><FaGamepad /></div>
              <div className={styles.detailContent}>
                <span>Sevimli Rol</span>
                <strong>Jungle / Assassin</strong>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailIconBox}><FaMedal /></div>
              <div className={styles.detailContent}>
                <span>Kredit Bali</span>
                <strong style={{color: '#00ffaa'}}>110 (A'lo)</strong>
              </div>
            </div>
          </div>

          {/* LOGOUT BUTTON */}
          {currentUser?.username === profileData?.username && (
            <button onClick={logout} className={styles.logoutBtn}>
              <FaSignOutAlt style={{marginRight: '8px'}} /> Akkountdan Chiqish
            </button>
          )}

        </div>
      </main>

      <Navbar user={currentUser} />
    </div>
  )
}