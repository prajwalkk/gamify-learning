import type { LearningStyle, TrackId } from "./types.js";

// Starter goals. Minutes are estimates for a careful first pass (reading + small
// exercises, or a video plus notes); stretch units are optional extras.

export interface LibraryUnit {
  title: string;
  minutes: number;
  stretch?: boolean;
  url?: string;
}

export interface LibraryEntry {
  id: string;
  title: string;
  aliases: string[];
  track: TrackId;
  format: LearningStyle;
  durationDays: number;
  link: string;
  blurb: string;
  units: LibraryUnit[];
}

const rust = (n: string, slug: string) => `https://rust-book.cs.brown.edu/ch${n}-00-${slug}.html`;

export const LIBRARY: LibraryEntry[] = [
  {
    id: "rust-book",
    title: "The Rust Book (Brown edition)",
    aliases: ["rust book", "rust", "brown rust", "the rust programming language"],
    track: "languages",
    format: "reading",
    durationDays: 30,
    link: "https://rust-book.cs.brown.edu/",
    blurb: "The official Rust book with Brown's ownership quizzes and visualizations",
    units: [
      { title: "Ch 1 · Getting started", minutes: 30, url: rust("01", "getting-started") },
      { title: "Ch 2 · Guessing game", minutes: 45, url: rust("02", "guessing-game-tutorial") },
      { title: "Ch 3 · Common programming concepts", minutes: 60, url: rust("03", "common-programming-concepts") },
      { title: "Ch 4 · Understanding ownership", minutes: 100, url: rust("04", "understanding-ownership") },
      { title: "Ch 5 · Structs", minutes: 45, url: rust("05", "structs") },
      { title: "Ch 6 · Enums and pattern matching", minutes: 50, url: rust("06", "enums") },
      { title: "Ch 7 · Packages, crates and modules", minutes: 45, url: rust("07", "managing-growing-projects-with-packages-crates-and-modules") },
      { title: "Ch 8 · Common collections", minutes: 50, url: rust("08", "common-collections") },
      { title: "Ch 9 · Error handling", minutes: 50, url: rust("09", "error-handling") },
      { title: "Ch 10 · Generics, traits and lifetimes", minutes: 120, url: rust("10", "generics") },
      { title: "Ch 11 · Writing tests", minutes: 45, url: rust("11", "testing") },
      { title: "Ch 12 · An I/O project", minutes: 75, url: rust("12", "an-io-project") },
      { title: "Ch 13 · Iterators and closures", minutes: 60, url: rust("13", "functional-features") },
      { title: "Ch 14 · More about Cargo", minutes: 30, stretch: true, url: rust("14", "more-about-cargo") },
      { title: "Ch 15 · Smart pointers", minutes: 90, url: rust("15", "smart-pointers") },
      { title: "Ch 16 · Fearless concurrency", minutes: 75, url: rust("16", "concurrency") },
      { title: "Ch 17 · Async and await", minutes: 90, url: rust("17", "async-await") },
      { title: "Ch 18 · OOP features", minutes: 45, stretch: true, url: rust("18", "oop") },
      { title: "Ch 19 · Patterns and matching", minutes: 45, url: rust("19", "patterns") },
      { title: "Ch 20 · Advanced features", minutes: 75, stretch: true, url: rust("20", "advanced-features") },
      { title: "Ch 21 · Final project: a web server", minutes: 90, stretch: true, url: rust("21", "final-project-a-web-server") },
    ],
  },
  {
    id: "mml",
    title: "Mathematics for Machine Learning",
    aliases: ["mml", "math for ml", "mathematics for machine learning", "deisenroth"],
    track: "ml",
    format: "reading",
    durationDays: 60,
    link: "https://mml-book.github.io/",
    blurb: "The linear algebra, calculus and probability under ML, with worked examples",
    units: [
      { title: "Ch 1 · Introduction and motivation", minutes: 20 },
      { title: "Ch 2 · Linear algebra", minutes: 180 },
      { title: "Ch 3 · Analytic geometry", minutes: 150 },
      { title: "Ch 4 · Matrix decompositions", minutes: 180 },
      { title: "Ch 5 · Vector calculus", minutes: 180 },
      { title: "Ch 6 · Probability and distributions", minutes: 210 },
      { title: "Ch 7 · Continuous optimization", minutes: 150 },
      { title: "Ch 8 · When models meet data", minutes: 120, stretch: true },
      { title: "Ch 9 · Linear regression", minutes: 150, stretch: true },
      { title: "Ch 10 · Dimensionality reduction with PCA", minutes: 150, stretch: true },
      { title: "Ch 11 · Density estimation with GMMs", minutes: 150, stretch: true },
      { title: "Ch 12 · Classification with SVMs", minutes: 150, stretch: true },
    ],
  },
  {
    id: "3b1b-linear-algebra",
    title: "3Blue1Brown · Essence of Linear Algebra",
    aliases: ["essence of linear algebra", "linear algebra", "3b1b linear algebra", "3blue1brown linear algebra"],
    track: "ml",
    format: "video",
    durationDays: 21,
    link: "https://www.3blue1brown.com/topics/linear-algebra",
    blurb: "Geometric intuition for vectors, matrices, determinants and eigenvectors",
    units: [
      "Vectors, what even are they?",
      "Linear combinations, span and basis vectors",
      "Linear transformations and matrices",
      "Matrix multiplication as composition",
      "Three-dimensional linear transformations",
      "The determinant",
      "Inverse matrices, column space and null space",
      "Nonsquare matrices as transformations between dimensions",
      "Dot products and duality",
      "Cross products",
      "Cross products in the light of linear transformations",
      "Cramer's rule, explained geometrically",
      "Change of basis",
      "Eigenvectors and eigenvalues",
      "A quick trick for computing eigenvalues",
      "Abstract vector spaces",
    ].map((t, i) => ({ title: `Ch ${i + 1} · ${t}`, minutes: 25, stretch: i === 14 || undefined })),
  },
  {
    id: "3b1b-calculus",
    title: "3Blue1Brown · Essence of Calculus",
    aliases: ["essence of calculus", "calculus", "3b1b calculus", "3blue1brown calculus"],
    track: "ml",
    format: "video",
    durationDays: 14,
    link: "https://www.3blue1brown.com/topics/calculus",
    blurb: "Derivatives, integrals and Taylor series, built from pictures",
    units: [
      "The essence of calculus",
      "The paradox of the derivative",
      "Derivative formulas through geometry",
      "Visualizing the chain rule and product rule",
      "What's so special about Euler's number e?",
      "Implicit differentiation",
      "Limits, L'Hôpital's rule and epsilon-delta",
      "Integration and the fundamental theorem of calculus",
      "What does area have to do with slope?",
      "Higher order derivatives",
      "Taylor series",
      "What they won't teach you in calculus",
    ].map((t, i) => ({ title: `Ch ${i + 1} · ${t}`, minutes: 25, stretch: i === 11 || undefined })),
  },
  {
    id: "zero-to-hero",
    title: "Karpathy · Neural Networks: Zero to Hero",
    aliases: ["zero to hero", "karpathy", "nn zero to hero", "neural networks zero to hero", "micrograd", "makemore"],
    track: "ml",
    format: "video",
    durationDays: 45,
    link: "https://karpathy.ai/zero-to-hero.html",
    blurb: "Build neural nets from scratch in code, from backprop to GPT",
    units: [
      { title: "1 · micrograd: backpropagation from scratch", minutes: 180 },
      { title: "2 · makemore 1: bigram language model", minutes: 150 },
      { title: "3 · makemore 2: MLP", minutes: 110 },
      { title: "4 · makemore 3: activations, gradients, BatchNorm", minutes: 150 },
      { title: "5 · makemore 4: becoming a backprop ninja", minutes: 160 },
      { title: "6 · makemore 5: building a WaveNet", minutes: 80 },
      { title: "7 · Let's build GPT, from scratch", minutes: 180 },
      { title: "8 · Let's build the GPT tokenizer", minutes: 170, stretch: true },
      { title: "9 · Let's reproduce GPT-2 (124M)", minutes: 300, stretch: true },
    ],
  },
  {
    id: "ddia",
    title: "Designing Data-Intensive Applications",
    aliases: ["ddia", "designing data intensive applications", "kleppmann"],
    track: "system-design",
    format: "reading",
    durationDays: 60,
    link: "https://dataintensive.net/",
    blurb: "How databases, replication, partitioning and streams really work",
    units: [
      { title: "Ch 1 · Reliable, scalable, maintainable applications", minutes: 60 },
      { title: "Ch 2 · Data models and query languages", minutes: 90 },
      { title: "Ch 3 · Storage and retrieval", minutes: 120 },
      { title: "Ch 4 · Encoding and evolution", minutes: 90 },
      { title: "Ch 5 · Replication", minutes: 120 },
      { title: "Ch 6 · Partitioning", minutes: 90 },
      { title: "Ch 7 · Transactions", minutes: 150 },
      { title: "Ch 8 · The trouble with distributed systems", minutes: 150 },
      { title: "Ch 9 · Consistency and consensus", minutes: 180 },
      { title: "Ch 10 · Batch processing", minutes: 120 },
      { title: "Ch 11 · Stream processing", minutes: 120 },
      { title: "Ch 12 · The future of data systems", minutes: 90, stretch: true },
    ],
  },
  {
    id: "system-design-primer",
    title: "The System Design Primer",
    aliases: ["system design primer", "sdp", "donnemartin"],
    track: "system-design",
    format: "reading",
    durationDays: 30,
    link: "https://github.com/donnemartin/system-design-primer",
    blurb: "The building blocks of large systems, plus worked interview designs",
    units: [
      { title: "How to approach a system design question", minutes: 30 },
      { title: "Performance vs scalability, latency vs throughput", minutes: 30 },
      { title: "CAP theorem, consistency and availability patterns", minutes: 60 },
      { title: "DNS and CDNs", minutes: 40 },
      { title: "Load balancers and reverse proxies", minutes: 45 },
      { title: "Application layer and microservices", minutes: 40 },
      { title: "Databases: replication, federation, sharding, NoSQL", minutes: 120 },
      { title: "Caching", minutes: 60 },
      { title: "Asynchronism: queues and back pressure", minutes: 45 },
      { title: "Communication: TCP, UDP, RPC, REST", minutes: 60 },
      { title: "Back-of-the-envelope numbers", minutes: 30 },
      { title: "Design: Pastebin / bit.ly", minutes: 60 },
      { title: "Design: Twitter timeline and search", minutes: 60 },
      { title: "Design: a web crawler", minutes: 60 },
      { title: "Design: key-value cache for a search engine", minutes: 45 },
      { title: "Design: scaling to millions of users on AWS", minutes: 60 },
      { title: "Security basics", minutes: 30, stretch: true },
      { title: "Design: Mint.com", minutes: 60, stretch: true },
      { title: "Design: social network data structures", minutes: 60, stretch: true },
      { title: "Design: Amazon sales rank by category", minutes: 45, stretch: true },
    ],
  },
  {
    id: "llm-from-scratch",
    title: "Build a Large Language Model (From Scratch)",
    aliases: ["build an llm from scratch", "llm from scratch", "raschka", "build a large language model"],
    track: "ml",
    format: "exercise",
    durationDays: 45,
    link: "https://github.com/rasbt/LLMs-from-scratch",
    blurb: "Code a GPT-style model end to end: tokenizer, attention, pretraining, fine-tuning",
    units: [
      { title: "Ch 1 · Understanding large language models", minutes: 45 },
      { title: "Ch 2 · Working with text data", minutes: 120 },
      { title: "Ch 3 · Coding attention mechanisms", minutes: 180 },
      { title: "Ch 4 · Implementing a GPT model from scratch", minutes: 180 },
      { title: "Ch 5 · Pretraining on unlabeled data", minutes: 180 },
      { title: "Ch 6 · Fine-tuning for classification", minutes: 150 },
      { title: "Ch 7 · Fine-tuning to follow instructions", minutes: 180 },
      { title: "Appendix A · Introduction to PyTorch", minutes: 90, stretch: true },
      { title: "Appendix D · Training loop bells and whistles", minutes: 60, stretch: true },
      { title: "Appendix E · Parameter-efficient fine-tuning with LoRA", minutes: 60, stretch: true },
    ],
  },
];

/** Find a library entry by id, title or alias (case-insensitive, loose). */
export function findLibrary(query: string): LibraryEntry | undefined {
  const q = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return (
    LIBRARY.find((e) => e.id === query) ??
    LIBRARY.find((e) => [e.title, ...e.aliases].some((a) => a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === q)) ??
    LIBRARY.find((e) => [e.title, ...e.aliases].some((a) => {
      const n = a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return n.includes(q) || q.includes(n);
    }))
  );
}
