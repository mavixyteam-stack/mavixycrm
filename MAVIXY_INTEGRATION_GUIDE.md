# Mavixy Integration & Automation Setup Guide
### Team Handbook — Step-by-Step, Foolproof

---

## Overview

This guide covers three things:

1. **One-time setup** — Register Mavixy as a developer app on each platform (done once by the owner/tech lead)
2. **Client onboarding** — Connect each client's accounts through Mavixy (done per client by the account manager)
3. **Mavixy automations** — WhatsApp morning briefs, report delivery, and other automations

> ⚠️ **Important architecture note:** You register **ONE** developer app per platform for Mavixy as a company. All clients then authorize that single app to access their accounts. You do NOT create a separate developer app for each client. Client credentials (tokens) are stored per-client in the Mavixy database.

---

## PART 1 — ONE-TIME PLATFORM SETUP
### (Done once by Owner / Tech Lead)

---

### 1A. Meta (Facebook + Instagram + Meta Ads)

**Time required:** 3–7 days (due to app review)

**Step 1 — Create a Meta Developer account**
1. Go to developers.facebook.com
2. Sign in with your Mavixy Facebook Page admin account
3. Click "My Apps" → "Create App"
4. Choose app type: **Business**
5. App name: `Mavixy` | Contact email: `mavixyteam@gmail.com`

**Step 2 — Add required products**
In your app dashboard, click "Add Product" and add:
- ✅ Facebook Login (for pages, Instagram)
- ✅ Instagram Graph API
- ✅ Marketing API (for Meta Ads)

**Step 3 — Configure permissions**
Go to App Review → Permissions and add:
- `pages_manage_posts` — publish to Facebook Pages
- `pages_read_engagement` — read page insights
- `instagram_basic` — read Instagram data
- `instagram_content_publish` — post to Instagram
- `ads_management` — manage Meta Ads
- `ads_read` — read ad performance

**Step 4 — Set OAuth redirect URI**
In Facebook Login settings → Valid OAuth Redirect URIs, add:
```
https://your-mavixy-domain.com/api/oauth/callback/facebook
```

**Step 5 — Submit for app review**
- Most permissions require Meta's review (3–7 business days)
- Prepare a screencast showing how Mavixy uses client data
- While waiting for approval, you can test with your own accounts in Development mode

**Step 6 — Save credentials in Supabase**
Once approved, go to App Dashboard → Settings → Basic and save:
- App ID → Supabase `env` table or `.env.local` as `META_APP_ID`
- App Secret → `META_APP_SECRET`

---

### 1B. Google (Google Ads + GMB + GA4 + Search Console)

**Time required:** 1–3 days

**Step 1 — Create Google Cloud project**
1. Go to console.cloud.google.com
2. Click "New Project" → Name: `Mavixy`
3. Select your organization (or leave as personal)

**Step 2 — Enable required APIs**
In the project, go to APIs & Services → Library and enable:
- ✅ Google Ads API
- ✅ Business Profile API (Google My Business)
- ✅ Google Analytics Data API (GA4)
- ✅ Google Search Console API

**Step 3 — Create OAuth credentials**
1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web Application**
3. Name: `Mavixy Web`
4. Authorized redirect URIs:
   ```
   https://your-mavixy-domain.com/api/oauth/callback/google
   ```
5. Download the JSON credentials file

**Step 4 — Configure OAuth consent screen**
1. APIs & Services → OAuth consent screen
2. User type: **External** (allows any Google user)
3. App name: `Mavixy` | Logo: upload your logo
4. Add scopes:
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/business.manage`
   - `https://www.googleapis.com/auth/adwords`
   - `https://www.googleapis.com/auth/webmasters.readonly`
5. Add test users (your team emails) while in testing mode
6. Submit for verification if needed (required for 100+ users)

**Step 5 — Save credentials**
- Client ID → `GOOGLE_CLIENT_ID`
- Client Secret → `GOOGLE_CLIENT_SECRET`

> 💡 **Google Ads extra step:** You need a **Manager Account (MCC)** to manage multiple client ad accounts. Go to ads.google.com/home/tools/manager-accounts and create one for Mavixy. Clients then link their ad account to your MCC.

---

### 1C. LinkedIn

**Time required:** 2–5 days (due to partner program requirement)

**Step 1 — Create LinkedIn Developer app**
1. Go to linkedin.com/developers/apps
2. Click "Create App"
3. App name: `Mavixy`
4. LinkedIn Page: Select your Mavixy company page
5. App logo: Upload Mavixy logo
6. Legal agreement: Accept

