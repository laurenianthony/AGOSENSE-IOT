export default function Brand({ className = '', href = '#dashboard', onClick }) {
  return <a className={`brand ${className}`.trim()} href={href} onClick={onClick} aria-label="AGOSENSE drainage intelligence">
    <span className="brand-mark" aria-hidden="true">&#8776;</span>
    <span><strong>AGOSENSE</strong><small>DRAINAGE INTELLIGENCE</small></span>
  </a>;
}
