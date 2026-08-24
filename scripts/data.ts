/**
 * The SkillGraph seed dataset.
 *
 * Kept separate from scripts/seed.ts so the *data* can be reviewed and edited
 * without reading the loading logic, and so the counts at the bottom of this
 * file act as a live inventory of the graph.
 *
 * Relationships are declared next to the node that owns them (a role lists the
 * skills it requires; a resource lists what it teaches) because that is how a
 * person thinks about the domain. Skill-to-skill edges are separate lists,
 * since neither end owns the relationship.
 *
 * Every resource URL points at a real, publicly accessible page. Nothing here
 * is invented.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type RoleLevel = "junior" | "mid" | "senior";
export type ResourceType = "documentation" | "course" | "book" | "tutorial" | "interactive";

export interface SeedCategory {
  id: string;
  name: string;
  description: string;
}

export interface SeedSkill {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  /** Category id — becomes (:Skill)-[:BELONGS_TO]->(:Category). */
  category: string;
}

export interface SeedRole {
  id: string;
  name: string;
  description: string;
  level: RoleLevel;
  /** Skill ids — becomes (:Role)-[:REQUIRES]->(:Skill). */
  requires: string[];
  /** Technology ids — becomes (:Role)-[:USES]->(:Technology). */
  uses: string[];
}

export interface SeedTechnology {
  id: string;
  name: string;
  description: string;
  /** Technology ids — becomes (:Technology)-[:BUILDS_ON]->(:Technology). */
  buildsOn: string[];
  /** Skill ids — becomes (:Technology)-[:REQUIRES_SKILL]->(:Skill). */
  requiresSkill: string[];
}

export interface SeedResource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  difficulty: Difficulty;
  provider: string;
  /** Skill ids — becomes (:Skill)-[:TAUGHT_BY]->(:Resource). */
  teaches: string[];
}

/** [prerequisiteId, dependentId] — (:Skill)-[:PREREQUISITE_FOR]->(:Skill). */
export type PrerequisiteEdge = readonly [string, string];

