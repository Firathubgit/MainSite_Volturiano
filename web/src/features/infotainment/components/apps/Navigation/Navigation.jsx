/**
 * Navigation App Component
 * Abstract map visualization with HUD overlay
 */
import React from 'react';
import {
  Navigation as NavIcon,
  Search,
  Menu,
  MapPin,
  Compass,
  Layers,
} from 'lucide-react';
import styles from './Navigation.module.css';

export function Navigation({ theme }) {
  return (
    <div className={styles.container}>
      {/* IMMERSIVE MAP LAYER */}

      {/* 3D Grid Plane */}
      <div
        className={styles.gridPlane}
        style={{
          backgroundImage: `linear-gradient(${theme.primary}30 1px, transparent 1px), linear-gradient(90deg, ${theme.primary}30 1px, transparent 1px)`,
        }}
      />

      {/* Abstract City Blocks / Roads */}
      <svg className={styles.roadsSvg} preserveAspectRatio="none">
        <defs>
          <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#333" stopOpacity="0" />
            <stop offset="50%" stopColor="#333" stopOpacity="1" />
            <stop offset="100%" stopColor="#333" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Main Highway */}
        <path
          d="M-200,800 C200,800 600,600 800,450 S1400,200 1800,200"
          fill="none"
          stroke="url(#roadGradient)"
          strokeWidth="60"
        />
        <path
          d="M-200,800 C200,800 600,600 800,450 S1400,200 1800,200"
          fill="none"
          stroke={theme.primary}
          strokeWidth="4"
          strokeDasharray="20 10"
          className={styles.animatedRoad}
        />

        {/* Intersecting Roads */}
        <path d="M600,0 L600,1000" fill="none" stroke="#222" strokeWidth="30" />
        <path d="M1200,0 L1200,1000" fill="none" stroke="#222" strokeWidth="30" />
      </svg>

      {/* HUD UI OVERLAY */}

      {/* Top Left: Search Island */}
      <div className={styles.searchIsland}>
        <div className={styles.searchBar}>
          <div className={styles.searchIconWrapper}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Where to?"
            className={styles.searchInput}
          />
          <div className={styles.menuButton}>
            <Menu size={18} />
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className={styles.suggestionChips}>
          <button className={styles.chip}>
            <MapPin size={12} /> Home
          </button>
          <button className={styles.chip}>
            <Compass size={12} /> Stations
          </button>
        </div>
      </div>

      {/* Top Right: Map Layers */}
      <div className={styles.mapLayers}>
        <button className={styles.layerButton}>
          <Layers size={20} />
        </button>
        <button className={styles.layerButton}>
          <Compass size={20} />
        </button>
      </div>

      {/* Bottom Left: Guidance Card */}
      <div className={styles.guidanceCard} style={{ borderColor: theme.primary }}>
        <div className={styles.guidanceHeader}>
          <h2 className={styles.guidanceDistance}>
            250 <span className={styles.distanceUnit}>m</span>
          </h2>
          <NavIcon
            size={32}
            className={styles.navIcon}
            style={{ transform: 'rotate(45deg)' }}
          />
        </div>
        <p className={styles.guidanceText}>
          Turn right via <span className={styles.gateName}>JD Gate</span>
        </p>
        <div className={styles.guidanceFooter}>
          <span>20 min remaining</span>
          <span>•</span>
          <span>14:52 ETA</span>
        </div>
      </div>

      {/* Center: Vehicle Cursor */}
      <div className={styles.vehicleCursor}>
        <div className={styles.cursorContainer}>
          <div
            className={styles.pulseRing}
            style={{ borderColor: theme.primary }}
          />
          <div
            className={styles.cursorArrow}
            style={{
              borderBottomColor: theme.primary,
              filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Navigation;

