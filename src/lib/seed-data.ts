export const SEED_CLIENTS = [
  { id:'sunso', name:'SUNSO', initials:'SO', color:'#F4B740', health:92, services:['social','performance'], type:'full' as const },
  { id:'lumio', name:'Lumio', initials:'LU', color:'#8B5CF6', health:79, services:['social','performance','seo'], type:'full' as const },
  { id:'elysian', name:'Elysian Trails', initials:'ET', color:'#10B981', health:88, services:['social','seo'], type:'full' as const },
  { id:'styltool', name:'STYLTOOL', initials:'ST', color:'#2563EB', health:74, services:['seo','performance'], type:'ads' as const },
  { id:'weekend', name:'The Weekend Doors', initials:'WD', color:'#FF5C38', health:61, services:['social','performance'], type:'social' as const },
  { id:'verve', name:'Verve Fitness', initials:'VF', color:'#EF4444', health:46, services:['social','performance'], type:'full' as const },
]

export const SEED_TEAM = [
  { id:'aanya', name:'Aanya Mehra', initials:'AM', color:'#0EA5A4', title:'Designer', role:'employee' as const },
  { id:'rohan', name:'Rohan Kapoor', initials:'RK', color:'#FB7185', title:'Video Editor', role:'employee' as const },
  { id:'zoya', name:'Zoya Khan', initials:'ZK', color:'#6366F1', title:'Copywriter', role:'employee' as const },
  { id:'kabir', name:'Kabir Joshi', initials:'KJ', color:'#F4B740', title:'Performance', role:'employee' as const },
  { id:'dev', name:'Dev Sharma', initials:'DS', color:'#8B5CF6', title:'Strategist', role:'manager' as const },
  { id:'ira', name:'Ira Nair', initials:'IN', color:'#2563EB', title:'Account Mgr', role:'manager' as const },
]

export const SEED_PLAN_ITEMS = [
  { id:'s1', month:'2026-5', client_id:'sunso', cat:'social', type:'Reel', title:'Glow ritual — 3-step routine', brief:'Soft editorial pacing, warm gradients. Open on the before/after texture macro, end on clean product CTA.', refs:[{label:'Glossier routine reel'},{label:'Saved: editorial skincare grid'}], assignee_id:'aanya', effort:4, day:29, status:'in_progress', created_at:'' },
  { id:'s2', month:'2026-5', client_id:'sunso', cat:'social', type:'Carousel', title:'Before / after macro carousel', brief:'Tight ingredient macros with call-outs. Slide 1 stops the scroll, last slide is the offer.', refs:[{label:'Macro texture refs'}], assignee_id:'aanya', effort:3, day:26, status:'review', created_at:'' },
  { id:'s3', month:'2026-5', client_id:'sunso', cat:'social', type:'UGC', title:'UGC repost set ×5', brief:'Repost top customer glow results, add thank-you sticker + consistent frame.', refs:[], assignee_id:'zoya', effort:2, day:9, status:'published', created_at:'' },
  { id:'s4', month:'2026-5', client_id:'sunso', cat:'performance', type:'Meta Ads Campaign', title:'June glow campaign — Meta', brief:'3 ad sets: prospecting, retargeting, lookalike. Hook-led creatives.', refs:[], assignee_id:'kabir', effort:4, day:30, status:'in_progress', created_at:'' },
  { id:'s5', month:'2026-5', client_id:'sunso', cat:'social', type:'Reel', title:'Ingredient explainer: niacinamide', brief:'Clean explainer, kinetic text, calm pacing. Educational not clinical.', refs:[{label:'Explainer reel refs'}], assignee_id:'aanya', effort:4, day:null, status:'planned', created_at:'' },
  { id:'l1', month:'2026-5', client_id:'lumio', cat:'social', type:'Reel', title:'Diwali gifting teaser', brief:'Product hero in warm bokeh, cozy gifting moment, festive sale stinger to close.', refs:[{label:'Festive bokeh reel'}], assignee_id:'rohan', effort:4, day:null, status:'planned', created_at:'' },
  { id:'l2', month:'2026-5', client_id:'lumio', cat:'social', type:'Carousel', title:'Gifting guide — 5 picks', brief:'Product picks with a copy hook per slide. Premium, not loud.', refs:[{label:'Gift guide layouts'}], assignee_id:'zoya', effort:3, day:null, status:'planned', created_at:'' },
  { id:'l3', month:'2026-5', client_id:'lumio', cat:'performance', type:'Google Ads', title:'Festive sale — Google Ads', brief:'Shopping + search for festive keywords. Scale winning ad sets into Diwali week.', refs:[], assignee_id:'kabir', effort:3, day:null, status:'planned', created_at:'' },
  { id:'l4', month:'2026-5', client_id:'lumio', cat:'seo', type:'Blog Article', title:'Best Diwali gifts 2026 (pillar)', brief:'1800-word pillar targeting festive gifting keywords, internal links to shop pages.', refs:[{label:'Keyword cluster doc'}], assignee_id:'zoya', effort:3, day:17, status:'in_progress', created_at:'' },
  { id:'l5', month:'2026-5', client_id:'lumio', cat:'seo', type:'On-page SEO', title:'Shop pages on-page refresh', brief:'Rewrite meta + H1s for top 6 product pages, add FAQ schema.', refs:[], assignee_id:'dev', effort:2, day:8, status:'published', created_at:'' },
  { id:'w1', month:'2026-5', client_id:'weekend', cat:'social', type:'Reel', title:'3 corners of the cafe', brief:'Fast cuts, warm film grain, lo-fi audio, big legible captions.', refs:[{label:'Cafe walkthrough reel'},{label:'Audio: lo-fi morning'}], assignee_id:'rohan', effort:3, day:29, status:'in_progress', created_at:'' },
  { id:'w2', month:'2026-5', client_id:'weekend', cat:'social', type:'Static Post', title:'Weekend menu drop', brief:'Mouth-watering flatlay, playful reveal copy.', refs:[], assignee_id:'zoya', effort:1, day:4, status:'published', created_at:'' },
  { id:'w3', month:'2026-5', client_id:'weekend', cat:'social', type:'Story', title:'Barista spotlight', brief:'Warm portrait, short story caption, behind-the-counter feel.', refs:[], assignee_id:'zoya', effort:1, day:null, status:'planned', created_at:'' },
  { id:'e1', month:'2026-5', client_id:'elysian', cat:'social', type:'Story', title:'Travel zine story set ×5', brief:'Serif headlines, thin map lines, muted film palette. Cereal-magazine feel.', refs:[{label:'Cereal magazine layouts'}], assignee_id:'aanya', effort:2, day:18, status:'approved', created_at:'' },
  { id:'e2', month:'2026-5', client_id:'elysian', cat:'seo', type:'Blog Article', title:'Hidden valleys itinerary', brief:'Evocative long-form targeting offbeat-travel keywords, 6 internal links.', refs:[], assignee_id:'zoya', effort:3, day:null, status:'planned', created_at:'' },
  { id:'v1', month:'2026-5', client_id:'verve', cat:'social', type:'Reel', title:'12-week transformation', brief:'Before/after montage, real members, motivational audio.', refs:[{label:'Transformation reels'}], assignee_id:'rohan', effort:4, day:30, status:'planned', created_at:'' },
  { id:'v2', month:'2026-5', client_id:'verve', cat:'performance', type:'Meta Ads Campaign', title:'Membership push — Meta', brief:'Lead-gen for trial memberships, location-targeted.', refs:[], assignee_id:'kabir', effort:3, day:25, status:'in_progress', created_at:'' },
]

