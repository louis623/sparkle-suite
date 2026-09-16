export type OnboardingStep = {
  id: string
  title: string
  summary: string
  source: string
  whatToDo: string[]
  whyItMatters: string
  askLeadWhen: string
  nicNacPrompt: string
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'start-strong-1',
    title: 'Connect with your team lead',
    summary: 'Get connected and learn where to go when you need team help.',
    source: 'Team guidance',
    whatToDo: [
      'Reply to your welcome and make sure you know your team lead’s preferred private channel for team questions and your information.',
      'Send a recent, well-lit photo that your team lead has permission to use for your team announcement and public Join Team card.',
      'Send your email address and the best phone number for your team lead to reach you.',
      'Send your TikTok handle plus any social links you want shown publicly, such as Facebook, Instagram, Whatnot, or another platform you use.',
      'Confirm the state where you are located, along with the spelling of your name and the show or business name you want your team lead to use.',
      'Keep passwords, verification codes, payout details, and other private account information out of ordinary team messages.',
    ],
    whyItMatters:
      'This gives your team lead what they need to welcome you, stay in touch, and—with your permission—add an accurate card to the team’s public Join Team page.',
    askLeadWhen:
      'You are unsure which photo or social links are needed, what can be public, or which team channel is current.',
    nicNacPrompt: 'What should I do first to connect with my team lead?',
  },
  {
    id: 'start-strong-2',
    title: 'Start Bomb Party University',
    summary: 'Set up your BPU access and begin the Start Strong course.',
    source: 'Official training, with team support',
    whatToDo: [
      'Look for the email titled “Confirm Your Email Account for Bomb Party University.”',
      'Use the same email address you used when enrolling as a rep, then enter the six-digit code BPU sends you.',
      'Read and accept the BPU and Teachable terms when prompted.',
      'Open the first new-rep course, “Start Strong and Get Fizzing!”, and follow the course in order.',
      'If BPU shows a completion screen or certificate, save a screenshot for your records. Do not worry if it does not show one.',
    ],
    whyItMatters:
      'BPU is the official source for company training. This guide organizes the path, but it never replaces the course or official support.',
    askLeadWhen:
      'The confirmation email, six-digit code, sign-in, or course access does not work after a careful retry.',
    nicNacPrompt: 'How do I get into Bomb Party University?',
  },
  {
    id: 'start-strong-3',
    title: 'Set up pay and payouts',
    summary: 'Finish your PayQuicker setup so you are ready to receive payouts.',
    source: 'Provider instructions first; your team lead for team context',
    whatToDo: [
      'Open the PayQuicker setup message only when you are ready to complete it and verify that it is the expected provider communication.',
      'Follow the provider’s current instructions so any payout card or account access can be issued correctly.',
      'Never send passwords, one-time codes, banking details, or identity documents to your team lead through this guide.',
      'Use official Bomb Party and PayQuicker information for payout timing, eligibility, and account-specific questions.',
    ],
    whyItMatters:
      'Payment setup affects sensitive personal and financial information. The provider’s current instructions—not memory or a team guess—must control.',
    askLeadWhen:
      'You cannot identify the expected setup email or need help understanding the team’s process. Use official support for identity, account, or missing-payment problems.',
    nicNacPrompt: 'What is PayQuicker and what should I do with the setup email?',
  },
  {
    id: 'start-strong-4',
    title: 'Build your first-live setup',
    summary: 'Create a simple space where customers can clearly see your reveals.',
    source: 'BPU requirements plus practical team examples',
    whatToDo: [
      'Set up your phone or camera so customers can clearly see both you and the reveal area.',
      'Test lighting at the same time of day you expect to go live and check for glare, harsh shadows, and unreadable labels.',
      'Use BPU to identify required live-show and safety equipment. Older supply examples included organization pouches and containers, mailers, jewelry boxes, a label printer, a ring light, a burner, and a heat-safe clear pot.',
      'Make a short required-now list and a later-upgrade list before shopping. Confirm uncertain or expensive items with your team lead first.',
      'Practice reaching your tools and packaging without leaving the camera or crossing the reveal area.',
    ],
    whyItMatters:
      'A calm first live comes from knowing where everything is and confirming that customers can see the experience clearly. More equipment does not automatically create a better show.',
    askLeadWhen:
      'You need the current supply list, are unsure whether an item is required, or want a quick review of your camera and lighting setup.',
    nicNacPrompt: 'What supplies should I compare before my first live?',
  },
  {
    id: 'start-strong-5',
    title: 'Get shipping ready',
    summary: 'Learn how you will pack, label, and track customer orders.',
    source: 'Official policies plus your team’s workflow',
    whatToDo: [
      'Ask your team lead to confirm the team’s current shipping-service setup before subscribing or paying for a plan. An older guide referenced Ship.com and a $19 plan; treat that as historical until it is confirmed as current.',
      'Learn where orders appear in the Bomb Party back office and how you verify names, addresses, and order status.',
      'Before purchasing labels, check whether one customer placed multiple orders that should be combined under the current policy and team workflow.',
      'Review the official shipping and return policies, then ask your team lead for the current shipping and label walkthroughs.',
      'Do one practice pass: organize the order, package it, confirm the address, prepare the label, and know where tracking is recorded—without creating a real shipment.',
    ],
    whyItMatters:
      'Learning the sequence before the first shipping day reduces duplicate labels, missed order details, and rushed customer updates.',
    askLeadWhen:
      'You need the current shipping-plan requirement, the team walkthrough videos, or help with a specific order. Use official support when policy or account behavior is unclear.',
    nicNacPrompt: 'What should I learn before my first shipping day?',
  },
  {
    id: 'start-strong-6',
    title: 'Plan customer follow-up',
    summary: 'Plan simple customer updates for orders, shipping, and questions.',
    source: 'Official policy for issues; your team lead for team routines',
    whatToDo: [
      'Plan the basic messages customers need after a live: order confirmation, shipping timing, tracking, and where to ask a question.',
      'Use the official return and shipping policies when a customer reports damage, a missing item, or another order problem.',
      'Keep customer-specific details private and move account or policy problems to the right official support path.',
      'If you want a loyalty program, ask your team lead for the current team approach before announcing it. An older guide used a 15-point example with a free OG item; treat that as an example, not an active promise, until the rules and inventory handling are confirmed.',
      'After the first live, write down what customers asked, what slowed you down, and the one thing you will improve next time.',
    ],
    whyItMatters:
      'Consistent follow-up is part of the customer experience. Clear expectations build more trust than an elaborate routine that is hard to maintain.',
    askLeadWhen:
      'A customer issue is unusual, you are unsure which policy applies, or you want approval for a loyalty or follow-up routine.',
    nicNacPrompt: 'What customer follow-up should I plan after my first live?',
  },
]

