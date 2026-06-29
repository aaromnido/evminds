interface MenuIconProps {
  isOpen: boolean;
  className?: string;
}

export function MenuIcon({ isOpen, className = "" }: MenuIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top line - rotates to form diagonal of X */}
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transformOrigin: "12px 12px",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isOpen ? "rotate(45deg) translateY(6px)" : "none",
        }}
      />

      {/* Middle line - fades out when open */}
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transition: "opacity 0.2s",
          opacity: isOpen ? 0 : 1,
        }}
      />

      {/* Bottom line - rotates to form other diagonal of X */}
      <line
        x1="3"
        y1="18"
        x2="21"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transformOrigin: "12px 12px",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isOpen ? "rotate(-45deg) translateY(-6px)" : "none",
        }}
      />
    </svg>
  );
}
