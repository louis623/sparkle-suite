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
  sections: LegalSection[];
};

export const legalFooterLinks = [
  {
    href: "/privacy-policy",
    label: "Privacy Policy",
  },
  {
    href: "/terms-and-conditions",
    label: "Terms and Conditions",
  },
] as const;

export const privacyPolicyDocument: LegalDocument = {
  pageTitle: "Privacy Policy",
  seoTitle: "Sparkle Suite Privacy Policy | Neon Rabbit Digital Services",
  seoDescription:
    "Privacy Policy for Sparkle Suite, the Live Queue Chrome Extension, Sparkle Suite websites, and Sparkle Suite SMS and email updates.",
  description: "Sparkle Suite Live Queue Chrome Extension, Sparkle Suite Websites, and SMS Updates",
  lastUpdated: "September 13, 2026",
  developer: "Neon Rabbit Digital Services, Jacksonville, FL",
  contact: "louis@neonrabbit.net",
  sections: [
    {
      title: "What This Policy Covers",
      paragraphs: [
        "This privacy policy explains how Neon Rabbit Digital Services collects, uses, stores, and protects information related to:",
      ],
      bullets: [
        "the Sparkle Suite Live Queue Chrome Extension",
        "Sparkle Suite representative websites",
        "Sparkle Suite waitlist, signup, intake, and contact forms",
        "Sparkle Suite Nic-Nac assistant, memory, and AI-assisted support features",
        "SMS and email update programs connected to Sparkle Suite",
        "related Neon Rabbit Digital Services websites and services",
      ],
    },
    {
      title: "What The Sparkle Suite Live Queue Extension Does",
      paragraphs: [
        "Sparkle Suite Live Queue is a Chrome extension that lets a Bomb Party representative deliberately connect a selected Party Orders source to the Live Lineup in that representative's Sparkle Suite Workspace and customer-facing website. The extension reads the selected source without refreshing, clicking, editing, or otherwise changing the Bomb Party page.",
      ],
    },
    {
      title: "Data We Collect",
      paragraphs: [],
    },
    {
      title: "From the Bomb Party dashboard through the Chrome extension, read-only",
      paragraphs: ["The Sparkle Suite Live Queue Chrome Extension may read:"],
      bullets: [
        "customer first names from the Party Orders table",
        "stable order and party identifiers used to distinguish and scope lineup entries",
        "order timing used to preserve the intended lineup order",
        "revealed or unrevealed status of each order",
        "the readiness state of the selected Party Orders source",
      ],
    },
    {
      title: "Stored locally in your browser by the Chrome extension",
      paragraphs: ["The extension may store:"],
      bullets: [
        "the representative's assigned Live Queue code entered from the Sparkle Suite Workspace",
        "publisher identifiers, ordered sequence, acknowledgment, retry, parser-health, and pause state needed to send updates reliably",
        "the explicitly selected Bomb Party source tab, show generation, and party scope for the current browser session",
      ],
      postBulletsParagraphs: [
        "The assigned Live Queue code and durable publisher state are restricted to trusted extension contexts. The selected source-tab details are stored only for the browser session. Disconnecting the browser deletes its saved code without changing the code assigned to the representative's Workspace.",
      ],
    },
    {
      title: "Transmitted to our server by the Chrome extension",
      paragraphs: [
        "The extension may transmit:",
        "This information is transmitted over HTTPS to the official Sparkle Suite Live Lineup service solely to authenticate the selected publisher, maintain connection health, operate the representative's lineup, and display the public lineup on the representative's website.",
      ],
      bullets: [
        "the assigned Live Queue code in an authorization header",
        "customer first names",
        "stable order and party identifiers",
        "order timing and intended queue order",
        "revealed or unrevealed status",
        "selected show and party scope, extension version, parser readiness, ordered sequence, and connection-health information",
      ],
    },
    {
      title: "Information collected through Sparkle Suite websites and forms",
      paragraphs: [
        "Sparkle Suite websites, waitlist forms, signup forms, intake forms, or contact forms may collect information you choose to provide, including:",
        "We collect this information only when you provide it through a form, signup flow, opt-in checkbox, text message interaction, or other direct interaction with Sparkle Suite or Neon Rabbit Digital Services.",
      ],
      bullets: [
        "name",
        "email address",
        "phone number",
        "TikTok handle or social media handle",
        "team representative name",
        "business or website setup information",
        "Nic-Nac conversation messages, workflow state, tool results, uploaded images, support context, and saved memory notes when you use AI-assisted Sparkle Suite features",
        "message preferences",
        "SMS opt-in status",
        "email opt-in status",
        "consent timestamps",
        "unsubscribe or opt-out status",
        "message interaction data needed to operate the messaging service",
      ],
    },
    {
      title: "Data We Do NOT Collect Through The Chrome Extension",
      paragraphs: ["The Sparkle Suite Live Queue Chrome Extension does not collect:"],
      bullets: [
        "last names",
        "email addresses",
        "phone numbers",
        "mailing addresses",
        "payment information",
        "transaction details",
        "browsing history",
        "website visits",
        "cookies",
        "Bomb Party login credentials",
        "saved passwords",
        "autofill data",
        "content from pages other than the explicitly selected Bomb Party Party Orders source",
      ],
    },
    {
      title: "How We Use Your Data",
      paragraphs: [
        "We use information handled through the Sparkle Suite Live Queue Chrome Extension exclusively to authenticate the representative's selected publisher, build and operate the Live Lineup, preserve deliberate ordering and hold/reveal state, provide recovery and connection status, and display the public lineup on the representative's Sparkle Suite website. Extension data is not used for advertising, creditworthiness, lending, or purposes unrelated to the Live Lineup feature.",
        "The anonymous customer-facing lineup displays first names, positions, and public lineup status only. It does not expose order IDs, party IDs, pairing credentials, publisher identifiers, private Hold entries, or recovery history.",
        "We may use information collected through Sparkle Suite websites and forms to:",
      ],
      bullets: [
        "provide Sparkle Suite services",
        "respond to requests or inquiries",
        "manage waitlist, signup, or onboarding workflows",
        "send requested SMS or email updates",
        "send live show reminders, event updates, dance floor updates, launch updates, or occasional promotional announcements when you have opted in",
        "maintain consent and opt-out records",
        "improve Sparkle Suite services",
        "protect against misuse, spam, fraud, or unauthorized access",
        "comply with legal, carrier, platform, or regulatory requirements",
      ],
    },
    {
      title: "Nic-Nac, Memory, And AI-Assisted Features",
      paragraphs: [
        "Sparkle Suite includes Nic-Nac, an AI-assisted workflow, website, live show, Dance Floor, support, and business helper. When you use Nic-Nac or related AI-assisted features, Sparkle Suite may process conversation messages, uploaded images, workflow state, tool results, representative account details, website setup details, show details, Dance Floor details, customer-audience details, support context, and saved memory notes.",
        "Nic-Nac memory is a product feature. Sparkle Suite may save bounded notes, preferences, summaries, conversation telemetry, tool activity, and troubleshooting context so Nic-Nac can provide more consistent help, avoid repeated mistakes, improve support, and operate safely across Sparkle Suite and linked Sparkle Finder experiences.",
      ],
      bullets: [
        "Nic-Nac may use saved memory to personalize future Sparkle Suite help for the same representative or linked account.",
        "If a Sparkle Suite representative links Sparkle Finder through the Secret Rep ID Number, bounded safe representative memory may be shared between Sparkle Suite and Sparkle Finder so the same Nic-Nac experience can follow that linked identity.",
        "Nic-Nac conversations, memory, telemetry, and tool results may be reviewed by Neon Rabbit Digital Services for support, troubleshooting, abuse prevention, product quality, safety, and approved Sparkle Lab analysis.",
        "AI model providers and service providers may process prompts, responses, and related context only as needed to provide the service to us.",
        "Do not send Nic-Nac sensitive personal, financial, medical, legal, or third-party confidential information unless it is necessary for the Sparkle Suite service you are requesting.",
      ],
    },
    {
      title: "SMS Privacy Notice",
      paragraphs: [
        "If you opt in to receive text messages from Neon Rabbit Digital Services, Sparkle Suite, or a Sparkle Suite representative site, we may collect your name, phone number, SMS opt-in status, consent timestamp, message preferences, and message interaction data so we can send the messages you requested.",
        "SMS messages may include launch updates, live show reminders, event updates, dance floor updates, customer updates, and occasional promotional announcements.",
        "Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase.",
        "You can opt out of SMS messages at any time by replying STOP. You can request help by replying HELP.",
      ],
    },
    {
      title: "SMS Data Sharing",
      paragraphs: [
        "We will not sell, rent, trade, or share your SMS opt-in data or consent status with third parties for their promotional or marketing purposes.",
        "All categories of data sharing described in this policy exclude text messaging originator opt-in data and consent. SMS opt-in data and consent status will not be shared with third parties for purposes unrelated to providing the SMS messaging service.",
        "We may share personal information, including SMS opt-in or consent status, with service providers that help us provide messaging services. These may include messaging platforms, phone carriers, hosting providers, compliance vendors, and other vendors that assist in the delivery, routing, security, or compliance of text messages. These providers may use that information only to help us provide the messaging service.",
      ],
    },
    {
      title: "Data Sharing",
      paragraphs: [
        "We do not sell personal information.",
        "We do not sell, trade, or share data collected by the Sparkle Suite Live Queue Chrome Extension with third parties for advertising, promotional, or marketing purposes.",
        "We may share limited information with service providers that help us operate Sparkle Suite and Neon Rabbit Digital Services, such as hosting providers, database providers, messaging providers, email providers, analytics providers, security providers, and compliance vendors. These providers are allowed to use the information only to provide services to us.",
        "We may also disclose information if required to comply with law, legal process, platform rules, carrier requirements, or to protect the rights, safety, and security of Neon Rabbit Digital Services, Sparkle Suite users, representatives, customers, or the public.",
      ],
    },
    {
      title: "Data Retention",
      paragraphs: [
        "The current Live Lineup state is updated as the selected source changes. Private show archives may retain lineup entries, stable identifiers, show scope, and operational timestamps so the representative can deliberately recover selected customers into a later show's private Hold area. These archives are not part of the anonymous customer-facing lineup and are retained only as needed to provide the Live Lineup service, support recovery, protect the service, resolve disputes, or comply with legal obligations.",
        "Browser pairing credentials expire, may be revoked by the representative, and are stored on our server only as non-reversible hashes. Limited credential metadata may be retained for security and audit purposes. Removing a pairing from the extension deletes the saved key from that browser.",
        "Information collected through Sparkle Suite websites and forms may be retained for as long as needed to provide services, maintain consent records, honor opt-out requests, comply with legal or carrier requirements, resolve disputes, enforce agreements, or operate Sparkle Suite.",
        "SMS opt-in, opt-out, and consent records may be retained as needed to document compliance and prevent unwanted messages.",
      ],
    },
    {
      title: "Your Rights and Choices",
      paragraphs: [],
      bullets: [
        "You can pause Chrome extension updates, disconnect the browser, or uninstall the extension.",
        "You can opt out of SMS messages at any time by replying STOP.",
        "You can request help for SMS messages by replying HELP.",
        "You can unsubscribe from email messages by using the unsubscribe method provided in the email, if available, or by contacting us.",
        "To request access to, correction of, or deletion of your data, contact louis@neonrabbit.net.",
      ],
    },
    {
      title: "Security",
      paragraphs: [
        "Data is transmitted over HTTPS.",
        "The extension limits its Party Orders access to the Bomb Party source explicitly selected by the representative. The assigned Live Queue code is restricted to trusted extension contexts and is never exposed to the customer-facing lineup.",
        "Our database uses security controls, including row-level security where applicable, to help keep representative data isolated.",
        "We take reasonable steps to protect information from unauthorized access, loss, misuse, or disclosure. However, no electronic transmission or storage system can be guaranteed to be completely secure.",
      ],
    },
    {
      title: "Children's Privacy",
      paragraphs: [
        "Sparkle Suite and Neon Rabbit Digital Services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information to us, contact louis@neonrabbit.net so we can review and delete it if appropriate.",
      ],
    },
    {
      title: "Changes to This Policy",
      paragraphs: [
        "We may update this privacy policy from time to time. Changes will be reflected in the Last Updated date above.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        "Neon Rabbit Digital Services",
        "Jacksonville, FL",
        "louis@neonrabbit.net",
      ],
    },
  ],
};