export const officialResources = [
  {
    title: 'Bomb Party University access guide',
    description:
      'Official walkthrough for helping a new rep enroll in and access BPU.',
    href: 'https://bombpartyassets.blob.core.windows.net/exigoresourcelibraryassets/How%20to%20Guide%20Your%20Downline%20Through%20the%20BPU%20Enrollment%20Process%2011.1.24.pdf',
    category: 'Official Bomb Party',
  },
  {
    title: 'Bomb Party new-rep enrollment guide',
    description: 'Official overview of the Party Rep enrollment process.',
    href: 'https://bombpartyassets.blob.core.windows.net/exigoresourcelibraryassets/Enrolling%20as%20a%20Party%20Rep-2024.pdf',
    category: 'Official Bomb Party',
  },
  {
    title: 'Bomb Party shipping policy',
    description:
      'Current shipping information, including how Party Rep orders are handled.',
    href: 'https://help.bombparty.com/hc/en-us/articles/33220290467732-Shipping-Policy',
    category: 'Official Bomb Party',
  },
  {
    title: 'Bomb Party return policy',
    description:
      'Current help for damaged items, defects, and reveal issues.',
    href: 'https://help.bombparty.com/hc/en-us/articles/33194356359444-Return-Policy',
    category: 'Official Bomb Party',
  },
  {
    title: 'Customer product replacements',
    description:
      'How customers and Party Reps request help with damaged or defective jewelry.',
    href: 'https://help.bombparty.com/hc/en-us/articles/47589261810068-Customer-Product-Replacements',
    category: 'Official Bomb Party',
  },
  {
    title: 'Bomb Party income disclosure statement',
    description:
      'Read the official disclosure before making or repeating income expectations.',
    href: 'https://bombpartyassets.blob.core.windows.net/exigoresourcelibraryassets/Rep%20Use%20Documents/Bomb%20Party_Income%20Disclosure%20Statement_2025%20%281%29.pdf',
    category: 'Official Bomb Party',
  },
  {
    title: 'FTC multi-level marketing guidance',
    description:
      'Independent consumer-protection guidance about claims, earnings, and recruiting.',
    href: 'https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing',
    category: 'Consumer protection',
  },
]

