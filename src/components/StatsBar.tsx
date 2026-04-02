const stats = [
  { value: "47K+", label: "VIDEOS CREATED" },
  { value: "2,400+", label: "ACTIVE USERS" },
  { value: "8.2M", label: "TOTAL VIDEO VIEWS" },
];

const StatsBar = () => {
  return (
    <section
      style={{
        background: "#111111",
        borderTop: "1px solid #1A1A1A",
        borderBottom: "1px solid #1A1A1A",
        padding: "28px 0",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-center">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center">
            <div className="text-center flex-1 px-4 md:px-8">
              <div
                className="font-display font-bold text-[36px] md:text-[52px] leading-none"
                style={{ color: "#E8C547" }}
              >
                {stat.value}
              </div>
              <div
                className="font-mono text-[10px] tracking-[1px] mt-1"
                style={{ color: "#AAAAAA" }}
              >
                {stat.label}
              </div>
            </div>
            {i < stats.length - 1 && (
              <div
                className="flex-shrink-0"
                style={{ width: 1, height: 40, background: "#222222" }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;
