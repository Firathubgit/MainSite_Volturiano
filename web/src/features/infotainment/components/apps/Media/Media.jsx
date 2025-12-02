/**
 * Media Player App Component
 * Music player with playlists and playback controls
 */
import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Home,
  Search,
  Library,
  ListMusic,
  Mic2,
  Disc,
  Radio,
  TrendingUp,
  Plus,
} from 'lucide-react';
import styles from './Media.module.css';

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${styles.sidebarItem} ${active ? styles.sidebarItemActive : ''}`}
    >
      <Icon size={18} className={active ? styles.sidebarIconActive : ''} />
      <span className={styles.sidebarLabel}>{label}</span>
    </button>
  );
}

function PlaylistItem({ label, icon: Icon = ListMusic, active = false }) {
  return (
    <button className={`${styles.playlistItem} ${active ? styles.playlistItemActive : ''}`}>
      <div className={styles.playlistIcon}>
        <Icon size={12} />
      </div>
      <div className={styles.playlistContent}>
        <p className={styles.playlistLabel}>{label}</p>
      </div>
    </button>
  );
}

const PLAYLISTS = [
  { title: 'Night Rider', artist: 'Synthwave Mix', color: 'purple' },
  { title: 'Daily Drive', artist: 'Made for You', color: 'emerald' },
  { title: 'Phonk Drift', artist: 'Aggressive Phonk', color: 'red' },
  { title: 'Chill Vibes', artist: 'Lofi Beats', color: 'indigo' },
  { title: 'Top 50 Global', artist: 'Trending', color: 'pink' },
  { title: 'Workout Mode', artist: 'High Energy', color: 'orange' },
];

export function Media({ theme }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    let interval;
    if (playing) {
      interval = setInterval(() => {
        setProgress((p) => (p >= 100 ? 0 : p + 0.2));
      }, 50);
    }
    return () => clearInterval(interval);
  }, [playing]);

  return (
    <div className={styles.container}>
      {/* LEFT SIDEBAR */}
      <div className={styles.sidebar}>
        {/* Nav Links */}
        <div className={styles.navLinks}>
          <SidebarItem
            icon={Home}
            label="Home"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <SidebarItem
            icon={Search}
            label="Search"
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
          />
          <SidebarItem
            icon={Library}
            label="Library"
            active={activeTab === 'library'}
            onClick={() => setActiveTab('library')}
          />
        </div>

        {/* Library Section */}
        <div className={styles.librarySection}>
          <div className={styles.libraryHeader}>
            <span className={styles.libraryTitle}>Your Playlists</span>
            <Plus size={14} className={styles.addIcon} />
          </div>

          <div className={styles.playlistList}>
            <PlaylistItem label="Liked Songs" icon={Heart} active />
            <PlaylistItem label="Volturiano ID" icon={Disc} />
            <PlaylistItem label="Midnight City" />
            <PlaylistItem label="Top 50 - Global" />
            <PlaylistItem label="Podcasts" icon={Mic2} />
            <PlaylistItem label="Radio 1" icon={Radio} />
            <PlaylistItem label="Workout Hits" />
            <PlaylistItem label="Late Night Jazz" />
          </div>
        </div>

        {/* Now Playing Mini Art */}
        <div className={styles.miniArt}>
          <div className={styles.miniArtBg} />
          <div className={styles.miniArtIcon}>
            <Mic2 size={32} />
          </div>
          {playing && (
            <div className={styles.equalizer}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={styles.equalizerBar}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={styles.mainContent}>
        {/* HERO PLAYER */}
        <div className={styles.heroPlayer}>
          <div className={styles.heroBackground} />
          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            {/* Header */}
            <div className={styles.heroHeader}>
              <div className={styles.nowPlayingBadge}>
                <TrendingUp size={12} className={styles.trendingIcon} />
                <span>Now Playing</span>
              </div>
            </div>

            {/* Track Info & Controls */}
            <div className={styles.trackSection}>
              <div className={styles.trackInfo}>
                <h1 className={styles.trackTitle}>NIGHTCALL</h1>
                <p className={styles.trackArtist}>
                  Kavinsky <span className={styles.artistDot} /> Drive OST
                </p>

                {/* Controls */}
                <div className={styles.controls}>
                  <button
                    onClick={() => setPlaying(!playing)}
                    className={styles.playButton}
                  >
                    {playing ? (
                      <Pause size={28} fill="black" />
                    ) : (
                      <Play size={28} fill="black" className={styles.playIcon} />
                    )}
                  </button>

                  <div className={styles.skipButtons}>
                    <button className={styles.skipButton}>
                      <SkipBack size={32} />
                    </button>
                    <button className={styles.skipButton}>
                      <SkipForward size={32} />
                    </button>
                  </div>

                  <button className={styles.heartButton}>
                    <Heart size={28} fill={theme.primary} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressSection}>
                <div className={styles.progressTime}>
                  <span>2:14</span>
                  <span>4:18</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PLAYLIST GRID */}
        <div className={styles.playlistGrid}>
          <h2 className={styles.gridTitle}>Jump Back In</h2>
          <div className={styles.grid}>
            {PLAYLISTS.map((playlist, idx) => (
              <div
                key={idx}
                className={styles.playlistCard}
                data-color={playlist.color}
              >
                <div className={`${styles.cardGradient} ${styles[`gradient${playlist.color}`]}`} />
                <div className={styles.cardOverlay} />

                <div className={styles.cardContent}>
                  <div className={styles.cardPlayButton}>
                    <div className={styles.cardPlayIcon}>
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                  <h3 className={styles.cardTitle}>{playlist.title}</h3>
                  <p className={styles.cardArtist}>{playlist.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Media;