export const supplyOptions = [
  {
    title: 'BOPART small mesh zipper pouch bags, 24 pack',
    href: 'https://www.amazon.com/dp/B0CKQN1JPW',
    category: 'Organization',
    timing: 'Compare for setup',
    note: 'A simple option for keeping small items sorted and easy to reach.',
  },
  {
    title: 'iMBAPrice #0 hot pink poly bubble mailers, 250 pack',
    href: 'https://www.amazon.com/dp/B074GJ3VHH',
    category: 'Shipping',
    timing: 'Ask your team lead first',
    note: 'A bulk option for smaller customer orders. Confirm the size and quantity before ordering.',
  },
  {
    title: 'iMBAPrice 8.5 × 12 hot pink poly bubble mailers, 100 pack',
    href: 'https://www.amazon.com/dp/B074GFFKSC',
    category: 'Shipping',
    timing: 'Ask your team lead first',
    note: 'A larger mailer option. Check which sizes fit the team’s current shipping routine.',
  },
  {
    title: 'Sasylvia jewelry ring gift boxes with foam insert, 200 pack',
    href: 'https://www.amazon.com/dp/B0DQL359SK',
    category: 'Packaging',
    timing: 'Helpful later',
    note: 'An optional way to package rings neatly. This is not a first-day requirement.',
  },
  {
    title: 'SATINIOR clear small containers with hinged lids, 48 pack',
    href: 'https://www.amazon.com/dp/B09CKW25VF',
    category: 'Organization',
    timing: 'Compare for setup',
    note: 'Clear containers for keeping small supplies visible and organized.',
  },
  {
    title: 'L Liked numbered raffle-ticket roll',
    href: 'https://www.amazon.com/dp/B0BB6Y6QV1',
    category: 'Customer fun',
    timing: 'Ask your team lead first',
    note: 'An optional customer-engagement idea. Ask before making it part of your live routine.',
  },
  {
    title: 'Elite Gourmet countertop electric burner',
    href: 'https://www.amazon.com/dp/B09G99VMB7',
    category: 'Live setup',
    timing: 'Ask your team lead first',
    note: 'A countertop burner option for a reveal station. Follow current BPU safety guidance.',
  },
  {
    title: 'Phomemo Bluetooth 4 × 6 thermal shipping-label printer',
    href: 'https://www.amazon.com/dp/B0BTYD7H28',
    category: 'Shipping',
    timing: 'Helpful later',
    note: 'A wireless label-printer option. Compare it with the team’s shipping setup before buying.',
  },
  {
    title: 'WORKPRO retractable utility knife and blades',
    href: 'https://www.amazon.com/dp/B0C6KQ9HRZ',
    category: 'Shipping',
    timing: 'Helpful later',
    note: 'A packing-station tool for opening boxes and trimming materials. Store it safely.',
  },
  {
    title: 'XJLVSV clear glass saucepan with lid',
    href: 'https://www.amazon.com/dp/B0B693MY6V',
    category: 'Live setup',
    timing: 'Ask your team lead first',
    note: 'A clear, heat-safe vessel option. Confirm current BPU guidance before choosing one.',
  },
  {
    title: 'NEEWER 18-inch ring-light kit with stand and phone holder',
    href: 'https://www.amazon.com/dp/B01LXDNNBW',
    category: 'Live setup',
    timing: 'Compare for setup',
    note: 'A lighting option with a phone holder. Test what you already have before upgrading.',
  },
  {
    title: 'UMETDO mesh zipper pouch bags, 24 pack, assorted sizes',
    href: 'https://www.amazon.com/dp/B0CC67GJSK',
    category: 'Organization',
    timing: 'Helpful later',
    note: 'Another way to separate supplies as your setup grows.',
  },
]

