/**
 * Showcase project data — driven by the real listings in /public/projects/.
 * Each project is one address: the reference photos that went IN, and the
 * different films that came OUT. Add a new folder + entry here to add a project.
 *
 * NOTE: profiles/quotes are sample placeholders — swap for real, permissioned
 * ones as you collect them.
 */

export interface ProjectOutput {
  label: string;
  video: string;
  poster: string;
}

export interface Project {
  slug: string;
  address: string;
  city?: string;
  tagline: string;
  refs: string[];
  outputs: ProjectOutput[];
  agent?: string;
  role?: string;
  quote?: string;
}

const ref = (slug: string, names: string[]) => names.map((n) => `/projects/${slug}/ref/${n}.jpg`);
const out = (slug: string, name: string, label: string): ProjectOutput => ({
  label,
  video: `/projects/${slug}/out/${name}.mp4`,
  poster: `/projects/${slug}/out/${name}.jpg`,
});

export const PROJECTS: Project[] = [
  {
    slug: "123-e-atwood",
    address: "123 E Atwood",
    tagline: "One listing. Five films.",
    refs: ref("123-e-atwood", ["front", "living", "bedroom", "guestbath", "drone"]),
    outputs: [
      out("123-e-atwood", "listing-reel", "Listing Reel"),
      out("123-e-atwood", "short", "TikTok / Short"),
      out("123-e-atwood", "showcase", "Reel Showcase"),
      out("123-e-atwood", "transform", "Transformation"),
      out("123-e-atwood", "staging", "Virtual Staging"),
    ],
    agent: "Maya Atwood",
    role: "Atwood Photographic",
    quote: "Five photos in, five finished films out — I post a different one every day of the week.",
  },
  {
    slug: "2356-n-forkner",
    address: "2356 N Forkner",
    city: "Fresno, CA",
    tagline: "Five rooms in. Three films out.",
    refs: ref("2356-n-forkner", ["front", "living", "bedroom", "masterbath", "backyard"]),
    outputs: [
      out("2356-n-forkner", "done-for-you", "Done-For-You Reel"),
      out("2356-n-forkner", "animate", "Animate Single"),
      out("2356-n-forkner", "sun-to-sun", "Sun-to-Sun"),
    ],
    agent: "Lindsey Cole",
    role: "Valley Signature Homes",
    quote: "I labeled each room and the reel walked the house exactly how I'd tour a buyer through it.",
  },
  {
    slug: "18736-topanga-beach-rd",
    address: "18736 Topanga Beach Rd.",
    city: "Malibu, CA",
    tagline: "Six photos in. One cinematic reel.",
    refs: ref("18736-topanga-beach-rd", ["1", "2", "3", "4", "5", "6"]),
    outputs: [out("18736-topanga-beach-rd", "result", "Listing Reel")],
    agent: "Diego Ramos",
    role: "Coastline Realty",
    quote: "A $6M beachfront listing that finally looks like a $6M listing.",
  },
  {
    slug: "1487-n-echo",
    address: "1487 N Echo",
    tagline: "One photo. Four camera moves.",
    refs: ref("1487-n-echo", ["ref"]),
    outputs: [
      out("1487-n-echo", "move-1", "Camera Move I"),
      out("1487-n-echo", "move-2", "Camera Move II"),
      out("1487-n-echo", "acreage", "Acreage Reveal"),
      out("1487-n-echo", "address", "Address Display"),
    ],
    agent: "Andre Cole",
    role: "Cole Development",
    quote: "One exterior shot became four different scroll-stoppers. Zero shoot day.",
  },
  {
    slug: "842-autumn-lane-mill-valley",
    address: "842 Autumn Lane",
    city: "Mill Valley, CA",
    tagline: "One photo. Every camera move.",
    refs: ref("842-autumn-lane-mill-valley", ["ref"]),
    outputs: [
      out("842-autumn-lane-mill-valley", "push-in", "Push In"),
      out("842-autumn-lane-mill-valley", "slide-right", "Slide Right"),
      out("842-autumn-lane-mill-valley", "pan-left", "Pan Left"),
      out("842-autumn-lane-mill-valley", "pull-out", "Pull Out"),
    ],
    agent: "Sara Larsen",
    role: "House of Larsen",
    quote: "Same photo, four cinematic moves. I pick whichever fits the platform.",
  },
];

export const PROJECT_STATS = {
  projects: PROJECTS.length,
  films: PROJECTS.reduce((n, p) => n + p.outputs.length, 0),
  photos: PROJECTS.reduce((n, p) => n + p.refs.length, 0),
};
