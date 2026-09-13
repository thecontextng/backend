import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./db";

const SEED_PASSWORD = "password123";

const CATEGORIES = [
  { name: "AI & Tech Innovations", slug: "ai-tech-innovations" },
  { name: "Climate & Environment", slug: "climate-environment" },
  { name: "Health & Human Stories", slug: "health-human-stories" },
  { name: "Video Reports", slug: "video-reports" },
  { name: "Documentaries", slug: "documentaries" },
] as const;

const AUTHORS = [
  { name: "Priya Nandan", email: "priya.nandan@example.com" },
  { name: "Tomas Rivera", email: "tomas.rivera@example.com" },
  { name: "Adaeze Obi", email: "adaeze.obi@example.com" },
  { name: "Marcus Webb", email: "marcus.webb@example.com" },
  { name: "Elin Voss", email: "elin.voss@example.com" },
] as const;

function img(seed: string, w = 1600, h = 1000) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

interface SeedMedia {
  type: "image" | "video";
  url: string;
  caption?: string;
}

interface SeedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageUrl: string;
  authorEmail: (typeof AUTHORS)[number]["email"];
  categorySlug: (typeof CATEGORIES)[number]["slug"];
  status: "draft" | "published" | "archived";
  publishedAt: string;
  tags: string[];
  media: SeedMedia[];
}