export const termsAndConditionsDocument: LegalDocument = {
  pageTitle: "Terms and Conditions",
  seoTitle: "Sparkle Suite Terms and Conditions | Neon Rabbit Digital Services",
  seoDescription:
    "Terms and Conditions for Sparkle Suite, the Live Queue Chrome Extension, Sparkle Suite websites, and Sparkle Suite SMS and email updates.",
  description: "Sparkle Suite, Sparkle Suite Live Queue Chrome Extension, and SMS Updates",
  lastUpdated: "June 22, 2026",
  developer: "Neon Rabbit Digital Services, Jacksonville, FL",
  contact: "louis@neonrabbit.net",
  sections: [
    {
      title: "Agreement to These Terms",
      paragraphs: [
        "These Terms and Conditions explain the rules for using Sparkle Suite, the Sparkle Suite Live Queue Chrome Extension, Sparkle Suite representative websites, related Neon Rabbit Digital Services websites, and SMS or email update programs connected to Sparkle Suite.",
        "By using these services, installing the Chrome extension, submitting a form, joining a waitlist, opting in to messages, or using a Sparkle Suite representative website, you agree to these Terms and Conditions.",
        "If you do not agree, do not use these services.",
      ],
    },
    {
      title: "About Sparkle Suite",
      paragraphs: [
        "Sparkle Suite is a software and website system created by Neon Rabbit Digital Services to help independent representatives manage parts of their online presence, including representative websites, live reveal queue display, customer updates, event reminders, dance floor updates, and related tools.",
        "Sparkle Suite is not owned by, operated by, endorsed by, or officially affiliated with Bomb Party, LLC. Bomb Party names, trademarks, products, and related references belong to their respective owner.",
      ],
    },
    {
      title: "Sparkle Suite Live Queue Chrome Extension",
      paragraphs: [
        "The Sparkle Suite Live Queue Chrome Extension reads limited queue information from the Bomb Party representative dashboard and syncs it to the representative's Sparkle Suite website.",
        "The extension is intended to display customer first names, queue order, and reveal status during live jewelry shows.",
        "The extension does not process payments, place orders, alter Bomb Party orders, or replace any official Bomb Party system.",
        "Representatives are responsible for using the extension appropriately and making sure the information displayed to customers is accurate.",
      ],
    },
    {
      title: "Representative Website Content",
      paragraphs: [
        "Sparkle Suite representative websites may include show information, live queue information, dance floor details, representative updates, links, signup forms, and related content.",
        "Representatives are responsible for reviewing their own website content, business information, show details, trade details, and customer-facing information.",
        "Neon Rabbit Digital Services may provide tools, templates, automation, or support, but representatives remain responsible for final business decisions, customer interactions, and compliance with any applicable Bomb Party policies or legal requirements.",
      ],
    },
    {
      title: "Nic-Nac And AI-Assisted Features",
      paragraphs: [
        "Sparkle Suite includes Nic-Nac and related AI-assisted tools that can help with setup, website content, Dance Floor workflows, live show planning, customer-audience workflows, support, and business organization within Sparkle Suite.",
        "Nic-Nac may use saved memory and workspace context to provide more consistent help over time. Nic-Nac is not a human employee, lawyer, accountant, financial advisor, medical provider, therapist, or official Bomb Party representative.",
        "AI-assisted output may be incomplete, inaccurate, or require review. Representatives remain responsible for reviewing their own website content, show details, Dance Floor listings, customer communications, business decisions, and compliance with applicable platform, carrier, legal, and Bomb Party requirements.",
        "Nic-Nac tool access is permission-based and product-surface gated. Sparkle Suite workspace actions must be performed from the appropriate Sparkle Suite account surface. Neon Rabbit Digital Services may limit, refuse, suspend, or redirect Nic-Nac use that is off-mission, abusive, unsafe, excessive, or outside the intended Sparkle Suite and Sparkle Finder scope.",
      ],
    },
    {
      title: "SMS Terms",
      paragraphs: [
        "Program name: Sparkle Suite / Neon Rabbit Digital Services.",
        "By opting in to receive text messages from Neon Rabbit Digital Services, Sparkle Suite, or a Sparkle Suite representative site, you agree to receive SMS messages related to Sparkle Suite or the representative you signed up with.",
        "Messages may include:",
      ],
      bullets: [
        "launch updates",
        "live show reminders",
        "event updates",
        "dance floor updates",
        "customer updates",
        "website or onboarding updates",
        "occasional promotional announcements",
      ],
      postBulletsParagraphs: [
        "Message frequency may vary.",
        "Message and data rates may apply.",
        "Consent to receive SMS messages is not a condition of purchase.",
        "You can opt out at any time by replying STOP.",
        "You can request help at any time by replying HELP.",
        "For help, you may also contact louis@neonrabbit.net.",
        "Wireless carriers are not liable for delayed or undelivered messages.",
      ],
    },
    {
      title: "SMS Opt-In",
      paragraphs: [
        "You may opt in to SMS messages by submitting a Sparkle Suite or representative website form and checking an unchecked SMS consent box.",
        "The SMS opt-in language will explain that you are agreeing to receive text messages, that message frequency may vary, that message and data rates may apply, that consent is not a condition of purchase, and that you can reply STOP to opt out or HELP for help.",
      ],
    },
    {
      title: "SMS Opt-Out",
      paragraphs: [
        "You can unsubscribe from SMS messages at any time by replying STOP.",
        "After you reply STOP, you may receive a confirmation message stating that you have been unsubscribed. After that, you should not receive further SMS messages from that campaign unless you opt in again.",
      ],
    },
    {
      title: "SMS Help",
      paragraphs: [
        "You can reply HELP for help.",
        "A HELP response may provide support information, including how to unsubscribe or how to contact Neon Rabbit Digital Services.",
      ],
    },
    {
      title: "Email Updates",
      paragraphs: [
        "If you opt in to email updates, you may receive messages related to Sparkle Suite, a Sparkle Suite representative, live shows, events, launch updates, onboarding updates, or related announcements.",
        "You may unsubscribe from email updates by using the unsubscribe method provided in the email, if available, or by contacting louis@neonrabbit.net.",
      ],
    },
    {
      title: "Privacy",
      paragraphs: [
        "Your use of Sparkle Suite, the Sparkle Suite Live Queue Chrome Extension, Sparkle Suite representative websites, and related messaging programs is also governed by our Privacy Policy:",
        "The Privacy Policy explains what information we collect, how we use it, and how SMS opt-in data is protected.",
      ],
      links: [
        {
          href: "/privacy-policy",
          label: "/privacy-policy",
        },
      ],
    },
    {
      title: "No Sale or Sharing of SMS Consent for Marketing",
      paragraphs: [
        "We do not sell, rent, trade, or share SMS opt-in data or SMS consent status with third parties for their promotional or marketing purposes.",
        "SMS opt-in data and consent status may be shared only with service providers that help provide the messaging service, such as messaging platforms, phone carriers, hosting providers, compliance vendors, and other vendors involved in message delivery, routing, security, or compliance.",
      ],
    },
    {
      title: "Acceptable Use",
      paragraphs: ["You agree not to use Sparkle Suite, the Chrome extension, representative websites, or messaging programs to:"],
      bullets: [
        "send unlawful, deceptive, abusive, harassing, or harmful content",
        "violate carrier messaging rules",
        "violate platform rules",
        "violate intellectual property rights",
        "interfere with the security or operation of the services",
        "attempt to access data or systems you are not authorized to access",
        "misrepresent your identity, affiliation, products, or services",
        "send prohibited or non-compliant marketing claims",
      ],
    },
    {
      title: "Service Availability",
      paragraphs: [
        "Sparkle Suite and related services may change, pause, or become unavailable from time to time.",
        "Neon Rabbit Digital Services may update, modify, suspend, or discontinue any part of the services at any time.",
        "We do not guarantee uninterrupted or error-free service.",
      ],
    },
    {
      title: "Third-Party Services",
      paragraphs: [
        "Sparkle Suite may rely on third-party services such as hosting providers, database providers, messaging providers, email providers, payment providers, browser platforms, or other software tools.",
        "Use of those third-party services may be subject to their own terms, policies, and availability.",
        "Neon Rabbit Digital Services is not responsible for third-party service outages, delays, policy changes, or failures.",
      ],
    },
    {
      title: "Payments and Fees",
      paragraphs: [
        "Some Sparkle Suite services may require payment.",
        "Any payment terms, subscription terms, setup fees, or service fees will be presented separately when applicable.",
        "Listed Sparkle Suite prices do not include taxes.",
        "Stripe checkout may calculate and show applicable taxes, payment-processing details, or other checkout-related amounts before payment is submitted.",
        "The final amount shown in Stripe checkout controls before payment is submitted.",
        "Unless otherwise stated in writing, fees are not automatically refundable once work has started or services have been provided.",
      ],
    },
    {
      title: "No Income Claims",
      paragraphs: [
        "Sparkle Suite does not guarantee sales, income, recruiting results, business growth, customer engagement, or any specific financial outcome.",
        "Any business results depend on many factors outside the control of Neon Rabbit Digital Services, including representative effort, product demand, platform rules, customer interest, and market conditions.",
      ],
    },
    {
      title: "Intellectual Property",
      paragraphs: [
        "Sparkle Suite, related software, website templates, workflows, content structures, branding created by Neon Rabbit Digital Services, and related materials are owned by or licensed to Neon Rabbit Digital Services unless otherwise stated.",
        "You may not copy, resell, redistribute, reverse engineer, or reuse Sparkle Suite software, templates, workflows, or materials outside the intended use of the service without written permission.",
      ],
    },
    {
      title: "Disclaimer of Warranties",
      paragraphs: [
        "The services are provided as is and as available.",
        "To the fullest extent permitted by law, Neon Rabbit Digital Services disclaims warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, or reliability.",
      ],
    },
    {
      title: "Limitation of Liability",
      paragraphs: [
        "To the fullest extent permitted by law, Neon Rabbit Digital Services will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, lost business opportunities, or service interruptions.",
      ],
    },
    {
      title: "Changes to These Terms",
      paragraphs: [
        "We may update these Terms and Conditions from time to time. Changes will be reflected in the Last Updated date above.",
        "Your continued use of the services after changes are posted means you accept the updated terms.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        "Neon Rabbit Digital Services",
        "Jacksonville, FL",
        "louis@neonrabbit.net",
      ],
    },
  ],
};
