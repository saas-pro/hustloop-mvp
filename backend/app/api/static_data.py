
# This file mimics fetching data from the database for the prototype.
# In a real application, this data would be in your database tables.

mentors_data = [
  {
    "name": "Dr. Evelyn Reed",
    "avatar": "https://source.unsplash.com/featured/100x100/?woman,portrait&sig=1",
    "hint": "woman portrait",
    "title": "Ph.D. in AI, Ex-Googler",
    "expertise": ["AI/ML", "Product Strategy", "Growth Hacking"],
    "bio": "Dr. Evelyn Reed is a seasoned AI researcher and product strategist with over 15 years of experience at the forefront of technological innovation. After a distinguished career at Google, where she led several high-impact AI projects, Evelyn now dedicates her time to mentoring early-stage startups, helping them navigate the complexities of product-market fit and scalable growth.",
    "rating": 5,
    "socials": { "x": "#", "linkedin": "#" },
    "hourlyRate": "₹8,000",
    "availability": {
        "2024-08-05": ["10:00 AM", "11:00 AM", "02:00 PM"],
        "2024-08-06": ["09:00 AM", "03:00 PM"],
        "2024-08-08": ["10:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"],
    }
  },
  {
    "name": "Marcus Chen",
    "avatar": "https://source.unsplash.com/featured/100x100/?man,portrait&sig=2",
    "hint": "man portrait",
    "title": "Serial Entrepreneur, Fintech Expert",
    "expertise": ["Fintech", "Blockchain", "Venture Capital"],
    "bio": "Marcus Chen has successfully built and exited three fintech companies. His expertise lies in decentralized finance, blockchain technology, and navigating the venture capital landscape. Marcus offers invaluable insights into fundraising, financial modeling, and building resilient business models in the competitive fintech space.",
    "rating": 4,
    "socials": { "x": "#", "linkedin": "#" },
    "hourlyRate": "₹10,000",
    "availability": {
        "2024-08-05": ["01:00 PM", "02:00 PM"],
        "2024-08-07": ["10:00 AM", "11:00 AM", "12:00 PM"],
        "2024-08-09": ["02:00 PM", "03:00 PM", "04:00 PM"],
    }
  },
  {
    "name": "Aisha Khan",
    "avatar": "https://source.unsplash.com/featured/100x100/?woman,face&sig=3",
    "hint": "woman face",
    "title": "Marketing Guru, Brand Specialist",
    "expertise": ["Branding", "Digital Marketing", "Storytelling"],
    "bio": "Aisha Khan is a branding virtuoso who has crafted compelling narratives for numerous Fortune 500 companies. Her approach combines data-driven digital marketing with powerful storytelling to build brands that resonate deeply with customers. She helps startups define their voice, build a loyal community, and create a lasting market presence.",
    "rating": 5,
    "socials": { "x": "#", "linkedin": "#" },
    "hourlyRate": "₹7,500",
    "availability": {
        "2024-08-06": ["10:00 AM", "02:00 PM", "03:00 PM"],
        "2024-08-07": ["09:00 AM", "11:00 AM"],
        "2024-08-08": ["01:00 PM", "02:00 PM"],
    }
  },
]

