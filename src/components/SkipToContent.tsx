export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed z-[9999] bg-primary text-primary-foreground font-bold text-xs px-4 py-2 transition-[top] duration-200 focus:top-0 outline-none"
      style={{
        top: "-40px",
        left: 0,
        fontFamily: "'Space Mono', monospace",
      }}
      onFocus={(e) => { e.currentTarget.style.top = "0"; }}
      onBlur={(e) => { e.currentTarget.style.top = "-40px"; }}
    >
      SKIP TO CONTENT
    </a>
  );
}
