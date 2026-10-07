export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  postBulletsParagraphs?: string[];
  links?: Array<{
    href: string;
    label: string;
  }>;
};

export type LegalDocument = {
  pageTitle: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
  lastUpdated: string;
  developer: string;
  contact: string;
  plainEnglishSummary: string;
  sections: LegalSection[];
};

export const sparkleFinderLegalFooterLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms and Conditions" },
] as const;

const developer = "Neon Rabbit Digital Services, Jacksonville, FL";
const contact = "louis@neonrabbit.net";
const lastUpdated = "October 3, 2026";

export const sparkleFinderPrivacyPolicyDocument: LegalDocument = {
  pageTitle: "Privacy Policy",
  seoTitle: "Sparkle Finder Privacy Policy | Neon Rabbit Digital Services",
  seoDescription:
    "Privacy Policy for Sparkle Finder customer accounts, Silver trial access, collector tools, Showcase features, and Sparkle Suite-powered discovery data.",
  description:
    "Sparkle Finder customer accounts, Silver trial access, collector tools, Showcase features, and Sparkle Suite-powered discovery data.",
  lastUpdated,
  developer,
  contact,
  plainEnglishSummary:
    "Sparkle Finder uses the information needed to run customer accounts, trial protection, account support, Favorite Reps, Public Showcases, one-way follows, block/report safety, optional updates, and discovery features. Neon Rabbit Digital Services does not sell personal information or SMS opt-in data.",
  sections: [
    {
      title: "What This Policy Covers",
      paragraphs: [
        "This privacy policy explains how Neon Rabbit Digital Services collects, uses, stores, and protects information related to Sparkle Finder.",
      ],
      bullets: [
        "Sparkle Finder public pages and customer account pages",
        "Sparkle Finder signup, sign-in, account, and Silver trial flows",
        "Favorite Reps, Public Showcases, Showcase Collections, Reveal Spotlight, one-way follow, block, report, watchlist, and Nic-Nac request features",
        "Nic-Nac assistant, memory, linked-rep context, and AI-assisted collector support features",
        "Sparkle Suite-powered library, live show, Dance Floor, and dancer availability data shown in Sparkle Finder",
        "optional Sparkle Finder email or SMS update choices",
      ],
    },
    {
      title: "Information Sparkle Finder Collects",
      paragraphs: [
        "Sparkle Finder may collect information you provide directly through account, signup, profile, preference, request, or support flows.",
      ],
      bullets: [
        "display name",
        "email address",
        "phone number",
        "state",
        "TikTok handle or other social handle if you choose to provide it",
        "Favorite Reps, Sparkle Showcase profile details, saved jewelry items, Showcase Collections, watchlist items, reveal stories, notes, and profile visibility choices",
        "Nic-Nac conversation messages, request details, saved memory notes, tool results, and linked Sparkle Suite representative context when you use AI-assisted features",
        "followed collectors, one-way follows, follower counts, following counts, block details, reports, moderation details, Public Showcases, and public sharing links",
        "privacy acknowledgment status and consent timestamps",
        "optional promotional email or SMS opt-in status",
        "account, trial, membership, billing, and support status needed to provide Sparkle Finder",
      ],
    },
    {
      title: "How Sparkle Finder Uses Information",
      paragraphs: [
        "Sparkle Finder uses account information to provide access, protect trial eligibility, support account recovery, maintain privacy choices, and operate customer discovery tools.",
      ],
      bullets: [
        "create and manage Sparkle Finder customer accounts",
        "provide the 45-day Silver trial and Silver membership access",
        "support Favorite Reps, Sparkle Showcase, Public Showcases, Showcase Collections, Reveal Spotlight, watchlist, one-way follow, block, report, and Nic-Nac request features",
        "show relevant library, live show, Dance Floor, and dancer availability information",
        "respond to support requests or product concern reports",
        "send account, security, trial, billing, or service notices",
        "send optional promotional messages only when you choose to opt in",
        "protect against misuse, spam, fraud, unauthorized access, and policy violations",
      ],
    },
    {
      title: "How A Jewelry Profile Is Used",
      paragraphs: [
        "If you share jewelry preferences with Finder, they are used in three ways.",
      ],
      bullets: [
        "Shared with Sparkle Suite reps only, so they can use them. Nobody else receives them.",
        "Kept for your own Finder profile and collection.",
        "Used by Finder to point you toward pieces you might like.",
      ],
    },
    {
      title: "Nic-Nac, Memory, And AI-Assisted Features",
      paragraphs: [
        "Sparkle Finder includes Nic-Nac, an AI-assisted collector, Silver, Showcase, discovery, and support helper. When you use Nic-Nac or related AI-assisted features, Sparkle Finder may process conversation messages, request details, collection details, Showcase details, Wishlist and Favorite Rep details, library searches, linked-rep details, tool results, support context, and saved memory notes.",
        "Nic-Nac memory is a product feature. Sparkle Finder may save bounded notes, preferences, summaries, conversation telemetry, tool activity, and troubleshooting context so Nic-Nac can provide more consistent help, avoid repeated mistakes, improve support, and operate safely across Sparkle Finder and linked Sparkle Suite experiences.",
      ],
      bullets: [
        "Nic-Nac may use saved memory to personalize future Sparkle Finder help for the same account.",
        "If a Sparkle Suite representative links Sparkle Finder through the Secret Rep ID Number, bounded safe representative memory may be shared between Sparkle Suite and Sparkle Finder so the same Nic-Nac experience can follow that linked identity.",
        "Nic-Nac conversations, memory, telemetry, and tool results may be reviewed by Neon Rabbit Digital Services for support, troubleshooting, abuse prevention, product quality, safety, and approved Sparkle Lab analysis.",
        "AI model providers and service providers may process prompts, responses, and related context only as needed to provide the service to us.",
        "Do not send Nic-Nac sensitive personal, financial, medical, legal, or third-party confidential information unless it is necessary for the Sparkle Finder service you are requesting.",
      ],
    },
    {
      title: "Sparkle Suite Data And Rep Links",
      paragraphs: [
        "Sparkle Finder may display catalog, live show, rep, Dance Floor, and dancer availability information read from or linked through Sparkle Suite systems.",
        "Sparkle Finder does not make every rep, dancer, availability count, show time, or external link permanently available or guaranteed. Reps and third-party systems may change their own information.",
      ],
    },
    {
      title: "Sparkle Showcase Sharing And Moderation",
      paragraphs: [
        "If you make Sparkle Showcase content public, visitors may be able to view Public Showcases, Showcase Collections, Reveal Spotlight pages, selected jewelry records, reveal stories, display names, handles, follower counts, following counts, public sharing links, and other information you choose to make visible.",
        "Sparkle Finder may store and review one-way follows, block details, reports, and moderation details to operate public sharing features, reduce spam, respond to abuse reports, and protect users through blocking, reporting, and moderation review.",
      ],
    },
    {
      title: "SMS And Email Choices",
      paragraphs: [
        "If you opt in to optional SMS or email updates, Sparkle Finder may store your opt-in status, consent timestamp, message preference, opt-out status, and message interaction data needed to provide or document the messaging service.",
        "Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase. You can opt out of SMS messages by replying STOP and request help by replying HELP.",
      ],
    },
    {
      title: "Data Sharing",
      paragraphs: [
        "We do not sell personal information.",
        "We do not sell, rent, trade, or share SMS opt-in data or SMS consent status with third parties for their promotional or marketing purposes.",
        "We may share limited information with service providers that help operate Sparkle Finder and Neon Rabbit Digital Services, such as hosting providers, database providers, authentication providers, payment providers, messaging providers, email providers, analytics providers, security providers, and compliance vendors.",
        "We may disclose information if required to comply with law, legal process, platform rules, carrier requirements, or to protect the rights, safety, and security of Neon Rabbit Digital Services, Sparkle Finder users, Sparkle Suite reps, customers, or the public.",
      ],
    },
    {
      title: "Data Retention",
      paragraphs: [
        "Sparkle Finder may retain account, consent, membership, billing, support, Favorite Reps, Sparkle Showcase, one-way follow, block, report, moderation, and customer tool data for as long as needed to provide services, maintain consent records, honor opt-out requests, comply with legal or carrier requirements, resolve disputes, enforce agreements, or operate Sparkle Finder.",
        "SMS opt-in, opt-out, and consent records may be retained as needed to document compliance and prevent unwanted messages.",
      ],
    },
    {
      title: "Your Rights And Choices",
      bullets: [
        "You can update account profile and preference details from available account tools.",
        "You can change available Sparkle Showcase visibility choices and public sharing links where those tools are provided.",
        "You can report spam or bad behavior from available Sparkle Showcase surfaces.",
        "You can opt out of SMS messages by replying STOP.",
        "You can request help for SMS messages by replying HELP.",
        "You can unsubscribe from email messages by using the unsubscribe method provided in the email, if available, or by contacting us.",
        "To request access to, correction of, or deletion of your data, contact louis@neonrabbit.net.",
      ],
    },
    {
      title: "Security",
      paragraphs: [
        "Data is transmitted over HTTPS.",
        "Sparkle Finder uses service providers and security controls designed to help protect account and customer data.",
        "We take reasonable steps to protect information from unauthorized access, loss, misuse, or disclosure. However, no electronic transmission or storage system can be guaranteed to be completely secure.",
      ],
    },
    {
      title: "Children's Privacy",
      paragraphs: [
        "Sparkle Finder and Neon Rabbit Digital Services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information to us, contact louis@neonrabbit.net so we can review and delete it if appropriate.",
      ],
    },
    {
      title: "Changes To This Policy",
      paragraphs: [
        "We may update this privacy policy from time to time. Changes will be reflected in the Last Updated date above.",
      ],
    },
    {
      title: "Contact",
      paragraphs: ["Neon Rabbit Digital Services", "Jacksonville, FL", "louis@neonrabbit.net"],
    },
  ],
};

