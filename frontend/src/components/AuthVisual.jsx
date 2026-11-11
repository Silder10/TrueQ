export function AuthVisual({ title, text }) {
  return (
    <div className="auth-visual">
      <svg
        className="auth-background-art auth-background-art--desktop"
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="qRing" x1="0.85" y1="0" x2="0.15" y2="1">
            <stop offset="0%" stopColor="#8be6dc" stopOpacity=".55" />
            <stop offset="40%" stopColor="#2f9aa4" stopOpacity=".30" />
            <stop offset="100%" stopColor="#0d3a50" stopOpacity=".10" />
          </linearGradient>
          <linearGradient id="qRim" x1="0.9" y1="0" x2="0.2" y2="0.9">
            <stop offset="0%" stopColor="#a6f0e7" stopOpacity=".65" />
            <stop offset="55%" stopColor="#3aa7b0" stopOpacity=".18" />
            <stop offset="100%" stopColor="#3aa7b0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="qTail" gradientUnits="userSpaceOnUse" x1="540" y1="590" x2="840" y2="890">
            <stop offset="0%" stopColor="#3aa7ad" stopOpacity=".55" />
            <stop offset="100%" stopColor="#2a8a96" stopOpacity=".30" />
          </linearGradient>
          <radialGradient id="qInner" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#0a3347" stopOpacity=".35" />
            <stop offset="100%" stopColor="#041a2c" stopOpacity=".6" />
          </radialGradient>
          <radialGradient id="qGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5fd0c8" stopOpacity=".32" />
            <stop offset="100%" stopColor="#5fd0c8" stopOpacity="0" />
          </radialGradient>
          <filter id="qBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        <circle cx="620" cy="260" r="300" fill="url(#qGlow)" />
        <path
          d="M850 60 C770 200 710 330 570 425 C450 505 300 545 110 505"
          fill="none" stroke="#4fc3bf" strokeOpacity=".13" strokeWidth="110"
          strokeLinecap="round" filter="url(#qBlur)"
        />
        <circle cx="340" cy="495" r="293" fill="none" stroke="url(#qRing)" strokeWidth="97" />
        <circle cx="340" cy="495" r="342" fill="none" stroke="url(#qRim)" strokeWidth="2" />
        <circle cx="340" cy="495" r="245" fill="url(#qInner)" />
        <circle cx="340" cy="495" r="245" fill="none" stroke="#8fe6dc" strokeOpacity=".16" strokeWidth="1.5" />
        <line x1="555" y1="605" x2="845" y2="895" stroke="url(#qTail)" strokeWidth="96" strokeLinecap="round" />
        <path
          d="M-40 470 C180 470 380 560 620 760 S800 900 860 945"
          fill="none" stroke="#58cfc6" strokeOpacity=".10" strokeWidth="90"
          strokeLinecap="round" filter="url(#qBlur)"
        />
      </svg>

      <svg
        className="auth-background-art auth-background-art--mobile"
        viewBox="0 0 1024 664"
        preserveAspectRatio="xMaxYMin slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mRing" x1="0" y1="0.2" x2="1" y2="1">
            <stop offset="0%" stopColor="#7be3dc" stopOpacity=".5" />
            <stop offset="45%" stopColor="#2b9aa6" stopOpacity=".3" />
            <stop offset="100%" stopColor="#0b4157" stopOpacity=".12" />
          </linearGradient>
          <linearGradient id="mRim" x1="0" y1="0.3" x2="1" y2="1">
            <stop offset="0%" stopColor="#a6f0e7" stopOpacity=".6" />
            <stop offset="60%" stopColor="#3aa7b0" stopOpacity=".15" />
            <stop offset="100%" stopColor="#3aa7b0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mTail" gradientUnits="userSpaceOnUse" x1="830" y1="405" x2="1060" y2="640">
            <stop offset="0%" stopColor="#3fb5b5" stopOpacity=".6" />
            <stop offset="100%" stopColor="#1f7f8d" stopOpacity=".3" />
          </linearGradient>
          <radialGradient id="mInner" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#06293c" stopOpacity=".3" />
            <stop offset="100%" stopColor="#021626" stopOpacity=".55" />
          </radialGradient>
          <radialGradient id="mGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5fd0c8" stopOpacity=".3" />
            <stop offset="100%" stopColor="#5fd0c8" stopOpacity="0" />
          </radialGradient>
          <filter id="mBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <circle cx="900" cy="60" r="380" fill="url(#mGlow)" />
        <path
          d="M-50 130 C150 300 330 345 520 320 S900 190 1080 60"
          fill="none" stroke="#4fc3bf" strokeOpacity=".14" strokeWidth="130"
          strokeLinecap="round" filter="url(#mBlur)"
        />
        <circle cx="785" cy="250" r="267" fill="none" stroke="url(#mRing)" strokeWidth="95" />
        <circle cx="785" cy="250" r="316" fill="none" stroke="url(#mRim)" strokeWidth="2" />
        <circle cx="785" cy="250" r="220" fill="url(#mInner)" />
        <circle cx="785" cy="250" r="220" fill="none" stroke="#8fe6dc" strokeOpacity=".16" strokeWidth="1.5" />
        <line x1="830" y1="405" x2="1080" y2="655" stroke="url(#mTail)" strokeWidth="96" strokeLinecap="round" />
      </svg>

      <div className="auth-brand">
        <span className="auth-logo-mark" aria-hidden="true"></span>
        <h1>
          True<span className="auth-logo-q">Q</span>
        </h1>
      </div>

      <div className="auth-visual-copy">
        <span className="auth-accent-line"></span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}