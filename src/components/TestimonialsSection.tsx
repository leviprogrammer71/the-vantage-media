import { motion } from "motion/react";
import { Star } from "lucide-react";

const testimonials = [
  {
    text: "I was skeptical about AI, but this blew me away. Photos look professional and my clients love them!",
    name: "Sarah M.",
    role: "Realtor, 12+ years",
  },
  {
    text: "What used to take hours now takes minutes. Game changer for my listing workflow.",
    name: "Marcus C.",
    role: "Top-Producing Agent",
  },
  {
    text: "The twilight enhancement is incredible. My listings stand out immediately.",
    name: "Jennifer W.",
    role: "Luxury Specialist",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-background py-12 md:py-20">
      <div className="px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl mb-2">
            Trusted by Agents
          </h2>
        </motion.div>

        {/* Testimonials - Stacked on mobile */}
        <div className="space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-4 md:p-5 rounded-xl bg-card border border-border"
            >
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{testimonial.name}</span>
                {" · "}{testimonial.role}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