**Step 2 — Request required products**
In your app, go to Products tab and request:
- **Share on LinkedIn** — for posting content
- **Sign In with LinkedIn** — for authentication
- **Marketing Developer Platform** — for ads and analytics (requires partner approval, takes 5–14 days)

**Step 3 — Configure OAuth**
In Auth tab → OAuth 2.0 settings, add redirect URL:
```
https://your-mavixy-domain.com/api/oauth/callback/linkedin
```

**Step 4 — Note required scopes**
- `r_liteprofile` — basic profile
- `r_emailaddress` — email
- `w_member_social` — post on behalf of member
- `r_organization_social` — read company page stats
- `w_organization_social` — post to company page

**Step 5 — Save credentials**
- Client ID → `LINKEDIN_CLIENT_ID`
- Client Secret → `LINKEDIN_CLIENT_SECRET`

---

### 1D. X (Twitter)

**Time required:** 1–3 days (Basic tier is instant; Elevated requires review)

**Step 1 — Apply for developer access**
1. Go to developer.twitter.com/portal
2. Sign in with your Mavixy X account
3. Apply for **Basic** access (free, ~1,500 posts/month)
4. For higher volume, apply for **Elevated** access (free, requires use case explanation)

**Step 2 — Create a project and app**
1. In the developer portal, create a Project named `Mavixy`
2. Inside the project, create an App named `Mavixy Production`
3. Enable **OAuth 2.0** under User Authentication Settings

**Step 3 — Configure OAuth 2.0**
- App permissions: **Read and Write**
- Type of App: **Web App**
- Callback URI:
  ```
  https://your-mavixy-domain.com/api/oauth/callback/twitter
  ```
- Website URL: `https://your-mavixy-domain.com`

**Step 4 — Save credentials**
- Client ID → `TWITTER_CLIENT_ID`
- Client Secret → `TWITTER_CLIENT_SECRET`

---

## PART 2 — SUPABASE DATABASE SETUP
### (Done once by Tech Lead)

Create this table in your Supabase project to store client OAuth tokens:

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,           -- 'instagram', 'facebook', 'google_ads', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  account_id TEXT,                  -- platform's account/page ID
  account_name TEXT,                -- display name
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, platform)
);

-- Only the backend service role should read/write tokens
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON oauth_tokens
  USING (auth.role() = 'service_role');
