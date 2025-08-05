export default function WaltonLogo({ className = "" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 300 60" 
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* WALTON text */}
      <g>
        {/* W */}
        <path d="M10 15 L15 45 L20 25 L25 45 L30 15 L28 15 L25 38 L20 20 L15 38 L12 15 Z" fill="currentColor"/>
        
        {/* A */}
        <path d="M40 45 L47 15 L54 45 M43 35 L51 35" fill="none" stroke="currentColor" strokeWidth="2.5"/>
        
        {/* L */}
        <path d="M64 15 L64 45 L74 45" fill="none" stroke="currentColor" strokeWidth="2.5"/>
        
        {/* T */}
        <path d="M84 15 L104 15 M94 15 L94 45" fill="none" stroke="currentColor" strokeWidth="2.5"/>
        
        {/* O */}
        <circle cx="124" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"/>
        
        {/* N */}
        <path d="M149 45 L149 15 L164 45 L164 15" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      </g>
      
      {/* TRAILERS text - smaller */}
      <g transform="translate(180, 0)">
        <text x="0" y="35" fontSize="14" fontFamily="Arial, sans-serif" fontWeight="500" letterSpacing="2">
          TRAILERS
        </text>
      </g>
      
      {/* Decorative line */}
      <line x1="10" y1="55" x2="290" y2="55" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    </svg>
  );
}