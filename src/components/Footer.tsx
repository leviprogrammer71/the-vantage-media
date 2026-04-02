import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      style={{
        background: "#000000",
        borderTop: "1px solid #1A1A1A",
        padding: "48px 24px",
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-center md:text-left">
        {/* Left */}
        <div>
          <p className="font-mono text-[14px] font-bold" style={{ color: "#E8C547" }}>
            THE VANTAGE
          </p>
          <p className="text-[13px] mt-1" style={{ color: "#555555" }}>
            Turn your projects into viral videos.
          </p>
          <p className="font-mono text-[11px] mt-2" style={{ color: "#333333" }}>
            © 2025 The Vantage · thevantage.media
          </p>
        </div>

        {/* Right */}
        <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
          {[
            { label: "Create Video", to: "/video?mode=transform" },
            { label: "Gallery", to: "/gallery" },
            { label: "Buy Credits", to: "/pricing" },
            { label: "Demo", to: "/demo" },
            { label: "Privacy Policy", to: "/privacy" },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="font-mono text-[12px] transition-colors hover:text-primary"
              style={{ color: "#555555" }}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="mailto:hello@thevantage.co"
            className="font-mono text-[12px] transition-colors hover:text-primary"
            style={{ color: "#555555" }}
          >
            hello@thevantage.co
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