incubators_data = [
  {
    "name": "TechStars Bangalore",
    "image": "https://api.hustloop.com/static/images/building.png",
    "hint": "tech office",
    "location": "Bangalore, India",
    "rating": 5,
    "reviews": 128,
    "description": "Premier startup accelerator focused on technology innovation and entrepreneurship.",
    "metrics": { "startups": "150+", "funding": "$5M", "successRate": "85%" },
    "focus": ["SaaS", "IoT", "Deep Tech"],
    "details": {
      "overview": "TechStars Bangalore is a world-class accelerator program that helps entrepreneurs build great companies. We provide funding, mentorship, and access to a global network of investors and corporate partners.",
      "services": [
        { "title": "Mentorship", "description": "One-on-one guidance from industry experts to help navigate your startup journey." },
        { "title": "Business Development", "description": "Access to a network of potential customers and partners to grow your business." }
      ],
      "benefits": ["$120,000 investment", "Access to global network", "Demo Day"],
      "eligibility": { "focusAreas": "SaaS, IoT, Deep Tech", "requirements": ["MVP required", "Technical team"] },
      "timeline": [{ "event": "Application Period", "period": "Jan - Mar" }, { "event": "Program Start", "period": "June" }]
    }
  },
    {
    "name": "EcoInnovate Hub",
    "image": "https://api.hustloop.com/static/images/building.png",
    "hint": "sustainable energy",
    "location": "Chennai, India",
    "rating": 4,
    "reviews": 98,
    "description": "Fostering startups that are building a sustainable and green future.",
    "metrics": { "startups": "80+", "funding": "$2.5M", "successRate": "88%" },
    "focus": ["MedTech", "BioTech", "Digital Health"],
    "details": {
      "overview": "EcoInnovate Hub is dedicated to supporting startups in the high-growth healthcare and biotech sectors. We provide the specialized resources, clinical networks, and regulatory guidance to help you navigate the complexities of medical innovation and make a global impact.",
      "services": [
        { "title": "Clinical Mentorship", "description": "Guidance from experienced healthcare professionals and medical experts." },
        { "title": "Lab Access", "description": "State-of-the-art laboratory facilities for medical research and testing." }
      ],
      "benefits": ["Seed funding up to $150,000", "Access to certified wet labs", "Fast-track pilot programs"],
      "eligibility": { "focusAreas": "MedTech, BioTech, Digital Health", "requirements": ["Strong scientific foundation", "Clear clinical need"] },
      "timeline": [{ "event": "Rolling Applications Open", "period": "All year" }, { "event": "Program Duration", "period": "12-18 months" }]
    }
  },
  {
    "name": "Creative Spark Collective",
    "image": "https://api.hustloop.com/static/images/building.png",
    "hint": "creative workspace",
    "location": "Mumbai, India",
    "rating": 5,
    "reviews": 110,
    "description": "An incubator for the next generation of storytellers and digital artists.",
    "metrics": { "startups": "120+", "funding": "$1.8M", "successRate": "90%" },
    "focus": ["Creative Tech", "Media", "Digital Arts"],
    "details": {
      "overview": "Creative Spark Collective is where art meets technology. We are an incubator dedicated to empowering the next generation of digital artists, filmmakers, and creative technologists.",
      "services": [
        { "title": "Production Support", "description": "Access to professional-grade studios and equipment." },
        { "title": "Distribution Network", "description": "Partnerships with leading media platforms." }
      ],
      "benefits": ["Seed funding for creative projects", "Showcase at film festivals", "Distribution deals"],
      "eligibility": { "focusAreas": "Digital Media, VR/AR, Filmmaking", "requirements": ["Compelling portfolio", "Passionate team"] },
      "timeline": [{ "event": "Spring & Fall Applications", "period": "Feb-Apr & Aug-Oct" }, { "event": "Residency Program", "period": "6-month cohorts" }]
    }
  }
]

