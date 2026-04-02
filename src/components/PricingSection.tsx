import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

const pricingPlans = [
  {
    name: "STARTER",
    price: "$97",
    period: "per video",
    features: [
      "1 transformation video",
      "TikTok or Reels format (9:16)",
      "720p HD output",
      "5 business day delivery",
      "Up to 20 after photos analyzed",
    ],
    cta: "Submit Your Project",
    link: "/submit",
    popular: false,
  },
  {
    name: "GROWTH",
    price: "$247",
    period: "per month",
    features: [
      "4 videos per month (1 per week)",
      "TikTok + Reels format",
      "720p HD output",
      "Priority 3 business day delivery",
      "Dedicated project manager",
    ],
    cta: "Get Started",
    link: "/submit",
    popular: true,
    badge: "Most Popular",
  },
  {
    name: "AGENCY",
    price: "$597",
    period: "per month",
    features: [
      "12 videos per month",
      "Multiple project types",
      "720p HD output",
      "48 hour turnaround",
      "White-label delivery",
      "Custom branding on request",
    ],
    cta: "Contact Us",
    link: "/contact",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-12 md:py-20 bg-muted/30">
      <div className="px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl mb-2">
            SIMPLE PRICING
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card
                className={`relative h-full ${
                  plan.popular
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-0.5 text-xs">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardContent className="p-5 md:p-6 pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{plan.price}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {plan.period}
                    </div>
                  </div>

                  <div className="border-t border-border my-4" />

                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground/90">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-border my-4" />

                  <Button
                    asChild
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    size="sm"
                  >
                    <Link to={plan.link}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