export const supplyGroups = [
  {
    title: 'First-live setup',
    description: 'Lighting and reveal-station examples',
    categories: ['Live setup'],
  },
  {
    title: 'Shipping and packing',
    description: 'Mailers, labels, boxes, and packing tools',
    categories: ['Shipping', 'Packaging'],
  },
  {
    title: 'Organization and extras',
    description: 'Ways to keep supplies sorted plus optional customer-fun ideas',
    categories: ['Organization', 'Customer fun'],
  },
]

export const realityTips = [
  [
    'Official policy beats memory',
    'When a rule, payout, return, or account detail matters, use the current official source.',
  ],
  [
    'Income is not guaranteed',
    'Use the official income disclosure and avoid promises about what a new rep will earn.',
  ],
  [
    'A quiet live is not a failure',
    'Audience growth and confidence take repetition. Review what worked and improve one thing at a time.',
  ],
  [
    'Inventory is not an audience',
    'Buying more does not automatically create customers. Pause before a large purchase and ask for guidance.',
  ],
  [
    'Ask before you guess',
    'Money, policy, taxes, inventory, account access, and unusual customer situations deserve the right answer.',
  ],
] as const

export const nicNacQuickQuestions = [
  'What do I do first?',
  'How do I get into BPU?',
  'What do I need for my first live?',
  'How do shipping and returns work?',
  'What if a customer receives a damaged item?',
  'What should I know about income claims?',
]

export const nicNacSensitiveTerms = [
  'tax',
  'taxes',
  'social security',
  'ssn',
  'identity document',
  'accounting',
  'password',
  'verification code',
  'one-time code',
  'bank',
  'missing payout',
  'exact payout',
  'account locked',
]

