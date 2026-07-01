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
