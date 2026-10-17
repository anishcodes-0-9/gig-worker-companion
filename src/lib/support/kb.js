// Curated knowledge base for the Support Desk (India). Entries are intentionally
// short, hedge anything that is still being rolled out, and link to official
// sources. This is general information, not legal advice. Review `reviewed`
// dates before relying on an entry; schemes and state laws change.

export const CATEGORIES = {
  safety: "Safety",
  rights: "Worker rights",
  schemes: "Welfare schemes",
  documents: "Documents",
  grievance: "Grievances",
};

export const EMERGENCY_NUMBERS = [
  { number: "112", label: "National emergency (police, fire, ambulance)" },
  { number: "108", label: "Ambulance (most states)" },
  { number: "1091", label: "Women helpline" },
  { number: "1930", label: "Cyber fraud / online payment fraud" },
];

const REVIEWED = "2026-06";

export const KB = [
  {
    id: "safety-accident",
    category: "safety",
    title: "After a road accident",
    keywords: "accident crash fall injured injury hurt hospital collision bike road hit",
    summary:
      "Get medical help first. Then record evidence and report it so insurance or compensation claims are possible later.",
    steps: [
      "Call 112 (police/ambulance) or 108 if anyone is hurt. Move out of traffic if you can.",
      "Take photos of the scene, vehicles, injuries and number plates; note witness names and numbers.",
      "Keep every hospital bill, prescription and discharge summary.",
      "Report the accident in the platform app straight away and save the ticket number; many platforms have accident insurance, but terms differ, so ask in writing what is covered.",
      "For serious injury or a third party involved, file a police report (FIR) and ask for a copy.",
    ],
    links: [{ label: "Emergency Response Support System (112)", url: "https://112.gov.in" }],
  },
  {
    id: "safety-harassment",
    category: "safety",
    title: "Harassment or threats from a customer or restaurant staff",
    keywords:
      "harassment harass threat threaten abuse abusive unsafe assault molest stalk follow customer behaviour behavior misbehave misbehaved violence women",
    summary:
      "Your safety comes before any order. You can leave an unsafe situation and report it afterwards.",
    steps: [
      "If you are in danger, move to a public place and call 112 (women can also call 1091).",
      "Share your live location with someone you trust while you work late or in unfamiliar areas.",
      "Do not deliver or complete the trip if you feel unsafe; report the reason in the app immediately.",
      "Save screenshots, call logs, chat messages and order details as evidence.",
      "You may file a police complaint; for sexual harassment, ask whether the platform has a POSH Internal Committee, or whether your district Local Committee can take your complaint.",
    ],
    links: [{ label: "National Commission for Women", url: "https://ncw.nic.in" }],
  },
  {
    id: "safety-heat-road",
    category: "safety",
    title: "Working safely in heat, rain and traffic",
    keywords: "heat heatwave hot summer rain monsoon helmet fatigue tired night sleep dehydration safety tips road",
    summary: "Simple habits reduce the biggest day-to-day risks of delivery and ride work.",
    steps: [
      "Heat: drink water regularly, take shade breaks at midday, and stop if you feel dizzy or cramped.",
      "Rain: slow down, increase braking distance, and avoid waterlogged roads even if it means a late order.",
      "Always wear a helmet and do not use the phone while riding; mount it and use voice or a pause at a safe spot.",
      "Avoid very long shifts; fatigue is a leading cause of accidents. Set a daily hour limit and track it.",
    ],
    links: [],
  },
  {
    id: "safety-payment-fraud",
    category: "safety",
    title: "Payment fraud and fake calls",
    keywords: "fraud scam fake upi otp cheat cheated phishing link money stolen cyber call kyc",
    summary: "Never share OTP, UPI PIN or card details, even with someone who claims to be platform support.",
    steps: [
      "Real platform staff never need your OTP or UPI PIN.",
      "If money is lost, call 1930 immediately; the first hours matter most.",
      "File a complaint at cybercrime.gov.in and inform your bank to block the transaction.",
    ],
    links: [{ label: "National Cyber Crime Reporting Portal", url: "https://cybercrime.gov.in" }],
  },
  {
    id: "rights-status",
    category: "rights",
    title: "Your legal status as a gig or platform worker",
    keywords:
      "rights status employee contractor legal law code social security gig platform worker definition aggregator labour labor",
    summary:
      "Most platform workers are treated as independent partners, not employees, so many employee laws do not apply directly. The Code on Social Security, 2020 is the first national law to recognise 'gig workers' and 'platform workers' and to provide for social security contributions from aggregators.",
    steps: [
      "Rules and schemes under the Code are still being rolled out; check the Ministry of Labour & Employment for the current position.",
      "A few states have their own platform-worker laws (for example Rajasthan, 2023, and Karnataka, 2025); check whether your state has one.",
      "Your platform's written terms and payout policy are your main basis for pay disputes, so keep copies and screenshots.",
    ],
    links: [{ label: "Ministry of Labour & Employment", url: "https://labour.gov.in" }],
  },
  {
    id: "rights-deactivation",
    category: "rights",
    title: "Account blocked or deactivated",
    keywords: "blocked block deactivated deactivation suspended suspend terminated removed id banned ban account appeal rating",
    summary:
      "Ask for the reason in writing and appeal through the platform first. Escalate with a record of your work history if the answer is unclear.",
    steps: [
      "Screenshot the notice, your rating/completion history and recent earnings.",
      "Raise an appeal in the app and then by email to the platform's grievance officer; request a written reason and the policy clause relied on.",
      "Ask for pending earnings to be released while the appeal is open.",
      "If unresolved, approach your state Labour Department or a worker union, and consider free legal aid (NALSA helpline 15100).",
    ],
    links: [{ label: "NALSA free legal aid", url: "https://nalsa.gov.in" }],
  },
  {
    id: "rights-pay-deductions",
    category: "rights",
    title: "Unpaid earnings or unexplained deductions",
    keywords:
      "unpaid payment payout pending delay delayed withheld withhold deduction deducted penalty fine commission short missing salary wages money not received",
    summary:
      "Track every trip and payout so you can show exactly what is owed. Then dispute it in writing, starting with the platform.",
    steps: [
      "Use the Earnings tab to see how much is pending and for how long per platform.",
      "Raise a ticket in the app for each missing payout or deduction and keep the ticket number.",
      "If it is not fixed, send a written complaint to the platform's grievance officer; the complaint-letter tool in the Support Desk can draft it from your records.",
      "Escalate to the state Labour Department if the platform does not respond; keep proof of every contact.",
    ],
    links: [{ label: "Ministry of Labour & Employment", url: "https://labour.gov.in" }],
  },
  {
    id: "schemes-eshram",
    category: "schemes",
    title: "e-Shram registration (free)",
    keywords:
      "eshram e-shram shram register registration uan card unorganised unorganized welfare benefits insurance pmsby gig",
    summary:
      "e-Shram is the national database of unorganised workers, including platform and gig workers. Registration is free and gives you a Universal Account Number (UAN) card. Which benefits come with it (for example accident insurance) have changed over time, so check the portal for what applies to you now.",
    steps: [
      "Eligibility: generally age 16 to 59, not an EPFO/ESIC member and not an income-tax payer.",
      "Keep ready: Aadhaar, an Aadhaar-linked mobile number, and your bank account number with IFSC.",
      "Register on eshram.gov.in or at a Common Service Centre (CSC); the helpline is 14434.",
      "Ask what benefits apply to you now; do not assume any cover is active until you see it confirmed.",
    ],
    links: [{ label: "e-Shram portal", url: "https://eshram.gov.in" }],
  },
  {
    id: "schemes-health",
    category: "schemes",
    title: "Health cover (Ayushman Bharat PM-JAY)",
    keywords: "health insurance hospital ayushman bharat pmjay pm-jay medical treatment cover card cashless family",
    summary:
      "PM-JAY provides cashless hospital cover (up to ₹5 lakh per family per year) to eligible families. The 2025 Union Budget announced extending it to registered gig workers; confirm the current enrolment steps before relying on it.",
    steps: [
      "Check eligibility with your mobile number at mera.pmjay.gov.in or by calling 14555.",
      "The announcement linked gig-worker cover to e-Shram registration, so register there and watch the official sites for enrolment details.",
      "Carry Aadhaar and your ration card or family details when applying for the card at an empanelled hospital or CSC.",
    ],
    links: [{ label: "PM-JAY", url: "https://pmjay.gov.in" }],
  },
  {
    id: "schemes-savings",
    category: "schemes",
    title: "Pension and savings schemes",
    keywords: "pension retirement old age savings pm-sym shram yogi maandhan nps atal apy bank account jan dhan",
    summary:
      "Unorganised workers can join voluntary pension schemes such as PM Shram Yogi Maan-Dhan or the Atal Pension Yojana with small monthly contributions.",
    steps: [
      "You need a bank account (a Jan Dhan account works) linked to Aadhaar.",
      "Compare eligibility and contribution amounts on the official sites before enrolling; the contribution depends on your age when you join.",
      "Enrol through your bank or a Common Service Centre (CSC).",
    ],
    links: [{ label: "PM-SYM", url: "https://maandhan.in" }],
  },
  {
    id: "docs-checklist",
    category: "documents",
    title: "Documents every gig worker should keep ready",
    keywords: "documents document papers checklist required id proof aadhaar pan licence license rc insurance passbook what need",
    summary: "Having these in one place speeds up scheme registration, loans and disputes.",
    steps: [
      "Identity: Aadhaar, PAN (if you have one), voter ID.",
      "Work: driving licence, vehicle RC and vehicle insurance (if you drive), platform ID/partner ID.",
      "Money: bank passbook or account statement, and monthly payout statements from each platform.",
      "Contact: an Aadhaar-linked mobile number; many schemes send OTPs to it.",
      "Keep photos or PDFs on your phone and a copy with someone you trust.",
    ],
    links: [],
  },
  {
    id: "docs-income-proof",
    category: "documents",
    title: "Proving your income (for loans, rentals, visas)",
    keywords: "income proof loan salary slip statement itr tax bank rent credit financial earnings certificate",
    summary:
      "Gig workers usually have no salary slip. Platform payout statements plus bank statements are the strongest proof.",
    steps: [
      "Download monthly payout or earnings statements from each platform app.",
      "Match them to bank credits from the last 6 to 12 months.",
      "Your records in this app can help you keep track, but they are self-reported, not official proof.",
      "Income tax rules for gig income depend on your total income; consider advice from a tax professional.",
    ],
    links: [],
  },
  {
    id: "docs-bank-dispute",
    category: "documents",
    title: "Wrong or failed UPI / bank transaction",
    keywords: "bank upi transaction failed debited refund wrong transfer rbi ombudsman complaint money deducted account",
    summary: "Complain to your bank first. If it does not resolve within 30 days, you can go to the RBI Ombudsman.",
    steps: [
      "Note the transaction ID, date, amount and screenshots.",
      "Raise a complaint with your bank (app, branch or toll-free) and keep the complaint number.",
      "If the bank does not reply or you are not satisfied after 30 days, file at cms.rbi.org.in (RBI Integrated Ombudsman).",
      "For fraud, call 1930 immediately.",
    ],
    links: [{ label: "RBI complaint portal", url: "https://cms.rbi.org.in" }],
  },
  {
    id: "grievance-process",
    category: "grievance",
    title: "How to escalate a complaint",
    keywords: "grievance complaint complain escalate escalation officer labour department commissioner union legal aid how raise",
    summary: "Escalate in steps and keep a paper trail at each one.",
    steps: [
      "1) In-app support ticket: note the ticket number and date.",
      "2) Written complaint to the platform's grievance officer (email or registered post); ask for an acknowledgement and a reply date.",
      "3) State Labour Department or Labour Commissioner office, attaching all earlier proof. Whether they can act on your case depends on your state and how your platform classifies you.",
      "4) Worker unions and free legal aid (NALSA 15100) if still unresolved.",
      "Use the complaint-letter tool in the Support Desk to generate a ready-to-send letter from your details.",
    ],
    links: [{ label: "NALSA", url: "https://nalsa.gov.in" }],
  },
];

export const KB_REVIEWED = REVIEWED;
