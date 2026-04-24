"use client";
import { useState, useEffect } from 'react';

const TwinklingStars = () => {
  const [stars, setStars] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars = [];
      const numStars = 100; // Adjust for density
      for (let i = 0; i < numStars; i++) {
        const style = {
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 3 + 2}s`,
        };
        newStars.push(<div key={i} className="star" style={style}></div>);
      }
      setStars(newStars);
    };
    generateStars();
  }, []);

  return <div className="star-field">{stars}</div>;
};

export default TwinklingStars;