const ARTICLES: SeedArticle[] = [
  {
    title: "Inside the Labs Racing to Build the Next Generation of Reasoning Models",
    slug: "labs-racing-next-generation-reasoning-models",
    excerpt:
      "A look at how three research teams are rethinking what it means for a machine to \"think,\" and why the next leap may not come from bigger models at all.",
    featuredImageUrl: img("ai-lab-1"),
    authorEmail: "priya.nandan@example.com",
    categorySlug: "ai-tech-innovations",
    status: "published",
    publishedAt: "2026-08-04T09:00:00Z",
    tags: ["artificial intelligence", "research", "reasoning models"],
    media: [
      {
        type: "image",
        url: img("ai-lab-1"),
        caption: "A training cluster at one of the labs featured in this report.",
      },
    ],
    content: `
      <p>On a Tuesday morning in a converted warehouse, a dozen researchers are staring at a scrolling log of model outputs, waiting for a single run to finish. It has been going for eleven hours. Nobody in the room will say out loud what they're hoping for, but everyone is thinking it: has the model finally learned to check its own work?</p>
      <h2>The bigger-is-better era is ending</h2>
      <p>For most of the last five years, progress in artificial intelligence has tracked a simple rule: more parameters, more data, more compute, better results. That rule is starting to bend. Diminishing returns on raw scale have pushed labs toward a different question — not how big a model can get, but how well it can reason through a problem step by step, catching its own mistakes along the way.</p>
      <h3>Where the real gains are hiding</h3>
      <p>Three teams we spoke with described a similar pattern: the gains are not coming from bigger networks, but from better training signals — rewarding a model for showing correct intermediate steps, not just a correct final answer.</p>
      <blockquote>"We spent two years chasing scale. The last six months of progress came from teaching the model to slow down."</blockquote>
      <p>Whether this approach holds up as workloads get harder is still an open question. But for now, it's the closest thing the field has to a shared roadmap.</p>
    `,
  },
  {
    title: "The Quiet Startup Teaching Warehouse Robots to Improvise",
    slug: "startup-warehouse-robots-improvise",
    excerpt:
      "Most warehouse robots follow a script. This team is betting that the next wave will need to adapt on the fly — and they've built a small fleet to prove it.",
    featuredImageUrl: img("robot-1"),
    authorEmail: "priya.nandan@example.com",
    categorySlug: "ai-tech-innovations",
    status: "published",
    publishedAt: "2026-07-28T09:00:00Z",
    tags: ["robotics", "automation", "startups"],
    media: [{ type: "image", url: img("robot-1") }],
    content: `
      <p>The floor of the test facility looks like an ordinary logistics warehouse, except for one detail: someone keeps moving the boxes.</p>
      <h2>Designing for the unexpected</h2>
      <p>Most commercial warehouse robots operate along fixed paths, in spaces mapped down to the centimeter. This team's robots are trained to handle the opposite: shelves that move, obstacles that weren't there yesterday, boxes stacked slightly wrong.</p>
      <p>It's a narrower bet than building a general-purpose robot, but the founders argue it's the more useful one: most warehouses are already automated for the easy 80 percent of tasks. The remaining 20 percent — the messy, unpredictable cases — are exactly where human labor still dominates.</p>
    `,
  },
  {
    title: "How Coastal Cities Are Quietly Redesigning Themselves Around Water",
    slug: "coastal-cities-redesigning-around-water",
    excerpt:
      "From elevated parks to floodable plazas, a handful of cities are treating rising water not as a threat to be walled off, but as a design constraint to build around.",
    featuredImageUrl: img("coastal-1"),
    authorEmail: "tomas.rivera@example.com",
    categorySlug: "climate-environment",
    status: "published",
    publishedAt: "2026-08-06T09:00:00Z",
    tags: ["climate adaptation", "urban design", "flooding"],
    media: [{ type: "image", url: img("coastal-1") }],
    content: `
      <p>Twice a year, the plaza outside the city's new transit hub floods on purpose. Engineers designed it that way.</p>
      <h2>From resistance to accommodation</h2>
      <p>For decades, flood planning meant one thing: build the wall higher. That approach is reaching its limits, both financially and physically, in cities where storm surges are arriving more often and rising further than old models predicted.</p>
      <p>Instead, a new generation of planners is designing spaces that can absorb water safely — parks that become retention ponds, parking garages with floodable ground floors, streets with permeable surfaces that slow runoff before it reaches drains.</p>
      <h3>The hardest part isn't engineering</h3>
      <p>Every planner we spoke to said the technical solutions were the easy part. The harder problem is convincing residents and insurers that a plaza designed to flood is safer, not riskier, than one designed to resist water entirely.</p>
    `,
  },
  {
    title: "The Farmers Betting on Soil Instead of Fertilizer",
    slug: "farmers-betting-on-soil-instead-of-fertilizer",
    excerpt:
      "A growing number of large-scale growers are ripping up decades of conventional wisdom, and the early yield data is hard to ignore.",
    featuredImageUrl: img("farm-1"),
    authorEmail: "tomas.rivera@example.com",
    categorySlug: "climate-environment",
    status: "published",
    publishedAt: "2026-07-22T09:00:00Z",
    tags: ["agriculture", "soil health", "regenerative farming"],
    media: [{ type: "image", url: img("farm-1") }],
    content: `
      <p>Five years ago, this field was farmed the conventional way: tilled every season, doused with synthetic fertilizer, planted with a single crop.</p>
      <h2>Reading the ground like a budget</h2>
      <p>Today it looks messier — cover crops threaded between rows, visible earthworm activity, a patchwork of plant species instead of a single uniform sea of green. The farmer who manages it says the mess is the point.</p>
      <p>The pitch is simple: healthier soil holds more water, needs less fertilizer, and resists erosion — all of which matter more as rainfall gets less predictable. The catch is that the transition takes years, and the first couple of harvests are often smaller, not bigger.</p>
    `,
  },
  {
    title: "The Nurses Who Never Left the Night Shift",
    slug: "nurses-who-never-left-night-shift",
    excerpt:
      "A decade after the crisis that emptied hospital wards, we followed three nurses who stayed — and asked what kept them there.",
    featuredImageUrl: img("nurse-1"),
    authorEmail: "adaeze.obi@example.com",
    categorySlug: "health-human-stories",
    status: "published",
    publishedAt: "2026-08-02T09:00:00Z",
    tags: ["healthcare workers", "hospitals", "profiles"],
    media: [{ type: "image", url: img("nurse-1") }],
    content: `
      <p>At 3 a.m., the hospital corridor is quiet except for the soft beep of monitors and the sound of sneakers on linoleum. This is when the real work happens, three nurses told us — not the emergencies, but the hours in between.</p>
      <h2>What stays with you</h2>
      <p>Each of them left and came back at least once. Ask why, and the answers vary less than you'd expect: it wasn't the pay, and it wasn't the hours. It was a specific patient, a specific night, a moment none of them can quite explain to people outside the profession.</p>
      <h3>A shift that never fully ends</h3>
      <p>All three described a version of the same habit: waking up at odd hours, unable to fully switch off the part of their brain trained to listen for a monitor alarm. It's a cost none of them regret paying, even on the nights they can't explain why.</p>
    `,
  },
  {
    title: "Inside a Rural Clinic Doing More With a Fraction of the Budget",
    slug: "rural-clinic-doing-more-with-less",
    excerpt:
      "No specialists, no imaging center, and a waiting room that fills up before sunrise. Here's how one clinic keeps a town of 4,000 people healthy.",
    featuredImageUrl: img("clinic-1"),
    authorEmail: "adaeze.obi@example.com",
    categorySlug: "health-human-stories",
    status: "published",
    publishedAt: "2026-07-19T09:00:00Z",
    tags: ["rural healthcare", "community health", "profiles"],
    media: [{ type: "image", url: img("clinic-1") }],
    content: `
      <p>By 6 a.m., there are already twelve people waiting outside the clinic door. The nearest hospital is ninety minutes away.</p>
      <h2>Triage as a way of life</h2>
      <p>With one full-time doctor and two nurses covering a town of four thousand, the clinic runs on a strict, well-practiced system of triage — and a level of trust between staff and patients that took years to build.</p>
      <p>What keeps the clinic running isn't cutting-edge equipment — it's a set of low-cost habits: same-day scheduling, community health workers who follow up by phone, and a doctor who knows most of her patients' names before they say them.</p>
    `,
  },
  {
    title: "We Rode Along on the First Fully Autonomous Freight Route",
    slug: "first-fully-autonomous-freight-route",
    excerpt:
      "No driver, no safety operator in the cab — just cargo, sensors, and four hundred miles of interstate. Our reporter went along for the ride.",
    featuredImageUrl: img("freight-1"),
    authorEmail: "marcus.webb@example.com",
    categorySlug: "video-reports",
    status: "published",
    publishedAt: "2026-08-09T09:00:00Z",
    tags: ["autonomous vehicles", "logistics", "video report"],
    media: [
      {
        type: "video",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        caption: "Ride-along footage from the autonomous freight route.",
      },
      { type: "image", url: img("freight-2") },
    ],
    content: `
      <p>The truck pulls out of the depot at 4:12 a.m. There's a seat behind the wheel, but nobody sits in it for long.</p>
      <h2>What it feels like to hand over control</h2>
      <p>For the first hour, it's hard not to watch the wheel turn on its own. By hour three, the strangest part is how unremarkable it becomes — lane changes, merges, and a construction detour handled without anyone touching the controls.</p>
      <p>Watch the full ride-along above for the moments that made even the engineers on board a little nervous — and the one stretch of highway they still won't run without a human in the seat.</p>
    `,
  },
  {
    title: "Behind the Build: A Floating Solar Farm Twice the Size of Its City",
    slug: "floating-solar-farm-behind-the-build",
    excerpt:
      "Engineers walk us through how they anchored a solar array the size of a small town to a reservoir that floods every monsoon season.",
    featuredImageUrl: img("solar-1"),
    authorEmail: "marcus.webb@example.com",
    categorySlug: "video-reports",
    status: "published",
    publishedAt: "2026-07-30T09:00:00Z",
    tags: ["renewable energy", "engineering", "video report"],
    media: [{ type: "video", url: "https://www.youtube.com/watch?v=9bZkp7q19f0" }],
    content: `
      <p>From the air, it looks like a dark mirror laid across the reservoir — nearly two million solar panels, anchored to floats, moving gently with the water beneath them.</p>
      <h2>Building on water no one trusted</h2>
      <p>The reservoir floods every monsoon season by as much as four meters. The anchoring system had to hold through all of it, without a single panel drifting loose.</p>
      <p>In the video above, the lead structural engineer walks through the mooring design, the surprise problem that nearly delayed the project by a year, and why they chose water over land in the first place.</p>
    `,
  },
  {
    title: "The Last Glacier Guides: A Documentary",
    slug: "last-glacier-guides-documentary",
    excerpt:
      "For three generations, one family has guided climbers across the same glacier. Now they're documenting its retreat before it's gone.",
    featuredImageUrl: img("glacier-1"),
    authorEmail: "elin.voss@example.com",
    categorySlug: "documentaries",
    status: "published",
    publishedAt: "2026-08-01T09:00:00Z",
    tags: ["documentary", "climate", "mountains"],
    media: [
      {
        type: "video",
        url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        caption: "Full documentary — 38 minutes.",
      },
      { type: "image", url: img("glacier-2") },
      { type: "image", url: img("glacier-3") },
    ],
    content: `
      <p>The ice line has moved four hundred meters up the valley since the guide's grandfather first mapped this route. He has the old photographs to prove it.</p>
      <h2>A family archive as a climate record</h2>
      <p>What started as a family scrapbook of guided climbs has become one of the only continuous visual records of this glacier's retreat — decades of photographs taken from the same vantage points, year after year.</p>
      <p>This documentary follows three generations of the same family as they retrace the route one more time, in what may be the last season the full climb is possible.</p>
    `,
  },
  {
    title: "Twelve Beds: Inside a Hospital's Busiest Month",
    slug: "twelve-beds-hospital-busiest-month",
    excerpt:
      "A feature-length documentary following one understaffed pediatric ward through its hardest month in a decade.",
    featuredImageUrl: img("hospital-1"),
    authorEmail: "elin.voss@example.com",
    categorySlug: "documentaries",
    status: "draft",
    publishedAt: "2026-07-15T09:00:00Z",
    tags: ["documentary", "healthcare", "profiles"],
    media: [
      {
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        caption: "Full documentary — 52 minutes.",
      },
    ],
    content: `
      <p>Twelve beds. On the worst nights this month, the ward saw twenty-three admissions.</p>
      <h2>A month nobody on staff will forget</h2>
      <p>Filmed over five weeks during an unusually severe respiratory season, this documentary follows the doctors, nurses, and families who lived through one of the ward's hardest stretches in ten years.</p>
      <p>It is, at its core, a film about a system running past its limits — and the people who kept showing up anyway.</p>
    `,
  },
];