corporate_challenges_data = [
    {
    "company": "Hustloop Corp",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "corporate building",
    "title": "AI-Powered Logistics Optimization",
    "reward": "₹5,00,000",
    "description": "Develop an AI model to optimize our last-mile delivery routes, reducing fuel consumption and delivery times.",
    "details": { "about": "The Hustloop Corp Grand Challenge is a pioneering initiative to encourage Deep Tech Startups to build indigenous solutions for optimizing supply chain and logistics. We are seeking innovative AI-driven products to revolutionize national delivery networks.", "problemStatements": 12, "stages": 3, "rewardPerStatement": "Up to ₹5 Lakh", "mission": "To nurture AI solutions for logistics.", "participation": "Indian Startups and Student Groups.", "rewards": "Total Prizes worth ₹1.5 Crore and post-challenge contract and integration into Hustloop Corp's logistics network." }
  },
  {
    "company": "Future Retail",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "modern storefront",
    "title": "Gamified Customer Loyalty Platform",
    "reward": "₹3,50,000",
    "description": "Create an engaging, game-like loyalty program to increase customer retention and in-store traffic.",
    "details": { "about": "A challenge to revolutionize customer engagement in retail.", "problemStatements": 5, "stages": 2, "rewardPerStatement": "Pilot Project", "mission": "To foster innovative loyalty solutions.", "participation": "Retail tech and mobile app development teams.", "rewards": "Total prize pool of ₹10 Lakhs and a paid pilot project." }
  },
    {
    "company": "HealthWell Pharma",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "science laboratory",
    "title": "IoT Smart Packaging for Medication",
    "reward": "₹7,00,000",
    "description": "Design smart packaging that monitors temperature and reminds patients to take their medication.",
    "details": { "about": "A challenge to improve patient adherence through intelligent packaging.", "problemStatements": 8, "stages": 3, "rewardPerStatement": "R&D Grant", "mission": "To develop smart packaging that reduces medication errors.", "participation": "Innovators in IoT, hardware design, and healthcare tech.", "rewards": "Total prizes worth ₹25 Lakhs and an R&D grant." }
  }
]

msme_collaborations_data = [
    {
    "name": "Artisan Co-op",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "artisan workshop",
    "sector": "Handicrafts",
    "description": "Seeking collaborators for digital marketing and e-commerce expansion to reach a global audience.",
    "details": { "about": "A collective of over 200 artisans from across rural India.", "scope": ["E-commerce", "Digital Marketing", "Logistics"], "lookingFor": "A dynamic startup partner to help us scale our online presence.", "benefits": ["Access to unique product catalog", "Social impact opportunity", "Shared revenue model"], "contact": { "name": "Priya Sharma", "title": "Director of Operations" } }
  },
  {
    "name": "GreenLeaf Organics",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "organic farming",
    "sector": "Agriculture",
    "description": "Looking for partners in sustainable packaging and cold-chain logistics to reduce spoilage.",
    "details": { "about": "A certified organic farm committed to sustainable agriculture.", "scope": ["Sustainable Packaging", "Cold-Chain", "Food Tech"], "lookingFor": "Innovative partner for eco-friendly packaging and efficient logistics.", "benefits": ["Consistent supply of organic produce for pilots", "Strong case study", "Joint grant applications"], "contact": { "name": "Ravi Kumar", "title": "Farm Manager" } }
  },
    {
    "name": "TechFix Solutions",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "computer hardware",
    "sector": "IT Services",
    "description": "Open to collaborations with hardware suppliers and B2B clients for annual maintenance contracts.",
    "details": { "about": "Provides reliable IT repair and maintenance services for SMBs.", "scope": ["Hardware Procurement", "B2B Sales", "SaaS Integration"], "lookingFor": "Partners to streamline hardware procurement and secure AMCs.", "benefits": ["Reliable service partner", "Commission-based rewards", "Access to SME client network"], "contact": { "name": "Anjali Verma", "title": "Business Development Head" } }
  }
]

