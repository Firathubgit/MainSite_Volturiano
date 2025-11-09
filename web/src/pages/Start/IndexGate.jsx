import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Home from '../Home/Home';

export default function IndexGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const played = sessionStorage.getItem('startPlayed');
    if (!played) {
      navigate('/start', { replace: true });
    } else {
      setReady(true);
    }
  }, [navigate]);

  return ready ? <Home /> : null;
}


