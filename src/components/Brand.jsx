export default function Brand({ className = '', href = '#dashboard', onClick }) {
  return (
    <a className={`brand ${className}`.trim()} href={href} onClick={onClick} aria-label="AGOSENSE drainage intelligence">
      <img 
        src="/agosense-logo.png" 
        alt="AGOSENSE Logo" 
        className="h-9 w-9 object-contain" 
      />
      <span>
        <strong>AGOSENSE</strong>
        <small>DRAINAGE INTELLIGENCE</small>
      </span>
    </a>
  );
}