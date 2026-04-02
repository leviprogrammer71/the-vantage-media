import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Camera, Eye } from "lucide-react";
import { ImageCompareSlider } from "@/components/generate/ImageCompareSlider";
import { motion } from "motion/react";
import exampleInterior from "@/assets/example-interior.jpg";

const benefits = [
  {
    icon: Star,
    title: "Higher Booking Rates",
    description: "Listings with professional photos get up to 40% more bookings. First impressions matter.",
  },
  {
    icon: Camera,
    title: "No Photography Skills Needed",
    description: "Just upload your phone photos. Our AI transforms them into stunning, professional images.",
  },
  {
    icon: Eye,
    title: "Match Guest Expectations",
    description: "Photos that accurately represent your space—bright, inviting, and true-to-life.",
  },
];

const testimonial = {
  text: "My Airbnb photos went from amateur to amazing. Bookings jumped 35% the first month after I started using TheVantage.",
  name: "Michael Chen",
  role: "Superhost, San Francisco",
  image: "https://randomuser.me/api/portraits/men/45.jpg",
};

const AirbnbLanding = () => {
  return (
    <>
      <Helmet>
        <title>AI Photo Enhancement for Airbnb Hosts | TheVantage</title>
        <meta
          name="description"
          content="Boost your Airbnb bookings with professional-quality listing photos. TheVantage transforms your phone photos into stunning images that attract guests."
        />
        <link rel="canonical" href="https://thevantage.ai/for-airbnb" />
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
                      For Airbnb Hosts
                    </span>
                    <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-tight mb-6">
                      Photos That Match Guest Expectations
                    </h1>
                    <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                      Poor photos lead to fewer bookings and disappointed guests. TheVantage creates stunning, accurate listing photos that attract the right guests and boost your reviews.
                    </p>
                    <Button 
                      asChild 
                      size="lg" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
                    >
                      <Link to="/signup">
                        Try It Free – No Credit Card
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
                      beforeImage={exampleInterior}
                      afterImage={exampleInterior}
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
                  Ready to Boost Your Bookings?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Start with 5 free photo enhancements. No credit card required.
                </p>
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
                >
                  <Link to="/signup">
                    Get Started Free
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

export default AirbnbLanding;
