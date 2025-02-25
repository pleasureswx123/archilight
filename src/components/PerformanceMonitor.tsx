import { useEffect, useState } from 'react';
import { Stats } from '@react-three/drei';

export const PerformanceMonitor = () => {
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'p') {
        setShowStats(prev => !prev);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, []);

  return showStats ? <Stats /> : null;
}; 