export default function Home() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const games = [
    {
      id: "minimise",
      name: "Minimise",
      description: "Assign 8 players to 8 stat categories — lowest total rank wins.",
      tag: "Daily · 8 players",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l4-4 4 2 4-6 4 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 21h18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "tenable",
      name: "Tenable",
      description: "Name the top 10 players in a stat category. How many can you get?",
      tag: "Daily · Top 10",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 9H4.5a2.5 2.5 0 010-5H6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M18 9h1.5a2.5 2.5 0 000-5H18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M8 21h8M12 17v4M6 4h12v9a6 6 0 01-12 0V4z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "stat-clash",
      name: "Stat Clash",
      description: "Two players, one stat. Pick who comes out on top across Premier League history.",
      tag: "Solo · vs Friend · PL stats",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="12" r="6" stroke="white" strokeWidth="2.5"/>
          <circle cx="15" cy="12" r="6" stroke="white" strokeWidth="2.5"/>
        </svg>
      ),
    },
    {
      id: "bingo",
      name: "Bingo",
      description: "Name players to fill your card before time runs out. Can you go 9/9?",
      tag: "Daily · 9 players",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2.5"/>
        </svg>
      ),
    },
  ];

  const navLinks = ["Games", "Bingo", "Tenable", "Stat Clash", "Minimise"];

  return (
    <main style={{ minHeight: "100vh",background: "#0f0808", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: "56px", borderBottom: "1px solid rgba(232,50,26,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", background: "#E8321A", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
            ⚽
          </div>
          <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.02em" }}>Top Bins</span>
        </div>
        <div style={{ display: "flex", gap: "28px" }}>
          {navLinks.map((link, i) => (
            <a
              key={link}
              href={i === 0 ? "/" : `/${link.toLowerCase().replace(" ", "-")}`}
              style={{
                fontSize: "14px",
                fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? "white" : "rgba(255,255,255,0.5)",
                textDecoration: "none",
                borderBottom: i === 0 ? "2px solid #E8321A" : "none",
                paddingBottom: "2px",
              }}
            >
              {link}
            </a>
          ))}
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: "32px 40px 24px", maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "inline-block", background: "#E8321A", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
            {today}
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Your daily football quiz
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,200,200,0.6)", margin: 0 }}>
            4 games today. How well do you know your football?
          </p>
        </div>
        <div style={{ background: "#1f0d0d", border: "1px solid rgba(232,50,26,0.2)", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "100px" }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#E8321A" }}>0/4</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginTop: "2px" }}>DONE TODAY</div>
        </div>
      </div>

      <div style={{ padding: "0 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: "16px" }}>
          TODAY'S GAMES
        </div>

        {/* Game cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {games.map((game) => (
            <div
              key={game.id}
              style={{ background: "#180d0d", border: "1px solid rgba(232,50,26,0.2)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ width: "44px", height: "44px", background: "#E8321A", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {game.icon}
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{game.name}</h2>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>{game.description}</p>
              </div>
              <div style={{ background: "rgba(232,50,26,0.15)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: 500, display: "inline-block", alignSelf: "flex-start" }}>
                {game.tag}
              </div>
              <a
                href={`/${game.id}`}
                style={{ display: "block", background: "#E8321A", color: "white", textAlign: "center", padding: "13px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", textDecoration: "none", marginTop: "4px" }}
              >
                Play now →
              </a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: "40px" }} />
    </main>
  );
}
