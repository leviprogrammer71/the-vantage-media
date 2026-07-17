import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Honor #anchors (e.g. /examples#18736-topanga-beach-rd from the email
    // campaign): scroll to the element instead of the top. Retry briefly —
    // lazy-loaded pages may not have rendered the target on first tick.
    if (hash) {
      const id = hash.slice(1);
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempts++ < 20) {
          setTimeout(tryScroll, 150);
        }
      };
      tryScroll();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
