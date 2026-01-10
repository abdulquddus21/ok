// components/Navbar.js
import { useRouter } from 'next/router';
import { FaHome, FaNewspaper, FaComments, FaUser } from 'react-icons/fa'; // Iconlar
import styles from '../styles/Home.module.css';

export default function Navbar({ user }) {
  const router = useRouter();

  if (!user) return null;

  // Active klassni aniqlash funksiyasi
  const isActive = (path) => router.pathname === path ? styles.activeNav : '';

  return (
    <nav className={styles.navbar}>
      <button 
        onClick={() => router.push('/')} 
        className={`${styles.navItem} ${isActive('/')}`}
      >
        <FaHome className={styles.navIcon} />
        <span className={styles.navText}>Asosiy</span>
      </button>

      <button 
        onClick={() => router.push('/news')} 
        className={`${styles.navItem} ${isActive('/news')}`}
      >
        <FaNewspaper className={styles.navIcon} />
        <span className={styles.navText}>Yangiliklar</span>
      </button>

      <button 
        onClick={() => router.push('/chat')} 
        className={`${styles.navItem} ${isActive('/chat') || router.pathname.startsWith('/chat/') ? styles.activeNav : ''}`}
      >
        <FaComments className={styles.navIcon} />
        <span className={styles.navText}>Chat</span>
      </button>

      <button 
        onClick={() => router.push(`/profile/${user.username}`)} 
        className={`${styles.navItem} ${router.query.username === user.username ? styles.activeNav : ''}`}
      >
        <FaUser className={styles.navIcon} />
        <span className={styles.navText}>Profil</span>
      </button>
    </nav>
  );
}