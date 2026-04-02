import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TrustSection = () => {
  const [totalVideos, setTotalVideos] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { count } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "delivered");
      setTotalVideos(count ?? 0);
    };
    fetchStats();
  }, []);

  const stats = [
    {
      value: totalVideos !== null ? `${totalVideos}` : "—",
      label: "Transformation videos delivered to builders and contractors",
    },
    {
      value: "< 5 min",
      label: "Average time from upload to finished video — no filming needed",
    },
    {
      value: "9:16",
      label: "Optimized for TikTok and Instagram Reels — the formats that drive leads",
    },
  ];

  return (
    <section className="py-8 md:py-12 bg-muted/30 border-y border-border">
      <div className="px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-6 md:mb-8"
        >
          <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl mb-4">
            THE FORMAT THAT WINS
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            Transformation videos are the highest-performing content format in home improvement. They drive saves, shares, and direct messages from people ready to hire.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-3 md:gap-6"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-3 md:p-5 rounded-xl bg-card border border-border">
              <div className="text-xl md:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