export const nicNacAnswers = [
  {
    triggers: ['what do i do first', 'where do i start', 'first step', 'new rep', 'just joined'],
    response:
      'Start with step 1 so you are connected with your team lead, then set up Bomb Party University and begin the Start Strong course. You do not need to finish everything at once—work through one step at a time.',
    guideAnchor: '#guide-1',
    resourceLabel: 'Open step 1',
  },
  {
    triggers: ['bpu', 'university', 'teachable', 'six-digit code', '6-digit code', 'training', 'course'],
    response:
      'Look for the BPU confirmation email, sign in with the email used for enrollment, enter the six-digit code, accept the current terms, and begin Start Strong and Get Fizzing. If access still fails after a careful retry, use the official BPU access guide or ask your team lead.',
    guideAnchor: '#guide-2',
    resourceLabel: 'Open the BPU guide',
  },
  {
    triggers: ['payquicker', 'pay quicker', 'payout card', 'get paid'],
    response:
      'Watch for the expected PayQuicker setup email and follow the provider’s current instructions. Never put passwords, one-time codes, banking details, or identity documents into this chat. Account-specific or missing-payment problems belong with official support.',
    guideAnchor: '#guide-3',
    resourceLabel: 'Open the pay setup guide',
  },
  {
    triggers: ['damaged', 'defective', 'broken', 'missing stone', 'stone fell', 'replacement', 'wrong size', 'empty package', 'reveal issue'],
    response:
      'Bomb Party’s current return guidance gives customers 120 days after receipt to report a damaged or defective item. A wrong ring size caused by Home Office, an empty package, or an item that does not match the listed collection can also require a new reveal and a support request. Use the official replacement or return page for the exact steps and photos needed.',
    guideAnchor: '#resources',
    resourceLabel: 'Open return and replacement help',
  },
  {
    triggers: ['return', 'refund', 'exchange'],
    response:
      'Bomb Party’s current policy says sales are generally final except for damaged or defective products. Do not promise a refund or exchange from memory. Open the official return policy and follow the current replacement steps.',
    guideAnchor: '#resources',
    resourceLabel: 'Open the return policy',
  },
  {
    triggers: ['income', 'earn', 'earnings', 'commission', 'compensation', 'recruit', 'recruiting', 'guaranteed'],
    response:
      'Income is not guaranteed. Bomb Party’s current disclosure says reps earn from product sales—their own and their team’s—and cannot earn money solely by recruiting. Business costs reduce net earnings, so use the official income disclosure whenever income or earning potential comes up.',
    guideAnchor: '#resources',
    resourceLabel: 'Open the income disclosure',
  },
  {
    triggers: ['inventory', 'starter pack', 'starter kit', 'how much should i buy', 'should i buy'],
    response:
      'Choose a starter option that fits your budget and comfort level. You can grow inventory over time, and buying more does not guarantee customers or income. Before a large purchase, review the current official information and talk through the decision with your team lead.',
    guideAnchor: '#guide-4',
    resourceLabel: 'Open the first-live setup step',
  },
  {
    triggers: ['first live', 'go live', 'lighting', 'camera', 'phone', 'sound', 'reveal setup', 'live setup'],
    response:
      'For your first live, focus on a stable work surface, a clear camera angle, good sound, and lighting that lets customers see you, the reveal area, and labels without glare. Practice reaching supplies and packaging before you go live. Simple and organized is enough to start.',
    guideAnchor: '#guide-4',
    resourceLabel: 'Open the first-live setup step',
  },
  {
    triggers: ['supplies', 'amazon', 'equipment', 'mailers', 'label printer', 'pouches', 'packaging', 'burner', 'pot', 'ring light'],
    response:
      'The supply list is grouped into first-live setup, shipping and packing, and organization. Start with what you already own, compare options before buying, and wait on extras until you know you need them. I can help you decide which category to check.',
    guideAnchor: '#supplies',
    resourceLabel: 'Open the supply list',
  },
  {
    triggers: ['shipping', 'ship.com', 'ship com', 'labels', 'merge orders', 'tracking', 'mail order', 'delivery'],
    response:
      'Party Reps are responsible for shipping and handling orders placed with them, including costs and delays. Learn where orders appear, check the address, combine orders only when the current process allows it, create the label, and record tracking. Ask your team lead which shipping service and workflow the team currently uses before paying for a plan.',
    guideAnchor: '#guide-5',
    resourceLabel: 'Open the shipping step',
  },
  {
    triggers: ['customer information', 'customer privacy', 'privacy', 'address', 'personal information', 'share customer'],
    response:
      'Keep customer and rep information private. Use the Bomb Party back office and approved support paths for account details. Never post or send passwords, verification codes, banking details, government IDs, or other sensitive information through this guide.',
    guideAnchor: '#resources',
    resourceLabel: 'Open helpful official links',
  },
  {
    triggers: ['loyalty', 'fizz points', 'free og', 'follow-up', 'follow up', 'customer update', 'after the live'],
    response:
      'Keep follow-up simple: confirm the order, set a clear shipping expectation, share tracking, and tell customers where to ask a question. Before promising loyalty rewards, confirm your team lead’s current team approach and make sure the routine is easy to maintain.',
    guideAnchor: '#guide-6',
    resourceLabel: 'Open the follow-up guide',
  },
  {
    triggers: ['policy', 'policies', 'rules', 'current rule', 'official', 'where can i find'],
    response:
      'When a rule matters, use the current official Bomb Party page linked in this guide. Policies can change, so I will point you to training, shipping, returns, replacement help, or the income disclosure instead of asking you to rely on an old note.',
    guideAnchor: '#resources',
    resourceLabel: 'Open official Bomb Party resources',
  },
]
