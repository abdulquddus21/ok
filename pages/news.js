import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import styles from '../styles/Home.module.css'

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

  return (
    <div className={styles.container}>
      <Head><title>Yangiliklar</title></Head>
      <Navbar user={user} />
      
      <main className={styles.main}>
        <div className={styles.authCard} style={{maxWidth: '800px'}}>
          <h1 className={styles.title}>📢 O'YIN YANGILIKLARI</h1>
          
          <div style={{textAlign: 'left', color: '#8899aa', display: 'flex', flexDirection: 'column', gap: '20px'}}>
            
            <div className={styles.chatItem} style={{cursor: 'default', display: 'block'}}>
              <h2 className={styles.goldText}>Yangi Qahramon: Arlott</h2>
              <p style={{marginTop: '5px'}}>Mobile Legends dunyosiga yangi qahramon Arlott qo'shildi. Uning qobiliyatlari juda kuchli va u jangchi sinfiga mansub.</p>
            </div>

            <div className={styles.chatItem} style={{cursor: 'default', display: 'block'}}>
              <h2 className={styles.goldText}>M5 Chempionati</h2>
              <p style={{marginTop: '5px'}}>M5 Jahon chempionati saralash bosqichlari boshlandi. O'zbekiston jamoalariga omad tilaymiz!</p>
            </div>

            <div className={styles.chatItem} style={{cursor: 'default', display: 'block'}}>
              <h2 className={styles.goldText}>Yangilanish 1.7.94</h2>
              <p style={{marginTop: '5px'}}>Balans o'zgarishlari: Layla va Hanabi kuchaytirildi. Fanny biroz kuchsizlantirildi.</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}