Government_challenges = [
  {
    "name": "Clean India Initiative",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "waste management",
    "sector": "Public Health & Sanitation",
    "description": "Looking for technology partners to optimize waste collection and recycling processes in urban areas.",
    "details": {
      "about": "A government-led program aimed at improving sanitation and waste management across cities.",
      "scope": "Waste Management Technology, Recycling Solutions, IoT Sensors",
      "lookingFor": "Innovative startups or NGOs that can implement efficient, scalable waste solutions.",
      "benefits": "Government recognition and support, Access to pilot sites in multiple cities, Funding/grants for successful solutions",
      "contact": "Ramesh Gupta, Program Coordinator"
    }
  },
  {
    "name": "Smart Education Program",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "digital education",
    "sector": "Education",
    "description": "Seeking partners for developing e-learning platforms and AI-driven personalized learning modules.",
    "details": {
      "about": "A national initiative to modernize classrooms and provide quality digital education to students in underserved areas.",
      "scope": "E-Learning Platforms, AI Tutoring, Digital Content Creation",
      "lookingFor": "EdTech startups and NGOs that can help deliver scalable digital learning solutions.",
      "benefits": "Government pilot programs in schools, Public visibility and recognition, Opportunities for long-term contracts",
      "contact": "Anita Desai, Education Program Manager"
    }
  },
  {
    "name": "Renewable Energy Expansion",
    "logo": "https://api.hustloop.com/static/images/building.png",
    "hint": "solar and wind",
    "sector": "Energy",
    "description": "Open to collaborations with startups and private firms to deploy solar and wind energy projects in rural areas.",
    "details": {
      "about": "Government-backed initiative to increase renewable energy capacity and promote sustainable development.",
      "scope": "Solar Panel Installation, Wind Energy Systems, Energy Storage Solutions",
      "lookingFor": "Companies or startups with expertise in renewable energy deployment.",
      "benefits": "Government subsidies and incentives, Access to project sites across regions, Public recognition and collaboration opportunities",
      "contact": "Vikram Singh, Energy Program Lead"
    }
  }
];


blog_posts_data = [
    { "title": "The Future of Startups: Trends to Watch in 2024", "image": "https://source.unsplash.com/featured/600x400/?futuristic,startup", "hint": "futuristic startup", "excerpt": "Discover the key trends shaping the startup ecosystem this year...", "content": "The startup world is in a constant state of flux... AI integration, sustainability, and remote work are key." },
    { "title": "How to Find the Perfect Mentor for Your Business", "image": "https://source.unsplash.com/featured/600x400/?business,meeting", "hint": "business meeting", "excerpt": "A good mentor can be a game-changer. Here's our guide to finding one...", "content": "Finding the right mentor is crucial... Define your needs, leverage your network, and be respectful of their time." },
    { "title": "Navigating the World of Venture Capital", "image": "https://source.unsplash.com/featured/600x400/?financial,chart", "hint": "financial chart", "excerpt": "Securing funding is a major milestone. Learn the ins and outs...", "content": "VC funding is about more than a great idea... Do your homework, create a compelling pitch deck, and be prepared for tough questions." }
]

education_programs_data = [
    {
      "title": "Startup Accelerator Program",
      "sessions": [
        { "language": "Tamil", "date": "15 JULY", "time": "11:00 AM" },
        { "language": "English", "date": "16 JULY", "time": "4:30 PM" },
      ],
      "description": "An intensive 8-week program designed to help early-stage startups validate their business model, refine their product strategy, and prepare for scaling. Learn directly from successful entrepreneurs and industry experts.",
      "features": [
        { "name": "Live Interactive Sessions", "icon": "RadioTower" },
        { "name": "1-on-1 Mentoring", "icon": "Users" },
        { "name": "Networking Opportunities", "icon": "Workflow" },
        { "name": "Real Project Work", "icon": "Briefcase" },
      ],
    },
    {
      "title": "AI for Business Leaders",
      "sessions": [
        { "language": "English", "date": "22 JULY", "time": "10:00 AM" },
        { "language": "English", "date": "29 JULY", "time": "10:00 AM" },
      ],
      "description": "This 2-day workshop provides a comprehensive overview of AI technologies and their practical applications in business. Understand how to leverage AI for competitive advantage, operational efficiency, and product innovation. No technical background required.",
      "features": [
        { "name": "Expert-Led Workshops", "icon": "BrainCircuit" },
        { "name": "Case Study Analysis", "icon": "BookOpen" },
        { "name": "Strategy Sessions", "icon": "Lightbulb" },
        { "name": "Implementation Roadmap", "icon": "Wrench" },
      ],
    },
    {
      "title": "Digital Marketing Bootcamp",
      "sessions": [
        { "language": "English", "date": "5 AUG", "time": "9:00 AM - 5:00 PM" },
      ],
      "description": "A one-day intensive bootcamp covering the entire digital marketing ecosystem. From SEO and SEM to social media marketing and content strategy, gain the skills to effectively promote your brand online and drive customer acquisition.",
      "features": [
        { "name": "Hands-On Training", "icon": "PenTool" },
        { "name": "Google & Meta Ads", "icon": "TrendingUp" },
        { "name": "SEO Masterclass", "icon": "Search" },
        { "name": "Certification", "icon": "Award" },
      ],
    },
]


