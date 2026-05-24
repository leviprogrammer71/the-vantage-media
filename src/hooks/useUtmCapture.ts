import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * useUtmCapture
 *
 * Persists UTM parameters from the URL into sessionStorage so attribution
 * survives client-side navigation. Once captured, every subsequent page in
 * the session can read the source ad / campaign / content via
 * getCapturedUtm() and stamp it onto sign-up events.
 *
 * Without this hook, an ad click landing on /tiktok?utm_source=tiktok&
 * utm_campaign=spring_launch loses its UTM data the second the user clicks
 * any internal link — which is exactly the user's "17 ads producing no
 * trackable traffic" problem.
 *
 * The hook also stamps a `vantage_first_landing` cookie/sessionStorage key
 * with the first page the user landed on, so the conversion event can
 * attribute back to the ad's landing page even after the user navigates.
 */
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "ttclid",
  "rdt_cid", // Reddit click ID
];

export function useUtmCapture(defaultSource?: string) {
  const [params] = useSearchParams();

  useEffect(() => {
    try {
      const captured: Record<string, string> = {};
      let hasAny = false;
      for (const k of UTM_KEYS) {
        const v = params.get(k);
        if (v) {
          captured[k] = v;
          hasAny = true;
        }
      }
      // If the landing page sets a default source (e.g. "tiktok") and no
      // utm_source was passed, fall back so we still attribute to that
      // channel. Ad accounts often forget to wire utm params on cold ads.
      if (!captured.utm_source && defaultSource) {
        captured.utm_source = defaultSource;
        hasAny = true;
      }
      if (hasAny) {
        // Persist on first capture only — never overwrite with a weaker
        // attribution (e.g., user clicks an internal link without UTMs).
        const existing = sessionStorage.getItem("vantage_utm");
        if (!existing) {
          sessionStorage.setItem("vantage_utm", JSON.stringify(captured));
          sessionStorage.setItem("vantage_landing_path", window.location.pathname);
          sessionStorage.setItem("vantage_landing_ts", String(Date.now()));
          // Persist longer-lived attribution in localStorage too — first-touch
          // wins. Lets us attribute paid signups that take a few days.
          if (!localStorage.getItem("vantage_first_touch")) {
            localStorage.setItem(
              "vantage_first_touch",
              JSON.stringify({
                ...captured,
                landing_path: window.location.pathname,
                ts: Date.now(),
              }),
            );
          }
        }
      }
    } catch {
      // sessionStorage can throw in privacy mode — fail silent.
    }
  }, [params, defaultSource]);
}

/** Read the captured UTM payload. Returns an empty object if nothing captured. */
export function getCapturedUtm(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("vantage_utm");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Read first-touch attribution (lives in localStorage). */
export function getFirstTouchAttribution(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem("vantage_first_touch");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