/** [aId, bId] — (:Skill)-[:RELATED_TO]->(:Skill). Read as undirected. */
export type RelatedEdge = readonly [string, string];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories: SeedCategory[] = [
  {
    id: "programming-languages",
    name: "Programming Languages",
    description: "The languages you write code in, and the fluency to pick the right one.",
  },
  {
    id: "web-frontend",
    name: "Frontend",
    description: "Building interfaces people actually use — markup, styling, components, performance.",
  },
  {
    id: "web-backend",
    name: "Backend",
    description: "Servers, APIs and the moving parts behind a product's interface.",
  },
  {
    id: "data-and-ai",
    name: "Data & AI",
    description: "Statistics, modelling and the engineering that puts models into production.",
  },
  {
    id: "databases",
    name: "Databases",
    description: "Storing, modelling and querying data — relational, document and graph.",
  },
  {
    id: "devops-and-cloud",
    name: "DevOps & Cloud",
    description: "Shipping and running software: containers, pipelines, infrastructure, observability.",
  },
  {
    id: "computer-science",
    name: "Computer Science",
    description: "The fundamentals that stay relevant when frameworks change.",
  },
  {
    id: "engineering-practices",
    name: "Engineering Practices",
    description: "How good teams work: version control, testing, security, design.",
  },
];

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const skills: SeedSkill[] = [
  // Programming languages
  {
    id: "javascript",
    name: "JavaScript",
    description: "The language of the web. Runs in every browser and, via Node.js, on the server too.",
    difficulty: "beginner",
    category: "programming-languages",
  },
  {
    id: "typescript",
    name: "TypeScript",
    description: "JavaScript with a static type system. Catches whole classes of bugs before runtime.",
    difficulty: "intermediate",
    category: "programming-languages",
  },
  {
    id: "python",
    name: "Python",
    description: "A readable, general-purpose language and the default choice for data work and ML.",
    difficulty: "beginner",
    category: "programming-languages",
  },
  {
    id: "go",
    name: "Go",
    description: "A small, fast, statically typed language built for concurrent network services.",
    difficulty: "intermediate",
    category: "programming-languages",
  },
  {
    id: "rust",
    name: "Rust",
    description: "Systems programming with memory safety enforced at compile time, no garbage collector.",
    difficulty: "advanced",
    category: "programming-languages",
  },

  // Frontend
  {
    id: "html-css",
    name: "HTML & CSS",
    description: "The structure and presentation layer of every web page. Where frontend work starts.",
    difficulty: "beginner",
    category: "web-frontend",
  },
  {
    id: "responsive-design",
    name: "Responsive Design",
    description: "Layouts that work from a 320px phone to an ultrawide monitor without separate codebases.",
    difficulty: "beginner",
    category: "web-frontend",
  },
  {
    id: "react",
    name: "React",
    description: "A component library for building user interfaces from composable, stateful pieces.",
    difficulty: "intermediate",
    category: "web-frontend",
  },
  {
    id: "nextjs",
    name: "Next.js",
    description: "A React framework adding routing, server rendering and server-side data access.",
    difficulty: "intermediate",
    category: "web-frontend",
  },
  {
    id: "state-management",
    name: "State Management",
    description: "Deciding what state lives where — local, lifted, server cache or global store.",
    difficulty: "intermediate",
    category: "web-frontend",
  },
  {
    id: "web-accessibility",
    name: "Web Accessibility",
    description: "Building interfaces that work with keyboards, screen readers and low vision.",
    difficulty: "intermediate",
    category: "web-frontend",
  },
  {
    id: "web-performance",
    name: "Web Performance",
    description: "Measuring and fixing what makes pages slow: payload size, rendering, network waterfalls.",
    difficulty: "advanced",
    category: "web-frontend",
  },

  // Backend
  {
    id: "nodejs",
    name: "Node.js",
    description: "A JavaScript runtime for servers, built around non-blocking I/O.",
    difficulty: "intermediate",
    category: "web-backend",
  },
  {
    id: "rest-apis",
    name: "REST APIs",
    description: "Designing HTTP interfaces around resources, verbs and status codes.",
    difficulty: "beginner",
    category: "web-backend",
  },
  {
    id: "graphql",
    name: "GraphQL",
    description: "A query language for APIs that lets clients ask for exactly the fields they need.",
    difficulty: "intermediate",
    category: "web-backend",
  },
  {
    id: "authentication",
    name: "Authentication & Authorization",
    description: "Sessions, tokens, OAuth and the difference between who someone is and what they may do.",
    difficulty: "intermediate",
    category: "web-backend",
  },
  {
    id: "caching",
    name: "Caching",
    description: "Trading freshness for speed deliberately — HTTP caches, in-memory stores, invalidation.",
    difficulty: "intermediate",
    category: "web-backend",
  },
  {
    id: "message-queues",
    name: "Message Queues",
    description: "Decoupling services with asynchronous messaging, retries and at-least-once delivery.",
    difficulty: "advanced",
    category: "web-backend",
  },

  // Data & AI
  {
    id: "statistics",
    name: "Statistics",
    description: "Distributions, sampling, inference and knowing when a result means nothing.",
    difficulty: "intermediate",
    category: "data-and-ai",
  },
  {
    id: "linear-algebra",
    name: "Linear Algebra",
    description: "Vectors, matrices and transformations — the mathematics underneath every ML model.",
    difficulty: "intermediate",
    category: "data-and-ai",
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    description: "Cleaning, exploring and summarising data to answer a question honestly.",
    difficulty: "beginner",
    category: "data-and-ai",
  },
  {
    id: "machine-learning",
    name: "Machine Learning",
    description: "Fitting models to data: supervised and unsupervised learning, evaluation, overfitting.",
    difficulty: "advanced",
    category: "data-and-ai",
  },
  {
    id: "deep-learning",
    name: "Deep Learning",
    description: "Neural networks with many layers — the approach behind modern vision and language models.",
    difficulty: "advanced",
    category: "data-and-ai",
  },
  {
    id: "nlp",
    name: "Natural Language Processing",
    description: "Tokenisation, embeddings, transformers and working with text at scale.",
    difficulty: "advanced",
    category: "data-and-ai",
  },
  {
    id: "computer-vision",
    name: "Computer Vision",
    description: "Teaching models to interpret images: classification, detection, segmentation.",
    difficulty: "advanced",
    category: "data-and-ai",
  },
  {
    id: "mlops",
    name: "MLOps",
    description: "Getting models into production and keeping them there: versioning, serving, monitoring drift.",
    difficulty: "advanced",
    category: "data-and-ai",
  },
  {
    id: "data-engineering",
    name: "Data Engineering",
    description: "Building the pipelines and storage that make reliable analytics and ML possible.",
    difficulty: "advanced",
    category: "data-and-ai",
  },
  {
    id: "prompt-engineering",
    name: "Prompt Engineering",
    description: "Getting useful, reliable behaviour out of large language models through careful instruction.",
    difficulty: "beginner",
    category: "data-and-ai",
  },

  // Databases
  {
    id: "sql",
    name: "SQL",
    description: "Querying relational data — joins, aggregation, window functions, query plans.",
    difficulty: "beginner",
    category: "databases",
  },
  {
    id: "database-design",
    name: "Database Design",
    description: "Schemas, normalisation, indexes and constraints that keep data correct as it grows.",
    difficulty: "intermediate",
    category: "databases",
  },
  {
    id: "data-modeling",
    name: "Data Modeling",
    description: "Turning a messy domain into entities and relationships a database can represent well.",
    difficulty: "intermediate",
    category: "databases",
  },
  {
    id: "graph-databases",
    name: "Graph Databases",
    description: "Modelling data as nodes and relationships, and querying it with traversals in Cypher.",
    difficulty: "intermediate",
    category: "databases",
  },
  {
    id: "nosql",
    name: "NoSQL",
    description: "Document, key-value and wide-column stores, and the trade-offs that justify them.",
    difficulty: "intermediate",
    category: "databases",
  },

  // DevOps & Cloud
  {
    id: "linux",
    name: "Linux",
    description: "The shell, the filesystem, processes and permissions — where servers actually live.",
    difficulty: "beginner",
    category: "devops-and-cloud",
  },
  {
    id: "docker",
    name: "Docker",
    description: "Packaging an application and its dependencies into a reproducible container image.",
    difficulty: "intermediate",
    category: "devops-and-cloud",
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    description: "Scheduling and operating containers across a cluster, declaratively.",
    difficulty: "advanced",
    category: "devops-and-cloud",
  },
  {
    id: "ci-cd",
    name: "CI/CD",
    description: "Automating build, test and deploy so releasing is routine rather than an event.",
    difficulty: "intermediate",
    category: "devops-and-cloud",
  },
  {
    id: "terraform",
    name: "Infrastructure as Code",
    description: "Declaring cloud infrastructure in version-controlled files instead of console clicks.",
    difficulty: "advanced",
    category: "devops-and-cloud",
  },
  {
    id: "aws",
    name: "AWS",
    description: "The core cloud building blocks: compute, storage, networking, managed databases, IAM.",
    difficulty: "intermediate",
    category: "devops-and-cloud",
  },
  {
    id: "observability",
    name: "Observability",
    description: "Logs, metrics and traces — being able to ask new questions of a running system.",
    difficulty: "advanced",
    category: "devops-and-cloud",
  },

  // Computer science
  {
    id: "data-structures",
    name: "Data Structures",
    description: "Arrays, maps, trees and graphs, and the cost of each operation on them.",
    difficulty: "intermediate",
    category: "computer-science",
  },
  {
    id: "algorithms",
    name: "Algorithms",
    description: "Sorting, searching, traversal and recursion, plus the complexity analysis to compare them.",
    difficulty: "intermediate",
    category: "computer-science",
  },
  {
    id: "networking",
    name: "Networking",
    description: "DNS, TCP, TLS and HTTP — what actually happens between a client and a server.",
    difficulty: "intermediate",
    category: "computer-science",
  },
  {
    id: "system-design",
    name: "System Design",
    description: "Composing services, storage and queues into a system that meets its requirements at scale.",
    difficulty: "advanced",
    category: "computer-science",
  },

  // Engineering practices
  {
    id: "git",
    name: "Git",
    description: "Branching, merging, rebasing and reading history — the substrate of team development.",
    difficulty: "beginner",
    category: "engineering-practices",
  },
  {
    id: "testing",
    name: "Testing",
    description: "Unit, integration and end-to-end tests, and knowing which failure each one catches.",
    difficulty: "intermediate",
    category: "engineering-practices",
  },
  {
    id: "security-fundamentals",
    name: "Security Fundamentals",
    description: "Injection, XSS, secrets handling, least privilege — the failures that keep recurring.",
    difficulty: "intermediate",
    category: "engineering-practices",
  },
];

