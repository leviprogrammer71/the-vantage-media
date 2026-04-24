import { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  italic?: ReactNode;
  lede?: string;
  align?: "left" | "center";
  children?: ReactNode;
  serif?: boolean;
  className?: string;
}

const SectionHeading = ({
  eyebrow,
  title,
  italic,
  lede,
  align = "left",
  children,
  serif = false,
  className = "",
}: SectionHeadingProps) => {
  const isCenter = align === "center";
  return (
    <header className={`${isCenter ? "text-center mx-auto max-w-3xl" : "max-w-3xl"} ${className}`}>
      {eyebrow && (
        <div className={`lux-eyebrow mb-6 flex items-center gap-3 ${isCenter ? "justify-center" : ""}`}
          style={{ color: "var(--lux-rust)" }}>
          <span style={{ display: "inline-block", width: 18, height: 1, background: "var(--lux-rust)" }} />
          <span>{eyebrow}</span>
          <span style={{ display: "inline-block", width: 18, height: 1, background: "var(--lux-rust)" }} />
        </div>
      )}
      <h2
        className={`${serif ? "lux-serif" : "lux-display"}`}
        style={{
          fontSize: "clamp(2.4rem, 5.2vw, 4.5rem)",
          letterSpacing: "-0.018em",
        }}
      >
        {title}
        {italic && (
          <>
            <br className="hidden sm:block" />
            <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>{italic}</span>
          </>
        )}
      </h2>
      {lede && (
        <p
          className={`lux-prose mt-6 ${isCenter ? "mx-auto" : ""}`}
          style={{ maxWidth: 560 }}
        >
          {lede}
        </p>
      )}
      {children}
    </header>
  );
};

export default SectionHeading;