export const sparkleFinderTermsAndConditionsDocument: LegalDocument = {
  pageTitle: "Terms and Conditions",
  seoTitle: "Sparkle Finder Terms and Conditions | Neon Rabbit Digital Services",
  seoDescription:
    "Terms and Conditions for Sparkle Finder customer accounts, Silver access, collector tools, Showcase features, and Sparkle Suite-powered discovery data.",
  description:
    "Sparkle Finder customer discovery hub, customer accounts, Silver access, collector tools, Showcase features, and Sparkle Suite-powered discovery data.",
  lastUpdated,
  developer,
  contact,
  plainEnglishSummary:
    "Sparkle Finder is a customer discovery hub by Sparkle Suite. These terms explain account use, Silver access, discovery data, Favorite Reps, Public Showcases, one-way follows, and important limits: Sparkle Finder is not Bomb Party, not a jewelry marketplace, and not an escrow or fulfillment service.",
  sections: [
    {
      title: "Agreement To These Terms",
      paragraphs: [
        "These Terms and Conditions explain the rules for using Sparkle Finder, including public pages, customer accounts, Silver access, Sparkle Showcase tools, and Sparkle Suite-powered discovery data.",
        "By using Sparkle Finder, creating an account, submitting a form, using a Sparkle Showcase tool, joining a trial, opting in to messages, or clicking through to an external site, you agree to these Terms and Conditions.",
        "If you do not agree, do not use Sparkle Finder.",
      ],
    },
    {
      title: "About Sparkle Finder",
      paragraphs: [
        "Sparkle Finder is a customer and collector discovery hub by Sparkle Suite and Neon Rabbit Digital Services.",
        "Sparkle Finder is not owned by, operated by, endorsed by, sponsored by, or officially affiliated with Bomb Party, LLC. Bomb Party names, trademarks, products, and related references belong to their respective owner.",
      ],
    },
    {
      title: "Customer Accounts And Silver Access",
      paragraphs: [
        "Sparkle Finder accounts may provide access to customer discovery tools, Silver trial features, Silver membership features, and account preferences.",
        "New customer accounts may begin with a 45-day Silver trial when that offer is available. Trial access, included access, paid access, and Free access may differ by feature.",
        "You are responsible for keeping your account information accurate and for using your account only for lawful, appropriate purposes.",
      ],
    },
    {
      title: "Library, Live Shows, Dance Floor, And Availability",
      paragraphs: [
        "Sparkle Finder may display jewelry library records, live show information, rep links, Dance Floor links, and dancer availability information powered by Sparkle Suite systems or other approved sources.",
        "Sparkle Finder does not guarantee that every dancer, show time, availability count, rep link, item detail, or external destination is complete, current, or error-free.",
      ],
    },
    {
      title: "Sparkle Showcase, Profile, And Watchlist Tools",
      paragraphs: [
        "Silver and account tools may let customers save Favorite Reps, Sparkle Showcase profile details, saved jewelry items, Public Showcases, Showcase Collections, watchlist items, notes, reveal stories, preferences, profile visibility choices, public sharing links, and related information.",
        "You are responsible for information you choose to save or make visible. Sparkle Finder may change, pause, or limit these tools as the product develops.",
      ],
    },
    {
      title: "Nic-Nac And AI-Assisted Features",
      paragraphs: [
        "Sparkle Finder includes Nic-Nac and related AI-assisted tools that can help with jewelry discovery, library search, Silver collection organization, Showcase support, Wishlist support, Favorite Rep context, linked-rep context, and product support within Sparkle Finder.",
        "Nic-Nac may use saved memory and account context to provide more consistent help over time. Nic-Nac is not a human employee, lawyer, accountant, financial advisor, medical provider, therapist, official Bomb Party representative, transaction broker, payment intermediary, or fulfillment provider.",
        "AI-assisted output may be incomplete, inaccurate, or require review. You are responsible for reviewing your own profile details, public Showcase choices, saved collection details, Wishlist details, rep links, show details, external purchase decisions, and communications outside Sparkle Finder.",
        "Nic-Nac tool access is permission-based and product-surface gated. Sparkle Suite workspace actions must be performed from the appropriate Sparkle Suite account surface. Neon Rabbit Digital Services may limit, refuse, suspend, or redirect Nic-Nac use that is off-mission, abusive, unsafe, excessive, or outside the intended Sparkle Finder and Sparkle Suite scope.",
      ],
    },
    {
      title: "Follows, Blocking, Reports, And Moderation",
      paragraphs: [
        "Sparkle Showcase sharing may let signed-in users follow public collectors and Public Showcases through one-way follows, view follower counts, use public sharing links, block collectors, and report spam or bad behavior.",
        "Sparkle Finder may remove, hide, limit, preserve, or review content, blocks, reports, and moderation details to reduce spam, protect users, investigate abuse, or enforce these Terms through blocking, reporting, and moderation review.",
        "Sparkle Finder does not support DMs, friend requests, customer-to-customer trading, customer marketplace features, escrow, payment, fulfillment, or disputes.",
      ],
    },
    {
      title: "Third-Party Product Resources",
      paragraphs: [
        "Sparkle Finder may link to external retailer or product resources for convenience, including optional photo setup examples for Showcase Studio uploads.",
        "Those links are informational resources. Sparkle Finder does not manufacture, sell, ship, warrant, or guarantee third-party products.",
      ],
    },
    {
      title: "Acceptable Use",
      paragraphs: ["You agree not to use Sparkle Finder to:"],
      bullets: [
        "send unlawful, deceptive, abusive, harassing, or harmful content",
        "misrepresent your identity, affiliation, products, ownership, or availability",
        "pressure, harass, spam, or mislead collectors, reps, or other visitors",
        "Do not use Sparkle Finder to request or arrange DMs, friend requests, customer-to-customer jewelry trading, customer marketplace workflows, escrow, payment, fulfillment, or disputes",
        "scrape, overload, attack, reverse engineer, or interfere with Sparkle Finder systems",
        "attempt to access data or accounts you are not authorized to access",
        "post or save content that violates intellectual property rights or privacy rights",
        "use Sparkle Finder to conduct fraud, spam, or non-compliant marketing",
      ],
    },
    {
      title: "Privacy",
      paragraphs: [
        "Your use of Sparkle Finder is also governed by the Sparkle Finder Privacy Policy.",
        "How jewelry preferences you share with Finder are used is explained in the Privacy Policy under How A Jewelry Profile Is Used.",
      ],
      links: [{ href: "/privacy-policy", label: "/privacy-policy" }],
    },
    {
      title: "Third-Party Services",
      paragraphs: [
        "Sparkle Finder may rely on third-party services such as hosting providers, database providers, authentication providers, payment providers, messaging providers, email providers, analytics providers, security providers, retailers, and external Sparkle Suite or rep sites.",
        "Use of third-party services may be subject to their own terms, policies, prices, availability, and operational rules.",
      ],
    },
    {
      title: "Payments, Trials, And Billing",
      paragraphs: [
        "Some Sparkle Finder features may require paid Silver access or another eligibility path.",
        "Any paid subscription, trial, billing, cancellation, or tax details will be presented in the relevant checkout, billing, or account surface before payment is submitted when payment is applicable.",
        "Unless otherwise stated in writing, access may continue or end according to the subscription, trial, billing, or eligibility terms shown for the account.",
      ],
    },
    {
      title: "No Sales, Escrow, Or Fulfillment",
      paragraphs: [
        "Sparkle Finder is a discovery hub, not a jewelry marketplace.",
        "Sparkle Finder does not support buying from members, selling your jewelry, message seller workflows, customer-to-customer jewelry trading, or customer-to-customer marketplace workflows.",
        "Sparkle Finder does not process jewelry payments between customers, provide escrow, hold inventory, verify every item, ship items, provide fulfillment, or settle disputes between customers, reps, retailers, or third parties.",
      ],
    },
    {
      title: "No Guarantees",
      paragraphs: [
        "Sparkle Finder does not guarantee that you will find a specific item, complete a purchase from a rep or retailer, receive a particular offer, reach a specific rep, or get a particular collector outcome.",
      ],
    },
    {
      title: "Intellectual Property",
      paragraphs: [
        "Sparkle Finder, Sparkle Suite, related software, workflows, content structures, branding created by Neon Rabbit Digital Services, and related materials are owned by or licensed to Neon Rabbit Digital Services unless otherwise stated.",
        "You may not copy, resell, redistribute, reverse engineer, or reuse Sparkle Finder software, templates, workflows, or materials outside the intended use of the service without written permission.",
      ],
    },
    {
      title: "Disclaimer Of Warranties",
      paragraphs: [
        "Sparkle Finder is provided as is and as available.",
        "To the fullest extent permitted by law, Neon Rabbit Digital Services disclaims warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, or reliability.",
      ],
    },
    {
      title: "Limitation Of Liability",
      paragraphs: [
        "To the fullest extent permitted by law, Neon Rabbit Digital Services will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, lost business opportunities, service interruptions, external purchase issues, or third-party disputes.",
      ],
    },
    {
      title: "Changes To These Terms",
      paragraphs: [
        "We may update these Terms and Conditions from time to time. Changes will be reflected in the Last Updated date above.",
        "Your continued use of Sparkle Finder after changes are posted means you accept the updated terms.",
      ],
    },
    {
      title: "Contact",
      paragraphs: ["Neon Rabbit Digital Services", "Jacksonville, FL", "louis@neonrabbit.net"],
    },
  ],
};
