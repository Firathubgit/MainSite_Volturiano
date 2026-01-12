import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Home from '../Home/Home';
import { PAUSE_MODE_ENABLED } from '../../config/pauseMode';

export default function IndexGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If pause mode is enabled, redirect to agency page
    if (PAUSE_MODE_ENABLED) {
      navigate('/agency', { replace: true });
      return;
    }

    const played = sessionStorage.getItem('startPlayed');
    if (!played) {
      navigate('/start', { replace: true });
    } else {
      setReady(true);
    }
  }, [navigate]);

  return ready ? <Home /> : null;
}


