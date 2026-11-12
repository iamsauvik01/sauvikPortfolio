import type { PortfolioContent } from '../types/content'

/**
 * ─────────────────────────────────────────────────────────────
 *  DISCOVER SAUVIK — every word on the site lives here
 * ─────────────────────────────────────────────────────────────
 *  The island is the portfolio. Each place below is one stop:
 *    hut → About · workshop → Skills · castle → Experience
 *    lab → Projects · cove → Achievements · lighthouse → Contact
 *
 *  • Tone: witty and conversational, but every fact is real.
 *  • LinkedIn / résumé: set the URL in `contact` to show them.
 *  • Project links: only add repository / live URLs that exist.
 */
export const content: PortfolioContent = {
  mascot: 'Bit',

  personal: {
    name: 'Sauvik Das',
    firstName: 'Sauvik',
    roles: ['Software Engineer', 'Full-Stack Development', 'Enterprise Applications'],
  },

  contact: {
    email: 'sauvikdas2505@gmail.com',
    github: 'https://github.com/iamsauvik01',
    linkedin: '',
    resume: '',
  },

  island: {
    arrival: {
      kicker: 'Land ho! You made it to',
      title: 'Sauvik Island',
      population: 'Population: one software engineer, one spider, zero unhandled exceptions (we hope).',
      hint: 'Six places to poke around. If something looks clickable, it probably is.',
      start: 'Start at the Welcome Hut',
      explore: 'I’ll wander on my own',
    },
    overviewBit: 'Welcome aboard! Pick any spot on the island — I’ll tag along.',

    /* ── 01 · ABOUT ─────────────────────────────────────────── */
    hut: {
      id: 'hut',
      name: 'The Welcome Hut',
      purpose: 'About me',
      teaser: 'Say hi to the person who lives here.',
      bit: 'This is where it all starts. Wipe your feet — the doormat is very welcoming.',
      accent: '#ee8a5f',
      hello: 'Oh, hello there.',
      headline: 'I’m Sauvik. I build the software behind the login screen.',
      paragraphs: [
        'Some people collect stamps. I collect workflows that need untangling — approval chains with more levels than a video game, databases with strong opinions, and legacy code that remembers a different decade.',
        'By day, I’m a Java Developer at the National Informatics Centre in Meghalaya, building the platforms that sit between citizens and the public services they’re owed.',
        'Before that, I shipped full-stack web apps at Scriptscode — classrooms, hotel rooms, invoices and everything in between.',
      ],
      facts: [
        { label: 'Currently', value: 'Level 2 Java Developer · NIC Meghalaya' },
        { label: 'Home turf', value: 'Spring Boot + PostgreSQL' },
        { label: 'Schooled at', value: 'Assam Don Bosco University · B.Tech CSE' },
        { label: 'Side quest', value: 'Ex-President, Web Development Club' },
      ],
      outro: 'That’s the short version. The long one is scattered across the island — the Workshop is next door, and it’s the noisy one.',
    },

    /* ── 02 · SKILLS ────────────────────────────────────────── */
    workshop: {
      id: 'workshop',
      name: 'The Workshop',
      purpose: 'Skills',
      teaser: 'Machines, tools and one suspicious coffee pot.',
      bit: 'Loudest place on the island. Click the machines — they love attention.',
      accent: '#e0a43a',
      headline: 'Every tool here has a job. None of them are for show.',
      intro: 'Six stations, one toolkit. Poke a machine to see what runs it — and what I use it for.',
      stations: [
        {
          id: 'engine',
          name: 'The Java Engine',
          tag: 'Languages',
          quip: 'Runs on Java. Yes, the coffee pot is a pun. No, I won’t apologise.',
          parts: [
            { name: 'Java', use: 'My main language — the engine behind my work at NIC.' },
            { name: 'JavaScript', use: 'Everything that has to happen in the browser.' },
            { name: 'PHP', use: 'The language under Laravel, and my Scriptscode days.' },
            { name: 'Python', use: 'Scripting, tooling and the occasional experiment.' },
            { name: 'C', use: 'Close to the metal. Keeps the fundamentals honest.' },
          ],
        },
        {
          id: 'forge',
          name: 'The Framework Forge',
          tag: 'Back-end frameworks',
          quip: 'Where raw requests get hammered into working applications.',
          parts: [
            { name: 'Spring Boot', use: 'Government platforms and REST APIs at NIC.' },
            { name: 'Spring Security', use: 'Authentication, authorisation and role-based access.' },
            { name: 'Laravel', use: 'Full-stack apps at Scriptscode — bookings to billing.' },
            { name: 'Express.js', use: 'Lightweight Node.js servers.' },
            { name: 'Django', use: 'Python’s batteries-included web framework.' },
          ],
        },
        {
          id: 'studio',
          name: 'The Paint Shop',
          tag: 'Front-end',
          quip: 'Back ends are great, but people do judge a book by its cover.',
          parts: [
            { name: 'React', use: 'Interactive interfaces — the EdTech platform’s front end.' },
            { name: 'Thymeleaf', use: 'Server-rendered pages for Spring Boot apps.' },
            { name: 'Bootstrap', use: 'Dependable layouts — MSPSDC’s interface uses it.' },
            { name: 'Tailwind CSS', use: 'Utility-first styling, minus the CSS sprawl.' },
          ],
        },
        {
          id: 'vault',
          name: 'The Data Vault',
          tag: 'Databases',
          quip: 'Rows, columns and a deep respect for foreign keys.',
          parts: [
            { name: 'PostgreSQL', use: 'Complex schemas behind government platforms.' },
            { name: 'MySQL', use: 'The relational backbone of my Scriptscode apps.' },
            { name: 'Oracle Database', use: 'Enterprise-grade relational storage.' },
            { name: 'MongoDB', use: 'For data that refuses to sit neatly in rows.' },
          ],
        },
        {
          id: 'relay',
          name: 'The API Relay',
          tag: 'APIs',
          quip: 'Systems talk here. Politely, and mostly in JSON.',
          parts: [
            { name: 'REST API development', use: 'Spring Boot APIs that let systems talk to each other.' },
            { name: 'Postman', use: 'Poking endpoints until they behave.' },
          ],
        },
        {
          id: 'bench',
          name: 'The Blueprint Bench',
          tag: 'Concepts & tools',
          quip: 'Measure twice, deploy once.',
          parts: [
            { name: 'Application architecture', use: 'Deciding where things live before they’re built.' },
            { name: 'Relational database design', use: 'Data models first, everything else second.' },
            { name: 'Data structures & algorithms', use: 'The foundations under every framework.' },
            { name: 'Object-oriented programming', use: 'Keeping big codebases in sensible pieces.' },
            { name: 'Full-stack development', use: 'From the schema to the screen.' },
            { name: 'Git', use: 'Every change, accounted for.' },
          ],
        },
      ],
    },

    /* ── 03 · EXPERIENCE ────────────────────────────────────── */
    castle: {
      id: 'castle',
      name: 'The Castle',
      purpose: 'Experience',
      teaser: 'The story so far, one floor at a time.',
      bit: 'Start at the gate and climb. The newest chapter lives at the top.',
      accent: '#8a6fe0',
      headline: 'The story so far. It gets higher as it goes.',
      intro: 'Every castle needs a foundation. This one has a gatehouse, a tower and a keep — click any of them to read that chapter.',
      chapters: [
        {
          id: 'gate',
          chapter: 'Chapter 0',
          building: 'The Gatehouse',
          when: '2020 – 2024',
          place: 'Assam Don Bosco University',
          role: 'B.Tech, Computer Science & Engineering',
          story: 'Where the first threads were spun: data structures, databases, operating systems, networks, plus a little AI and machine learning. Somewhere along the way I ended up running the Web Development Club.',
          highlights: [
            'Coursework: DSA, DBMS, Operating Systems, Computer Networks, AI, Machine Learning',
            'President of the college Web Development Club',
          ],
          stack: [],
        },
        {
          id: 'tower',
          chapter: 'Chapter 1',
          building: 'The Tower',
          when: 'Mar 2024 – Apr 2025',
          place: 'Scriptscode Consultancy LLP',
          role: 'Software Developer',
          story: 'My first real workshop. Clients needed things built end to end, so I built them end to end.',
          highlights: [
            'Full-stack apps, including an EdTech platform and a hotel booking system',
            'Role-based access control, CMS and project-management modules',
            'Relational schemas, plus search that spans many tables',
            'GST-based billing with PDF invoices',
            'Payment gateways and email services, wired in',
          ],
          stack: ['Laravel', 'React', 'MySQL', 'JavaScript'],
        },
        {
          id: 'keep',
          chapter: 'Chapter 2',
          building: 'The Keep',
          when: 'May 2025 – Present',
          place: 'National Informatics Centre (NIC), Meghalaya',
          role: 'Level 2, Java Developer',
          story: 'Now I build public-service platforms, where “it works on my machine” is not an acceptable answer.',
          highlights: [
            'Government applications, including the MSPSDC platform',
            'Application architecture and database design',
            'Migrating legacy Spring MVC / JSP / DAO apps to Spring Boot + Thymeleaf',
            'REST APIs, complex PostgreSQL and role-based access control',
            'Multi-level approval workflows, admin dashboards and reporting',
            'Deployments and production troubleshooting',
          ],
          stack: ['Java', 'Spring Boot', 'Spring Security', 'Thymeleaf', 'PostgreSQL', 'REST APIs'],
        },
      ],
    },

    /* ── 04 · PROJECTS ──────────────────────────────────────── */
    lab: {
      id: 'lab',
      name: 'The Innovation Lab',
      purpose: 'Projects',
      teaser: 'Four creations, four tiny worlds.',
      bit: 'My favourite stop. Every project here gets its own little world.',
      accent: '#2aa596',
      headline: 'Things I’ve built (and occasionally argued with).',
      intro: 'Four creations on four pedestals. Pick one up — gently, they’re load-bearing.',
      projects: [
        {
          id: 'mspsdc',
          code: 'MSPSDC',
          fullName: 'Meghalaya State Public Services Delivery Commission',
          title: 'Public services, on the clock.',
          tagline: 'A government platform that helps public services arrive on time — and gives citizens a path to appeal when they don’t.',
          status: '',
          built: [
            'Multi-level service-delivery workflows',
            'Citizen applications and tracking',
            'First and second appeals, with Designated Officer and Appellate Authority workflows',
            'Role-based admin access and service-monitoring dashboards',
            'PostgreSQL data, and moving legacy parts to Spring Boot',
          ],
          stack: [
            { role: 'Application', items: ['Java', 'Spring Boot', 'Spring Security', 'Thymeleaf'] },
            { role: 'Data', items: ['PostgreSQL'] },
            { role: 'Interface', items: ['JavaScript', 'Bootstrap'] },
          ],
          stackNote: '',
          links: [],
          accent: '#e2bd63',
          accent2: '#3fa79a',
        },
        {
          id: 'cibf',
          code: 'CIBF',
          fullName: 'Chief Inspector of Boilers and Factories',
          title: 'Boilers, factories and a lot of forms.',
          tagline: 'A digital initiative for factory regulation: registration, licensing, renewal, transfer and amendment.',
          status: 'Ongoing',
          built: [
            'Application development for regulatory workflows',
            'Database configuration',
            'REST API development',
            'Integration with ServicePlus-related application data',
          ],
          stack: [
            { role: 'Services & APIs', items: ['Java', 'Spring Boot', 'REST APIs'] },
            { role: 'Data', items: ['PostgreSQL'] },
            { role: 'App & interface tooling', items: ['Svelte', 'Convex', 'Tauri'] },
          ],
          stackNote: 'Grouped by the part of the initiative they support. It’s not one single deployed stack.',
          links: [],
          accent: '#d97a43',
          accent2: '#f0b886',
        },
        {
          id: 'edtech',
          code: 'EDTECH',
          fullName: 'EdTech Platform',
          title: 'Homework, but make it full-stack.',
          tagline: 'An education platform built at Scriptscode, with React up front, Laravel behind and MySQL underneath.',
          status: '',
          built: [
            'Full-stack application development',
            'Wiring the React client to Laravel services',
            'Relational data management in MySQL',
          ],
          stack: [
            { role: 'Front end', items: ['React'] },
            { role: 'Back end', items: ['Laravel'] },
            { role: 'Data', items: ['MySQL'] },
          ],
          stackNote: '',
          links: [],
          accent: '#4a6fd1',
          accent2: '#e2694f',
        },
        {
          id: 'hotel',
          code: 'STAY',
          fullName: 'Hotel Booking System',
          title: 'Check in, check out, check the dashboard.',
          tagline: 'A web app for hotel bookings, with admin tools and operational dashboards for the people running the place.',
          status: '',
          built: ['Booking workflows', 'Laravel back end', 'Administrative functionality', 'Operational dashboards'],
          stack: [
            { role: 'Back end', items: ['Laravel'] },
            { role: 'Data', items: ['MySQL'] },
            { role: 'Interface', items: ['JavaScript'] },
          ],
          stackNote: '',
          links: [],
          accent: '#e0716a',
          accent2: '#7fb08e',
        },
      ],
    },

    /* ── 05 · ACHIEVEMENTS ──────────────────────────────────── */
    cove: {
      id: 'cove',
      name: 'Treasure Cove',
      purpose: 'Achievements',
      teaser: 'A small hoard. Every piece is real.',
      bit: 'Open the chest. I promise it isn’t a mimic.',
      accent: '#e2a92b',
      headline: 'Shiny things, honestly earned.',
      intro: 'It’s not a big hoard, but there are no replicas in it. Click a treasure for its story.',
      treasures: [
        {
          id: 'trophy',
          title: 'First in Assam',
          detail: 'Took first position in the state of Assam at a Google Developer Club hackathon.',
          quip: 'The whole state. Not just the room.',
          color: '#f0b94a',
        },
        {
          id: 'medal',
          title: 'Web design winner',
          detail: 'Won an inter-college web design competition.',
          quip: 'Proof I care about how things look, not just how they work.',
          color: '#5cc2ad',
        },
        {
          id: 'crown',
          title: 'Club President',
          detail: 'Led the college Web Development Club as its President.',
          quip: 'Herding developers. Good practice for code review.',
          color: '#a98bf0',
        },
      ],
    },

    /* ── 06 · CONTACT ───────────────────────────────────────── */
    lighthouse: {
      id: 'lighthouse',
      name: 'The Lighthouse',
      purpose: 'Contact',
      teaser: 'End of the tour. The light’s on.',
      bit: 'End of the tour… or the start of a conversation?',
      accent: '#e2584a',
      headline: 'You’ve reached the edge of the island.',
      body: 'Got a role, a project, or a workflow that needs untangling? The light’s on, and I answer my messages.',
      bottlePrompt: 'Message in a bottle',
      signoff: 'Thanks for exploring. Bit will be back on the landing page, staring at your cursor.',
    },
  },
}