```

---

## PART 3 — CLIENT ONBOARDING FLOW
### (Done per client by Account Manager)

Once the platform apps are approved (Part 1), connecting each client takes **5–10 minutes per platform**.

---

### For each new client, follow this checklist:

**Before the connection call:**
- [ ] Client has admin access to their Facebook Page
- [ ] Client has admin access to their Instagram Business account
- [ ] Client has admin access to their Google Business Profile
- [ ] Client has access to their Google Ads account
- [ ] Client has admin on their LinkedIn Company Page
- [ ] Client has login credentials for their X (Twitter) account

---

### Connecting Meta (Facebook + Instagram)

1. Open Mavixy → Navigate to the client's detail page
2. Click **Connect** next to Instagram or Facebook
3. A popup window opens → client logs in with their Facebook credentials
4. They see a permission dialog — tick all checkboxes, click **Continue**
5. Select which **Facebook Page** represents their business → click **Continue**
6. Select which **Instagram account** is linked to that Page → click **Continue**
7. Popup closes → Mavixy shows ✓ Linked with green badge
8. Insights appear within 30 seconds

> 🔑 **Client must be an admin of the Facebook Page** — Editor or Analyst access is not enough to grant publishing permissions.

---

### Connecting Google (GMB + GA4 + Google Ads + Search Console)

1. Click **Connect** next to any Google platform
2. Google sign-in popup opens → client logs in with their Google account
3. They see permissions screen — click **Allow** (all permissions are requested at once)
4. If connecting **GA4**: Mavixy shows a dropdown to select which GA4 property → select the one for their website
5. If connecting **Google Ads**: Client shares their Customer ID (10-digit number in the top right of Google Ads) — OR they can link their account to your Mavixy MCC from their Ads dashboard
6. If connecting **Search Console**: Client must have the website verified in their Google Search Console already
7. Connection completes → insights appear

> 💡 **All four Google products (GMB, GA4, Google Ads, Search Console) are connected in one Google OAuth flow.** The client only has to log in once.

---

### Connecting LinkedIn

1. Click **Connect** next to LinkedIn
2. LinkedIn login popup opens → client logs in
3. They select which **Company Page** Mavixy should manage
4. Click **Allow**
5. ✓ Linked appears with follower count and post metrics

> ⚠️ **LinkedIn limit:** A Company Page can only have 1 active API integration at a time. If the client uses another tool (like Buffer), they must disconnect it first.

---

### Connecting X (Twitter)

1. Click **Connect** next to X
2. X login popup opens → client logs in
3. They click **Authorize App**
4. ✓ Linked appears

---

### Unlinking an account

If a client offboards or wants to revoke access:
1. Go to client detail page → Connected Accounts section
2. Click **Unlink** → click **Unlink** again in the confirmation
3. Mavixy removes the stored token
4. The client should also revoke access from their platform settings for security:
   - Facebook: Settings → Business Integrations → Remove Mavixy
   - Google: myaccount.google.com/permissions → Remove Mavixy
   - LinkedIn: Settings → Permitted Services → Remove Mavixy

---

## PART 4 — WHATSAPP AUTOMATION SETUP
### Mavixy's automation WhatsApp number

---

### Step 1 — Get a dedicated phone number

You need a phone number that is **NOT already registered** on personal WhatsApp.

**Option A (Recommended): Virtual number**
- Get a virtual Indian mobile number from services like:
  - Airtel IQ
  - Textlocal
  - MSG91
  - Twilio (with Indian DID)
- Cost: ₹500–2,000/month
- This keeps automation completely separate from any personal WhatsApp

**Option B: New SIM card**
- Buy a new Airtel/Jio SIM specifically for Mavixy automation
- Register it as a business number

---

### Step 2 — Apply for WhatsApp Business API

WhatsApp Business API (now called Cloud API) is free and managed by Meta.

1. **Create a Meta Business account** (if you don't have one already)
   - Go to business.facebook.com
   - Create account with your Mavixy business details

2. **Go to Meta for Developers**
   - In your existing Mavixy Meta app (from Part 1) → Add Product → **WhatsApp**
   - Or go to developers.facebook.com/docs/whatsapp

3. **Add a phone number**
   - Go to WhatsApp → Getting Started in your Meta app
   - Click "Add phone number"
   - Enter the dedicated number from Step 1
   - Verify via OTP

4. **Create message templates**
   - WhatsApp requires pre-approved templates for outbound messages
   - Go to WhatsApp → Message Templates → Create Template
   - Template category: **UTILITY** (for operational messages like briefs)

**Morning Brief Template example:**
```
Name: morning_brief
Category: UTILITY
Language: English

Body:
Good morning {{1}}! 🌅

Here's your Mavixy brief for {{2}}:

📋 Tasks due today: {{3}}
📱 Posts scheduled: {{4}}
⚡ Priority: {{5}}

Have a productive day! — Mavixy
```

**Client update template example:**
```
Name: client_report_ready
Category: UTILITY
Language: English

Body:
Hi {{1}}, your {{2}} performance report is ready on Mavixy.

📊 Key highlights:
• Reach: {{3}}
• Engagement: {{4}}
• Top post: {{5}}