// ---------------------------------------------------------------------------
// Skill-to-skill relationships
//
// PREREQUISITE_FOR is directional and asymmetric: [a, b] means "learn a before
// b". These edges are what make the learning-path and recommendation queries
// meaningful, so they are deliberately conservative — only genuine
// dependencies, not loose associations.
// ---------------------------------------------------------------------------

export const prerequisites: PrerequisiteEdge[] = [
  // Web fundamentals
  ["html-css", "responsive-design"],
  ["html-css", "react"],
  ["html-css", "web-accessibility"],
  ["javascript", "typescript"],
  ["javascript", "react"],
  ["javascript", "nodejs"],
  ["react", "nextjs"],
  ["react", "state-management"],
  ["typescript", "nextjs"],
  ["responsive-design", "web-performance"],
  ["javascript", "web-performance"],

  // Backend
  ["nodejs", "rest-apis"],
  ["rest-apis", "graphql"],
  ["rest-apis", "authentication"],
  ["networking", "rest-apis"],
  ["caching", "system-design"],
  ["message-queues", "system-design"],
  ["rest-apis", "system-design"],
  ["database-design", "system-design"],

  // Databases
  ["sql", "database-design"],
  ["data-modeling", "database-design"],
  ["data-modeling", "graph-databases"],
  ["database-design", "nosql"],
  ["sql", "data-analysis"],

  // Data & AI
  ["python", "data-analysis"],
  ["statistics", "machine-learning"],
  ["linear-algebra", "machine-learning"],
  ["python", "machine-learning"],
  ["data-analysis", "machine-learning"],
  ["machine-learning", "deep-learning"],
  ["deep-learning", "nlp"],
  ["deep-learning", "computer-vision"],
  ["machine-learning", "mlops"],
  ["docker", "mlops"],
  ["sql", "data-engineering"],
  ["python", "data-engineering"],
  ["message-queues", "data-engineering"],
  ["nlp", "prompt-engineering"],

  // Infrastructure
  ["linux", "docker"],
  ["docker", "kubernetes"],
  ["git", "ci-cd"],
  ["docker", "ci-cd"],
  ["linux", "aws"],
  ["aws", "terraform"],
  ["kubernetes", "observability"],
  ["networking", "aws"],

  // Computer science & practice
  ["data-structures", "algorithms"],
  ["algorithms", "system-design"],
  ["git", "testing"],
  ["networking", "security-fundamentals"],
  ["authentication", "security-fundamentals"],
];

/**
 * RELATED_TO is symmetric in meaning — "you will keep meeting these two
 * together". It is stored in one direction and always matched undirected, so
 * there is exactly one edge per pair rather than two mirrored ones.
 */