sector_data = [
  {
    "id": 1,
    "name": "Automotive, EV & Smart Mobility",
    "children": [
      "EV Technologies",
      "Batteries",
      "Mobility Solutions",
      "Connected Vehicle",
      "Intelligent Transport",
      "Component Tech",
      "Charging Infra",
      "Fleet Management",
      "Telematics",
      "Others"
    ]
  },
  {
    "id": 2,
    "name": "Agriculture & FoodTech",
    "children": [
      "Precision Agriculture",
      "Agri Machinery",
      "Supply Chain Agri",
      "Smart Irrigation",
      "Crop Solutions",
      "Food Processing",
      "Dairy Tech",
      "Fisheries Tech",
      "Livestock Tech",
      "Others"
    ]
  },
  {
    "id": 3,
    "name": "AI, ML & IoT",
    "children": [
      "Computer Vision",
      "NLP",
      "Predictive Analytics",
      "IoT Devices",
      "Edge Computing",
      "Sensors & Actuators",
      "Industrial IoT",
      "Smart Devices",
      "Others"
    ]
  },
  {
    "id": 4,
    "name": "Circular Economy",
    "children": [
      "Waste Management",
      "Circular Product Design",
      "Recycling Solutions",
      "Resource Recovery",
      "Upcycling",
      "Sustainable Packaging",
      "Others"
    ]
  },
  {
    "id": 5,
    "name": "Blue Economy",
    "children": [
      "Marine Technology",
      "Aquaculture",
      "Fisheries Tech",
      "Port and Shipping Tech",
      "Coastal Infrastructure",
      "Ocean Energy",
      "Marine Robotics",
      "Others"
    ]
  },
  {
    "id": 6,
    "name": "Healthcare & Life Sciences",
    "children": [
      "Biotech",
      "Diagnostics",
      "Devices",
      "Digital Health",
      "Telemedicine",
      "Hospital Tech",
      "Pharmaceuticals",
      "Health Analytics",
      "Genomics",
      "Others"
    ]
  },
  {
    "id": 7,
    "name": "ClimateTech & Clean Energy",
    "children": [
      "Solar",
      "Wind",
      "Hydrogen",
      "Battery Tech",
      "Grid Tech",
      "Smart Metering",
      "Carbon Capture",
      "Water Purification",
      "Green Buildings",
      "Others"
    ]
  },
  {
    "id": 8,
    "name": "Social Impact, Rural Livelihood & Sustainability",
    "children": [
      "Rural Finance",
      "Livelihood Platforms",
      "Agriculture Impact",
      "Renewable Energy",
      "Clean Water Access",
      "Health Outreach",
      "Education Access",
      "Gender Empowerment",
      "Others"
    ]
  },
  {
    "id": 9,
    "name": "Web 3.0, Blockchain, VR/AR",
    "children": [
      "Blockchain Platforms",
      "Crypto Tech",
      "DeFi Solutions",
      "NFT Platforms",
      "VR Products",
      "AR/VR Solutions",
      "Virtual Environments",
      "Web3 Infrastructure",
      "Others"
    ]
  },
  {
    "id": 10,
    "name": "Industry 4.0 & Advanced Manufacturing",
    "children": [
      "Additive Manufacturing",
      "Robotics",
      "CAD/CAM",
      "Smart Machines",
      "Industrial IoT",
      "MES/ERP",
      "AI in Manufacturing",
      "Digital Twin",
      "Others"
    ]
  },
  {
    "id": 11,
    "name": "Chemicals & Materials",
    "children": [
      "Specialty Chemicals",
      "Polymers",
      "Nano-Materials",
      "Bio-Materials",
      "Sustainable Chemicals",
      "Advanced Coatings",
      "Smart Materials",
      "Recycling Tech",
      "Others"
    ]
  },
  {
    "id": 12,
    "name": "Data Mining & Analytics",
    "children": [
      "Data Platforms",
      "Analytics Tools",
      "Visualization",
      "Big Data",
      "Data Warehousing",
      "Cloud Analytics",
      "MLOps",
      "Others"
    ]
  },
  {
    "id": 13,
    "name": "PropTech, LegalTech & RegTech",
    "children": [
      "Property Platforms",
      "Property Mgmt",
      "Digital Contracts",
      "Legal Automation",
      "Reg Compliance",
      "Risk Analytics",
      "Urban Solutions",
      "Others"
    ]
  },
  {
    "id": 14,
    "name": "HRTech & Smart Workforce",
    "children": [
      "Recruitment Platforms",
      "Payroll Tech",
      "Workforce Analytics",
      "Remote Work Tools",
      "Employee Engagement",
      "Skill Platforms",
      "HR Automation",
      "Others"
    ]
  },
  {
    "id": 15,
    "name": "Telecom, Networking & Hardware",
    "children": [
      "5G Solutions",
      "Fiber Tech",
      "Networking Devices",
      "IoT Connectivity",
      "Network Security",
      "Communications Hardware",
      "Antenna Tech",
      "Others"
    ]
  },
  {
    "id": 16,
    "name": "Media & Entertainment",
    "children": [
      "Digital Media",
      "Blogging",
      "News Platforms",
      "Publishing",
      "Video Platforms",
      "Entertainment Tech",
      "Movies",
      "OOH Media",
      "Social Media",
      "Photography",
      "Advertising",
      "Others"
    ]
  },
  {
    "id": 17,
    "name": "Textile Tech & Fashion",
    "children": [
      "Smart Textiles",
      "Sustainable Fashion",
      "Fashion E-commerce",
      "Textile Manufacturing",
      "Fashion Design Tech",
      "Supply Chain Solutions",
      "Others"
    ]
  },
  {
    "id": 18,
    "name": "Retail Tech, D2C",
    "children": [
      "Omnichannel Retail Operations & Analytics",
      "Supplychain Visibility",
      "Delivery Platforms",
      "Inventory Management",
      "Merchandising & Discovery",
      "Digital Content",
      "ONDC/D2C",
      "Marketplace Tech",
      "Robotic Fulfillment",
      "E-commerce Infrastructure",
      "Omnichannel Payments",
      "Shopper Engagement",
      "Virtual Shopping",
      "In-store Tech",
      "Omnichannel Solutions",
      "Others"
    ]
  },
  {
    "id": 19,
    "name": "Life Style, Personal Care",
    "children": [
      "Personal Care & Hygiene",
      "Safe Cosmetics",
      "Sustainable Home Products",
      "Active Wear & Lingerie",
      "Napkins & Diapers",
      "Jewelry & Accessories",
      "Eco Products",
      "Organic Products",
      "Fitness & Nutrition",
      "Furniture & Decor",
      "Lifestyle Products"
    ]
  },
  {
    "id": 20,
    "name": "Marketing Tech & MICE",
    "children": [
      "Marketing Tech",
      "Email/SMS Marketing",
      "CMS",
      "Customer Experience",
      "Digital Experience",
      "Call Analytics",
      "Digital Events",
      "Meetings & Incentives",
      "Conferences/Exhibitions",
      "MICE Technology",
      "MICE for Tourism/Business",
      "Others"
    ]
  },
  {
    "id": 21,
    "name": "Aerospace, Defence & SpaceTech",
    "children": [
      "Aerospace/Defence Components",
      "Satellite Tech",
      "UAVs/Drones",
      "Defence Electronics",
      "Aerospace R&D",
      "Defence Services",
      "Training",
      "Air Traffic Control",
      "Others"
    ]
  },
  {
    "id": 22,
    "name": "Ed Tech",
    "children": [
      "K-12 Education",
      "AI/VR in Education",
      "Learning Apps",
      "Online Tutoring",
      "Test Prep",
      "LMS",
      "Student Management",
      "Attendance Management",
      "Learning Platforms",
      "Vernacular Learning",
      "Gamified Learning",
      "Others"
    ]
  },
  {
    "id": 23,
    "name": "Smart Cities & E-Governance",
    "children": [
      "Urban Mobility",
      "Smart Utilities",
      "E-Governance Platforms",
      "Public Safety",
      "Citizen Engagement",
      "Urban Data Analytics",
      "Traffic Management",
      "Smart Lighting",
      "E-Government Services",
      "IoT for Smart Cities",
      "Others"
    ]
  },
  {
    "id": 24,
    "name": "Supply Chain & Logistics",
    "children": [
      "Freight & Transport Companies",
      "Courier Services",
      "Warehousing/Distribution",
      "3PL & 4PL Providers",
      "E-commerce Delivery",
      "Reverse Logistics",
      "Supply Chain Tech",
      "Freight Brokerage Platforms",
      "Customs/Trade Compliance",
      "Cold Chain Logistics",
      "Supply Chain Consulting",
      "Warehouse Robotics/Automation",
      "Others"
    ]
  },
  {
    "id": 25,
    "name": "FemTech",
    "children": [
      "Menstrual Health",
      "Fertility Tech",
      "Pregnancy Tech",
      "Women’s Fitness",
      "Women’s Health Diagnostics",
      "Women’s Health Education",
      "Personal Safety Tech",
      "Community Platforms",
      "Others"
    ]
  },
  {
    "id": 26,
    "name": "Sports Tech & Gaming",
    "children": [
      "Fantasy Sports Platforms",
      "Sports Analytics",
      "Sports Training Platforms",
      "Esports Platforms",
      "Sports Equipment Tech",
      "AR/VR Sports",
      "Fitness Apps",
      "Game Development",
      "Gaming Platforms",
      "Others"
    ]
  },
  {
    "id": 27,
    "name": "Art, Culture & Architecture",
    "children": [
      "Art Curation Tech",
      "Cultural Heritage Digitization",
      "Creative Platforms",
      "Art Marketplaces",
      "Virtual Museums",
      "Design Tech",
      "Digital Storytelling",
      "Architecture Platforms",
      "Others"
    ]
  },
  {
    "id": 28,
    "name": "SaaS, Software & IT/ITES",
    "children": [
      "SaaS Products",
      "Cloud Solutions",
      "Productivity Software",
      "FinTech Platforms",
      "HR Tech Platforms",
      "EdTech Software",
      "Healthcare SaaS",
      "AI API Platforms",
      "IT Services",
      "Automation Tech",
      "Others"
    ]
  },
  {
    "id": 29,
    "name": "FinTech & InsurTech",
    "children": [
      "Payments",
      "Digital Banking",
      "Lending Tech",
      "InsurTech Platforms",
      "Investment Tech",
      "WealthTech",
      "Blockchain FinTech",
      "Regulatory Tech",
      "Others"
    ]
  },
  {
    "id": 30,
    "name": "Travel & Tourism",
    "children": [
      "Travel Booking Platforms",
      "Hospitality Tech",
      "Smart Tourism",
      "Mobility for Tourism",
      "Digital Experience Tourism",
      "Sustainable Tourism",
      "Travel Safety Tech",
      "Others"
    ]
  },
  {
    "id": 31,
    "name": "Others",
    "children": [
      "Any other relevant technology area not listed above."
    ]
  }
]

_all_data = {
    "mentors": mentors_data,
    "incubators": incubators_data,
    "corporate_challenges": corporate_challenges_data,
    "msme_collaborations": msme_collaborations_data,
    "blog_posts": blog_posts_data,
    "education_programs": education_programs_data,
    "Government_challenges":Government_challenges,
    "Sector_Data":sector_data
}

def get_static_data(key):
    return _all_data.get(key, [])
