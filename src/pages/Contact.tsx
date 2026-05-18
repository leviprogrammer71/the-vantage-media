import { useState } from "react";
import { Helmet } from "react-helmet-async";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

const liaisons = [
  {
    role: "HELLO",
    title: "General inquiries",
    email: "hello@thevantage.media",
    note: "First-time questions, demo requests, or anything that doesn't quite fit another desk.",
  },
  {
    role: "SALES",
    title: "Sales & partnerships",
    email: "sales@thevantage.media",
    note: "Team seats, brokerage deployments, white-label, MLS integrations, custom volume pricing.",
  },
  {
    role: "SUPPORT",
    title: "Customer support",
    email: "support@thevantage.media",
    note: "Technical issues, render failures, account access, gallery questions, anything broken.",
  },
  {
    role: "BILLING",
    title: "Billing & invoices",
    email: "billing@thevantage.media",
    note: "Tax documentation, refunds, expense receipts, invoicing for plan customers.",
  },
  {
    role: "FEEDBACK",
    title: "Feedback & feature requests",
    email: "feedback@thevantage.media",
    note: "Ideas, gripes, missing categories, things you wish we did differently. We read every note.",
  },
];

const team = [
  {
    name: "Levi Sumbela",
    role: "Founder",
    email: "levisumbela@thevantage.media",
  },
  {
    name: "Jorge Esparza",
    role: "Studio operations",
    email: "jorgeesparza@thevantage.media",
  },
  {
    name: "Nancy Sarantos",
    role: "Brokerage liaison",
    email: "nancysarantos@thevantage.media",
  },
];

const Contact = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "HELLO", message: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Message received. A liaison will reply within four working hours.");
      setForm({ name: "", email: "", subject: "HELLO", message: "" });
    }, 900);
  };

  return (
    <>
      <Helmet>
        <title>Speak to a Liaison — The Vantage</title>
        <meta name="description" content="A direct line to the studio. Working photographers, brokerages, and press all welcome." />
        <link rel="canonical" href="https://thevantage.media/contact" />
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
                    <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>THE TEAM</div>
                    <p className="lux-display text-2xl mt-3">Direct to a person.</p>
                    <p className="lux-prose mt-4 text-sm">
                      Already speaking with someone here? Reach them directly.
                    </p>
                    <ul className="mt-6 space-y-4">
                      {team.map((member) => (
                        <li key={member.email} className="flex items-baseline justify-between gap-4">
                          <div>
                            <div className="lux-display text-base">{member.name}</div>
                            <div className="lux-eyebrow text-xs" style={{ color: "var(--lux-ash)" }}>
                              {member.role}
                            </div>
                          </div>
                          <a
                            href={`mailto:${member.email}`}
                            className="lux-link text-xs"
                            style={{ color: "var(--lux-ink)" }}
                          >
                            {member.email}
                          </a>
                        </li>
                      ))}
                    </ul>
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
                        <option value="HELLO">General Inquiries (hello@)</option>
                        <option value="SALES">Sales & Partnerships</option>
                        <option value="SUPPORT">Customer Support</option>
                        <option value="BILLING">Billing & Invoices</option>
                        <option value="FEEDBACK">Feedback & Feature Requests</option>
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