export const relatedSkills: RelatedEdge[] = [
  ["javascript", "html-css"],
  ["typescript", "react"],
  ["react", "state-management"],
  ["nextjs", "web-performance"],
  ["nextjs", "rest-apis"],
  ["web-accessibility", "responsive-design"],
  ["nodejs", "typescript"],
  ["graphql", "state-management"],
  ["rest-apis", "authentication"],
  ["caching", "web-performance"],
  ["python", "javascript"],
  ["python", "sql"],
  ["sql", "nosql"],
  ["sql", "graph-databases"],
  ["graph-databases", "data-modeling"],
  ["graph-databases", "data-structures"],
  ["nosql", "data-modeling"],
  ["statistics", "data-analysis"],
  ["linear-algebra", "deep-learning"],
  ["machine-learning", "data-engineering"],
  ["mlops", "ci-cd"],
  ["mlops", "observability"],
  ["nlp", "prompt-engineering"],
  ["computer-vision", "nlp"],
  ["docker", "kubernetes"],
  ["kubernetes", "terraform"],
  ["aws", "terraform"],
  ["ci-cd", "testing"],
  ["observability", "system-design"],
  ["linux", "networking"],
  ["security-fundamentals", "testing"],
  ["algorithms", "data-analysis"],
  ["system-design", "message-queues"],
  ["data-engineering", "sql"],
  ["git", "testing"],
];

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const roles: SeedRole[] = [
  {
    id: "junior-software-engineer",
    name: "Junior Software Engineer",
    description:
      "First engineering role. Ships small, well-reviewed changes and learns the codebase and the craft.",
    level: "junior",
    requires: ["javascript", "html-css", "git", "sql", "rest-apis", "testing", "data-structures"],
    uses: ["postgresql", "github-actions", "vite"],
  },
  {
    id: "frontend-engineer",
    name: "Frontend Engineer",
    description:
      "Owns the interface: component architecture, state, accessibility and how fast the page feels.",
    level: "mid",
    requires: [
      "html-css",
      "javascript",
      "typescript",
      "react",
      "nextjs",
      "state-management",
      "responsive-design",
      "web-accessibility",
      "web-performance",
      "testing",
      "git",
    ],
    uses: ["tailwind-css", "vite", "redux", "github-actions"],
  },
  {
    id: "backend-engineer",
    name: "Backend Engineer",
    description:
      "Builds the services behind the product: APIs, data access, background work and the contracts between them.",
    level: "mid",
    requires: [
      "nodejs",
      "typescript",
      "rest-apis",
      "graphql",
      "sql",
      "database-design",
      "authentication",
      "caching",
      "testing",
      "git",
      "docker",
    ],
    uses: ["express", "postgresql", "redis", "github-actions"],
  },
  {
    id: "full-stack-engineer",
    name: "Full Stack Engineer",
    description:
      "Works across the whole request path, from the component tree down to the query plan.",
    level: "mid",
    requires: [
      "javascript",
      "typescript",
      "react",
      "nextjs",
      "nodejs",
      "rest-apis",
      "sql",
      "database-design",
      "authentication",
      "testing",
      "git",
      "docker",
    ],
    uses: ["postgresql", "tailwind-css", "redis", "github-actions"],
  },
  {
    id: "data-scientist",
    name: "Data Scientist",
    description:
      "Turns data into decisions — framing the question, building the model, and explaining what it does and does not show.",
    level: "mid",
    requires: [
      "python",
      "statistics",
      "linear-algebra",
      "data-analysis",
      "machine-learning",
      "sql",
      "git",
    ],
    uses: ["pandas", "numpy", "scikit-learn", "postgresql"],
  },
  {
    id: "ml-engineer",
    name: "ML Engineer",
    description:
      "Takes models from a notebook to a running service, and keeps them healthy once real traffic arrives.",
    level: "senior",
    requires: [
      "python",
      "machine-learning",
      "deep-learning",
      "statistics",
      "linear-algebra",
      "mlops",
      "docker",
      "kubernetes",
      "sql",
      "testing",
      "git",
    ],
    uses: ["pytorch", "tensorflow", "scikit-learn", "numpy", "prometheus"],
  },
  {
    id: "ai-engineer",
    name: "AI Engineer",
    description:
      "Builds products on top of foundation models: retrieval, prompting, evaluation and the surrounding application.",
    level: "senior",
    requires: [
      "python",
      "typescript",
      "nlp",
      "prompt-engineering",
      "machine-learning",
      "rest-apis",
      "graph-databases",
      "docker",
      "git",
    ],
    uses: ["pytorch", "fastapi", "cognodb", "redis"],
  },
  {
    id: "data-engineer",
    name: "Data Engineer",
    description:
      "Builds the pipelines and warehouses everyone else depends on, and is accountable when the numbers are wrong.",
    level: "mid",
    requires: [
      "python",
      "sql",
      "data-engineering",
      "database-design",
      "data-modeling",
      "message-queues",
      "docker",
      "nosql",
      "git",
    ],
    uses: ["apache-spark", "apache-kafka", "postgresql", "mongodb"],
  },
  {
    id: "devops-engineer",
    name: "DevOps Engineer",
    description:
      "Owns the path from commit to production, and the tooling that makes that path boring.",
    level: "mid",
    requires: ["linux", "docker", "kubernetes", "ci-cd", "terraform", "aws", "networking", "git", "observability"],
    uses: ["github-actions", "helm", "prometheus", "grafana"],
  },
  {
    id: "cloud-engineer",
    name: "Cloud Engineer",
    description:
      "Designs and runs cloud infrastructure: networking, identity, cost and the blast radius of each change.",
    level: "mid",
    requires: ["aws", "terraform", "linux", "networking", "security-fundamentals", "docker", "git"],
    uses: ["helm", "prometheus", "github-actions"],
  },
  {
    id: "site-reliability-engineer",
    name: "Site Reliability Engineer",
    description:
      "Treats reliability as a product: error budgets, on-call, capacity, and postmortems that change something.",
    level: "senior",
    requires: [
      "linux",
      "kubernetes",
      "observability",
      "networking",
      "system-design",
      "ci-cd",
      "terraform",
      "caching",
      "git",
    ],
    uses: ["prometheus", "grafana", "helm", "redis"],
  },
  {
    id: "platform-engineer",
    name: "Platform Engineer",
    description:
      "Builds the internal platform other engineers ship on — golden paths, self-service, sensible defaults.",
    level: "senior",
    requires: [
      "go",
      "kubernetes",
      "terraform",
      "ci-cd",
      "docker",
      "system-design",
      "observability",
      "linux",
      "git",
    ],
    uses: ["helm", "github-actions", "grafana", "postgresql"],
  },
  {
    id: "security-engineer",
    name: "Security Engineer",
    description:
      "Finds and closes the ways a system can be abused, and makes the secure path the easy one.",
    level: "senior",
    requires: [
      "security-fundamentals",
      "networking",
      "linux",
      "authentication",
      "python",
      "docker",
      "testing",
      "git",
    ],
    uses: ["postgresql", "prometheus", "github-actions"],
  },
];

