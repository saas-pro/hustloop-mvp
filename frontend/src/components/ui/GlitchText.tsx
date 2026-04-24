export default function GlitchText() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent">
      <h1 className="glitch text-6xl md:text-8xl font-bold relative text-white" data-text="GLITCH">
        GLITCH
      </h1>
      <style jsx>{`
        .glitch {
          position: relative;
          color: white;
          font-weight: bold;
          text-transform: uppercase;
        }
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
          clip: rect(0, 0, 0, 0);
        }
        .glitch::before {
          left: 2px;
          text-shadow: -2px 0 red;
          animation: glitchTop 2s infinite linear alternate-reverse;
        }
        .glitch::after {
          left: -2px;
          text-shadow: -2px 0 blue;
          animation: glitchBottom 2s infinite linear alternate-reverse;
        }
        @keyframes glitchTop {
          0% { clip: rect(0, 9999px, 0, 0); transform: translate(0,0); }
          10% { clip: rect(0, 9999px, 10px, 0); transform: translate(-2px,-2px); }
          20% { clip: rect(10px, 9999px, 20px, 0); transform: translate(2px,2px); }
          30% { clip: rect(20px, 9999px, 30px, 0); transform: translate(-2px,2px); }
          40% { clip: rect(30px, 9999px, 40px, 0); transform: translate(2px,-2px); }
          50% { clip: rect(40px, 9999px, 50px, 0); transform: translate(0,0); }
          100% { clip: rect(0, 9999px, 0, 0); transform: translate(0,0); }
        }
        @keyframes glitchBottom {
          0% { clip: rect(0, 9999px, 0, 0); transform: translate(0,0); }
          10% { clip: rect(50px, 9999px, 60px, 0); transform: translate(2px,2px); }
          20% { clip: rect(40px, 9999px, 50px, 0); transform: translate(-2px,-2px); }
          30% { clip: rect(30px, 9999px, 40px, 0); transform: translate(2px,-2px); }
          40% { clip: rect(20px, 9999px, 30px, 0); transform: translate(-2px,2px); }
          50% { clip: rect(10px, 9999px, 20px, 0); transform: translate(0,0); }
          100% { clip: rect(0, 9999px, 0, 0); transform: translate(0,0); }
        }
      `}</style>
    </div>
  );
}
