// ─── Mavixy's standard proposal content ───────────────────────────────────────
// The reusable, on-brand sections that appear in every Mavixy proposal (pulled
// from the real SAP Hardware / Aakar decks). The AI only writes the
// client-specific layer; these give every deck its depth and consistency.

export interface CapabilityGroup { title: string; items: string[] }
export interface FlywheelStep { label: string; text: string }
export interface MeasureLayer { area: string; items: string[] }
export interface TermClause { heading: string; body: string }

export const STD_CAPABILITIES: CapabilityGroup[] = [
  { title: 'Brand & Creative', items: ['Brand positioning', 'Visual identity', 'Brand systems', 'Creative direction', 'Social media design', 'Campaign concepts', 'Communication strategy'] },
  { title: 'Digital & Technology', items: ['Website development', 'Website optimisation', 'UX / UI improvements', 'SEO implementation', 'Analytics & tracking', 'Conversion optimisation', 'Digital systems'] },
  { title: 'Content', items: ['Content strategy', 'Photography', 'Video production', 'Short-form video', 'Product storytelling', 'Festival communication', 'Graphic content'] },
  { title: 'Marketing & Growth', items: ['Social media management', 'Meta advertising', 'Google advertising', 'B2B lead generation', 'B2C awareness', 'Dealer acquisition', 'Performance marketing'] },
  { title: 'AI & Data', items: ['AI content workflows', 'Marketing research', 'Data-backed decisions', 'Performance analysis', 'Reporting', 'Automation', 'AI-led optimisation'] },
]

export const APPROACH = {
  headline: "We don't market blindly.",
  from: '"What should we post this week?"',
  to: '"What are we trying to achieve?"',
  loop: [
    { k: 'Objective', v: 'What are we trying to achieve?' },
    { k: 'Data', v: 'What is the audience telling us?' },
    { k: 'Action', v: 'What should we change, test or do next?' },
  ],
  note: "A good campaign isn't just one that performs well — it teaches us what to do better next.",
}

export const FLYWHEEL: FlywheelStep[] = [
  { label: 'Brand', text: 'Creates recognition.' },
  { label: 'Content', text: 'Creates attention.' },
  { label: 'Social', text: 'Builds familiarity.' },
  { label: 'SEO', text: 'Creates discoverability.' },
  { label: 'Website', text: 'Converts interest into action.' },
  { label: 'Ads', text: 'Create targeted demand.' },
  { label: 'Data', text: 'Shows what is working.' },
  { label: 'Insights', text: 'Tell us what to improve.' },
  { label: 'Optimisation', text: 'Makes the next campaign better.' },
]

export const MEASUREMENT: MeasureLayer[] = [
  { area: 'Brand', items: ['Brand consistency', 'Digital perception', 'Visual recognition', 'Brand recall'] },
  { area: 'Website & SEO', items: ['Organic traffic', 'Search visibility', 'Keyword movement', 'Website engagement'] },
  { area: 'Social', items: ['Reach', 'Engagement', 'Audience growth', 'Content performance'] },
  { area: 'Performance', items: ['Click-through rate', 'Cost per lead', 'Lead quality', 'Conversion rate'] },
  { area: 'Business', items: ['Dealer enquiries', 'B2B enquiries', 'Website enquiries', 'Product interest'] },
]

export const WHAT_YOU_GET = {
  headline: 'Ten partners, or one team.',
  instead: ['Branding', 'SEO', 'Website', 'Content', 'Production', 'Social media', 'Meta Ads', 'Analytics', 'Google Ads', 'AI'],
  chain: [
    'The website informs SEO.', 'SEO informs content.', 'Content informs advertising.',
    'Advertising generates data.', 'Data informs the next creative.', 'The next creative improves the next campaign.',
  ],
}

export const STD_TERMS: TermClause[] = [
  { heading: 'Engagement', body: 'The engagement will be executed according to the phases, activities and scope in this proposal.' },
  { heading: 'Taxes', body: 'All Mavixy service fees are exclusive of GST. Applicable GST is charged additionally.' },
  { heading: 'Advertising budget', body: 'Meta and Google advertising budgets are separate from Mavixy fees and are paid directly to the platforms.' },
  { heading: 'Payment', body: 'Monthly retainers and production charges are payable as mutually agreed before that month’s activities begin.' },
  { heading: 'Production', body: 'Shoot costs are based on the proposed scope. Specialised locations, models, props, travel or extra crew may be quoted separately.' },
  { heading: 'Third-party costs', body: 'Paid software, stock assets, influencers, hosting, domains or plugins are not included unless specified.' },
  { heading: 'Performance', body: 'We use best-practice strategy, testing and analysis to improve results. Platforms and market conditions are outside our control, so specific lead or revenue guarantees cannot be given.' },
  { heading: 'Client approvals', body: 'Timely feedback, information and approvals are required to maintain the agreed timelines.' },
  { heading: 'Scope changes', body: 'Any work outside the agreed scope will be discussed and quoted separately before execution.' },
  { heading: 'Reporting', body: 'Performance is reviewed periodically, and insights guide future content and marketing decisions.' },
  { heading: 'Strategy evolution', body: 'This roadmap is designed to evolve. Based on real data we may recommend changes to creative, campaigns, content or audiences so the strategy stays connected to what works.' },
]
