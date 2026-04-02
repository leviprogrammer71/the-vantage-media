import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Layers, Settings } from "lucide-react";
import { ImageCompareSlider } from "@/components/generate/ImageCompareSlider";
import { motion } from "motion/react";
import propertyBefore from "@/assets/property-before.jpg";
import propertyAfter from "@/assets/property-after.png";

const benefits = [
  {
    icon: Users,
    title: "Consistent Quality Across Teams",
    description: "Every agent produces professional photos. No more inconsistent listing quality across your team.",
  },
  {
    icon: Layers,
    title: "Centralized Photo Management",
    description: "One platform for all your agents. Track usage, manage teams, and maintain brand standards.",
  },
  {
    icon: Settings,
    title: "API & White-Label Options",
    description: "Integrate directly into your workflow. Custom branding options for enterprise clients.",
  },
];

const testimonial = {
  text: "We rolled out TheVantage to our 50-agent team. Photo quality is now consistent across all listings, and our brand looks more professional than ever.",
  name: "Robert Thompson",
  role: "Broker/Owner, Thompson Realty",
  image: "https://randomuser.me/api/portraits/men/52.jpg",
};

const AgenciesLanding = () => {
  return (
    <>
      <Helmet>
        <title>AI Photo Enhancement for Real Estate Agencies | TheVantage</title>
        <meta
          name="description"
          content="Centralize photo quality across your real estate team. TheVantage gives agencies consistent, professional listing photos with team management and API access."
        />
        <link rel="canonical" href="https://thevantage.ai/for-agencies" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          {/* Hero */}
          <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
            <div className="article-grid">
              <div className="article-hero">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                      For Real Estate Agencies
                    </span>
                    <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-tight mb-6">
                      Consistent Photo Quality Across Your Entire Team
                    </h1>
                    <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                      Agent photos are inconsistent. Some are great, others hurt your brand. TheVantage centralizes photo quality so every listing looks professional—automatically.
                    </p>
                    <Button 
                      asChild 
                      size="lg" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
                    >
                      <Link to="/contact">
                        Contact Sales
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                  >
                    <ImageCompareSlider
                      beforeImage={propertyBefore}
                      afterImage={propertyAfter}
                      className="rounded-2xl shadow-2xl"
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16 md:py-20">
            <div className="article-grid">
              <div className="article-hero">
                <div className="grid md:grid-cols-3 gap-8">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="text-center p-6"
                    >
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                        <benefit.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonial */}
          <section className="py-16 md:py-20 bg-muted/30">
            <div className="article-grid">
              <div className="article-content-standard">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <blockquote className="text-xl md:text-2xl font-medium mb-6 italic">
                    "{testimonial.text}"
                  </blockquote>
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-20">
            <div className="article-grid">
              <div className="article-content-standard text-center">
                <h2 className="font-display font-bold text-2xl md:text-3xl mb-4">
                  Ready to Elevate Your Agency?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Get custom pricing and API access for your team.
                </p>
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
                >
                  <Link to="/contact">
                    Contact Sales
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default AgenciesLanding;
