import { useState } from "react";
import { Helmet } from "react-helmet-async";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

const liaisons = [
  {
    role: "STUDIO",
    title: "Working photographers & studios",
    email: "studio@thevantage.media",
    note: "Onboarding, brand presets, agent gallery setup, and bulk render configuration.",
  },
  {
    role: "BROKERAGE",
    title: "Brokerages & House plans",
    email: "house@thevantage.media",
    note: "White-label deployment, team seats, MLS integration, dedicated liaison assignment.",
  },
  {
    role: "PRESS",
    title: "Press & partnerships",
    email: "press@thevantage.media",
    note: "Editorial inquiries, partnership decks, embargoed previews of new releases.",
  },
  {
    role: "BILLING",
    title: "Billing & invoices",
    email: "billing@thevantage.media",
    note: "Tax documentation, refunds, expense receipts, invoicing for House plan customers.",
  },
];

const Contact = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "STUDIO", message: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Message received. A liaison will reply within four working hours.");
      setForm({ name: "", email: "", subject: "STUDIO", message: "" });
    }, 900);
  };

  return (
    <>
      <Helmet>
        <title>Speak to a Liaison — The Vantage</title>
        <meta name="description" content="A direct line to the studio. Working photographers, brokerages, and press all welcome." />
        <link rel="canonical" href="https://thevantage.co/contact" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <SectionHeading
                eyebrow="A DIRECT LINE TO THE STUDIO"
                title="Speak to a"
                italic="liaison."
                lede="Reach the right desk on the first try. Working photographers, brokerages, press, and press-curious — all welcome. Replies within four working hours."
                align="center"
                className="mb-20"
              />

              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5">
                  {liaisons.map((l) => (
                    <a
                      key={l.email}
                      href={`mailto:${l.email}`}
                      className="block py-8 transition-colors group"
                      style={{ borderBottom: "1px solid var(--lux-hairline)" }}
                    >
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>
                          ✦ {l.role}
                        </span>
                        <span style={{ flex: 1, height: 1, background: "var(--lux-hairline)" }} />
                      </div>
                      <h3 className="lux-display text-2xl md:text-3xl">{l.title}</h3>
                      <p className="lux-prose mt-3 text-sm">{l.note}</p>
                      <div className="mt-4 lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-ink)" }}>
                        <Mail size={12} /> {l.email}
                      </div>
                    </a>
                  ))}

                  <div className="mt-12 p-8 lux-bg-cream" style={{ border: "1px solid var(--lux-hairline)" }}>
                    <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>VISIT</div>
                    <p className="lux-display text-2xl mt-3">By appointment, in studio.</p>
                    <p className="lux-prose mt-4 text-sm">
                      Our New York and Los Angeles studios host House plan clients by appointment.
                      Email <a href="mailto:house@thevantage.media" className="lux-link">house@thevantage.media</a> to arrange.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <form
                    onSubmit={onSubmit}
                    className="p-8 md:p-12 lux-bg-parchment"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  >
                    <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-rust)" }}>WRITE TO US DIRECTLY</div>
                    <h3 className="lux-display text-3xl md:text-4xl mb-10">A note to the studio.</h3>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <label className="block">
                        <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>YOUR NAME</span>
                        <input
                          required
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full mt-3 bg-transparent outline-none py-3 text-lg lux-display-italic"
                          style={{ borderBottom: "1px solid var(--lux-hairline-strong)", color: "var(--lux-ink)" }}
                          placeholder="Maya Atwood"
                        />
                      </label>
                      <label className="block">
                        <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>YOUR EMAIL</span>
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full mt-3 bg-transparent outline-none py-3 text-lg lux-display-italic"
                          style={{ borderBottom: "1px solid var(--lux-hairline-strong)", color: "var(--lux-ink)" }}
                          placeholder="maya@atwood.studio"
                        />
                      </label>
                    </div>

                    <label className="block mt-8">
                      <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>WHICH DESK</span>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full mt-3 bg-transparent outline-none py-3 text-lg lux-display-italic"
                        style={{ borderBottom: "1px solid var(--lux-hairline-strong)", color: "var(--lux-ink)" }}
                      >
                        <option value="STUDIO">The Studio Desk</option>
                        <option value="BROKERAGE">The House Plan Desk</option>
                        <option value="PRESS">Press & Partnerships</option>
                        <option value="BILLING">Billing & Invoices</option>
                      </select>
                    </label>

                    <label className="block mt-8">
                      <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>YOUR NOTE</span>
                      <textarea
                        required
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full mt-3 bg-transparent outline-none py-3 text-lg"
                        style={{ borderBottom: "1px solid var(--lux-hairline-strong)", color: "var(--lux-ink)", resize: "vertical" }}
                        placeholder="Tell us a little about your studio, your roster, and what you'd like to make."
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="lux-btn mt-10"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : "SEND TO THE STUDIO →"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default Contact;
