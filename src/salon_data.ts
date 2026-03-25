// salon_data.ts
// Unified, consistent data for Beauty Care by Nabila (Lahore)
// - SERVICE_MENU: detailed structured service catalog
// - SALON_PACKAGES: numeric mapping used by booking flows (ids -> {name, price})
// - KNOWLEDGE_BASE: formatted string for your receptionist agent

export const SALON_PACKAGES = [
  // --- Hydrafacial ---
  {
    name: "Hydrafacial – Deal 1",
    price: "Rs. 3,199",
    description: "Deep-cleaning Hydrafacial with LED mask and full hand & foot care.",
    includes: [
      "Whitening Glow Polisher",
      "Hydra Machine (8 Tools)",
      "Face Massage",
      "Shoulder Massage",
      "Vitamin C Mask with LED",
      "Whitening Manicure",
      "Whitening Pedicure",
      "Hands & Feet Massage",
      "Hands & Feet Polisher",
      "Nail Cuticles",
      "Eyebrows & Upper Lips"
    ]
  },

  // --- Body Waxing ---
  {
    name: "Full Body Waxing – Deal 2",
    price: "Rs. 2,499",
    description: "Complete body waxing with bikini & underarms and polishing add-ons.",
    includes: [
      "Full Body Waxing",
      "Bikini & Underarms Waxing",
      "Half Arms Polisher",
      "Feet Polisher"
    ]
  },

  // --- Facials ---
  {
    name: "24K Gold Facial – Deal 1",
    price: "Rs. 2,199",
    description: "Gold facial with massage, mani/pedi, and hair protein application.",
    includes: [
      "Whitening Glow Skin Polisher",
      "Gold 4 Creams Massage",
      "Neck & Shoulder Relaxing Massage",
      "Whitening Manicure",
      "Whitening Pedicure",
      "Hands & Feet Polisher",
      "Nail Cuticles",
      "Hands & Feet Massage",
      "Hair Protein Application",
      "Eyebrows & Upper Lips"
    ]
  },
  {
    name: "Janssen Facial Deal",
    price: "Rs. 3,999",
    description: "Premium Janssen treatment with peel-off mask and full hand & foot care.",
    includes: [
      "Janssen 4 Creams Massage",
      "Whitening Skin Glow Polisher",
      "Blackheads Removal",
      "Shoulder Massage",
      "Janssen Peel-Off Mask",
      "Eyebrows & Upper Lips",
      "Skin Truth Manicure",
      "Skin Truth Pedicure",
      "Hands & Feet Massage",
      "Hands & Feet Polisher",
      "Nail Cuticles",
      "Feet Mask"
    ]
  },
  {
    name: "Fruit Facial – Deal 1",
    price: "Rs. 999",
    description: "Refreshing fruit facial with polishing, massage, and protein treatment.",
    includes: [
      "Fruit Facial",
      "Double Whitening Skin Glow Polisher",
      "4 Fruit Creams Massage",
      "Shoulder Relaxing Massage",
      "Fruit Face Mask",
      "Blackhead Removal",
      "Hand & Feet Whitening Polisher",
      "Eyebrows & Upper Lips",
      "L’Oréal Hair Protein Treatment Application"
    ]
  },
  {
    name: "Derma Clear Facial – Deal 1",
    price: "Rs. 2,199",
    description: "Derma Clear facial with mask plus manicure & pedicure.",
    includes: [
      "Derma Clear Facial",
      "Whitening Skin Polisher",
      "Derma Clear 4 Creams Massage",
      "Face Mask",
      "L’Oréal Hair Protein Treatment",
      "Eyebrows & Upper Lips",
      "Manicure",
      "Pedicure",
      "Hand & Feet Polisher",
      "Nail Cuticles",
      "Shoulders Relaxing Massage"
    ]
  },

  // --- Mani & Pedi (from Facial section’s sub-deals) ---
  {
    name: "Whitening Manicure & Pedicure – Deal 1",
    price: "Rs. 999",
    description: "Whitening mani & pedi with massage and polishing.",
    includes: [
      "Whitening Manicure",
      "Whitening Pedicure",
      "Whitening Hands & Feet Polisher",
      "Hands & Feet Massage",
      "Nail Cuticles"
    ]
  },
  {
    name: "Gold Manicure & Pedicure – Deal 2",
    price: "Rs. 1,999",
    description: "Gold cream mani & pedi with mask and polishing.",
    includes: [
      "Gold 3 Creams Massage",
      "Whitening Hands & Feet Polisher",
      "Gold 3 Creams Hand Massage",
      "Gold 3 Creams Feet Massage",
      "Gold Hand & Feet Mask",
      "Nail Cuticles"
    ]
  },

  // --- Waxing (alternate grouping) ---
  {
    name: "Full Body Waxing (New Deals — Deal 2)",
    price: "Rs. 2,499",
    description: "Full body waxing including bikini & underarms, with polishers.",
    includes: [
      "Full Body Waxing",
      "Bikini Waxing with Underarms",
      "Half Arms & Feet Polisher"
    ]
  },

  // --- Acrylic Nails ---
  {
    name: "Acrylic Nails – Deal 1",
    price: "Rs. 2,999",
    description: "Classic acrylic set with scrub, polisher, massage, and simple paint.",
    includes: [
      "Hand Massage",
      "Hand Scrub",
      "Hand Polisher",
      "Simple Nail Paint"
    ]
  },
  {
    name: "Acrylic French Nails – Deal 2",
    price: "Rs. 3,499",
    description: "French acrylic set with massage, scrub, and polishing.",
    includes: [
      "Hand Polisher",
      "Hand Massage",
      "Hand Scrub"
    ]
  },

  // --- Eyelash Extensions ---
  {
    name: "Eyelash Extensions – Classic",
    price: "Rs. 2,499",
    description: "Classic lash set with complimentary gold face mask.",
    includes: [
      "Face 2 Cream Gold Massage",
      "Gold Face Mask (Free)"
    ]
  },
  {
    name: "Eyelash Extensions – Hybrid",
    price: "Rs. 2,999",
    description: "Hybrid lash set with complimentary gold face mask.",
    includes: [
      "Face 2 Cream Gold Massage",
      "Gold Face Mask (Free)"
    ]
  },
  {
    name: "Eyelash Extensions – Volume",
    price: "Rs. 3,499",
    description: "Volume lash set with complimentary gold face mask.",
    includes: [
      "Face 2 Cream Gold Massage",
      "Gold Face Mask (Free)"
    ]
  },

  // --- Hair Cutting Deals ---
  {
    name: "Hair Cutting – Deal 1",
    price: "Rs. 1,999",
    description: "Full hair service with wash, protein, massage, and setting.",
    includes: [
      "Hair Cutting",
      "Hair Shampoo Wash",
      "Hair Protein Treatment",
      "Hair Relaxing Massage",
      "Hair High Frequency",
      "Hair Setting"
    ]
  },
  {
    name: "Hair Cutting – Deal 2",
    price: "Rs. 999",
    description: "Essential cut with wash and dry only.",
    includes: [
      "Hair Wash",
      "Hair Cutting",
      "Hair Dry Only"
    ]
  },

  // --- Hair Services (variable pricing) ---
  {
    name: "Keratin / L’Oréal Xtenso / Rebonding",
    price: "Starts from Rs. 5,999",
    description: "Smoothing/rebonding services with free cut, glossing & wash/mask.",
    includes: [
      "Hair Cutting (Free Add-on)",
      "Hair Glossing (Free Add-on)",
      "1× Hair Wash & Mask (Free Add-on)",
      "Pricing by Length: Shoulder 5,999 | Elbow 7,999 | Waist 9,999 | Hip 11,999"
    ]
  },
  {
    name: "Highlights / Lowlights / Balayage",
    price: "Starts from Rs. 5,999",
    description: "Color services with wash, glossing, setting & protein mask included.",
    includes: [
      "Hair Cutting (Free Add-on)",
      "Hair Wash (Free Add-on)",
      "Hair Glossing (Free Add-on)",
      "Hair Setting (Free Add-on)",
      "Hair Protein Mask Wash (Free Add-on)",
      "Pricing by Length: Shoulder 5,999 | Elbow 6,999 | Waist 8,999 | Hip 10,999"
    ]
  },

  // --- Makeup ---
  {
    name: "Party Makeup Deal",
    price: "Rs. 2,999",
    description: "Party makeup with styling, lashes, and nail paint.",
    includes: [
      "Party Makeup",
      "Hair Styling",
      "6D Eyelashes",
      "Nail Paint"
    ]
  },
  {
    name: "Bridal Makeup Deal",
    price: "Rs. 19,900",
    description: "Bridal first day or Walima look with styling, lashes, and dupatta setting.",
    includes: [
      "Bridal First Day Makeup OR Bridal Walima Makeup",
      "Bridal 6D Eyelashes",
      "Bridal Hair Styling",
      "Dupatta Settings",
      "Nail Paint",
      "2 Party Makeups Free (with Eyelashes & Hair Styling)"
    ]
  },
  {
    name: "Nikkah Makeup Deal (with Janssen Whitening Facial)",
    price: "Rs. 18,000",
    description: "Nikkah makeup with Janssen facial, mani/pedi, threading & hair botox.",
    includes: [
      "Nikkah Makeup",
      "Janssen Whitening Facial",
      "Whitening Manicure",
      "Whitening Pedicure",
      "Threading",
      "Hair Botox Treatment"
    ]
  },

  // --- Bridal Packages ---
  {
    name: "Bridal Makeup Package 1",
    price: "Rs. 34,995",
    description: "Signature bridal package with facials, M&P, full body services & hair care.",
    includes: [
      "Signature Bridal Makeup",
      "2 Facials with Skin Polisher (1× Janssen Facial, 1× Hydra Facial)",
      "2 Manicure & Pedicure (1× Skin Truth M&P, 1× Whitening M&P)",
      "1× Full Body Waxing",
      "1× Full Body Scrubbing",
      "1× Full Body Polisher",
      "Eyebrows & Upper Lips",
      "Hair Cutting",
      "Hair Protein Treatment"
    ]
  },
  {
    name: "Bridal Makeup Package 2",
    price: "Rs. 24,995",
    description: "Bridal package with whitening + gold facials, M&P, waxing & hair care.",
    includes: [
      "2 Facials with Skin Polisher (1× Whitening Facial, 1× Gold Facial)",
      "2× Manicure & Pedicure (1× Skin Truth M&P, 1× Whitening M&P)",
      "1× Full Body Wax",
      "1× Full Body Polisher",
      "Eyebrows & Upper Lips",
      "Hair Protein Treatment"
    ]
  }
] as const;