View full report: {{6}}
```

5. **Template approval** takes 1–24 hours.

---

### Step 3 — Connect WhatsApp to Mavixy

Save in your `.env.local`:
```
WHATSAPP_PHONE_NUMBER_ID=your_number_id_from_meta_dashboard
WHATSAPP_ACCESS_TOKEN=your_permanent_token
WHATSAPP_VERIFY_TOKEN=any_random_secret_string
```

Webhook URL (Meta calls this when messages arrive):
```
https://your-mavixy-domain.com/api/webhooks/whatsapp
```

---

## PART 5 — AUTOMATION FLOWS

---

### Automation 1: Morning Brief (WhatsApp)

**Trigger:** Daily at 8:30 AM IST (cron job)

**What it sends:**
- Tasks due today (for each team member)
- Content scheduled for today across all clients
- Any overdue items
- Weather is nice to have 😄

**Setup steps:**
1. In Mavixy dashboard → Automations → Morning Brief
2. Toggle ON
3. Set send time: 8:30 AM
4. Select recipients: All team members / Managers only
5. Each team member must save Mavixy's WhatsApp number and opt in

**Tech implementation (for dev team):**
- Supabase Edge Function triggered by pg_cron every morning
- Queries tasks + plan_items for the day
- Sends via WhatsApp Cloud API to each user's phone number in profiles table
- Add `phone` field to profiles table if not present

---

### Automation 2: Client Report Delivery (WhatsApp + Email)

**Trigger:** Monthly on the 1st, or manual "Send report" button

**What it sends to CLIENT:**
- Summary of that month's performance
- Link to their live report page on Mavixy
- Next month's content calendar preview

**Setup steps:**
1. Client detail page → Contacts section → ensure client's WhatsApp number is saved
2. Report template approved in WhatsApp (Step 4 above)
3. Automations → Client Reports → Toggle ON → Select platforms to include

---

### Automation 3: Content Approval Workflow (WhatsApp)

**Trigger:** When a content item is moved to "Review" status

**Flow:**
1. Designer finishes post → moves to Review in Mavixy
2. WhatsApp message sent automatically to client:
   > "Hi [Client Name], your [post type] for [date] is ready for review on Mavixy. Please approve or request changes within 24 hours. View: [link]"
3. Client clicks link → views content → approves or comments
4. Team is notified in Mavixy when approved

**Setup:** Automations → Content Approval → Toggle ON

---

### Automation 4: New Lead Notification (WhatsApp)

**Trigger:** New lead added to Mavixy Pipeline

**What it sends:**
- Notification to sales team member assigned to the lead
- Lead name, company, source, estimated value

**Setup:** Automations → Lead Alerts → Toggle ON → Select sales team recipients

---

## PART 6 — TEAM CHECKLIST SUMMARY

### Owner / Tech Lead (one-time, ~1 week):
- [ ] Register Meta Developer App + submit for review
- [ ] Create Google Cloud project + enable APIs + OAuth consent screen
- [ ] Create LinkedIn Developer App + request Marketing Developer Platform
- [ ] Create X Developer App + get Elevated access
- [ ] Create Supabase `oauth_tokens` table (SQL above)
- [ ] Get dedicated WhatsApp number
- [ ] Apply for WhatsApp Business API
- [ ] Create and submit message templates for approval
- [ ] Set all API credentials in Vercel/Supabase environment variables

### Account Manager (per new client, ~30 minutes):
- [ ] Client added to Mavixy with correct services selected (social / performance / seo)
- [ ] Schedule 15-min video call with client (screen share)
- [ ] Walk client through connecting each relevant platform
- [ ] Verify ✓ Linked shows for all platforms
- [ ] Confirm insights are populating
- [ ] Save client's WhatsApp number for report delivery

### Monthly operations:
- [ ] Check token expiry (most tokens last 60 days — Mavixy will alert you)
- [ ] Send monthly reports to all clients
- [ ] Review any failed automation deliveries

---

## PLATFORM APPROVAL TIMELINE REFERENCE

| Platform | Typical wait | Notes |
|---|---|---|
| Meta (Facebook/Instagram) | 3–7 business days | Most permissions require video demo |
| Meta Ads API | 5–10 business days | Requires business verification |
| Google APIs | Instant–3 days | Sensitive scopes need verification |
| LinkedIn Marketing API | 7–14 business days | Requires partner program application |
| X Basic | Instant | Elevated access takes 1–3 days |
| WhatsApp Cloud API | 1–3 days | Templates: 1–24 hours each |

---

## TROUBLESHOOTING

**"Token expired" error on a connected account**
→ Ask client to re-connect the account (click Connect again — they'll be asked to re-authorize)
→ Meta tokens expire after 60 days unless refreshed; Mavixy should auto-refresh them

**"Insufficient permissions" on Meta**
→ Check that the client is an Admin (not Editor) on their Facebook Page
→ Go through the connection flow again and make sure all permission checkboxes are ticked

**"Account not found" on Google Ads**
→ Verify the 10-digit Customer ID is correct
→ Ask client to accept the MCC link request from their Google Ads account

**WhatsApp message not delivered**
→ Verify the recipient has opted in (saved your number)
→ Check that the message template is APPROVED (not PENDING) in Meta dashboard
→ Verify the phone number format is E.164: `+91XXXXXXXXXX`

**LinkedIn Company Page not appearing in selector**
→ The logged-in account must be a Super Admin of the page
→ Ask client to check their Page Admin role at linkedin.com/company/[page]/admin

---

*Last updated: July 2026 | Mavixy Internal Documentation*