// ---------------------------------------------------------------------------
// Technologies
//
// A Technology is a concrete product or library; a Skill is a competency. Where
// the two would collide (React is both a library and a competency) the model
// keeps the Skill and links products to it with REQUIRES_SKILL, so no concept
// is duplicated under two labels.
// ---------------------------------------------------------------------------

export const technologies: SeedTechnology[] = [
  {
    id: "tailwind-css",
    name: "Tailwind CSS",
    description: "A utility-first CSS framework — styling composed from small classes rather than bespoke sheets.",
    buildsOn: [],
    requiresSkill: ["html-css", "responsive-design"],
  },
  {
    id: "vite",
    name: "Vite",
    description: "A frontend build tool with a fast dev server and an optimised production bundle.",
    buildsOn: ["esbuild"],
    requiresSkill: ["javascript"],
  },
  {
    id: "esbuild",
    name: "esbuild",
    description: "A JavaScript bundler written in Go, fast enough to change how build tooling is designed.",
    buildsOn: [],
    requiresSkill: ["javascript", "go"],
  },
  {
    id: "redux",
    name: "Redux Toolkit",
    description: "A predictable state container for JavaScript applications, with an opinionated toolkit.",
    buildsOn: [],
    requiresSkill: ["javascript", "state-management", "react"],
  },
  {
    id: "express",
    name: "Express",
    description: "A minimal HTTP server framework for Node.js, built around middleware.",
    buildsOn: [],
    requiresSkill: ["nodejs", "rest-apis"],
  },
  {
    id: "fastapi",
    name: "FastAPI",
    description: "A Python web framework that derives validation and API docs from type hints.",
    buildsOn: ["pydantic"],
    requiresSkill: ["python", "rest-apis"],
  },
  {
    id: "pydantic",
    name: "Pydantic",
    description: "Runtime data validation for Python driven by standard type annotations.",
    buildsOn: [],
    requiresSkill: ["python"],
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    description: "A mature open-source relational database with strong SQL support and rich indexing.",
    buildsOn: [],
    requiresSkill: ["sql", "database-design"],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "A document database storing flexible JSON-like records instead of fixed rows.",
    buildsOn: [],
    requiresSkill: ["nosql", "data-modeling"],
  },
  {
    id: "redis",
    name: "Redis",
    description: "An in-memory data store used for caching, rate limiting, queues and ephemeral state.",
    buildsOn: [],
    requiresSkill: ["caching", "nosql"],
  },
  {
    id: "neo4j",
    name: "Neo4j",
    description: "A property-graph database queried with Cypher, and the origin of the Bolt protocol.",
    buildsOn: [],
    requiresSkill: ["graph-databases", "data-modeling"],
  },
  {
    id: "cognodb",
    name: "CognoDB",
    description:
      "A managed graph database that speaks openCypher over Bolt, so the official Neo4j drivers connect to it unchanged. This application runs on it.",
    buildsOn: ["neo4j"],
    requiresSkill: ["graph-databases", "data-modeling"],
  },
  {
    id: "apache-kafka",
    name: "Apache Kafka",
    description: "A distributed log used as the backbone for event streaming between services.",
    buildsOn: [],
    requiresSkill: ["message-queues", "data-engineering"],
  },
  {
    id: "apache-spark",
    name: "Apache Spark",
    description: "A distributed engine for large-scale data processing, batch and streaming.",
    buildsOn: [],
    requiresSkill: ["data-engineering", "python"],
  },
  {
    id: "numpy",
    name: "NumPy",
    description: "Fast n-dimensional arrays for Python — the numerical base most of the ecosystem sits on.",
    buildsOn: [],
    requiresSkill: ["python", "linear-algebra"],
  },
  {
    id: "pandas",
    name: "pandas",
    description: "Tabular data structures for Python, for cleaning, reshaping and aggregating datasets.",
    buildsOn: ["numpy"],
    requiresSkill: ["python", "data-analysis"],
  },
  {
    id: "scikit-learn",
    name: "scikit-learn",
    description: "Classical machine learning in Python behind one consistent estimator API.",
    buildsOn: ["numpy"],
    requiresSkill: ["python", "machine-learning", "statistics"],
  },
  {
    id: "pytorch",
    name: "PyTorch",
    description: "A deep learning framework with dynamic graphs and first-class GPU support.",
    buildsOn: ["numpy"],
    requiresSkill: ["python", "deep-learning", "linear-algebra"],
  },
  {
    id: "tensorflow",
    name: "TensorFlow",
    description: "A deep learning platform with a strong story for production serving and mobile.",
    buildsOn: ["numpy"],
    requiresSkill: ["python", "deep-learning"],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    description: "CI/CD workflows defined in the repository and triggered by repository events.",
    buildsOn: [],
    requiresSkill: ["ci-cd", "git"],
  },
  {
    id: "helm",
    name: "Helm",
    description: "A package manager for Kubernetes — templated, versioned application manifests.",
    buildsOn: [],
    requiresSkill: ["kubernetes"],
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "A metrics database that scrapes targets and evaluates alerting rules over time series.",
    buildsOn: [],
    requiresSkill: ["observability"],
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Dashboards and alerting over metrics, logs and traces from many backends.",
    buildsOn: ["prometheus"],
    requiresSkill: ["observability"],
  },
];