async function seed() {
  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const result = await pool.query(
      `INSERT INTO categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [category.name, category.slug]
    );
    categoryIds.set(category.slug, result.rows[0].id);
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const authorIds = new Map<string, string>();
  for (const author of AUTHORS) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'author')
       ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, updated_at = now()
       RETURNING id`,
      [author.email, passwordHash, author.name]
    );
    authorIds.set(author.email, result.rows[0].id);
    console.log(`Seeded author -> ${author.email} / ${SEED_PASSWORD}`);
  }

  for (const article of ARTICLES) {
    const categoryId = categoryIds.get(article.categorySlug);
    const authorId = authorIds.get(article.authorEmail);
    if (!categoryId || !authorId) {
      throw new Error(`Missing category or author lookup for "${article.slug}"`);
    }

    const result = await pool.query(
      `INSERT INTO articles (
         title, slug, excerpt, content, author_id, category_id,
         status, published_at, featured_image_url, seo_title, seo_description, tags
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         content = EXCLUDED.content,
         author_id = EXCLUDED.author_id,
         category_id = EXCLUDED.category_id,
         status = EXCLUDED.status,
         published_at = EXCLUDED.published_at,
         featured_image_url = EXCLUDED.featured_image_url,
         seo_title = EXCLUDED.seo_title,
         seo_description = EXCLUDED.seo_description,
         tags = EXCLUDED.tags,
         updated_at = now()
       RETURNING id`,
      [
        article.title,
        article.slug,
        article.excerpt,
        article.content,
        authorId,
        categoryId,
        article.status,
        article.publishedAt,
        article.featuredImageUrl,
        article.title,
        article.excerpt,
        article.tags,
      ]
    );

    const articleId = result.rows[0].id;

    await pool.query("DELETE FROM article_media WHERE article_id = $1", [articleId]);
    for (let position = 0; position < article.media.length; position++) {
      const item = article.media[position];
      await pool.query(
        `INSERT INTO article_media (article_id, type, url, caption, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [articleId, item.type, item.url, item.caption ?? null, position]
      );
    }

    console.log(`Seeded article -> ${article.title} (${article.status})`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