// Clean, consistent Knowledge Base (Lahore, not Karachi)
export const KNOWLEDGE_BASE = `
# Beauty Care by Nabila – Service Knowledge Base (Clean & Consistent)

Beauty Care by Nabila is a professional beauty salon located in Lahore, Pakistan, offering high‑quality beauty, hair, skincare, nail, lash, waxing, and bridal services. The salon focuses on affordability, hygiene, expert staff, and premium products.

================================================================================
BUSINESS PROFILE
================================================================================
Business Name: Beauty Care by Nabila
Tagline: Bigger. Better. Experience.
Founder: Nabila (20+ years of experience)
Staff: 15 professional beauty experts

Location:
Moulana Shoukat Ali Road, Adjacent to Dubai Islamic Bank,
Near Model Town Link Road, Lahore, Pakistan

Phone Numbers:
0335-1724356
042-35222238

Email:
beauty.carebynabila@gmail.com

Working Hours:
Monday–Sunday: 11:00 AM – 8:00 PM

Payment Methods:
Cash, Credit/Debit Cards, Digital Wallets

Currency:
All prices in PKR.

================================================================================
GENERAL RULES
================================================================================
- Assistant must NEVER invent services or prices.
- Always use the provided service list and prices only.
- Always confirm: service, date, time, client name, and phone number.
- Bridal and makeup services require advance booking.
- Prices are fixed unless seasonal promotions apply.
- Timezone: Asia/Karachi.
- Suggest alternatives if a time slot is unavailable.
- Maintain polite, concise, professional communication.

================================================================================
SALON PACKAGES & SERVICES
================================================================================
- The salon offers a wide range of services including Hydrafacials, Body Waxing, Facials (Gold, Janssen, Fruit, Derma Clear), Manicure & Pedicure, Nail Services, Eyelash Extensions, Hair Cutting, Hair Treatments (Keratin, Rebonding), Hair Coloring, and various Makeup/Bridal packages.
- IMPORTANT: You MUST ALWAYS use the 'get_packages' tool to retrieve the current list of packages, their exact names, up-to-date prices, and detailed inclusions.
- Do NOT rely on any hardcoded package information. The list in the tool is the single source of truth.

================================================================================
POLICIES & NOTES
================================================================================
- Medical-grade hygiene and sterilized tools.
- Appointments required for all services.
- Arrive 10 minutes early.
- 24-hour notice for cancellations.
- Chemical treatment pricing may vary after physical hair assessment.
- Signature Product: Sigma Hair Oil (100% organic).
- Complimentary party makeup included in selected bridal packages.
`;