// ---------------------------------------------------------------------------
// Learning resources
//
// Every URL below is a real, publicly accessible page from the project's own
// documentation or a well-known educational site. None are invented.
// ---------------------------------------------------------------------------

export const resources: SeedResource[] = [
  {
    id: "mdn-javascript-guide",
    title: "MDN JavaScript Guide",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    type: "documentation",
    difficulty: "beginner",
    provider: "MDN Web Docs",
    teaches: ["javascript"],
  },
  {
    id: "mdn-html",
    title: "MDN HTML Reference",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
    type: "documentation",
    difficulty: "beginner",
    provider: "MDN Web Docs",
    teaches: ["html-css"],
  },
  {
    id: "mdn-css",
    title: "MDN CSS Reference",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS",
    type: "documentation",
    difficulty: "beginner",
    provider: "MDN Web Docs",
    teaches: ["html-css", "responsive-design"],
  },
  {
    id: "mdn-http",
    title: "MDN HTTP Guide",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP",
    type: "documentation",
    difficulty: "beginner",
    provider: "MDN Web Docs",
    teaches: ["rest-apis", "networking", "caching"],
  },
  {
    id: "typescript-handbook",
    title: "The TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    type: "documentation",
    difficulty: "intermediate",
    provider: "Microsoft",
    teaches: ["typescript"],
  },
  {
    id: "react-learn",
    title: "React — Learn",
    url: "https://react.dev/learn",
    type: "documentation",
    difficulty: "intermediate",
    provider: "Meta",
    teaches: ["react", "state-management"],
  },
  {
    id: "nextjs-learn",
    title: "Next.js Learn Course",
    url: "https://nextjs.org/learn",
    type: "interactive",
    difficulty: "intermediate",
    provider: "Vercel",
    teaches: ["nextjs", "react"],
  },
  {
    id: "nodejs-learn",
    title: "Node.js Guides",
    url: "https://nodejs.org/en/learn",
    type: "documentation",
    difficulty: "intermediate",
    provider: "OpenJS Foundation",
    teaches: ["nodejs"],
  },
  {
    id: "python-tutorial",
    title: "The Python Tutorial",
    url: "https://docs.python.org/3/tutorial/",
    type: "documentation",
    difficulty: "beginner",
    provider: "Python Software Foundation",
    teaches: ["python"],
  },
  {
    id: "go-tour",
    title: "A Tour of Go",
    url: "https://go.dev/tour/",
    type: "interactive",
    difficulty: "intermediate",
    provider: "The Go Authors",
    teaches: ["go"],
  },
  {
    id: "rust-book",
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    type: "book",
    difficulty: "advanced",
    provider: "The Rust Project",
    teaches: ["rust"],
  },
  {
    id: "web-dev-accessibility",
    title: "Learn Accessibility",
    url: "https://web.dev/learn/accessibility",
    type: "course",
    difficulty: "intermediate",
    provider: "Google",
    teaches: ["web-accessibility"],
  },
  {
    id: "web-dev-performance",
    title: "Learn Performance",
    url: "https://web.dev/learn/performance",
    type: "course",
    difficulty: "advanced",
    provider: "Google",
    teaches: ["web-performance"],
  },
  {
    id: "web-dev-design",
    title: "Learn Responsive Design",
    url: "https://web.dev/learn/design",
    type: "course",
    difficulty: "beginner",
    provider: "Google",
    teaches: ["responsive-design"],
  },
  {
    id: "graphql-learn",
    title: "GraphQL — Introduction",
    url: "https://graphql.org/learn/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "GraphQL Foundation",
    teaches: ["graphql"],
  },
  {
    id: "pro-git",
    title: "Pro Git",
    url: "https://git-scm.com/book/en/v2",
    type: "book",
    difficulty: "beginner",
    provider: "Scott Chacon & Ben Straub",
    teaches: ["git"],
  },
  {
    id: "postgresql-tutorial",
    title: "PostgreSQL Tutorial",
    url: "https://www.postgresql.org/docs/current/tutorial.html",
    type: "documentation",
    difficulty: "beginner",
    provider: "PostgreSQL Global Development Group",
    teaches: ["sql", "database-design"],
  },
  {
    id: "mongodb-manual",
    title: "MongoDB Manual",
    url: "https://www.mongodb.com/docs/manual/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "MongoDB",
    teaches: ["nosql", "data-modeling"],
  },
  {
    id: "redis-docs",
    title: "Redis Documentation",
    url: "https://redis.io/docs/latest/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "Redis",
    teaches: ["caching"],
  },
  {
    id: "neo4j-graphacademy",
    title: "Neo4j GraphAcademy",
    url: "https://graphacademy.neo4j.com/",
    type: "course",
    difficulty: "intermediate",
    provider: "Neo4j",
    teaches: ["graph-databases", "data-modeling"],
  },
  {
    id: "opencypher",
    title: "openCypher",
    url: "https://opencypher.org/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "openCypher",
    teaches: ["graph-databases"],
  },
  {
    id: "docker-get-started",
    title: "Docker — Get Started",
    url: "https://docs.docker.com/get-started/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "Docker",
    teaches: ["docker"],
  },
  {
    id: "kubernetes-tutorials",
    title: "Kubernetes Tutorials",
    url: "https://kubernetes.io/docs/tutorials/",
    type: "tutorial",
    difficulty: "advanced",
    provider: "CNCF",
    teaches: ["kubernetes"],
  },
  {
    id: "terraform-tutorials",
    title: "Terraform Tutorials",
    url: "https://developer.hashicorp.com/terraform/tutorials",
    type: "tutorial",
    difficulty: "advanced",
    provider: "HashiCorp",
    teaches: ["terraform"],
  },
  {
    id: "linux-command-line",
    title: "The Linux Command Line",
    url: "https://linuxcommand.org/tlcl.php",
    type: "book",
    difficulty: "beginner",
    provider: "William Shotts",
    teaches: ["linux"],
  },
  {
    id: "github-actions-docs",
    title: "GitHub Actions Documentation",
    url: "https://docs.github.com/en/actions",
    type: "documentation",
    difficulty: "intermediate",
    provider: "GitHub",
    teaches: ["ci-cd"],
  },
  {
    id: "prometheus-docs",
    title: "Prometheus Documentation",
    url: "https://prometheus.io/docs/introduction/overview/",
    type: "documentation",
    difficulty: "advanced",
    provider: "Prometheus",
    teaches: ["observability"],
  },
  {
    id: "seeing-theory",
    title: "Seeing Theory — Visual Introduction to Probability and Statistics",
    url: "https://seeing-theory.brown.edu/",
    type: "interactive",
    difficulty: "beginner",
    provider: "Brown University",
    teaches: ["statistics"],
  },
  {
    id: "essence-linear-algebra",
    title: "Essence of Linear Algebra",
    url: "https://www.3blue1brown.com/topics/linear-algebra",
    type: "course",
    difficulty: "beginner",
    provider: "3Blue1Brown",
    teaches: ["linear-algebra"],
  },
  {
    id: "google-ml-crash-course",
    title: "Machine Learning Crash Course",
    url: "https://developers.google.com/machine-learning/crash-course",
    type: "course",
    difficulty: "intermediate",
    provider: "Google",
    teaches: ["machine-learning", "statistics"],
  },
  {
    id: "scikit-learn-user-guide",
    title: "scikit-learn User Guide",
    url: "https://scikit-learn.org/stable/user_guide.html",
    type: "documentation",
    difficulty: "advanced",
    provider: "scikit-learn",
    teaches: ["machine-learning"],
  },
  {
    id: "deep-learning-book",
    title: "Deep Learning",
    url: "https://www.deeplearningbook.org/",
    type: "book",
    difficulty: "advanced",
    provider: "Goodfellow, Bengio & Courville",
    teaches: ["deep-learning", "linear-algebra"],
  },
  {
    id: "pytorch-tutorials",
    title: "PyTorch Tutorials",
    url: "https://pytorch.org/tutorials/",
    type: "tutorial",
    difficulty: "advanced",
    provider: "PyTorch",
    teaches: ["deep-learning"],
  },
  {
    id: "huggingface-nlp-course",
    title: "Hugging Face NLP Course",
    url: "https://huggingface.co/learn/nlp-course",
    type: "course",
    difficulty: "advanced",
    provider: "Hugging Face",
    teaches: ["nlp", "prompt-engineering"],
  },
  {
    id: "pandas-getting-started",
    title: "pandas — Getting Started",
    url: "https://pandas.pydata.org/docs/getting_started/index.html",
    type: "documentation",
    difficulty: "beginner",
    provider: "pandas",
    teaches: ["data-analysis"],
  },
  {
    id: "kafka-docs",
    title: "Apache Kafka Documentation",
    url: "https://kafka.apache.org/documentation/",
    type: "documentation",
    difficulty: "advanced",
    provider: "Apache Software Foundation",
    teaches: ["message-queues", "data-engineering"],
  },
  {
    id: "ml-ops-guide",
    title: "MLOps Principles",
    url: "https://ml-ops.org/",
    type: "documentation",
    difficulty: "advanced",
    provider: "ml-ops.org",
    teaches: ["mlops"],
  },
  {
    id: "owasp-top-ten",
    title: "OWASP Top Ten",
    url: "https://owasp.org/www-project-top-ten/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "OWASP",
    teaches: ["security-fundamentals", "authentication"],
  },
  {
    id: "testing-library-docs",
    title: "Testing Library Documentation",
    url: "https://testing-library.com/docs/",
    type: "documentation",
    difficulty: "intermediate",
    provider: "Testing Library",
    teaches: ["testing"],
  },
  {
    id: "system-design-primer",
    title: "The System Design Primer",
    url: "https://github.com/donnemartin/system-design-primer",
    type: "book",
    difficulty: "advanced",
    provider: "Donne Martin",
    teaches: ["system-design", "caching"],
  },
  {
    id: "visualgo",
    title: "VisuAlgo — Data Structures and Algorithms Visualised",
    url: "https://visualgo.net/en",
    type: "interactive",
    difficulty: "intermediate",
    provider: "VisuAlgo",
    teaches: ["data-structures", "algorithms"],
  },
  {
    id: "aws-skill-builder",
    title: "AWS Skill Builder",
    url: "https://skillbuilder.aws/",
    type: "course",
    difficulty: "intermediate",
    provider: "Amazon Web Services",
    teaches: ["aws"],
  },
];

