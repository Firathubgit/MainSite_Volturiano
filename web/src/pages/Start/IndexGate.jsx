import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Home from '../Home/Home';
import { PAUSE_MODE_ENABLED } from '../../config/pauseMode';
import { useUiStore } from '../../stores/uiStore';

export default function IndexGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const platformMode = useUiStore((state) => state.platformMode);

  useEffect(() => {
    // If pause mode is enabled and NOT in platform mode, redirect to agency page
    if (PAUSE_MODE_ENABLED && !platformMode) {
      navigate('/agency', { replace: true });
      return;
    }

    const played = sessionStorage.getItem('startPlayed');
    if (!played) {
      navigate('/start', { replace: true });
    } else {
      setReady(true);
    }
  }, [navigate, platformMode]);

  return ready ? <Home /> : null;
}