export const SERVICE_CATS = [
  { key:'social', label:'Social Media', short:'Social', color:'#8B5CF6', bg:'#F3EEFE', icon:'social' },
  { key:'performance', label:'Performance Marketing', short:'Ads', color:'#2563EB', bg:'#EAF1FF', icon:'performance' },
  { key:'seo', label:'SEO', short:'SEO', color:'#0E8C63', bg:'#E7FAF3', icon:'seo' },
]

export const STATUS_PIPE = [
  { key:'planned', label:'To start', c:'#9A9E94', bg:'#F0F1ED' },
  { key:'in_progress', label:'In progress', c:'#C99211', bg:'#FCF3D9' },
  { key:'review', label:'In review', c:'#7C3AED', bg:'#F3EEFE' },
  { key:'approved', label:'Approved', c:'#0E8C63', bg:'#E7FAF3' },
  { key:'published', label:'Published', c:'#2563EB', bg:'#EAF1FF' },
] as const

export const EFFORT_LABELS = ['','Quick','Light','Medium','Heavy','Major']

export const TYPE_MAP = {
  social: ['Reel','Carousel','Story','Static Post','UGC'],
  performance: ['Meta Ads Campaign','Google Ads','Ad Creative Set','Landing Page','A/B Test'],
  seo: ['Blog Article','On-page SEO','Keyword Research','Backlink Outreach','Tech Audit Fix'],
}

export const IDEA_BANK: Record<string, Record<string,string[]>> = {
  social: {
    Reel:['{brand} — 3 things nobody tells you','Behind-the-scenes in 15 seconds','Trend remix with the hero product','Day-in-the-life, founder-led'],
    Carousel:['5 quick tips your audience will save','Myth vs. fact carousel','Mini case study in 6 slides','The ultimate starter guide'],
    Story:['This-or-that poll set','Countdown to the drop','Quick Q&A with the team','Repost + react to UGC'],
    'Static Post':['Bold quote on brand background','Product hero with one-line hook','Founder note to the community','Limited-time offer announcement'],
    UGC:['Top customer results repost','Creator unboxing clip','Review screenshot set','Tag-and-feature roundup'],
  },
  performance: {
    'Meta Ads Campaign':['Prospecting + retargeting refresh','Hook-led creative test, 3 angles','Lookalike expansion campaign'],
    'Google Ads':['Branded + competitor search push','Shopping feed optimisation','Performance Max festive sprint'],
    'Ad Creative Set':['3 thumb-stopping hooks, same offer','UGC-style ad set','Static vs. video split test'],
    'Landing Page':['High-intent offer landing page','Lead-magnet capture page'],
    'A/B Test':['Headline A/B on top campaign','CTA + creative split test'],
  },
  seo: {
    'Blog Article':['Pillar page for the core keyword cluster','Comparison guide: us vs alternatives','Listicle targeting long-tail terms'],
    'On-page SEO':['Meta + H1 refresh on money pages','Add FAQ schema to top pages','Internal-linking pass'],
    'Keyword Research':['Quarterly keyword gap analysis','Festive / seasonal keyword map'],
    'Backlink Outreach':['Guest-post outreach batch','Digital-PR link campaign'],
    'Tech Audit Fix':['Core Web Vitals fixes','Fix crawl + indexation issues'],
  },
}

export const BRIEF_BANK: Record<string,string> = {
  social: 'Open with a strong hook in the first 1.5s. Keep pacing tight, on-brand palette, big legible captions, and close on a clear CTA. Provide 2–3 reference frames for the editor.',
  performance: 'Define the objective + audience, the offer, and 3 creative angles to test. Note the target cost-per-result and which existing creative is the control to beat.',
  seo: 'State the target keyword + search intent, the outline (H2s), word count, and the internal links to include. Flag any assets (images, data) the writer needs.',
}