// ---------------------------------------------------------------------------
// Referential integrity
//
// The dataset is hand-written, so a typo in an id would silently create a
// dangling reference — a role requiring a skill that does not exist, which
// MERGE would happily invent as an empty node. This check runs before the seed
// writes anything, and again in the test suite.
// ---------------------------------------------------------------------------

export interface SeedCounts {
  categories: number;
  skills: number;
  roles: number;
  technologies: number;
  resources: number;
  relationships: number;
}

export function countSeedData(): SeedCounts {
  const relationships =
    skills.length + // BELONGS_TO
    prerequisites.length +
    relatedSkills.length +
    roles.reduce((total, role) => total + role.requires.length + role.uses.length, 0) +
    technologies.reduce(
      (total, technology) => total + technology.buildsOn.length + technology.requiresSkill.length,
      0,
    ) +
    resources.reduce((total, resource) => total + resource.teaches.length, 0);

  return {
    categories: categories.length,
    skills: skills.length,
    roles: roles.length,
    technologies: technologies.length,
    resources: resources.length,
    relationships,
  };
}

/** Returns a list of problems. An empty list means the dataset is consistent. */
export function validateSeedData(): string[] {
  const problems: string[] = [];

  const skillIds = new Set(skills.map((skill) => skill.id));
  const categoryIds = new Set(categories.map((category) => category.id));
  const technologyIds = new Set(technologies.map((technology) => technology.id));

  const requireUnique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${label}: duplicate id "${id}"`);
      seen.add(id);
    }
  };

  requireUnique("Category", categories.map((category) => category.id));
  requireUnique("Skill", skills.map((skill) => skill.id));
  requireUnique("Role", roles.map((role) => role.id));
  requireUnique("Technology", technologies.map((technology) => technology.id));
  requireUnique("Resource", resources.map((resource) => resource.id));

  const requireSkill = (id: string, context: string) => {
    if (!skillIds.has(id)) problems.push(`${context} references unknown skill "${id}"`);
  };

  for (const skill of skills) {
    if (!categoryIds.has(skill.category)) {
      problems.push(`Skill "${skill.id}" references unknown category "${skill.category}"`);
    }
  }

  for (const [from, to] of prerequisites) {
    requireSkill(from, "PREREQUISITE_FOR");
    requireSkill(to, "PREREQUISITE_FOR");
    if (from === to) problems.push(`PREREQUISITE_FOR: "${from}" is its own prerequisite`);
  }

  for (const [a, b] of relatedSkills) {
    requireSkill(a, "RELATED_TO");
    requireSkill(b, "RELATED_TO");
    if (a === b) problems.push(`RELATED_TO: "${a}" is related to itself`);
  }

  for (const role of roles) {
    for (const skillId of role.requires) requireSkill(skillId, `Role "${role.id}"`);
    for (const technologyId of role.uses) {
      if (!technologyIds.has(technologyId)) {
        problems.push(`Role "${role.id}" uses unknown technology "${technologyId}"`);
      }
    }
  }

  for (const technology of technologies) {
    for (const skillId of technology.requiresSkill) {
      requireSkill(skillId, `Technology "${technology.id}"`);
    }
    for (const other of technology.buildsOn) {
      if (!technologyIds.has(other)) {
        problems.push(`Technology "${technology.id}" builds on unknown technology "${other}"`);
      }
      if (other === technology.id) {
        problems.push(`Technology "${technology.id}" builds on itself`);
      }
    }
  }

  for (const resource of resources) {
    for (const skillId of resource.teaches) requireSkill(skillId, `Resource "${resource.id}"`);
    if (!/^https:\/\//.test(resource.url)) {
      problems.push(`Resource "${resource.id}" has a non-HTTPS url`);
    }
  }

  // A skill with no relationships at all is a dead end in every traversal, so
  // it is almost certainly a mistake rather than a deliberate choice.
  const connected = new Set<string>();
  for (const [from, to] of prerequisites) connected.add(from).add(to);
  for (const [a, b] of relatedSkills) connected.add(a).add(b);
  for (const role of roles) for (const id of role.requires) connected.add(id);
  for (const technology of technologies) for (const id of technology.requiresSkill) connected.add(id);
  for (const resource of resources) for (const id of resource.teaches) connected.add(id);

  for (const skill of skills) {
    if (!connected.has(skill.id)) {
      problems.push(`Skill "${skill.id}" is isolated — no relationship reaches it`);
    }
  }

  return problems;
}
