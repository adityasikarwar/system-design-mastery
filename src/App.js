import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { supabase, isSupabaseConfigured, signInWithMagicLink, signOut } from "./supabase";

const KEY = "sd_v2";

const DARK = {
  bg: "#05060a", card: "#0c0d14", card2: "#10111a", border: "#1a1d2e", accent: "#f59e0b",
  green: "#10b981", red: "#ef4444", blue: "#3b82f6", purple: "#8b5cf6",
  cyan: "#06b6d4", text: "#d1d5db", dim: "#4b5563", muted: "#1a1d2e", orange: "#f97316", pink: "#ec4899",
  glow: "rgba(245,158,11,0.08)", glass: "rgba(12,13,20,0.85)",
  headText: "#fff", subText: "#9ca3af", checkBorder: "#2a2d3e", starOff: "#1e2433",
  hoverBg: "rgba(255,255,255,0.03)", cardHover: "#2a2d3e", scrollThumb: "#1a1d2e", scrollHover: "#2a2d3e",
  headerBg: "linear-gradient(180deg, rgba(12,13,20,0.95), rgba(5,6,10,0.98))", headerBorder: "rgba(255,255,255,0.04)",
  progressTrack: "rgba(26,29,46,0.5)", inputBg: "#0c0d14",
};
const LIGHT = {
  bg: "#f5f5f7", card: "#ffffff", card2: "#f0f0f3", border: "#e0e0e6", accent: "#d97706",
  green: "#059669", red: "#dc2626", blue: "#2563eb", purple: "#7c3aed",
  cyan: "#0891b2", text: "#1f2937", dim: "#6b7280", muted: "#e5e7eb", orange: "#ea580c", pink: "#db2777",
  glow: "rgba(217,119,6,0.06)", glass: "rgba(255,255,255,0.9)",
  headText: "#111827", subText: "#4b5563", checkBorder: "#d1d5db", starOff: "#d1d5db",
  hoverBg: "rgba(0,0,0,0.03)", cardHover: "#d1d5db", scrollThumb: "#d1d5db", scrollHover: "#9ca3af",
  headerBg: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(245,245,247,0.98))", headerBorder: "rgba(0,0,0,0.08)",
  progressTrack: "rgba(0,0,0,0.06)", inputBg: "#ffffff",
};
let C = DARK;

const DC = {
  Easy: { bg: "#052e16", text: "#4ade80" },
  Medium: { bg: "#1c1007", text: "#fbbf24" },
  Hard: { bg: "#2a0a0a", text: "#f87171" },
};

const RESHADED = [
  { l: "R", n: "Requirements", t: "~5m", c: "#f59e0b", d: "Clarify functional & non-functional needs.", q: ["Users?", "Features?", "DAU/QPS?", "Read vs write?", "Latency?", "Availability?"] },
  { l: "E", n: "Estimation", t: "~3m", c: "#06b6d4", d: "QPS, storage, bandwidth, cache.", q: ["QPS?", "Storage/yr?", "Bandwidth?", "Cache size?"] },
  { l: "S", n: "System Interface", t: "~3m", c: "#10b981", d: "API contracts, endpoints, params.", q: ["Endpoints?", "REST/gRPC/WS?", "Pagination?", "Auth?"] },
  { l: "H", n: "High-Level Design", t: "~10m", c: "#8b5cf6", d: "Architecture boxes and data flow.", q: ["Components?", "Data flow?", "Cache location?", "Async?"] },
  { l: "A", n: "Data Model", t: "~5m", c: "#ec4899", d: "Schema, storage choice, indexing.", q: ["SQL or NoSQL?", "Tables?", "Partition key?", "Indexes?"] },
  { l: "D", n: "Detailed Design", t: "~12m", c: "#3b82f6", d: "Deep dive 2-3 critical components.", q: ["Complex part?", "Edge cases?", "Failures?", "Bottlenecks?"] },
  { l: "E", n: "Trade-offs", t: "~3m", c: "#f97316", d: "Alternatives and why you chose your path.", q: ["Alternatives?", "Trade-offs?", "When is alt better?", "Cost?"] },
  { l: "D", n: "Defend & Scale", t: "~4m", c: "#ef4444", d: "10x traffic, failures, monitoring, security.", q: ["10x traffic?", "Failures?", "Monitoring?", "Security?"] },
];

const EST = {
  nums: [
    { l: "Sec/day", v: "86,400" },
    { l: "Sec/month", v: "2.5M" },
    { l: "Sec/year", v: "~30M" },
    { l: "1 Million", v: "10^6" },
    { l: "1 Billion", v: "10^9" },
    { l: "1 Trillion", v: "10^12" },
    { l: "Days/year", v: "365" },
    { l: "Hours/month", v: "~730" },
  ],
  storage: [
    { l: "User profile", v: "~1 KB" },
    { l: "Tweet / msg", v: "~0.5-1 KB" },
    { l: "Log line", v: "~200 B" },
    { l: "Photo (compressed)", v: "200 KB - 1 MB" },
    { l: "Thumbnail", v: "10-50 KB" },
    { l: "Short video (1 min)", v: "5-50 MB" },
    { l: "Long video (1 hr)", v: "1-5 GB" },
    { l: "Audio song (5 min)", v: "3-10 MB" },
    { l: "1 KB × 1M records", v: "1 GB" },
    { l: "1 MB × 1M records", v: "1 TB" },
    { l: "1 GB × 1M records", v: "1 PB" },
  ],
  latency: [
    { l: "L1 cache ref", v: "0.5 ns" },
    { l: "L2 cache ref", v: "7 ns" },
    { l: "RAM access", v: "100 ns" },
    { l: "SSD random read", v: "150 μs" },
    { l: "SSD sequential (1MB)", v: "1 ms" },
    { l: "HDD seek", v: "10 ms" },
    { l: "HDD sequential (1MB)", v: "20 ms" },
    { l: "Same datacenter", v: "0.5 ms" },
    { l: "Cross-region (US-EU)", v: "80 ms" },
    { l: "Cross-continent", v: "150 ms" },
    { l: "TLS handshake", v: "50-100 ms" },
    { l: "DNS lookup", v: "20-120 ms" },
  ],
  throughput: [
    { l: "Redis (single)", v: "100K ops/sec" },
    { l: "Memcached", v: "200K ops/sec" },
    { l: "Kafka (cluster)", v: "1M+ msgs/sec" },
    { l: "PostgreSQL writes", v: "5K-10K/sec" },
    { l: "PostgreSQL reads", v: "30K-50K/sec" },
    { l: "Cassandra writes", v: "50K-200K/sec per node" },
    { l: "Elasticsearch", v: "10K-50K writes/sec" },
    { l: "Nginx (HTTP)", v: "50K-100K req/sec" },
    { l: "Single server (web)", v: "1K-5K req/sec" },
    { l: "WebSocket (per server)", v: "500K connections" },
  ],
  network: [
    { l: "1 Gbps link", v: "125 MB/sec" },
    { l: "10 Gbps link", v: "1.25 GB/sec" },
    { l: "SSD seq read", v: "500 MB/sec" },
    { l: "SSD seq write", v: "400 MB/sec" },
    { l: "HDD seq read", v: "100 MB/sec" },
    { l: "HTTP request overhead", v: "~500 B" },
    { l: "TCP connection", v: "~240 B memory" },
  ],
  formulas: [
    { l: "QPS", f: "DAU × actions / 86,400" },
    { l: "Peak QPS", f: "QPS × 2 (spiky ×3)" },
    { l: "Storage/yr", f: "records/day × size × 365" },
    { l: "Bandwidth", f: "QPS × avg_response_size" },
    { l: "Cache size", f: "QPS × response_size × cache_TTL" },
    { l: "Servers needed", f: "Peak_QPS / per_server_QPS" },
    { l: "Replication storage", f: "raw_storage × replicas (usually 3)" },
    { l: "DB shards", f: "total_data / max_per_shard (1TB)" },
  ],
};

const COMPS = [
  { t: "SQL vs NoSQL", c: "#3b82f6", rows: [
    { k: "Schema", a: "Fixed (enforced)", b: "Flexible (schemaless)" },
    { k: "Scale", a: "Vertical (hard to shard)", b: "Horizontal (built-in)" },
    { k: "Consistency", a: "ACID (strong)", b: "BASE (eventual)" },
    { k: "Joins", a: "Native, powerful", b: "Not supported (denormalize)" },
    { k: "Best for", a: "Transactions, complex queries", b: "High writes, flexible data" },
    { k: "Examples", a: "PostgreSQL, MySQL", b: "Cassandra, MongoDB, DynamoDB" },
  ]},
  { t: "Kafka vs RabbitMQ", c: "#10b981", rows: [
    { k: "Model", a: "Distributed log (append)", b: "Message broker (queue)" },
    { k: "Ordering", a: "Per partition (key-based)", b: "FIFO per queue" },
    { k: "Replay", a: "Yes (re-read from offset)", b: "No (consumed = gone)" },
    { k: "Throughput", a: "Millions msgs/sec", b: "Tens of thousands/sec" },
    { k: "Routing", a: "Topic + partition only", b: "Flexible (exchange, routing key)" },
    { k: "Best for", a: "Event streaming, logs, CDC", b: "Task queues, RPC, routing" },
  ]},
  { t: "REST vs gRPC vs GraphQL", c: "#8b5cf6", rows: [
    { k: "Format", a: "JSON / HTTP 1.1", b: "Protobuf / HTTP 2", c: "JSON / HTTP" },
    { k: "Speed", a: "Good (~100ms)", b: "Excellent (~10ms)", c: "Good (variable)" },
    { k: "Streaming", a: "No (SSE workaround)", b: "Yes (bi-directional)", c: "Subscriptions" },
    { k: "Schema", a: "OpenAPI (optional)", b: "Strict .proto files", c: "Strong type system" },
    { k: "Best for", a: "Public APIs", b: "Service-to-service", c: "Mobile apps (bandwidth)" },
  ]},
  { t: "Push vs Pull Feed", c: "#f97316", rows: [
    { k: "Write cost", a: "High (fan-out to followers)", b: "Low (store once)" },
    { k: "Read cost", a: "Low (pre-computed)", b: "High (merge on read)" },
    { k: "Celebrity", a: "Expensive (millions of writes)", b: "Natural (merge at read)" },
    { k: "Latency", a: "Instant reads from cache", b: "Slower (aggregate at query)" },
    { k: "Used by", a: "Twitter (<10K followers)", b: "Twitter (celebrities)" },
  ]},
  { t: "Redis vs Memcached", c: "#ef4444", rows: [
    { k: "Data types", a: "Strings, Lists, Sets, Sorted Sets, Hashes, Streams", b: "Strings only (key-value)" },
    { k: "Persistence", a: "RDB snapshots + AOF log", b: "None (pure cache)" },
    { k: "Clustering", a: "Redis Cluster (built-in sharding)", b: "Client-side sharding only" },
    { k: "Pub/Sub", a: "Yes (built-in)", b: "No" },
    { k: "Memory", a: "Higher overhead per key", b: "More memory-efficient" },
    { k: "Best for", a: "Leaderboards, sessions, queues, rate limiting", b: "Simple caching at massive scale" },
  ]},
  { t: "WebSocket vs SSE vs Long Polling", c: "#06b6d4", rows: [
    { k: "Direction", a: "Bidirectional", b: "Server → Client only", c: "Client → Server (repeated)" },
    { k: "Protocol", a: "WS (upgrade from HTTP)", b: "HTTP (text/event-stream)", c: "HTTP (hanging GET)" },
    { k: "Reconnect", a: "Manual (client logic)", b: "Automatic (built-in)", c: "Automatic (new request)" },
    { k: "Scalability", a: "Hard (stateful connections)", b: "Easy (stateless, CDN-able)", c: "Moderate" },
    { k: "Best for", a: "Chat, gaming, collab editing", b: "Notifications, live feeds", c: "Fallback, simple updates" },
  ]},
  { t: "TCP vs UDP", c: "#ec4899", rows: [
    { k: "Reliability", a: "Guaranteed delivery + ordering", b: "No guarantees (fire and forget)" },
    { k: "Connection", a: "Connection-oriented (3-way handshake)", b: "Connectionless" },
    { k: "Speed", a: "Slower (overhead of ACKs)", b: "Faster (no overhead)" },
    { k: "Flow control", a: "Yes (congestion control)", b: "No (can overwhelm receiver)" },
    { k: "Best for", a: "HTTP, DB connections, file transfer", b: "Video streaming, gaming, DNS, VoIP" },
  ]},
  { t: "Pessimistic vs Optimistic Lock", c: "#f59e0b", rows: [
    { k: "Approach", a: "Lock row before reading", b: "Check version at write time" },
    { k: "SQL", a: "SELECT ... FOR UPDATE", b: "UPDATE ... WHERE version = X" },
    { k: "Contention", a: "Blocks other transactions", b: "Retry on conflict" },
    { k: "Performance", a: "Bad under high concurrency", b: "Good if conflicts are rare" },
    { k: "Best for", a: "High contention (seat booking)", b: "Low contention (profile updates)" },
  ]},
  { t: "Monolith vs Microservices", c: "#8b5cf6", rows: [
    { k: "Deployment", a: "One unit, all-or-nothing", b: "Independent per service" },
    { k: "Data", a: "Shared database", b: "Database per service" },
    { k: "Complexity", a: "Simple at start", b: "Distributed systems complexity" },
    { k: "Scaling", a: "Scale entire app together", b: "Scale each service independently" },
    { k: "Team size", a: "< 10 engineers", b: "> 50 engineers, multiple teams" },
    { k: "Start with", a: "Always (then extract services)", b: "After domain boundaries are clear" },
  ]},
  { t: "B-Tree vs LSM-Tree", c: "#10b981", rows: [
    { k: "Optimized for", a: "Reads (balanced tree)", b: "Writes (append-only + merge)" },
    { k: "Write speed", a: "Moderate (random I/O)", b: "Fast (sequential I/O)" },
    { k: "Read speed", a: "Fast (O(log N) direct)", b: "Slower (check multiple levels)" },
    { k: "Space", a: "More (fragmentation)", b: "Less (compaction)" },
    { k: "Used by", a: "PostgreSQL, MySQL (InnoDB)", b: "Cassandra, RocksDB, LevelDB" },
    { k: "Best for", a: "OLTP, read-heavy workloads", b: "Write-heavy, time-series, logs" },
  ]},
];

const RUBRIC = [
  { a: "Requirements", w: "15%", g: "Asks questions, defines NFRs", b: "Jumps to drawing" },
  { a: "HLD", w: "25%", g: "Clean architecture", b: "Missing components" },
  { a: "Data Model", w: "15%", g: "Justifies choice", b: "No reasoning" },
  { a: "Deep Dive", w: "20%", g: "2-3 deep, edge cases", b: "Surface only" },
  { a: "Trade-offs", w: "15%", g: "Discusses alternatives", b: "None" },
  { a: "Communication", w: "10%", g: "Clear, drives", b: "Rambling, silent" },
];

const BB = [
  { id: "bb1", n: "Client-Server & HTTP", cat: "Networking", i: "🌐", d: 1,
    desc: "The foundation of all web communication. A client (browser/app) sends a request to a server, which processes it and returns a response. Every system you design uses this pattern.",
    pts: [
      "DNS lookup: browser asks 'What IP is google.com?' → gets 142.250.80.46",
      "TCP 3-way handshake: SYN → SYN-ACK → ACK. Establishes reliable connection",
      "TLS/HTTPS: encrypts data in transit. TLS 1.3 = 1 round-trip (faster than 1.2)",
      "HTTP is stateless: each request is independent. Server doesn't remember previous requests",
      "HTTP methods: GET (read), POST (create), PUT (update), DELETE (remove), PATCH (partial update)",
      "Status codes: 200 OK, 201 Created, 301 Redirect, 400 Bad Request, 404 Not Found, 500 Server Error",
      "Headers carry metadata: Content-Type, Authorization, Cache-Control, Cookie"
    ],
    use: "Every single web application. This is the foundation of everything else you'll learn.",
    dont: "N/A — you always need this.",
    rw: "When you type google.com: DNS resolves IP → TCP connects → TLS encrypts → HTTP GET / → server returns HTML → browser renders. All in ~200ms." },

  { id: "bb2", n: "Load Balancer", cat: "Networking", i: "⚖️", d: 1,
    desc: "A load balancer sits between clients and servers, distributing incoming requests across multiple servers so no single server gets overwhelmed. It's how you go from 1 server to many.",
    pts: [
      "Round Robin: requests go to servers in order (1→2→3→1→2→3). Simple but ignores server load",
      "Least Connections: send to server with fewest active connections. Better for uneven requests",
      "L4 (Transport): routes by IP/port. Fast, no packet inspection. Good for TCP/UDP traffic",
      "L7 (Application): reads HTTP headers/URLs. Can route /api to backend, /images to CDN. Smarter but slower",
      "Health checks: LB pings servers every 5-10s. Unhealthy server removed from rotation automatically",
      "Sticky sessions: route same user to same server (via cookie). Needed if server holds session state",
      "Examples: AWS ALB (L7), NLB (L4), Nginx, HAProxy. Cloud LBs auto-scale"
    ],
    use: "Whenever you have more than 1 server. Mention in EVERY system design answer.",
    dont: "Single server prototypes. But even then, add it for future scaling.",
    rw: "Netflix uses AWS ELB to distribute millions of concurrent streams across thousands of servers. If one server crashes, LB routes traffic to healthy ones in <10 seconds." },

  { id: "bb3", n: "CDN", cat: "Networking", i: "📡", d: 1,
    desc: "A Content Delivery Network is a network of servers spread across the globe that cache your static content (images, videos, CSS, JS) close to users. Instead of fetching from your origin server 5000 miles away, users get content from an edge server 50 miles away.",
    pts: [
      "Reduces latency: 200ms cross-continent → 20ms from local edge. 10x faster",
      "Pull CDN: first request goes to origin, CDN caches it, subsequent requests served from edge",
      "Push CDN: you upload content directly to CDN. Better for large files you know will be popular",
      "Cache invalidation: hardest problem. Use versioned URLs (/style.v2.css) or purge API",
      "Edge servers in 200+ cities worldwide. CloudFlare has 300+ PoPs (Points of Presence)",
      "Handles DDoS: CDN absorbs attack traffic at edge, protecting your origin servers",
      "Cost: $0.01-0.08 per GB transferred. Much cheaper than serving from your own servers"
    ],
    use: "Images, videos, CSS, JS, fonts — any static content. Also API responses that don't change often.",
    dont: "Highly personalized dynamic content (user dashboards, real-time data). Though edge computing is changing this.",
    rw: "Netflix serves 95% of video traffic from its own CDN (Open Connect) — boxes placed inside ISPs. A video request in Mumbai is served from a server IN Mumbai, not from the US." },

  { id: "bb4", n: "DNS", cat: "Networking", i: "📖", d: 1,
    desc: "The Domain Name System is the phone book of the internet. It translates human-readable domain names (google.com) into IP addresses (142.250.80.46) that computers use to find each other.",
    pts: [
      "Hierarchical: Root (.) → TLD (.com) → Authoritative (google.com) → resolves to IP",
      "Caching at every level: browser cache (1 min) → OS cache → ISP resolver → recursive resolver",
      "TTL (Time To Live): how long a record is cached. Low TTL (60s) = fast updates but more DNS queries",
      "Record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (email), NS (nameserver), TXT (verification)",
      "DNS round-robin: return different IPs to different clients → simple load balancing",
      "GeoDNS: return closest server IP based on client location. Used by CDNs and global services",
      "Propagation delay: changing DNS records takes minutes to hours as caches expire worldwide"
    ],
    use: "Every internet request starts with DNS. Use GeoDNS for global traffic routing.",
    dont: "N/A — DNS is always involved.",
    rw: "When you visit amazon.com from India, DNS returns an IP for a server in Mumbai. From the US, it returns a Virginia IP. This is GeoDNS — same domain, different servers based on your location." },

  { id: "bb5", n: "API Gateway", cat: "Networking", i: "🚪", d: 2,
    desc: "A single entry point that sits in front of all your microservices. Instead of clients knowing about 20 different services, they talk to one gateway that routes requests, handles authentication, rate limiting, and more.",
    pts: [
      "Request routing: /users → User Service, /orders → Order Service, /search → Search Service",
      "Authentication: verify JWT tokens once at gateway, not in every service. Attach user info to request",
      "Rate limiting: block abusive clients before they hit your services. 1000 req/min per API key",
      "SSL termination: decrypt HTTPS at gateway, use plain HTTP internally (faster, simpler)",
      "Request/response transformation: convert external API format to internal, aggregate responses",
      "Circuit breaker: if a downstream service is failing, gateway returns cached/fallback response",
      "Analytics: log all requests for monitoring, billing, debugging. Single point of observability"
    ],
    use: "Microservices architecture. When you have 5+ services that clients need to access.",
    dont: "Simple monolith with one backend. Adds unnecessary latency and complexity.",
    rw: "Netflix Zuul handles 50B+ API requests daily. It routes requests to 1000+ microservices, handles auth, rate limiting, and canary deployments — all at the gateway level." },

  { id: "bb6", n: "SQL Databases", cat: "Storage", i: "🗄️", d: 1,
    desc: "Relational databases store data in tables with rows and columns, enforcing strict schemas and relationships. They guarantee ACID properties — meaning your data is always consistent. Use PostgreSQL or MySQL.",
    pts: [
      "ACID: Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent safety), Durability (survives crashes)",
      "Schema enforced: every row must match the table definition. Catches bugs early",
      "JOINs: combine data from multiple tables in one query. Very powerful for complex queries",
      "Indexes: B-tree index on a column makes lookups O(log N) instead of O(N). Critical for performance",
      "Transactions: BEGIN → multiple operations → COMMIT/ROLLBACK. All succeed or all fail",
      "Vertical scaling: add more CPU/RAM. Works up to ~1TB data, ~10K writes/sec on beefy hardware",
      "Hard to shard: JOINs across shards are expensive. This is the main limitation at massive scale"
    ],
    use: "User accounts, payments, orders, inventory — anything where data correctness matters more than raw speed.",
    dont: "Billions of simple key-value lookups, flexible schemas that change weekly, massive write throughput (>50K writes/sec).",
    rw: "Every bank uses SQL. If you transfer $100, the debit from your account and credit to theirs MUST both succeed or both fail. ACID guarantees this. PostgreSQL handles Stripe's payment data." },

  { id: "bb7", n: "NoSQL Databases", cat: "Storage", i: "📦", d: 2,
    desc: "Non-relational databases that sacrifice some SQL features (joins, ACID) for better scalability, flexibility, or performance. There are 4 main types, each suited for different use cases.",
    pts: [
      "Key-Value (Redis, DynamoDB): O(1) lookups by key. Like a giant hash map. Best for caching, sessions, config",
      "Document (MongoDB): stores JSON documents. Flexible schema — each document can have different fields. Good for catalogs, profiles",
      "Wide-Column (Cassandra, HBase): rows can have millions of columns. Excellent for time-series, activity feeds, IoT data. Handles millions of writes/sec",
      "Graph (Neo4j): nodes + edges. Query relationships naturally. 'Friends of friends who like X' in one query vs 10 SQL JOINs",
      "BASE instead of ACID: Basically Available, Soft state, Eventually consistent. Trade consistency for availability",
      "Horizontal scaling: add more nodes to handle more data/traffic. No single-machine ceiling",
      "No JOINs: denormalize data (store copies). Trades storage for read speed"
    ],
    use: "High write throughput, flexible schemas, horizontal scale, specific access patterns (KV, graph, time-series).",
    dont: "Complex queries with JOINs, financial transactions needing ACID, data where relationships matter and schema is stable.",
    rw: "Instagram uses Cassandra for likes/feeds (billions of writes/day). DynamoDB powers Amazon's cart (always available, even during outages). MongoDB stores Uber's city data (flexible schema per city)." },

  { id: "bb8", n: "Caching (Redis)", cat: "Storage", i: "⚡", d: 2,
    desc: "An in-memory data store that sits between your application and database. Since RAM is 100x faster than disk, caching frequently accessed data dramatically reduces latency and database load.",
    pts: [
      "Cache-aside: app checks cache first. Cache miss → read DB → store in cache. Most common pattern",
      "Write-through: write to cache AND DB together. Cache always fresh but slower writes",
      "Write-behind: write to cache only, async flush to DB later. Fast writes but risk data loss",
      "TTL (Time To Live): auto-expire entries after N seconds. Prevents serving stale data forever",
      "LRU eviction: when cache is full, remove Least Recently Used entries. Redis default policy",
      "Cache stampede: cache expires → 1000 concurrent requests all hit DB simultaneously. Fix: lock or pre-warm",
      "Redis data structures: Strings, Lists, Sets, Sorted Sets, Hashes, HyperLogLog — much more than simple KV"
    ],
    use: "Read-heavy workloads (10:1+ read:write ratio), hot data, session storage, leaderboards, rate limiting counters.",
    dont: "Write-heavy with no repeated reads, data that must always be 100% fresh, datasets larger than available RAM.",
    rw: "Twitter caches tweets from celebrities in Redis. When Elon tweets, 150M people read it. Without cache: 150M DB queries. With cache: 1 DB query + 150M RAM reads (1000x faster, $0.001 per read)." },

  { id: "bb9", n: "Message Queues", cat: "Async", i: "📬", d: 2,
    desc: "A system where producers send messages to a queue, and consumers process them later. This decouples services — the producer doesn't wait for the consumer to finish. Essential for handling traffic spikes and async workflows.",
    pts: [
      "Kafka: distributed log. Messages ordered within partition. Replayable. Millions of msgs/sec. Best for event streaming",
      "RabbitMQ: traditional message broker. Routing, priorities, dead letter queues. Best for task queues",
      "SQS: AWS managed queue. Zero ops. Good for simple producer-consumer. Auto-scales",
      "Decoupling: Service A sends message and moves on. Service B processes when ready. Neither needs to know about the other",
      "Buffering: Black Friday spike → 10x normal traffic. Queue absorbs the spike, consumers process at steady rate",
      "Retry & DLQ: if consumer fails, message goes back to queue. After N retries → Dead Letter Queue for debugging",
      "Ordering: Kafka guarantees order within a partition (key-based). Important for events that must be processed in sequence"
    ],
    use: "Async tasks (send email, process image, update feed), traffic spikes, service decoupling, event sourcing.",
    dont: "When you need a synchronous response (user is waiting for result). Use request-response instead.",
    rw: "When you post on Instagram: (1) save post to DB (sync), (2) send to Kafka → feed update worker, notification worker, analytics worker all consume independently. Your post appears instantly; feed updates happen in <1 second async." },

  { id: "bb10", n: "DB Replication", cat: "Storage", i: "📋", d: 2,
    desc: "Making copies of your database on multiple servers. The primary purpose is high availability (if one server dies, another takes over) and read scaling (distribute read queries across replicas).",
    pts: [
      "Leader-Follower: one leader handles writes, followers get copies and handle reads. Most common pattern",
      "Synchronous replication: leader waits until follower confirms write. Guarantees consistency but slower",
      "Asynchronous replication: leader writes and moves on. Follower catches up later. Faster but may serve stale data",
      "Replication lag: time between write on leader and it appearing on follower. Usually <1 second, but can spike",
      "Failover: leader dies → promote a follower to new leader. Automatic with tools like Patroni, RDS Multi-AZ",
      "Read replicas: 1 leader + 5 followers = 5x read capacity. Route reads to replicas, writes to leader",
      "Multi-region: replicas in different data centers for disaster recovery and lower latency for global users"
    ],
    use: "Any production database. Even with low traffic, replication gives you disaster recovery.",
    dont: "Development/testing environments where you don't need HA. Single-machine prototype.",
    rw: "AWS RDS Multi-AZ: your PostgreSQL has a standby replica in another data center. If the primary goes down, automatic failover in <60 seconds. Read replicas in 3 regions serve users worldwide with <50ms latency." },

  { id: "bb11", n: "DB Sharding", cat: "Storage", i: "🧩", d: 3,
    desc: "Splitting your database into multiple pieces (shards), each on its own server. Each shard holds a subset of the data. This is how you scale beyond what a single server can handle — but it adds significant complexity.",
    pts: [
      "Hash sharding: shard = hash(user_id) % N. Even distribution but range queries span all shards",
      "Range sharding: shard by date range or alphabetical. Good for range queries but can create hot shards",
      "Partition key choice is CRITICAL: pick the key you query by most. Wrong key = every query hits all shards",
      "Cross-shard queries: JOINs across shards are expensive (scatter-gather). Denormalize to avoid",
      "Hot shard problem: celebrity user's shard gets 100x more traffic. Fix: further split hot shards, or use consistent hashing",
      "Resharding: adding/removing shards requires rebalancing data. Use consistent hashing to minimize movement",
      "When to shard: LAST resort. First try: read replicas, caching, query optimization, vertical scaling"
    ],
    use: "When single DB exceeds ~1TB data or ~5K writes/sec and you've exhausted vertical scaling + replicas.",
    dont: "Prematurely. Sharding adds enormous complexity (cross-shard joins, transactions, migrations). Start with replicas.",
    rw: "Discord shards by guild_id — each shard handles ~10K guilds. Instagram shards by user_id. Vitess (YouTube) manages 1000s of MySQL shards transparently." },

  { id: "bb12", n: "Consistent Hashing", cat: "Distributed", i: "🎯", d: 3,
    desc: "A technique for distributing data across a variable number of nodes (servers) so that adding or removing a node only moves a small fraction of keys. Without it, adding 1 server would require moving almost ALL data.",
    pts: [
      "Hash ring: imagine a circle from 0 to 2^32. Both nodes and keys are hashed onto this ring",
      "Assignment: a key belongs to the first node clockwise from its position on the ring",
      "Adding a node: only keys between the new node and its predecessor need to move. ~1/N of total keys",
      "Without consistent hashing: hash(key) % N. Change N from 4 to 5 → ~80% of keys need to move!",
      "Virtual nodes: each physical server gets 100-200 positions on the ring. Prevents imbalance when servers have different capacities",
      "Replication: store key on the next R nodes clockwise. If one node dies, replicas still serve the data",
      "Used everywhere in distributed systems: it's the standard solution for dynamic partitioning"
    ],
    use: "Distributed caches (Memcached), partitioned databases (DynamoDB, Cassandra), CDN routing, load balancing.",
    dont: "Small fixed number of servers that never changes. Simple hash(key) % N works fine.",
    rw: "DynamoDB uses consistent hashing to distribute data across nodes. When Amazon adds capacity during Prime Day, only a small fraction of data moves — customers never notice." },

  { id: "bb13", n: "CAP Theorem", cat: "Theory", i: "📐", d: 2,
    desc: "In any distributed system, when a network partition happens (and it WILL), you must choose between Consistency (every read gets the most recent write) and Availability (every request gets a response). You cannot have both during a partition.",
    pts: [
      "Consistency: all nodes see the same data at the same time. Bank balance is always accurate",
      "Availability: every request receives a response (no errors, no timeouts). System always works",
      "Partition tolerance: system continues operating despite network failures between nodes. This ALWAYS happens",
      "CP (Consistent + Partition-tolerant): during partition, reject requests rather than serve stale data. Banks, inventory",
      "AP (Available + Partition-tolerant): during partition, serve possibly stale data rather than failing. Social feeds, DNS",
      "In practice: most systems are AP with tunable consistency. Strong consistency when needed, eventual when not",
      "NEVER say 'I pick CA': network partitions are inevitable in distributed systems. CA only works on single machine"
    ],
    use: "Every distributed system design decision. 'Should I use strong or eventual consistency here?'",
    dont: "Single-machine systems. CAP only applies to distributed systems with network between nodes.",
    rw: "Google Spanner (CP): globally consistent, uses GPS clocks + Paxos. During partition, it waits rather than serve stale data. DynamoDB (AP): always responds, even if replica hasn't caught up yet. Your Instagram feed might show a like count that's 2 seconds stale — and that's fine." },

  { id: "bb14", n: "Rate Limiting", cat: "Protection", i: "🚦", d: 2,
    desc: "Controlling how many requests a user/IP can make in a given time period. Protects your API from abuse, DDoS attacks, and runaway scripts. Returns HTTP 429 (Too Many Requests) when limit exceeded.",
    pts: [
      "Token Bucket: bucket holds N tokens, refills at R/sec. Each request takes 1 token. Allows short bursts. Most popular algorithm",
      "Sliding Window: count requests in a rolling time window. More accurate than fixed windows, prevents boundary spikes",
      "Fixed Window: count requests per minute/hour. Simple but allows 2x burst at window boundaries",
      "Key = user_id, API key, or IP address. Different limits per tier: free (100/hr), paid (10K/hr)",
      "Redis implementation: INCR key + EXPIRE. Atomic, shared across all API servers. Lua script for precision",
      "Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
      "Layered: API gateway (global) + per-service (local) + per-user (Redis). Defense in depth"
    ],
    use: "Every public API. Also useful internally to prevent cascade failures between microservices.",
    dont: "Trusted internal services on a private network where traffic is controlled. Though circuit breakers serve a similar purpose.",
    rw: "GitHub: 5000 requests/hour for authenticated users, 60/hour for anonymous. Stripe: 100 read req/sec, 100 write req/sec per API key. Hit the limit → 429 status with Retry-After header." },

  { id: "bb15", n: "Object Storage (S3)", cat: "Storage", i: "🗂️", d: 1,
    desc: "A storage service designed for large binary files: images, videos, documents, backups. Unlike databases, object storage is infinitely scalable, incredibly cheap, and designed for files that are written once and read many times.",
    pts: [
      "Key-value for files: upload with a key (path), download with the same key. No folders — paths are just strings",
      "Massively scalable: S3 stores trillions of objects. No capacity planning needed — just upload",
      "Durability: 99.999999999% (11 nines). S3 stores data across 3+ data centers. You will NEVER lose data",
      "Cheap: $0.023/GB/month for standard. $0.004/GB for infrequent access. Compare to SSD: $0.10/GB/month",
      "Immutable: files are replaced, not modified in place. Version everything for safety",
      "Presigned URLs: generate a temporary upload/download URL. Client uploads directly to S3, bypassing your server",
      "Lifecycle policies: automatically move old data to cheaper storage (Glacier) after 90 days. Archive after 1 year"
    ],
    use: "Images, videos, user uploads, backups, data lake files, static website hosting, ML training data.",
    dont: "Small structured data (use a database), data that changes frequently, data that needs complex queries.",
    rw: "Netflix stores ALL video content in S3 — petabytes of data. When you press play, the video is fetched from S3 → CDN → your device. Dropbox moved from S3 to their own storage at 500PB to save costs." },

  { id: "bb16", n: "Search (Elasticsearch)", cat: "Processing", i: "🔍", d: 2,
    desc: "A search engine that uses inverted indexes to find documents containing specific words in milliseconds, even across billions of documents. It's how Amazon finds products, GitHub searches code, and Netflix finds shows.",
    pts: [
      "Inverted index: maps each word → list of document IDs containing it. 'redis' → [doc5, doc12, doc89]",
      "TF-IDF/BM25: ranking algorithm. Words that appear frequently in a doc but rarely across all docs score higher",
      "Near real-time: new documents are searchable within ~1 second of indexing. Not instant, but close enough",
      "Analyzers: tokenize text (split words), lowercase, remove stop words, stem ('running' → 'run'). Language-aware",
      "Aggregations: faceted search (filter by brand, price range, rating). Also used for analytics dashboards",
      "Distributed: data split across shards. Each shard searched in parallel. Results merged. Scales horizontally",
      "Kibana + Logstash: ELK stack for log analysis. Ingest logs → search and visualize in real-time"
    ],
    use: "Full-text search, log analysis, product search, autocomplete, analytics. Anywhere users type a search query.",
    dont: "Primary database. No ACID. Not for simple key-value lookups (Redis is faster). Not for transactions.",
    rw: "Amazon product search: you type 'wireless headphones' → Elasticsearch checks inverted index across billions of products → returns ranked results with filters (brand, price, rating) in <100ms." },

  { id: "bb17", n: "WebSockets", cat: "Real-time", i: "🔌", d: 2,
    desc: "A protocol that creates a persistent, two-way connection between client and server. Unlike HTTP (request → response → close), WebSocket stays open so the server can push data to the client instantly without the client asking.",
    pts: [
      "Full-duplex: both client and server can send messages at any time. No request-response turns needed",
      "Upgrade from HTTP: starts as HTTP request, upgrades to WS. Same port (80/443). Firewall-friendly",
      "Lower overhead: after handshake, messages are just 2-6 bytes of framing. HTTP headers add ~500 bytes per request",
      "Server push: server sends updates instantly. No polling (wasteful) or long polling (hacky) needed",
      "Connection management: each WS = a TCP connection. Server must track all connections. 1M connections = significant RAM",
      "Scaling: use a pub/sub layer (Redis Pub/Sub) so messages published on any server reach the right client",
      "Alternatives: SSE (server→client only, simpler), Long Polling (HTTP-based, works everywhere)"
    ],
    use: "Chat (WhatsApp, Slack), live notifications, collaborative editing (Google Docs), gaming, live sports scores, stock tickers.",
    dont: "Regular CRUD APIs, request-response patterns, infrequent updates (use SSE or polling instead — simpler).",
    rw: "Slack uses WebSockets for real-time messaging. When someone posts in a channel, the server pushes the message to all connected clients instantly. 1M+ concurrent WS connections per Slack cluster." },

  { id: "bb18", n: "Microservices", cat: "Architecture", i: "🧱", d: 2,
    desc: "An architecture where your application is split into small, independent services, each responsible for one business capability. Each service has its own database, can be deployed independently, and communicates via APIs or message queues.",
    pts: [
      "Independent deployment: update User Service without touching Order Service. 10x faster release cycles",
      "Own database per service: User Service uses PostgreSQL, Search uses Elasticsearch, Cache uses Redis. Best tool for each job",
      "Communication: REST (simple), gRPC (fast, typed), message queues (async, decoupled). Usually a mix",
      "Team ownership: one team owns one service end-to-end. 'You build it, you run it' — Amazon's philosophy",
      "Scaling independently: Search Service needs 20 instances, Auth needs 2. Don't waste resources scaling everything equally",
      "Complexity cost: distributed transactions (saga pattern), service discovery, network failures, debugging across services",
      "Start monolith: build a monolith first, then extract services as you grow. Don't start with microservices"
    ],
    use: "Large organizations (50+ engineers), services with very different scaling/technology needs, when team independence is critical.",
    dont: "Small teams (<10 engineers), MVP/startup phase, when you're still figuring out your domain boundaries.",
    rw: "Netflix started as a monolith. As they grew to 1000+ engineers, they split into 1000+ microservices. Each team deploys independently, 100s of times per day. Amazon does the same — 'two-pizza teams' each owning a service." },

  { id: "bb19", n: "H vs V Scaling", cat: "Architecture", i: "📈", d: 1,
    desc: "Vertical scaling means getting a bigger machine (more CPU, RAM, SSD). Horizontal scaling means adding more machines. Most systems start vertical and go horizontal as they grow.",
    pts: [
      "Vertical (scale up): upgrade from 4 cores → 32 cores, 16GB RAM → 256GB RAM. Simple — no code changes needed",
      "Vertical ceiling: biggest machine is ~128 cores, 4TB RAM. Eventually you hit a wall. Also: single point of failure",
      "Horizontal (scale out): add more servers. 2 servers → 20 → 200. Theoretically infinite scaling",
      "Horizontal requirement: your app must be STATELESS. No storing sessions in memory. Use Redis/DB for state",
      "Database scaling: start vertical (bigger machine), then read replicas, then sharding. DB horizontal is harder than app horizontal",
      "Auto-scaling: cloud can add/remove servers based on CPU/traffic. 5 servers normally, 50 during Black Friday, back to 5 after",
      "Cost: vertical has diminishing returns (2x CPU ≠ 2x performance). Horizontal scales linearly but adds complexity"
    ],
    use: "Vertical first for databases and simple apps. Horizontal for web servers, stateless services, and anything beyond 1 machine's capacity.",
    dont: "Don't horizontally scale prematurely. It adds complexity (load balancing, distributed state, network latency). Scale vertically until you can't.",
    rw: "Dropbox started on a single server. At 500M users, they run hundreds of servers. Web servers scale horizontally (stateless). Database started vertical (big PostgreSQL), then replicas, then sharded." },

  { id: "bb20", n: "Consensus (Raft)", cat: "Theory", i: "🗳️", d: 3,
    desc: "How do multiple servers agree on something (who is the leader? what is the latest value?) when network is unreliable and servers can crash? Raft is the most understandable algorithm for this — it's used by etcd, Consul, and CockroachDB.",
    pts: [
      "Problem: 5 servers must agree on a value. Network can drop messages. Servers can crash. How?",
      "Leader election: one node is leader, others are followers. Leader dies → followers start election using random timeouts",
      "Quorum (majority): need N/2 + 1 nodes to agree. 3 nodes → need 2. 5 nodes → need 3. Survives minority failures",
      "Log replication: leader receives writes, appends to log, replicates to followers. Committed when majority confirms",
      "Split brain: network partition creates two groups, each might elect a leader. Quorum prevents this — only majority side can commit",
      "Raft vs Paxos: Raft designed to be understandable. Same guarantees, clearer implementation. Industry standard now",
      "When nodes disagree: Raft guarantees that if a value is committed, ALL future leaders will have it. Safety property"
    ],
    use: "Leader election in distributed databases, distributed locks (Chubby/ZooKeeper), configuration management (etcd), metadata consensus.",
    dont: "Data replication at scale (too slow for high-throughput). Not for user-facing requests directly. Used for control plane, not data plane.",
    rw: "When a Kafka broker dies, ZooKeeper (Paxos-based) elects a new partition leader in <10 seconds. etcd (Raft-based) stores Kubernetes cluster state — every pod, service, config. CockroachDB uses Raft for every data range." },
];

const WEEKS = [
  { w: 1, t: "Foundations", e: "🌐", c: "#f59e0b", items: ["bb1","bb4","bb19","bb15"], type: "b", f: "Request flow browser to server.", tip: "Draw the HTTP request path." },
  { w: 2, t: "Scaling Layer", e: "⚡", c: "#06b6d4", items: ["bb2","bb3","bb8","bb14"], type: "b", f: "LB + CDN + Cache + Rate Limit.", tip: "Mention at least 2 in any answer." },
  { w: 3, t: "Data Layer", e: "🗄️", c: "#10b981", items: ["bb6","bb7","bb10","bb11"], type: "b", f: "Choose and scale databases.", tip: "Trade-off reasoning, not one answer." },
  { w: 4, t: "Distributed Systems", e: "📐", c: "#8b5cf6", items: ["bb13","bb12","bb20","bb5"], type: "b", f: "CAP, consistent hashing, consensus.", tip: "WHEN to choose CP vs AP, WHY." },
  { w: 5, t: "Communication", e: "📬", c: "#ec4899", items: ["bb9","bb17","bb16","bb18"], type: "b", f: "Queues, WS, Search, Microservices.", tip: "Real-time -> WS. Async -> Queue." },
  { w: 6, t: "Framework + Easy", e: "🎯", c: "#f59e0b", items: ["sd1","sd2","sd3","sd4","sd5","sd6"], type: "p", f: "Learn RESHADED. Talk out loud.", tip: "Silence = red flag." },
  { w: 7, t: "Core FAANG Problems", e: "🏗️", c: "#3b82f6", items: ["sd7","sd8","sd9","sd10","sd11","sd12","sd13","sd14"], type: "p", f: "These 8 cover 80% of interviews.", tip: "What if 10x traffic? DB dies?" },
  { w: 8, t: "Hard + Advanced", e: "🏆", c: "#ef4444", items: ["sd15","sd16","sd17","sd18","sd19","sd20","sd21","sd22","sd23","sd24","sd25","sd26","sd27","sd28","sd29","sd30"], type: "p", f: "Senior + 2026 topics.", tip: "Monitoring, failures, cost, security." },
];

const P = [
  { id: "sd1", n: "URL Shortener", d: "Easy", tags: ["Google","Amazon"], v: "https://www.youtube.com/watch?v=fMZMm_0ZhK4", s: ["Req: shorten URL, redirect, analytics, custom aliases, expiration","Est: 100M URLs/mo → 40 writes/sec, 400 reads/sec (10:1). 500B/URL → 50GB/yr","API: POST /api/shorten {long_url, custom_alias?, expires_at?} → {short_url}. GET /{code} → 301 redirect","HLD: Client → LB → App Server → PostgreSQL + Redis cache. CDN for popular redirects","Data: urls(id BIGINT PK, code VARCHAR(7) UNIQUE, long_url TEXT, click_count, created_at). Base62(id) = code","Deep: Base62 vs MD5 (collision-free vs truncation risk). Cache-aside with 24h TTL. 301 (cacheable) vs 302 (trackable)","Trade-off: Counter-based ID (unique but predictable) vs Random hash (unpredictable but collision check needed)","Scale: Read replicas for redirects. Shard by code hash. CDN for popular URLs. Kafka → analytics pipeline for clicks"] },
  { id: "sd2", n: "Rate Limiter", d: "Easy", tags: ["Amazon","Google"], v: "https://www.youtube.com/watch?v=FU4WlwfS3G0", s: ["Req: limit by user/IP/API key, sub-ms latency, distributed, configurable rules per tier","Est: 1M active users × 10 req/min = 167K checks/sec. Redis handles easily","API: Middleware intercepts all requests. Returns 429 + Retry-After header when limit exceeded","HLD: API Gateway → Redis (INCR + EXPIRE). Multiple rules: 100/min/user AND 1000/hr/user","Data: Redis key = rate_limit:{user_id}:{window}. TTL = window size. Lua script for atomic INCR + check","Deep: Token Bucket (allows bursts) vs Sliding Window (smooth) vs Fixed Window (simple but boundary spike)","Trade-off: Central Redis (exact but adds latency) vs Local counters + sync (fast but slightly over-limit)","Scale: Redis Cluster for HA. Rate limit rules in config service. Response headers: X-RateLimit-Remaining"] },
  { id: "sd3", n: "Pastebin", d: "Easy", tags: ["Amazon"], v: "https://www.youtube.com/watch?v=josjRSBqEBI", s: ["Req: create paste (10MB max), read by URL, set expiration (1hr/1day/never), syntax highlighting","Est: 5M pastes/day → 60 writes/sec. Avg 10KB → 50GB/day. Read:write = 5:1 → 300 reads/sec","API: POST /api/paste {content, language, expires_in} → {url, key}. GET /api/paste/{key} → {content}","HLD: Client → LB → App Server → Metadata DB (PostgreSQL) + Content Store (S3). CDN for popular pastes","Data: pastes(id, key VARCHAR(8), user_id, title, language, s3_path, size, expires_at, created_at)","Deep: S3 for content (cheap, scalable). Cleanup: cron job deletes expired. CDN cache for viral pastes","Trade-off: DB BLOB vs S3 (DB simpler for <1MB; S3 cheaper and scalable for large content)"] },
  { id: "sd4", n: "Key-Value Store", d: "Easy", tags: ["Amazon","Google"], v: "https://www.youtube.com/watch?v=rnZmdmlR-2M", s: ["Req: put(key, value), get(key), delete(key). HA, partition-tolerant, tunable consistency","Est: 10M operations/day. Sub-ms reads. Data replication across 3 nodes. 99.99% availability","HLD: Client → Coordinator Node → finds responsible nodes via consistent hashing → replicas","Data: Consistent hash ring with virtual nodes. Each node stores a range of keys. Replicate to N=3 clockwise nodes","Deep: Quorum: W=2, R=2, N=3 (strong). W=1, R=1 (fast, eventual). Vector clocks for conflict detection","Trade-off: Strong consistency (W+R>N, slower writes) vs Eventual (W=1, fast but stale reads possible)","Scale: Add nodes → consistent hashing moves ~1/N keys. Anti-entropy with Merkle trees. Gossip protocol for membership"] },
  { id: "sd5", n: "Notification Service", d: "Easy", tags: ["Amazon","Meta"], v: "https://www.youtube.com/watch?v=bBTPZ9NdSk8", s: ["Req: push (APNS/FCM), email (SES), SMS (Twilio). User preferences. Priority levels. Templates","Est: 1B notifications/day → 12K/sec. Partition Kafka by user_id. 50 consumer instances","API: POST /api/notify {user_id, type, channel, template_id, variables}. Internal API for services","HLD: Producer Services → Kafka (priority topics: high/medium/low) → Channel Workers → Providers","Data: notifications(id, user_id, type, channel, status, template_id, sent_at). Preferences per user in cache","Deep: At-least-once delivery with dedup by notification_id. Retry with exponential backoff. Dead letter queue","Trade-off: At-least-once (dedup needed but no lost alerts) vs Exactly-once (complex, Kafka transactions)","Scale: Batch sends (SES: 50/call). Rate limit per channel (APNS limits). User quiet hours. Template caching"] },
  { id: "sd6", n: "Web Crawler", d: "Easy", tags: ["Google"], v: "https://www.youtube.com/watch?v=BKZxZwUgL3Y", s: ["Req: crawl billions of pages, dedup, respect robots.txt, politeness (1 req/sec per domain)","Est: 1B pages/month → ~400 pages/sec. Avg page 100KB → 40MB/sec bandwidth. 100TB storage/month","HLD: URL Frontier (priority queue) → Fetcher workers → HTML Parser → Content Store + URL Extractor → Frontier","Data: URLs in frontier DB (priority, last_crawled, domain). Content in S3. Bloom filter for URL dedup","Deep: Bloom filter: O(1) membership check, 1% false positive OK (re-crawl is cheap). BFS for breadth first","Trade-off: BFS (discovers more domains, better for discovery) vs DFS (deeper into one site, better for specific scraping)","Scale: Distribute by domain hash. DNS cache. Politeness: per-domain rate limiter. Checkpointing for crash recovery"] },
  { id: "sd7", n: "Twitter / X", d: "Medium", tags: ["Meta","Google"], v: "https://www.youtube.com/watch?v=wYk0xPP_P_8", s: ["Req: post tweet, follow/unfollow, news feed, search, trending topics, likes, retweets","Est: 200M DAU × 5 reads/day = 1B reads → 12K QPS. 500K tweets/day. Fan-out: 6/sec × 200 followers = 1.2K Redis writes/sec","API: POST /tweet {content, media}. GET /feed?cursor=X. POST /follow/{user_id}. GET /search?q=X","HLD: Tweet Service (Cassandra) → Kafka → Fan-out Service → Feed Cache (Redis). Search Service (Elasticsearch)","Data: tweets in Cassandra (user_id partition). Feed in Redis sorted sets (ZADD by timestamp). Users in PostgreSQL","Deep: Hybrid fan-out: push for <10K followers, pull for celebrities (merge on read). Trending: sliding window count in Redis","Trade-off: Fan-out on write (fast reads, expensive writes for celebrities) vs Fan-out on read (cheap writes, slow reads)","Scale: Shard feeds by user_id. Elasticsearch for search. CDN for media. Kafka decouples tweet creation from feed update"] },
  { id: "sd8", n: "Instagram", d: "Medium", tags: ["Meta","Amazon"], v: "https://www.youtube.com/watch?v=VJpfO6KdyWE", s: ["Req: upload photo/video, news feed, stories (24h TTL), likes, comments, explore/discover, hashtags","Est: 500M DAU, 100M photos/day × 500KB = 50TB/day raw. Thumbnails 3x. 5 years = 270PB. CDN absorbs 95% reads","API: POST /upload (presigned URL to S3). GET /feed?cursor=X. POST /like/{post_id}. GET /explore","HLD: Upload → S3 (presigned URL) → Transcode Workers → CDN. Feed Service → Redis. Explore → ML Rec Engine","Data: Posts in Cassandra. Users in PostgreSQL. Likes in Cassandra (write-heavy). Feed in Redis sorted sets. Search in ES","Deep: Presigned URL bypasses app server for upload. Async thumbnail generation. Stories: separate Redis list with 24h TTL","Trade-off: Sync upload (simple but slow) vs Async with presigned URL (fast, app server not bottleneck)","Scale: Shard by user_id. CDN for all media. Cassandra for likes (500M+/day). ML recommendations precomputed hourly"] },
  { id: "sd9", n: "WhatsApp", d: "Medium", tags: ["Meta","Google"], v: "https://www.youtube.com/watch?v=vvhC64hQZMk", s: ["Req: 1:1 chat, group chat (1024 members), read receipts, typing indicators, presence, media sharing, E2E encryption","Est: 2B users, 100B msg/day → 1.2M msg/sec. Avg 100B/msg → 10TB/day. 30-day retention = 300TB","API: WebSocket: send_message, typing, read_receipt. REST: GET /conversations, GET /messages/{conv_id}?before=X","HLD: Client ↔ WS Gateway ↔ Chat Service → Cassandra (messages). Presence Service (Redis). Group Service","Data: messages(conv_id PARTITION KEY, msg_id TIMEUUID, sender_id, encrypted_body BLOB, status). Cassandra","Deep: Signal Protocol for E2E encryption. Offline: store in Cassandra, push on reconnect. Media: encrypt client-side → S3","Trade-off: WebSocket (instant, bidirectional) vs Long Polling (simpler, works everywhere but higher latency)","Scale: WS gateways handle 500K connections each. Route by user_id. Redis pub/sub for cross-gateway messaging"] },
  { id: "sd10", n: "YouTube", d: "Medium", tags: ["Google","Netflix"], v: "https://www.youtube.com/watch?v=jPKTo1iGQiE", s: ["Req: upload video, stream (adaptive bitrate), search, recommendations, comments, likes, subscriptions","Est: 500 hrs uploaded/min → 250GB/min. 1B views/day. 5min avg = 3.5GB/sec. CDN handles 95%. 18+ transcode variants","API: POST /upload (resumable, presigned URL). GET /video/{id}/manifest.m3u8. GET /search?q=X. GET /feed","HLD: Upload → Raw S3 → Transcode (H.264/VP9/AV1 × 6 resolutions) → CDN. Metadata in PostgreSQL. Search in ES","Data: videos(id, user_id, title, status, s3_path, duration, view_count). Metadata in PostgreSQL. Comments tree in DB","Deep: HLS/DASH: video split into 2-10s chunks, manifest lists quality levels. Client switches quality adaptively","Trade-off: Transcode all formats upfront (slow upload, fast serve) vs On-demand transcode (fast upload, cold start)","Scale: CDN edge caching for popular videos. Parallel encoding workers. Content ID fingerprinting for copyright"] },
  { id: "sd11", n: "Uber / Lyft", d: "Medium", tags: ["Uber","Google"], v: "https://www.youtube.com/watch?v=umWABit-wbk", s: ["Req: request ride, match driver, real-time tracking, ETA, surge pricing, payments, ratings","Est: 20M rides/day. 5M concurrent drivers. Location: 5M × 1/3s = 1.7M writes/sec. 20M payments/day","API: POST /ride/request {pickup, dropoff}. WS for live tracking. GET /ride/{id}/status. POST /ride/{id}/rate","HLD: Ride Service → Matching Service (GEORADIUS) → Location Service (Redis GEO) → Payment. All events to Kafka","Data: rides(id, rider_id, driver_id, status, pickup, dropoff, fare, surge). Driver locations in Redis GEO (GEOADD)","Deep: GeoHash: nearby coords share prefix → fast range queries. Matching: K nearest, score by distance+ETA+rating","Trade-off: GeoHash (simple, Redis native) vs QuadTree (dynamic resolution, better for uneven density)","Scale: Partition Redis GEO by city. ETA: contraction hierarchies (pre-computed). Surge per GeoHash cell"] },
  { id: "sd12", n: "Google Drive", d: "Medium", tags: ["Google","Amazon"], v: "https://www.youtube.com/watch?v=U0xTu6E2CT8", s: ["Req: upload/download files, sync across devices, share with permissions, version history, offline support","Est: 500M users × 200 files × 500KB = 50PB total. 10M syncs/day. Delta sync saves 70% bandwidth","API: POST /upload (resumable, chunked). GET /download/{file_id}. POST /share/{file_id} {user, permission}","HLD: Client → Sync Service → Metadata DB (PostgreSQL) + Block Store (S3). Notification Service (WS)","Data: files(id, user_id, name, path, size, version, s3_keys[], updated_at). Chunks: SHA256 hash = key","Deep: 4MB chunks. Change 1 byte in 1GB → upload 1 chunk. Dedup by content hash (SHA256). Delta sync","Trade-off: Large chunks (fewer requests, more re-upload) vs Small chunks (more requests, less re-upload)","Scale: Dedup saves 30-50% storage. WS for real-time sync notifications. Conflict: create '(conflicted copy)' file"] },
  { id: "sd13", n: "Autocomplete", d: "Medium", tags: ["Google","Amazon"], v: "https://www.youtube.com/watch?v=us0qySiUsGU", s: ["Req: top 5 suggestions as user types, <100ms latency, personalized + trending, typo tolerance","Est: 10M searches/day. Trie with 10M terms. Each keystroke = 1 query → 100M+ autocomplete queries/day","API: GET /autocomplete?q=sys&limit=5 → [{term: 'system design', score: 9500}, ...]","HLD: CDN (cache popular prefixes) → Autocomplete Service → Trie (in-memory). Offline: MapReduce rebuilds trie hourly","Data: Trie node stores top-K terms at each prefix. Rebuilt from query logs (MapReduce → sorted term frequencies)","Deep: Each trie node pre-computes top-5 results. Lookup = O(prefix length). Fuzzy: edit distance for typo correction","Trade-off: Trie (fast prefix lookup, memory-heavy) vs Inverted index (disk-based, slower but handles more terms)","Scale: CDN caches top 1000 prefixes. Shard trie by first 2 chars. Rebuild weekly, update popular terms daily"] },
  { id: "sd14", n: "Ticket Booking", d: "Medium", tags: ["Amazon"], v: "https://www.youtube.com/watch?v=lBAwJgoSJ2k", s: ["Req: browse events, view seats, select+reserve, pay within 10 min timeout, prevent double-booking","Est: 10K events, 100K seats/event. Peak: 50K concurrent users for popular events. 1M bookings/day","API: GET /events/{id}/seats. POST /reserve {seat_ids} → {reservation_id, expires_in: 600}. POST /pay {reservation_id}","HLD: Event Service → Seat Service (lock) → Reservation (TTL 10 min) → Payment Service. Redis for seat locks","Data: seats(event_id, seat_id, status ENUM(available, reserved, sold), reservation_id, reserved_until)","Deep: Pessimistic lock: SELECT FOR UPDATE on seat row. Optimistic: version column, retry on conflict. Redis TTL for reservation expiry","Trade-off: Pessimistic (simple, guaranteed but contention under load) vs Optimistic (no lock, faster but retry storms)","Scale: Shard by event_id. Redis distributed lock for hot events. Cron releases expired reservations. Queue for fairness"] },
  { id: "sd15", n: "Google Docs", d: "Hard", tags: ["Google","Meta"], v: "https://www.youtube.com/watch?v=2auwirNBvGg", s: ["Req: real-time collaborative editing, cursor sync, comments, version history, permissions (view/edit/comment)","Est: 100M docs, 10M concurrent editors. 2 ops/sec/user = 20M ops/sec. Op ~100B. Op log: 170TB/day (compact via snapshots)","API: WebSocket: {op: 'insert', pos: 5, char: 'a'}. REST: GET /doc/{id}. POST /doc (create). PUT /doc/{id}/share","HLD: Client ↔ WS Hub (per doc room) → OT Engine → Doc Store (PostgreSQL). Op Log (append-only). Snapshot every N ops","Data: docs(id, title, owner, content_snapshot, version). op_log(doc_id, version, op_type, position, chars, user_id, timestamp)","Deep: OT: transform concurrent ops to converge. Insert@5 + Delete@3 → adjust insert to @4. Cursors as ephemeral WS state","Trade-off: OT (simpler, needs central server) vs CRDT (peer-to-peer, no server, but complex and larger metadata)","Scale: Partition by doc_id. Snapshot every 1000 ops for fast loading. Offline: queue ops locally, merge on reconnect via OT"] },
  { id: "sd16", n: "Payment (Stripe)", d: "Hard", tags: ["Amazon","Google"], v: "https://www.youtube.com/watch?v=olfaBgJrUBI", s: ["Req: process payments, handle refunds, fraud detection, PCI compliance, idempotency, ledger/audit trail","Est: 10M transactions/day → 115/sec. $1B+ daily volume. 99.99% availability. Zero data loss","API: POST /pay {amount, currency, method, idempotency_key}. POST /refund {payment_id, amount}. GET /ledger","HLD: API Gateway → Payment Service → Payment Processor (Stripe/Adyen). Ledger Service. Fraud ML Service","Data: payments(id, idempotency_key UNIQUE, amount, currency, status, processor_ref, created_at). Double-entry ledger table","Deep: Idempotency: client sends same key → server returns cached result (no double charge). Saga: reserve → charge → confirm. Compensate on failure","Trade-off: Sync payment (simple but slow, timeout risk) vs Async (webhook callback, complex but reliable)","Scale: Idempotency key in Redis (fast dedup). Ledger in PostgreSQL (ACID). Event sourcing for audit trail. PCI: tokenize cards"] },
  { id: "sd17", n: "Search Engine", d: "Hard", tags: ["Google"], v: "https://www.youtube.com/watch?v=CeGtqYdA-Cg", s: ["Req: index billions of pages, full-text search <500ms, relevance ranking, spell correction, featured snippets","Est: 10B pages × 100KB = 1PB raw. Inverted index: 100TB. 10K queries/sec. 99.9% < 500ms","HLD: Web Crawler → Document Processor → Indexer (inverted index) → Query Service (parse + rank + paginate)","Data: Inverted index: term → [(doc_id, position, tf)...]. Document store: doc_id → {title, url, snippet, pagerank}","Deep: PageRank: importance = sum(linking pages' ranks / outgoing links). TF-IDF: term frequency × inverse document frequency","Trade-off: Index freshness (re-crawl often, expensive) vs Cost (crawl less, stale results). Tiered: hot pages hourly, cold weekly","Scale: Shard index by term hash. Each shard replicated 3x. Scatter-gather query: hit all shards in parallel, merge top-K results"] },
  { id: "sd18", n: "Distributed Cache", d: "Hard", tags: ["Amazon","Google"], v: "https://www.youtube.com/watch?v=iuqZvajTOyA", s: ["Req: sub-ms reads, HA, consistent hashing, eviction (LRU/LFU), hot key handling, cache warming","Est: 100M keys × 1KB avg = 100GB. 1M reads/sec, 100K writes/sec. 99.99% availability","HLD: Client → Hash ring → Cache Node. Replicate to N=3. Failover: promote replica. Consistent hashing for routing","Data: In-memory hash table per node. LRU doubly-linked list for eviction. Consistent hash ring for key → node mapping","Deep: Hot key: replicate to multiple nodes (scatter reads). Cache stampede: lock + single-flight (one caller fills, others wait)","Trade-off: LRU (simple, good for recency) vs LFU (keeps frequently accessed, better hit rate but more memory overhead)","Scale: Add nodes with consistent hashing (move ~1/N keys). Memory-tiered: hot in RAM, warm on SSD. Monitoring: hit rate, latency p99"] },
  { id: "sd19", n: "Google Maps", d: "Hard", tags: ["Google","Uber"], v: "https://www.youtube.com/watch?v=jk3yvVfNvds", s: ["Req: render map tiles, turn-by-turn navigation, real-time traffic, search places, ETA calculation","Est: 1B map loads/day. 50M nav sessions/day. 256×256 tiles × 20 zoom levels. Traffic data from 1B devices","API: GET /tile/{z}/{x}/{y}.png. POST /directions {origin, destination} → {route, steps, eta}. GET /search?q=X","HLD: Tile Server (CDN + S3) → Routing Engine (contraction hierarchies) → Traffic Service (real-time from devices)","Data: Tiles pre-rendered at each zoom level in S3. Road graph: nodes (intersections) + edges (roads + weight). Traffic overlays","Deep: Contraction hierarchies: pre-process shortcuts in road graph. A* too slow for continent-scale. CH: <10ms for any route","Trade-off: Pre-rendered raster tiles (fast serve, huge storage) vs Vector tiles (smaller, render client-side, more CPU on device)","Scale: CDN caches 95% of tile requests. Road graph partitioned by region. Traffic: stream from devices → aggregate per road segment"] },
  { id: "sd20", n: "Spotify", d: "Hard", tags: ["Spotify"], v: "https://www.youtube.com/watch?v=_K-eupuDVEc", s: ["Req: stream audio, create playlists, search, personalized recommendations (Discover Weekly), offline download","Est: 500M users, 200M DAU. 50M songs × 5MB = 250TB. 10M concurrent streams. Peak: 200Gbps bandwidth","API: GET /stream/{song_id}?quality=high. GET /recommendations. POST /playlist {name, song_ids}. GET /search?q=X","HLD: Audio files in S3 → CDN (edge cache). Metadata in PostgreSQL. Search in Elasticsearch. Rec Engine (ML pipeline)","Data: songs(id, title, artist_id, album_id, duration, s3_path, genre). playlists(id, user_id, songs[]). listening_history for ML","Deep: Adaptive quality: 96/160/320 kbps. Buffer 30s ahead. Collaborative filtering + content-based for recommendations","Trade-off: Pre-cache next songs (smooth playback, wastes bandwidth) vs On-demand (saves bandwidth, risk of buffering)","Scale: CDN caches top 10K songs (covers 80% of streams). Shard by user for playlists. Rec engine: batch daily + real-time updates"] },
  { id: "sd21", n: "Amazon E-Commerce", d: "Hard", tags: ["Amazon"], v: "https://www.youtube.com/watch?v=EpASu_1dUdE", s: ["Req: product catalog, search, cart, checkout, order tracking, inventory management, reviews, seller portal","Est: 300M products. 100M DAU. 1M orders/day. Peak (Prime Day): 10x normal. Cart must never lose items","API: GET /products?q=X. POST /cart/add {product_id, qty}. POST /checkout → {order_id}. GET /order/{id}","HLD: Product Service → Search (ES) → Cart (DynamoDB) → Order Service → Inventory → Payment. All connected via Kafka","Data: Products in PostgreSQL + ES index. Cart in DynamoDB (always available AP). Orders in PostgreSQL (ACID). Inventory with row locks","Deep: Inventory: SELECT FOR UPDATE to prevent oversell. Saga: create order → reserve inventory → charge payment → confirm","Trade-off: Strong consistency for inventory (no oversell, contention) vs Eventual (fast but risk oversell, compensate with backorder)","Scale: Cart in DynamoDB (survived real AWS outages — AP design). Elasticsearch for search. CDN for product images. Event-driven with Kafka"] },
  { id: "sd22", n: "Food Delivery", d: "Hard", tags: ["Uber","Amazon"], v: "https://www.youtube.com/watch?v=iRhSAR3ldTw", s: ["Req: browse restaurants, order food, match delivery driver, real-time tracking, ETA, ratings, promotions","Est: 5M orders/day. 500K concurrent drivers. ETA accuracy: ±3 min. Order lifecycle: 30-60 min average","API: GET /restaurants?lat=X&lng=Y. POST /order {restaurant_id, items}. WS for tracking. GET /order/{id}/status","HLD: Restaurant Service → Order Service → Matching Service (assign driver) → Tracking (WS + Redis GEO). Payment","Data: orders(id, user_id, restaurant_id, driver_id, status, items JSON, total, estimated_delivery). Driver location in Redis GEO","Deep: Multi-objective matching: minimize (driver distance + food prep time). Batch matching every 30s for better global optimum","Trade-off: Immediate dispatch (lower wait, suboptimal match) vs Batch matching (better matches, slightly longer wait)","Scale: Partition by city. Redis GEO for driver location. Kafka for order state machine events. ML for ETA prediction"] },
  { id: "sd23", n: "Reddit", d: "Medium", tags: ["Amazon"], v: "https://www.youtube.com/watch?v=KYExYE_9nIY", s: ["Req: subreddits, posts, nested comments (tree), upvote/downvote, hot/top/new ranking, moderation","Est: 50M DAU. 100K posts/day. 1M comments/day. 10M votes/day. Comment trees up to 10 levels deep","API: POST /r/{sub}/post {title, content}. POST /comment {post_id, parent_id, content}. POST /vote {target, direction}","HLD: Post Service → Comment Service (tree) → Vote Service (Redis counters) → Ranking Service. Search in Elasticsearch","Data: posts(id, sub_id, user_id, title, body, score, created_at). comments(id, post_id, parent_id, depth, body, score)","Deep: Comment tree: adjacency list (parent_id). Fetch: recursive CTE or flatten with (post_id, path) materialized","Trade-off: Real-time ranking (expensive, always fresh) vs Periodic recalculation (cheaper, slightly stale — Reddit uses this)","Scale: Hot ranking: score = log(votes) + age_bonus. Precompute top posts per subreddit hourly. Shard by subreddit_id"] },
  { id: "sd24", n: "TikTok", d: "Hard", tags: ["Meta","Google"], v: "https://www.youtube.com/watch?v=07BVxmVFDGY", s: ["Req: upload short videos, For You feed (algorithmic), following feed, comments, likes, duets, trending sounds","Est: 1B DAU. 1M videos uploaded/day × 20MB = 20TB/day. For You: each swipe = 1 rec query → billions/day","API: POST /upload (resumable). GET /feed/foryou?cursor=X. GET /feed/following?cursor=X. POST /like/{video_id}","HLD: Upload → Transcode (multiple resolutions) → S3 + CDN. Rec Engine (2-stage: retrieval + ranking). Feed Service","Data: videos(id, user_id, s3_path, caption, sound_id, duration, view_count). User interactions logged to Kafka for ML","Deep: Explore vs Exploit: 90% recommended by ML model, 10% random/new creators (ensures discovery). Real-time feature updates","Trade-off: Pre-compute feed (fast serve, stale) vs Real-time ranking (fresh, expensive compute per request)","Scale: CDN for video (95% cache hit). Rec model: candidate gen (1000s) → ranking (top 10). GPU inference for ranking"] },
  { id: "sd25", n: "Distributed Lock", d: "Hard", tags: ["Google","Amazon"], v: "https://www.youtube.com/watch?v=v7x75aN9liM", s: ["Req: mutual exclusion across distributed nodes, TTL (auto-release), reentrant, fairness, high availability","Est: 100K lock acquisitions/sec. Lock hold time: 5-30s typical. Must survive node failures","API: POST /lock/acquire {resource_id, ttl_ms, owner_id} → {lock_token}. POST /lock/release {resource_id, lock_token}","HLD: Lock Service backed by Raft consensus (etcd/ZooKeeper) OR Redis (Redlock). Client → Lock Service → consensus","Data: locks(resource_id, owner_id, lock_token, expires_at). In ZK: ephemeral nodes. In Redis: SET NX EX","Deep: Redlock: acquire lock on N/2+1 Redis instances independently. Fencing tokens: monotonic counter prevents stale locks","Trade-off: Redis Redlock (faster, simpler, but not 100% safe under clock drift) vs ZooKeeper/etcd (slower but Raft-guaranteed)","Scale: Partition lock space by resource_id prefix. Watch/wait queue for fairness (ZK sequential nodes). Monitor lock hold times"] },
  { id: "sd26", n: "Slack", d: "Hard", tags: ["Amazon","Meta"], v: "https://www.youtube.com/watch?v=Mxqbkp-eGII", s: ["Req: channels, DMs, threads, message search, file sharing, @mentions, reactions, presence, notifications","Est: 20M DAU. 1M channels. 5B messages/day → 60K msg/sec. Message search across full history","API: WebSocket: send_message, typing, presence. REST: GET /channels/{id}/messages?before=X. GET /search?q=X","HLD: WS Gateway → Message Service → Cassandra (messages). Search Service (Elasticsearch). Presence (Redis). File → S3","Data: messages(channel_id PARTITION, msg_id TIMEUUID, user_id, content, thread_id, reactions JSON). Channel members in PostgreSQL","Deep: Pub/Sub: message sent → broadcast to all WS connections in channel. Cross-server: Redis pub/sub between WS gateways","Trade-off: Full message history (expensive storage, powerful search) vs Limited window (cheaper, lose old context)","Scale: Shard messages by channel_id. Elasticsearch indexes text for search. WS gateways handle 500K connections each"] },
  { id: "sd27", n: "Airbnb", d: "Hard", tags: ["Amazon","Google"], v: "https://www.youtube.com/watch?v=YyOXt2MEkv4", s: ["Req: search listings (location, dates, price, amenities), book with availability calendar, reviews, messaging, payments","Est: 7M listings. 1M bookings/day. Search: 50M queries/day. Calendar: check availability across date ranges","API: GET /search?location=X&checkin=X&checkout=X&guests=N. POST /book {listing_id, dates}. GET /listing/{id}","HLD: Search Service (Elasticsearch + geo) → Booking Service (calendar lock) → Payment (Saga). Messaging (WS)","Data: listings(id, host_id, location POINT, price, amenities JSON). bookings(id, listing_id, guest_id, checkin, checkout, status). calendar_blocks(listing_id, date, available BOOL)","Deep: Double-booking prevention: SELECT FOR UPDATE on calendar_blocks for date range. Or optimistic with version check","Trade-off: Instant booking (better UX, risk of host rejection) vs Host approval (slower, host controls who stays)","Scale: Geo search in Elasticsearch. Calendar: partition by listing_id. Price prediction ML. Image CDN for listing photos"] },
  { id: "sd28", n: "ChatGPT / LLM", d: "Hard", tags: ["Google","Meta"], v: "https://www.youtube.com/watch?v=jkrNMKz9pWU", s: ["Req: multi-turn chat, token streaming, conversation history, model selection, rate limiting, content safety","Est: 10M conversations/day. Avg 2K tokens/conv → 20B tokens/day. GPU: $2-8/hr. 10-30s per response","API: POST /chat {messages[], model, stream: true} → SSE stream of tokens. GET /conversations/{id}","HLD: API Gateway → Queue (priority: paid > free) → GPU Workers (continuous batching) → SSE stream back to client","Data: conversations(id, user_id, model, messages JSON, token_count, created_at). Usage tracking per user for billing","Deep: Continuous batching: GPU processes N prompts in parallel, new requests join as others finish. KV cache per conversation","Trade-off: Latency (small batch, fast first token) vs Throughput (large batch, better GPU utilization, slower individual response)","Scale: Queue smooths bursty traffic. Auto-scale GPU pool. Smaller model fallback under load. Cache common responses"] },
  { id: "sd29", n: "Stock Exchange", d: "Hard", tags: ["Goldman"], v: "https://www.youtube.com/watch?v=XuKs2kWH0mQ", s: ["Req: place buy/sell orders, real-time matching, order book (bid/ask), market data feed, trade history","Est: 10M orders/day. Matching latency: <1ms. Market data: 100K updates/sec broadcast to subscribers","API: POST /order {symbol, side, type, price, quantity}. WS: subscribe to market data. GET /orderbook/{symbol}","HLD: Order Gateway → Matching Engine (single-threaded, in-memory per symbol) → Trade Store. Market Data Publisher","Data: Order book: sorted map of price levels. Each level: queue of orders (price-time priority). Trades: append-only log","Deep: Price-time priority: match at best price first, then earliest order at that price. Limit vs Market orders","Trade-off: Throughput (batch matching, higher latency) vs Latency (match on every order, lower throughput)","Scale: Partition matching engines by symbol. Replicate order book for HA. Sequencer ensures total ordering. Market data via multicast"] },
  { id: "sd30", n: "Monitoring", d: "Hard", tags: ["Google","Amazon"], v: "https://www.youtube.com/watch?v=kG-ej15G2pU", s: ["Req: collect metrics/logs/traces from 1000s of services, store efficiently, query, dashboards, alerting","Est: 10K services × 100 metrics × 1/sec = 1M data points/sec. Logs: 10TB/day. Retention: metrics 1yr, logs 30 days","API: POST /metrics (batch). POST /logs (batch). GET /query?metric=X&from=X&to=X&agg=avg. POST /alert/rule","HLD: Agents → Kafka → Metrics: TSDB (Prometheus/InfluxDB). Logs: Elasticsearch. Traces: Jaeger. Alert Engine evaluates rules","Data: Time-series: (metric_name, tags, timestamp, value). Compressed with delta-of-delta + XOR encoding (Gorilla)","Deep: Gorilla compression: 12x compression for time-series. Downsampling: 1s → 1min after 7 days → 1hr after 30 days","Trade-off: Push (agents send to collector, simpler at scale) vs Pull (Prometheus scrapes targets, easier to detect down services)","Scale: Shard TSDB by metric name hash. Kafka buffers spikes. Tiered storage: hot (SSD) → warm (HDD) → cold (S3)"] },
];

const RES = [
  { cat: "📚 Courses", items: [
    { n: "Grokking System Design", u: "https://www.designgurus.io/course/grokking-the-system-design-interview", d: "Gold standard. RESHADED + 13 case studies.", p: "$$", r: "⭐⭐⭐⭐⭐" },
    { n: "ByteByteGo", u: "https://bytebytego.com", d: "Visual. Free newsletter.", p: "$$", r: "⭐⭐⭐⭐⭐" },
  ]},
  { cat: "📖 Books", items: [
    { n: "SD Interview Vol 1 — Alex Xu", u: "https://www.amazon.com/dp/B08CMF2CQF", d: "THE book. Start here.", p: "$", r: "⭐⭐⭐⭐⭐" },
    { n: "SD Interview Vol 2 — Alex Xu", u: "https://www.amazon.com/dp/1736049119", d: "Advanced problems.", p: "$", r: "⭐⭐⭐⭐⭐" },
    { n: "DDIA — Kleppmann", u: "https://www.amazon.com/dp/1449373321", d: "Distributed systems bible.", p: "$", r: "⭐⭐⭐⭐⭐" },
  ]},
  { cat: "🎥 YouTube", items: [
    { n: "ByteByteGo", u: "https://www.youtube.com/@ByteByteGo", d: "5-15 min walkthroughs.", p: "Free", r: "⭐⭐⭐⭐⭐" },
    { n: "Gaurav Sen", u: "https://www.youtube.com/@gkcs", d: "Deep conceptual dives.", p: "Free", r: "⭐⭐⭐⭐" },
  ]},
  { cat: "🔗 Free", items: [
    { n: "System Design Primer", u: "https://github.com/donnemartin/system-design-primer", d: "200K+ stars. Anki cards.", p: "Free", r: "⭐⭐⭐⭐⭐" },
  ]},
  { cat: "🎯 Mocks", items: [
    { n: "Pramp", u: "https://www.pramp.com/", d: "Free peer mocks.", p: "Free", r: "⭐⭐⭐⭐" },
    { n: "Interviewing.io", u: "https://interviewing.io/", d: "FAANG engineers.", p: "$$$", r: "⭐⭐⭐⭐⭐" },
  ]},
];

const QUOTES = [
  "System design is about trade-offs, not right answers.",
  "Draw first, explain second.",
  "Twitter + WhatsApp + YouTube = 80% of interviews.",
  "Interviewers want THINKING, not recitation.",
  "Silence = red flag. Talk while drawing.",
];

const DEEP_DIVES = [
  { id: "dd1", n: "CAP Theorem", i: "📐", c: C.purple, cat: "Distributed", summary: "In a distributed system, you can only guarantee 2 of 3: Consistency, Availability, Partition tolerance.",
    sections: [
      { t: "Core Idea", body: "Network partitions WILL happen. So you choose: CP (consistent but reject requests during partition) or AP (available but may return stale data)." },
      { t: "CP Systems", body: "Banking, inventory. Use: ZooKeeper, etcd, Spanner. Strong reads, may block during partitions." },
      { t: "AP Systems", body: "Social feeds, DNS, caching. Use: Cassandra, DynamoDB. Always respond, eventual consistency." },
      { t: "Interview Tip", body: "Don't say 'I pick CA'. Partitions are inevitable. Say: 'For payments I'd pick CP because...' or 'For feeds, AP because stale is acceptable.'" },
    ]},
  { id: "dd2", n: "Consistent Hashing", i: "🎯", c: C.cyan, cat: "Distributed", summary: "Distribute data across nodes so adding/removing a node moves only 1/N keys.",
    sections: [
      { t: "Hash Ring", body: "Nodes and keys hashed onto a ring (0 to 2^32). A key is stored on the first node clockwise from its position." },
      { t: "Virtual Nodes", body: "Each physical node gets 100-200 virtual positions on the ring. Prevents hot spots and balances load." },
      { t: "Add/Remove Node", body: "Only keys between the new node and its predecessor move. O(K/N) redistribution vs O(K) in naive hashing." },
      { t: "Used By", body: "DynamoDB, Cassandra, Akamai CDN, Discord, Memcached. Anywhere you shard across variable nodes." },
    ]},
  { id: "dd3", n: "Paxos / Raft", i: "🗳️", c: C.green, cat: "Consensus", summary: "Algorithms for distributed nodes to agree on a value even when some nodes fail.",
    sections: [
      { t: "The Problem", body: "N nodes must agree on leader/value. Network is unreliable. Some nodes crash. Byzantine failures possible." },
      { t: "Raft (Understandable)", body: "Leader election → Log replication → Safety. Leader sends heartbeats. If timeout, followers start election. Majority quorum (N/2+1)." },
      { t: "Paxos (Original)", body: "Propose → Promise → Accept → Learn. Correct but hard to implement. Multi-Paxos for repeated consensus." },
      { t: "When to Use", body: "Leader election (Kafka), distributed locks (Chubby), metadata consensus (etcd). NOT for data replication at scale." },
    ]},
  { id: "dd4", n: "Gossip Protocol", i: "📡", c: C.orange, cat: "Distributed", summary: "Nodes periodically exchange state with random peers. Information spreads like a rumor.",
    sections: [
      { t: "How It Works", body: "Every T seconds, each node picks a random peer and exchanges state. After O(log N) rounds, all nodes converge." },
      { t: "Failure Detection", body: "If node A hasn't heard from B in T rounds, B is suspected. Multiple nodes confirming = B marked down." },
      { t: "Advantages", body: "Decentralized (no leader SPOF), scalable O(log N), tolerates network partitions, eventually consistent." },
      { t: "Used By", body: "Cassandra (membership), DynamoDB (failure detection), Consul (service discovery), Bitcoin (tx propagation)." },
    ]},
  { id: "dd5", n: "Bloom Filters", i: "🌸", c: C.pink, cat: "Data Structures", summary: "Space-efficient probabilistic set. Can say 'definitely not in set' or 'probably in set'. No false negatives.",
    sections: [
      { t: "How It Works", body: "Bit array of m bits + k hash functions. Insert: set bits at h1(x), h2(x)...hk(x). Query: check all bits. Any 0 = definitely absent." },
      { t: "False Positive Rate", body: "FPR ≈ (1 - e^(-kn/m))^k. With 10 bits/element and 7 hash functions, FPR ≈ 0.8%." },
      { t: "Limitations", body: "Cannot delete (use Counting Bloom Filter). Cannot enumerate members. Cannot tell you WHAT matched." },
      { t: "Used By", body: "Chrome (malicious URL check), CDNs (cache miss avoidance), Cassandra (SSTable lookup skip), Web Crawler (URL dedup)." },
    ]},
  { id: "dd6", n: "LSM Trees & SSTables", i: "🌲", c: C.accent, cat: "Storage", summary: "Write-optimized storage. Writes go to in-memory MemTable, then flush to sorted immutable SSTables on disk.",
    sections: [
      { t: "Write Path", body: "Write → WAL (durability) → MemTable (sorted in-memory, e.g. Red-Black tree). When full, flush to SSTable on disk." },
      { t: "Read Path", body: "Check MemTable → Check Bloom filters for each SSTable level → Binary search within SSTable. Slower than B-tree reads." },
      { t: "Compaction", body: "Background merge of SSTables. Size-tiered (Cassandra) or Leveled (RocksDB). Reclaims space, reduces read amplification." },
      { t: "Trade-off vs B-Trees", body: "LSM: better writes (sequential I/O), worse reads (multiple levels). B-tree: balanced read/write, in-place updates." },
    ]},
  { id: "dd7", n: "Merkle Trees", i: "🌳", c: C.blue, cat: "Data Structures", summary: "Hash tree where every leaf is a data hash and every non-leaf is a hash of its children. Efficient diff detection.",
    sections: [
      { t: "How It Works", body: "Leaf = hash(data block). Parent = hash(left_child + right_child). Root hash represents entire dataset." },
      { t: "Sync Protocol", body: "Compare root hashes. If different, recurse to children. Only exchange differing subtrees. O(log N) to find diffs." },
      { t: "Used By", body: "Git (commits), Bitcoin (tx verification), Cassandra (anti-entropy repair), IPFS, certificate transparency." },
      { t: "Interview Tip", body: "Mention Merkle trees when asked 'How do you detect inconsistencies between replicas?' — it's the standard answer." },
    ]},
  { id: "dd8", n: "Quorum Consensus", i: "⚖️", c: C.red, cat: "Distributed", summary: "W + R > N ensures overlap between write and read sets. Tunable consistency.",
    sections: [
      { t: "Formula", body: "N = replicas, W = write quorum, R = read quorum. W + R > N guarantees at least one node has latest write." },
      { t: "Configurations", body: "Strong: W=N, R=1 (fast reads). Fast writes: W=1, R=N. Balanced: W=R=(N+1)/2. Typical: N=3, W=2, R=2." },
      { t: "Sloppy Quorum", body: "During partition, write to ANY N nodes (not necessarily the designated replicas). Hinted handoff later. DynamoDB uses this." },
      { t: "Interview Tip", body: "When discussing replication, always mention 'tunable consistency with quorum' and give N=3, W=2, R=2 as default." },
    ]},
  { id: "dd9", n: "API Design Patterns", i: "🔌", c: C.blue, cat: "API", summary: "REST vs GraphQL vs gRPC, pagination, idempotency, versioning — the patterns every API needs.",
    sections: [
      { t: "REST vs GraphQL vs gRPC", body: "REST: simple, cacheable, HTTP verbs, best for public APIs. GraphQL: client picks fields, avoids over-fetching, great for mobile (bandwidth). gRPC: binary protobuf, HTTP/2 streaming, 10x faster, best for service-to-service." },
      { t: "Pagination", body: "Offset: ?page=3&limit=20. Simple but slow for deep pages (OFFSET 10000). Cursor: ?after=eyJpZCI6MTIzfQ. Use last item's ID as cursor. O(1) regardless of depth. Keyset is industry standard." },
      { t: "Idempotency", body: "POST /payments with Idempotency-Key header. Server stores key → result mapping. Retry same key = same result, no double charge. Stripe, PayPal all use this. Essential for payments." },
      { t: "Versioning", body: "URL path: /v1/users (simple, clear). Header: Accept: application/vnd.api+json;version=2 (cleaner). Never break existing clients. Deprecate old versions with sunset headers." },
      { t: "Rate Limiting Headers", body: "X-RateLimit-Limit: 1000, X-RateLimit-Remaining: 999, X-RateLimit-Reset: 1609459200, Retry-After: 30. Always include these in API responses." },
      { t: "Error Format", body: "Consistent error body: {error: {code: 'INVALID_INPUT', message: 'Email is required', details: [{field: 'email'}]}}. Use HTTP status codes correctly: 400 client error, 500 server error." },
    ]},
  { id: "dd10", n: "Database Indexing", i: "📇", c: C.green, cat: "Storage", summary: "How to make queries fast. B-tree, hash, composite, covering indexes — the difference between 500ms and 5ms.",
    sections: [
      { t: "B-Tree Index (Default)", body: "Balanced tree, O(log N) lookups. Supports range queries (WHERE age > 25), sorting, and prefix matching. PostgreSQL, MySQL default. Add index on any column you WHERE or ORDER BY." },
      { t: "Hash Index", body: "O(1) exact lookups only. Cannot do range queries or sorting. Faster than B-tree for equality checks. Used internally by hash joins. Rare to create manually." },
      { t: "Composite Index", body: "Index on (country, city, name). Follows leftmost prefix rule: can use (country), (country, city), (country, city, name) but NOT (city) alone. Order matters — put most-filtered column first." },
      { t: "Covering Index", body: "Index contains ALL columns the query needs. DB reads only the index, never touches the table (index-only scan). CREATE INDEX idx ON users(email) INCLUDE (name, age). 10-100x faster." },
      { t: "When NOT to Index", body: "Low-cardinality columns (boolean, gender) — index doesn't help. Write-heavy tables — each write updates all indexes. Small tables (<1000 rows) — full scan is faster than index lookup." },
      { t: "Interview Tip", body: "Always mention indexing when discussing data models. 'I'd add a B-tree index on user_id for O(log N) lookups, and a composite index on (user_id, created_at) for the feed query.'" },
    ]},
  { id: "dd11", n: "Distributed Transactions", i: "🔄", c: C.orange, cat: "Distributed", summary: "How to maintain consistency across multiple services/databases. Saga, 2PC, Outbox — pick the right pattern.",
    sections: [
      { t: "The Problem", body: "User places order: (1) deduct inventory, (2) charge payment, (3) create order. These are 3 different services/DBs. If payment fails AFTER inventory deducted, you have inconsistency." },
      { t: "2PC (Two-Phase Commit)", body: "Coordinator asks all participants: 'Can you commit?' (prepare). If all say yes → 'Commit!'. If any says no → 'Rollback!'. Problem: coordinator crash = all blocked. Rarely used in microservices." },
      { t: "Saga Pattern (Choreography)", body: "Each service publishes an event after its step. Next service listens and acts. Failure → publish compensating events (refund payment, restore inventory). No central coordinator. Loose coupling." },
      { t: "Saga Pattern (Orchestration)", body: "Central orchestrator tells each service what to do step-by-step. Easier to understand and debug than choreography. Single point of failure but simpler. Uber uses orchestrated sagas." },
      { t: "Outbox Pattern", body: "Write to DB + outbox table in same local transaction. Background worker publishes outbox events to Kafka. Guarantees DB + event are consistent. Solves dual-write problem." },
      { t: "Interview Tip", body: "For any multi-service write: 'I'd use the Saga pattern with compensating transactions. For the order flow: create order → reserve inventory → charge payment. If payment fails, compensate by releasing inventory.'" },
    ]},
  { id: "dd12", n: "Event Sourcing & CQRS", i: "📜", c: C.purple, cat: "Architecture", summary: "Store events (what happened) instead of state (what is). Separate read and write models for different optimization.",
    sections: [
      { t: "Event Sourcing", body: "Instead of UPDATE balance=900, store event: {type: 'withdrawal', amount: 100, timestamp: ...}. Current state = replay all events. Full audit trail. Can rebuild state at any point in time." },
      { t: "CQRS", body: "Command Query Responsibility Segregation. Write model: normalized, optimized for writes. Read model: denormalized, optimized for reads. Sync via events. Different DBs possible (Postgres write, Elasticsearch read)." },
      { t: "When to Use", body: "Audit-critical systems (banking, healthcare). Complex business logic with many state transitions. High read:write ratio where read/write models differ significantly. Event-driven architectures." },
      { t: "When NOT to Use", body: "Simple CRUD applications. Small teams without event infrastructure. Systems where eventual consistency between read/write is unacceptable. The complexity cost is high." },
      { t: "Interview Tip", body: "Mention for: payment systems ('event log for audit trail'), analytics ('replay events to rebuild views'), or anywhere you need 'time travel' debugging." },
    ]},
  { id: "dd13", n: "Vector Clocks", i: "🕐", c: C.cyan, cat: "Distributed", summary: "Track causality in distributed systems. Know if event A happened before B, or if they're concurrent (conflict).",
    sections: [
      { t: "The Problem", body: "Two replicas accept writes simultaneously. Which one is 'newer'? Wall clocks are unreliable across machines (clock skew). Need logical ordering." },
      { t: "How It Works", body: "Each node maintains a vector [N1:3, N2:1, N3:5]. On local write: increment own counter. On receive: merge by taking max of each. Compare: A < B if all A's counters ≤ B's counters." },
      { t: "Detecting Conflicts", body: "If neither A < B nor B < A, they're concurrent (conflict). Application must resolve: last-writer-wins (lose data), merge (CRDTs), or ask user (Git-style)." },
      { t: "Used By", body: "DynamoDB (simplified: vector clocks per key), Riak (full vector clocks), Git (commit DAG is essentially vector clocks). Lamport timestamps are simpler but can't detect concurrency." },
    ]},
  { id: "dd14", n: "Leader Election", i: "👑", c: C.accent, cat: "Distributed", summary: "Choosing one node as coordinator in a distributed system. Must handle failures, network partitions, and split brain.",
    sections: [
      { t: "Why Needed", body: "Someone must coordinate: who handles writes (DB leader), who assigns partitions (Kafka controller), who holds the lock (distributed lock). Without a leader, you get conflicts." },
      { t: "Bully Algorithm", body: "Highest-ID node wins. On timeout: broadcast 'election' to higher-ID nodes. If no response → you're the leader. Simple but not partition-safe." },
      { t: "Raft Election", body: "Nodes start as followers. On leader timeout → become candidate → request votes. Majority votes → new leader. Random timeouts prevent split votes. Industry standard." },
      { t: "Using ZooKeeper/etcd", body: "Create ephemeral node /leader. First to create wins. Others watch for deletion. Leader crashes → node deleted → watchers notified → new election. Used by Kafka, HBase, Solr." },
      { t: "Split Brain Prevention", body: "Quorum requirement: only majority partition can elect leader. Fencing tokens: monotonically increasing token ensures old leader can't make changes after new leader elected." },
    ]},
];

const TRADEOFFS = [
  { id: "to1", n: "SQL vs NoSQL Decision Tree", c: C.blue, icon: "🗄️",
    question: "What kind of data and access pattern?",
    branches: [
      { condition: "Structured data, complex queries, joins, ACID transactions", answer: "SQL (PostgreSQL, MySQL)", examples: "Banking, e-commerce orders, user accounts", color: C.blue },
      { condition: "Flexible schema, massive writes, horizontal scale needed", answer: "NoSQL Document (MongoDB)", examples: "Product catalogs, user profiles, CMS", color: C.green },
      { condition: "High-throughput writes, time-series, wide-column", answer: "NoSQL Wide-Column (Cassandra)", examples: "IoT data, activity feeds, messaging", color: C.purple },
      { condition: "Simple key-value, ultra-fast lookups, caching", answer: "NoSQL KV (Redis, DynamoDB)", examples: "Sessions, caching, leaderboards", color: C.red },
      { condition: "Highly connected data, relationships are the query", answer: "Graph DB (Neo4j)", examples: "Social networks, fraud detection, recommendations", color: C.cyan },
    ]},
  { id: "to2", n: "Push vs Pull vs Hybrid", c: C.green, icon: "📨",
    question: "How should updates reach users?",
    branches: [
      { condition: "Few producers, many consumers, real-time needed", answer: "Push (Fan-out on Write)", examples: "Twitter feed for normal users, notifications", color: C.green },
      { condition: "Celebrity/hot-key problem, uneven follower counts", answer: "Pull (Fan-out on Read)", examples: "Celebrity tweets, trending topics", color: C.orange },
      { condition: "Mix of normal and celebrity users", answer: "Hybrid Push+Pull", examples: "Twitter actual design: push for <10K followers, pull for celebrities", color: C.blue },
    ]},
  { id: "to3", n: "Long Polling vs WebSocket vs SSE", c: C.purple, icon: "🔌",
    question: "What real-time communication pattern?",
    branches: [
      { condition: "Server → Client only, simple updates, auto-reconnect", answer: "Server-Sent Events (SSE)", examples: "Stock tickers, news feeds, LLM token streaming", color: C.cyan },
      { condition: "Bidirectional, low-latency, persistent connection", answer: "WebSocket", examples: "Chat, gaming, collaborative editing, live tracking", color: C.purple },
      { condition: "Simple fallback, moderate frequency, broad compatibility", answer: "Long Polling", examples: "Simple chat, legacy browsers, email checking", color: C.orange },
      { condition: "Request-response, no real-time needed", answer: "Regular HTTP", examples: "CRUD APIs, form submissions, batch operations", color: C.dim },
    ]},
  { id: "to4", n: "Monolith vs Microservices", c: C.orange, icon: "🧱",
    question: "How should services be organized?",
    branches: [
      { condition: "Small team (<10), MVP, rapid iteration, simple domain", answer: "Monolith", examples: "Startups, simple CRUD apps, prototypes", color: C.green },
      { condition: "Large org, independent deploy, different scaling needs", answer: "Microservices", examples: "Netflix (1000+ services), Amazon, Uber", color: C.blue },
      { condition: "Growing team, some boundaries clear but not all", answer: "Modular Monolith → Microservices", examples: "Shopify started monolith, gradually extracted", color: C.accent },
    ]},
  { id: "to5", n: "Cache Strategy", c: C.red, icon: "⚡",
    question: "How should data be cached?",
    branches: [
      { condition: "Read-heavy, tolerates slight staleness", answer: "Cache-Aside (Lazy Loading)", examples: "Product pages, user profiles. App checks cache first, fills on miss.", color: C.blue },
      { condition: "Write-heavy, need cache always fresh", answer: "Write-Through", examples: "Session stores, real-time dashboards. Write to cache + DB together.", color: C.green },
      { condition: "Write-heavy, can tolerate delay", answer: "Write-Behind (Write-Back)", examples: "Analytics counters, logging. Write to cache, async flush to DB.", color: C.orange },
      { condition: "Predictable access patterns", answer: "Read-Through", examples: "CDN content, config data. Cache itself fetches from DB on miss.", color: C.purple },
    ]},
  { id: "to6", n: "Sync vs Async Processing", c: C.pink, icon: "⏳",
    question: "Should the operation complete before responding?",
    branches: [
      { condition: "User needs immediate result, <200ms acceptable", answer: "Synchronous", examples: "Login, search, read profile, validate input", color: C.blue },
      { condition: "Long-running task (>1s), user can wait with progress", answer: "Async with Polling/WebSocket", examples: "File upload processing, report generation, AI image gen", color: C.green },
      { condition: "Fire-and-forget, user doesn't need to wait", answer: "Async with Message Queue", examples: "Send email, update feed, log analytics, resize image", color: C.orange },
      { condition: "Must complete but caller shouldn't block", answer: "Async with Callback/Webhook", examples: "Payment processing, third-party integrations, CI/CD", color: C.purple },
    ]},
  { id: "to7", n: "Batch vs Stream Processing", c: C.cyan, icon: "🔄",
    question: "How should data be processed?",
    branches: [
      { condition: "Process all data at once, latency OK (hours)", answer: "Batch (MapReduce, Spark)", examples: "Daily reports, ML model training, ETL pipelines, billing", color: C.blue },
      { condition: "Process events as they arrive, <1 sec latency", answer: "Stream (Kafka Streams, Flink)", examples: "Fraud detection, live dashboards, recommendation updates, alerting", color: C.green },
      { condition: "Mostly batch but need some real-time", answer: "Lambda Architecture (batch + speed layer)", examples: "Analytics: batch for accuracy + stream for speed. LinkedIn, Twitter", color: C.orange },
      { condition: "Unified processing, simplify architecture", answer: "Kappa Architecture (stream only)", examples: "Replay Kafka from offset 0 = batch. Simpler ops. Uber, Confluent", color: C.purple },
    ]},
  { id: "to8", n: "Read-Heavy vs Write-Heavy", c: C.red, icon: "📖",
    question: "What's the read:write ratio?",
    branches: [
      { condition: "Read-heavy (100:1), reads must be fast", answer: "Cache + Read Replicas + CDN + Denormalize", examples: "News feed, product pages, user profiles. Precompute and cache aggressively", color: C.blue },
      { condition: "Write-heavy (1:100), writes must be fast", answer: "LSM-tree DB + Write-behind cache + Async", examples: "IoT ingestion, logging, analytics events. Use Cassandra, append-only writes", color: C.green },
      { condition: "Balanced read/write, both matter", answer: "B-tree DB + Cache-aside + Read Replicas", examples: "E-commerce, social media. PostgreSQL + Redis + 3 read replicas", color: C.orange },
      { condition: "Read and write models are very different", answer: "CQRS: separate read/write stores", examples: "Write to normalized Postgres, project to denormalized Elasticsearch for reads", color: C.purple },
    ]},
  { id: "to9", n: "Consistency Model", c: C.accent, icon: "🔒",
    question: "How consistent must reads be?",
    branches: [
      { condition: "Money, inventory, bookings — correctness critical", answer: "Strong Consistency", examples: "Banking ledger, seat booking, stock trades. Use: Spanner, CockroachDB", color: C.red },
      { condition: "Social feeds, likes, views — staleness OK", answer: "Eventual Consistency", examples: "Like counts, follower counts, news feed. Use: Cassandra, DynamoDB", color: C.green },
      { condition: "User sees own writes but others may lag", answer: "Read-Your-Writes", examples: "Profile updates, post creation. Route reads to leader after write.", color: C.blue },
      { condition: "Causal ordering matters but not global", answer: "Causal Consistency", examples: "Comment threads, chat messages. Use: vector clocks, logical timestamps.", color: C.purple },
    ]},
];

const NFR_DATA = [
  { id: "nfr1", n: "Monitoring & Observability", i: "📊", c: C.cyan,
    sections: [
      { t: "The 3 Pillars", items: ["Metrics — Counters, gauges, histograms (Prometheus, Datadog)", "Logs — Structured JSON logs, correlation IDs (ELK, Splunk)", "Traces — Distributed request tracing across services (Jaeger, Zipkin)"] },
      { t: "Key Metrics (RED)", items: ["Rate — requests per second", "Errors — error rate per endpoint", "Duration — p50, p95, p99 latency"] },
      { t: "Key Metrics (USE)", items: ["Utilization — % resource busy (CPU, memory, disk)", "Saturation — queue depth, backpressure", "Errors — hardware/software error counts"] },
      { t: "Dashboards", items: ["Service health: uptime, latency, error rate", "Infrastructure: CPU, memory, disk, network", "Business: signups, orders, revenue per minute"] },
    ]},
  { id: "nfr2", n: "Alerting & Incident Response", i: "🚨", c: C.red,
    sections: [
      { t: "Alert Design", items: ["Alert on SYMPTOMS not causes (high latency, not CPU)", "Use severity levels: P0 (revenue impact) → P3 (cosmetic)", "Avoid alert fatigue: only page for actionable issues", "Include runbook link in every alert"] },
      { t: "SLOs / SLAs", items: ["SLI: the metric (e.g., request latency p99)", "SLO: internal target (e.g., p99 < 200ms, 99.9% uptime)", "SLA: external contract with penalties", "Error budget: 0.1% downtime = 43 min/month"] },
      { t: "On-Call Best Practices", items: ["Rotation: 1 week on, 3 weeks off", "Escalation chain: primary → secondary → manager", "Blameless postmortems after every incident", "Track MTTR (mean time to recover)"] },
    ]},
  { id: "nfr3", n: "Deployment Strategies", i: "🚀", c: C.green,
    sections: [
      { t: "Rolling Deployment", items: ["Replace instances one by one", "Zero downtime, easy rollback", "Risk: mixed versions during rollout"] },
      { t: "Blue-Green", items: ["Two identical environments", "Switch traffic instantly (DNS/LB)", "Easy rollback: switch back", "Cost: 2x infrastructure"] },
      { t: "Canary", items: ["Route 1-5% traffic to new version", "Monitor error rates and latency", "Gradually increase if healthy", "Netflix, Google standard practice"] },
      { t: "Feature Flags", items: ["Deploy code, enable for specific users", "A/B testing built-in", "Kill switch for bad features", "Tools: LaunchDarkly, Unleash"] },
    ]},
  { id: "nfr4", n: "Capacity Planning", i: "📐", c: C.purple,
    sections: [
      { t: "Back-of-Envelope Steps", items: ["1. Estimate DAU and peak multiplier (2-3x)", "2. Calculate QPS: DAU × actions / 86,400", "3. Storage: records/day × size × retention", "4. Bandwidth: QPS × avg response size", "5. Cache: hot data × size (usually 20% rule)"] },
      { t: "Scaling Thresholds", items: ["Single server: ~1K QPS (web), ~5K QPS (Redis)", "Shard when single DB > 1TB or > 5K writes/sec", "Add CDN when static content > 30% of traffic", "Add cache when DB read latency > SLO"] },
      { t: "Cost Optimization", items: ["Reserved instances for baseline (60-70% cheaper)", "Spot/preemptible for batch jobs (90% cheaper)", "Auto-scale for traffic spikes", "Right-size: most instances are over-provisioned"] },
    ]},
  { id: "nfr5", n: "Security Checklist", i: "🔒", c: C.accent,
    sections: [
      { t: "Authentication", items: ["OAuth 2.0 / OIDC for user auth", "JWT tokens (short-lived access + refresh)", "API keys for service-to-service", "MFA for sensitive operations"] },
      { t: "Data Protection", items: ["Encrypt at rest (AES-256) and in transit (TLS 1.3)", "PII encryption with separate key management (KMS)", "Data masking in logs and non-prod environments", "GDPR/CCPA: data deletion, export, consent"] },
      { t: "Infrastructure", items: ["VPC isolation, security groups, private subnets", "WAF + DDoS protection (CloudFlare, AWS Shield)", "Secrets management (Vault, AWS Secrets Manager)", "Least privilege IAM roles"] },
    ]},
];

const MOCK_PROBLEMS = [
  { id: "mk1", n: "Design Twitter", time: 45, d: "Medium", rubric: ["Requirements & scope", "High-level architecture", "Data model & storage", "Feed generation strategy", "Scaling & trade-offs"] },
  { id: "mk2", n: "Design URL Shortener", time: 35, d: "Easy", rubric: ["Functional requirements", "API design", "ID generation strategy", "Database & caching", "Analytics & monitoring"] },
  { id: "mk3", n: "Design WhatsApp", time: 45, d: "Medium", rubric: ["Requirements (1:1, groups, presence)", "WebSocket architecture", "Message storage & delivery", "E2E encryption approach", "Offline handling & scale"] },
  { id: "mk4", n: "Design YouTube", time: 45, d: "Medium", rubric: ["Upload & transcode pipeline", "CDN & streaming strategy", "Search & recommendations", "Data model", "Scale to 1B views/day"] },
  { id: "mk5", n: "Design Google Docs", time: 45, d: "Hard", rubric: ["Real-time collaboration model", "OT vs CRDT choice", "WebSocket architecture", "Conflict resolution", "Storage & versioning"] },
  { id: "mk6", n: "Design Payment System", time: 45, d: "Hard", rubric: ["Idempotency & exactly-once", "Ledger & double-entry", "Saga pattern for distributed tx", "Fraud detection", "PCI compliance"] },
  { id: "mk7", n: "Design Uber", time: 45, d: "Medium", rubric: ["Location tracking (GeoHash)", "Matching algorithm", "ETA & routing", "Surge pricing", "Scaling location updates"] },
  { id: "mk8", n: "Design Distributed Cache", time: 45, d: "Hard", rubric: ["Consistent hashing", "Eviction policies (LRU)", "Replication strategy", "Hot key handling", "Failure recovery"] },
  { id: "mk9", n: "Design Instagram", time: 45, d: "Medium", rubric: ["Upload flow (presigned URL → S3)", "Feed generation (fan-out)", "Stories with TTL", "CDN & image resizing", "Data model & scaling"] },
  { id: "mk10", n: "Design Rate Limiter", time: 35, d: "Easy", rubric: ["Token bucket vs sliding window", "Redis data structure choice", "Distributed rate limiting", "Lua script atomicity", "Rule configuration & monitoring"] },
  { id: "mk11", n: "Design Notification System", time: 45, d: "Medium", rubric: ["Multi-channel (push, email, SMS)", "Kafka decoupling & workers", "Priority queue & retries", "DLQ & delivery guarantees", "User preference & opt-out"] },
  { id: "mk12", n: "Design Dropbox / File Sync", time: 45, d: "Hard", rubric: ["Block-level chunking (4MB)", "Delta sync & dedup (SHA-256)", "Conflict resolution strategy", "Notification of changes (WebSocket)", "Sharing & permissions model"] },
  { id: "mk13", n: "Design LLM Chat Service", time: 45, d: "Hard", rubric: ["Conversation history management", "Context window & token budget", "GPU inference batching", "Streaming response (SSE/WS)", "Rate limiting & cost control"] },
  { id: "mk14", n: "Design RAG Pipeline", time: 45, d: "Hard", rubric: ["Document chunking strategy", "Embedding model & vector DB", "Similarity search (ANN)", "Prompt engineering with context", "Indexing pipeline & freshness"] },
  { id: "mk15", n: "Design Recommendation System", time: 45, d: "Hard", rubric: ["Candidate generation (retrieve)", "Ranking model (ML)", "Feature store design", "A/B testing framework", "Cold start & diversity"] },
];

const SCHEMAS = [
  { id: "sc1", n: "Twitter / Social Feed", i: "🐦", c: C.blue, tables: [
    { name: "users", cols: "id BIGINT PK, username VARCHAR UNIQUE, display_name, avatar_url, bio, followers_count INT, created_at", note: "PostgreSQL — strong consistency for user data" },
    { name: "tweets", cols: "id BIGINT PK (Snowflake), user_id FK, content VARCHAR(280), media_urls JSON, reply_to_id, retweet_of_id, like_count, created_at", note: "Cassandra — write-heavy, partition by user_id" },
    { name: "follows", cols: "follower_id, followee_id, created_at — PK(follower_id, followee_id)", note: "PostgreSQL — need both directions: who I follow + who follows me" },
    { name: "feed_cache", cols: "user_id, tweet_id, score (timestamp) — Redis Sorted Set", note: "Redis ZSET — O(log N) insert, O(K) range read for feed" },
    { name: "likes", cols: "user_id, tweet_id, created_at — PK(user_id, tweet_id)", note: "Cassandra — billions of likes, no joins needed" },
  ]},
  { id: "sc2", n: "WhatsApp / Chat", i: "💬", c: C.green, tables: [
    { name: "users", cols: "id BIGINT PK, phone VARCHAR UNIQUE, display_name, avatar_url, public_key BLOB, last_seen TIMESTAMP", note: "PostgreSQL — user profile data, public keys for E2E" },
    { name: "conversations", cols: "id BIGINT PK, type ENUM(direct, group), name, created_at", note: "PostgreSQL — conversation metadata" },
    { name: "participants", cols: "conversation_id, user_id, role ENUM(admin, member), joined_at — PK(conv_id, user_id)", note: "PostgreSQL — who is in which conversation" },
    { name: "messages", cols: "id TIMEUUID PK, conversation_id (partition key), sender_id, encrypted_body BLOB, type ENUM(text, image, video), status, created_at", note: "Cassandra — partition by conversation_id, ordered by timeuuid" },
    { name: "presence", cols: "user_id → {status, last_seen} — Redis with 60s TTL", note: "Redis — heartbeat every 30s, TTL auto-expires offline users" },
  ]},
  { id: "sc3", n: "Uber / Ride-Sharing", i: "🚗", c: C.orange, tables: [
    { name: "users", cols: "id BIGINT PK, name, email, phone, type ENUM(rider, driver), rating DECIMAL, created_at", note: "PostgreSQL — user profiles" },
    { name: "drivers", cols: "user_id PK FK, license_plate, vehicle_model, status ENUM(available, busy, offline), current_location_hash", note: "PostgreSQL + Redis for live location" },
    { name: "driver_locations", cols: "driver_id → {lat, lng} — Redis GEO (GEOADD/GEORADIUS)", note: "Redis GEO — 1.7M writes/sec for location updates, GEORADIUS for nearby search" },
    { name: "rides", cols: "id BIGINT PK, rider_id FK, driver_id FK, status ENUM(requested, matched, en_route, arrived, in_progress, completed, cancelled), pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fare DECIMAL, surge_multiplier, created_at", note: "PostgreSQL — ride lifecycle, state machine" },
    { name: "payments", cols: "id BIGINT PK, ride_id FK, amount, currency, method, status ENUM(pending, authorized, captured, refunded), idempotency_key UNIQUE", note: "PostgreSQL — ACID for money, idempotency key prevents double charge" },
  ]},
  { id: "sc4", n: "URL Shortener", i: "🔗", c: C.purple, tables: [
    { name: "urls", cols: "id BIGINT PK (auto-increment), code VARCHAR(7) UNIQUE INDEX, original_url TEXT, user_id FK (nullable), expires_at TIMESTAMP, click_count INT DEFAULT 0, created_at", note: "PostgreSQL — Base62(id) = code. Index on code for O(log N) redirect" },
    { name: "clicks", cols: "id BIGINT PK, url_id FK, ip VARCHAR, country VARCHAR (GeoIP), referrer VARCHAR, user_agent, clicked_at", note: "Cassandra or ClickHouse — append-only analytics, partition by url_id + date" },
    { name: "url_cache", cols: "code → original_url — Redis with 24h TTL", note: "Redis — 80% of redirects served from cache. LRU eviction." },
  ]},
  { id: "sc5", n: "E-Commerce / Amazon", i: "🛒", c: C.accent, tables: [
    { name: "products", cols: "id BIGINT PK, seller_id FK, title, description, price DECIMAL, category_id, inventory_count INT, images JSON, rating DECIMAL, created_at", note: "PostgreSQL — product catalog, inventory with row-level locking" },
    { name: "orders", cols: "id BIGINT PK, user_id FK, status ENUM(pending, confirmed, shipped, delivered, cancelled), total DECIMAL, shipping_address JSON, created_at", note: "PostgreSQL — ACID for orders" },
    { name: "order_items", cols: "id, order_id FK, product_id FK, quantity INT, price_at_purchase DECIMAL", note: "PostgreSQL — snapshot price at purchase time (price may change later)" },
    { name: "cart", cols: "user_id (partition), product_id, quantity, added_at — DynamoDB", note: "DynamoDB — always available (AP), survives outages. Amazon's real design." },
    { name: "search_index", cols: "product_id, title, description, category, price, rating — Elasticsearch", note: "Elasticsearch — inverted index for full-text search + filters + aggregations" },
  ]},
  { id: "sc6", n: "YouTube / Video", i: "🎬", c: C.red, tables: [
    { name: "videos", cols: "id BIGINT PK (Snowflake), creator_id FK, title, description, tags JSON, status ENUM(uploading, processing, live, removed), duration_sec INT, view_count BIGINT, created_at", note: "PostgreSQL — video metadata, indexed by creator_id + created_at" },
    { name: "video_files", cols: "video_id FK, resolution ENUM(360, 480, 720, 1080, 4K), codec, s3_key, size_bytes, bitrate — PK(video_id, resolution)", note: "PostgreSQL — one row per resolution. Transcode pipeline writes these after upload." },
    { name: "comments", cols: "id TIMEUUID PK, video_id (partition key), user_id, text VARCHAR(2000), parent_id (nullable), like_count, created_at", note: "Cassandra — partition by video_id, ordered by time. Nested for replies." },
    { name: "watch_history", cols: "user_id (partition), video_id, progress_sec INT, watched_at — Cassandra", note: "Cassandra — append-heavy, partition by user_id. Powers 'continue watching' + recs." },
    { name: "video_search", cols: "video_id, title, description, tags, channel, view_count — Elasticsearch", note: "Elasticsearch — full-text search + boosting by view_count and freshness" },
  ]},
  { id: "sc7", n: "Dropbox / File Sync", i: "📁", c: C.cyan, tables: [
    { name: "accounts", cols: "id BIGINT PK, email UNIQUE, name, storage_quota_bytes BIGINT, storage_used_bytes BIGINT, created_at", note: "PostgreSQL — account metadata, quota tracking" },
    { name: "files", cols: "id BIGINT PK, account_id FK, parent_folder_id FK, name, is_folder BOOL, size_bytes, content_hash VARCHAR(64), version INT, updated_at, created_at", note: "PostgreSQL — file tree, content_hash = SHA-256 for dedup, version for conflict detection" },
    { name: "file_blocks", cols: "file_id FK, block_index INT, block_hash VARCHAR(64) UNIQUE, s3_key, size_bytes — PK(file_id, block_index)", note: "PostgreSQL + S3 — 4MB chunks, dedup by block_hash (same content = same block globally)" },
    { name: "file_versions", cols: "file_id FK, version INT, block_hashes JSON, modified_by FK, created_at — PK(file_id, version)", note: "PostgreSQL — full version history, each version = ordered list of block hashes" },
    { name: "sharing", cols: "file_id FK, user_id FK, permission ENUM(view, edit, owner), shared_by FK, created_at — PK(file_id, user_id)", note: "PostgreSQL — ACL per file. Cascade to children folders via recursive query." },
  ]},
  { id: "sc8", n: "Rate Limiter", i: "🚦", c: C.pink, tables: [
    { name: "rate_rules", cols: "id BIGINT PK, name, key_type ENUM(user_id, ip, api_key), endpoint_pattern, max_requests INT, window_sec INT, action ENUM(reject, throttle, queue), priority INT", note: "PostgreSQL — rate limit configuration. Admins update rules, workers reload periodically." },
    { name: "token_buckets", cols: "key VARCHAR → {tokens FLOAT, last_refill_ts FLOAT} — Redis Hash", note: "Redis — MULTI/EXEC or Lua script: refill tokens since last_refill, decrement 1 if >0, reject if 0" },
    { name: "sliding_windows", cols: "key:window → sorted set of {timestamp: score, request_id: member} — Redis ZSET", note: "Redis ZSET — ZREMRANGEBYSCORE to remove old entries, ZCARD to count. Accurate per-window." },
    { name: "rate_log", cols: "timestamp, key, endpoint, allowed BOOL, rule_id — Kafka → ClickHouse", note: "ClickHouse — analytics: top rate-limited users, endpoint abuse patterns, rule tuning" },
  ]},
  { id: "sc9", n: "Instagram / Photo Feed", i: "📸", c: C.purple, tables: [
    { name: "users", cols: "id BIGINT PK, username UNIQUE, bio, avatar_url, post_count INT, follower_count INT, following_count INT, is_private BOOL, created_at", note: "PostgreSQL — user profiles, counters denormalized for O(1) reads" },
    { name: "posts", cols: "id BIGINT PK (Snowflake), user_id FK, caption VARCHAR(2200), location JSON, like_count INT, comment_count INT, created_at", note: "PostgreSQL — post metadata, partition by user_id for profile page queries" },
    { name: "media", cols: "id, post_id FK, type ENUM(image, video, reel), s3_key_original, s3_key_thumb, s3_key_medium, width INT, height INT, order_index INT", note: "PostgreSQL + S3 — 3 sizes per image (thumb 150px, medium 640px, original). Carousel = multiple media rows." },
    { name: "feed_cache", cols: "user_id → list of {post_id, score} — Redis Sorted Set", note: "Redis ZSET — fan-out on write for users with <10K followers. Pull for celebrities." },
    { name: "stories", cols: "id, user_id FK, media_url, type, viewers JSON, expires_at (24h TTL), created_at — DynamoDB with TTL", note: "DynamoDB — auto-delete after 24h via TTL. High write, ephemeral data." },
  ]},
  { id: "sc10", n: "Google Docs / Collab", i: "📝", c: C.blue, tables: [
    { name: "documents", cols: "id BIGINT PK, owner_id FK, title, content_snapshot TEXT, version INT, created_at, updated_at", note: "PostgreSQL — latest snapshot for fast page load. Full content periodically saved." },
    { name: "operations", cols: "id BIGINT PK, doc_id FK (partition), version INT, user_id FK, op_type ENUM(insert, delete, format), position INT, content, created_at", note: "Cassandra — append-only op log, partition by doc_id. Core of OT: every keystroke is an op." },
    { name: "doc_permissions", cols: "doc_id FK, user_id FK, role ENUM(owner, editor, commenter, viewer) — PK(doc_id, user_id)", note: "PostgreSQL — ACL. Sharing link = special user_id 'anyone' with viewer/editor role." },
    { name: "cursors", cols: "doc_id → {user_id: {position, color, name}} — Redis Hash with 30s TTL", note: "Redis — ephemeral cursor positions. Each user's cursor broadcasted via WebSocket." },
    { name: "revision_history", cols: "doc_id FK, revision INT, snapshot TEXT, saved_by FK, created_at — PK(doc_id, revision)", note: "S3 or PostgreSQL — periodic snapshots (every 100 ops). Powers 'Version history' and restore." },
  ]},
];

const ANTI_PATTERNS = [
  { id: "ap1", mistake: "Jumping to drawing without asking requirements", fix: "Spend 5 minutes clarifying: users, features, scale, latency, availability. Ask 'What should I prioritize?'", severity: "critical" },
  { id: "ap2", mistake: "Going silent while thinking", fix: "Think out loud: 'I'm considering two options here... Option A is... Option B is... I'll go with A because...'", severity: "critical" },
  { id: "ap3", mistake: "Over-engineering from the start", fix: "Start simple: monolith + single DB. Then say 'At 10M users, I'd add caching here, and shard this DB'. Show evolution.", severity: "high" },
  { id: "ap4", mistake: "Naming technologies without explaining WHY", fix: "Don't say 'I'll use Kafka'. Say 'I need async processing to decouple services, so I'll use Kafka because it gives ordered, replayable events.'", severity: "high" },
  { id: "ap5", mistake: "Ignoring back-of-envelope estimation", fix: "Always estimate QPS, storage, bandwidth. Even rough numbers show you think about scale: '100M DAU × 10 actions = ~12K QPS'", severity: "high" },
  { id: "ap6", mistake: "No trade-off discussion", fix: "For EVERY decision, state the alternative: 'I chose SQL over NoSQL here because we need ACID for payments, but the trade-off is harder horizontal scaling.'", severity: "high" },
  { id: "ap7", mistake: "Designing for Google scale when it's a startup", fix: "Ask about scale first. A system for 1K users is VERY different from 1B users. Match your design to the requirements.", severity: "medium" },
  { id: "ap8", mistake: "Forgetting single points of failure", fix: "Every component: 'What if this dies?' Add replicas for DBs, multiple instances for services, failover for everything.", severity: "medium" },
  { id: "ap9", mistake: "Skipping the API design", fix: "Define 3-5 key API endpoints: method, path, request body, response. Shows you think about the contract between client and server.", severity: "medium" },
  { id: "ap10", mistake: "Not mentioning monitoring/alerting", fix: "End with: 'I'd add metrics (latency p99, error rate), logging (structured JSON with correlation IDs), and alerts on SLO violations.'", severity: "medium" },
];

const HOW_TO_TALK = [
  { id: "ht1", phase: "Opening (first 30 seconds)", c: C.accent, script: "\"Thanks for the problem! Before I dive in, I'd like to spend a few minutes understanding the requirements. Can I start by asking some clarifying questions?\"", tips: [
    "Shows structure and maturity — you're not a junior who starts drawing immediately",
    "Interviewers LOVE this opener because it mirrors how real engineers work",
    "Sets expectations for how you'll use the 45 minutes",
  ]},
  { id: "ht2", phase: "Requirements Gathering (~5 min)", c: C.cyan, script: "\"Let me make sure I understand the scope. For functional requirements, we need: [list 3-5 features]. For non-functional: I'd assume we need high availability — say 99.9%, low latency under 200ms for reads, and we should handle [X] DAU. Does that sound right, or should I adjust?\"", tips: [
    "Always state your ASSUMPTIONS explicitly — don't just ask open-ended questions",
    "Propose numbers and let the interviewer correct you: 'I'll assume 100M DAU unless you'd like different'",
    "Prioritize: 'Given the time, I'll focus on [core feature] and mention [others] at the end'",
  ]},
  { id: "ht3", phase: "Estimation (~3 min)", c: C.blue, script: "\"Let me do a quick back-of-envelope calculation. If we have 100M DAU and each user performs 10 actions per day, that's 1 billion requests per day — roughly 12K QPS, with peak at maybe 25K. For storage, each record is about 1KB, so we're looking at 1TB per year. This tells me we'll need multiple database nodes and aggressive caching.\"", tips: [
    "Round aggressively — 86,400 ≈ 100K is fine. Show you can estimate, not that you're a calculator",
    "Always connect the NUMBER to a DECISION: 'This means we need sharding' or 'This fits on a single machine'",
    "Practice saying estimation out loud — it's awkward at first but becomes natural",
  ]},
  { id: "ht4", phase: "High-Level Design (~10 min)", c: C.green, script: "\"Let me draw the high-level architecture. Starting from the client: requests hit a load balancer, then our API gateway which handles auth and rate limiting. For the core service, I see three main components: [Service A], [Service B], and [Service C]. For storage, I'd use PostgreSQL for [reason] and Redis for caching. Let me show the data flow...\"", tips: [
    "Draw LEFT to RIGHT: Client → LB → Gateway → Services → Database",
    "Name your components specifically: 'Feed Service' not just 'Service'",
    "Explain WHY as you draw: 'I'm adding a message queue here because we need to decouple...'",
    "Pause and ask: 'Does this make sense so far? Anything you'd like me to go deeper on?'",
  ]},
  { id: "ht5", phase: "Handling 'What If' Follow-ups", c: C.orange, script: "\"Great question! If traffic increases 10x, here's how the system would need to change: First, we'd need to shard the database — I'd partition by user_id using consistent hashing. Second, we'd add a CDN layer here to offload static content. Third, this synchronous call would need to become asynchronous with a message queue. The trade-off is increased complexity for eventual consistency.\"", tips: [
    "Don't panic — 'what if' questions test if you understand scaling, not if your first design was perfect",
    "Structure: 'First... Second... Third...' — organized thinking beats scattered genius",
    "Always mention the trade-off: 'We gain X but lose Y'",
  ]},
  { id: "ht6", phase: "Trade-off Discussion", c: C.purple, script: "\"I chose SQL over NoSQL here because we need ACID for payment transactions. The trade-off is that horizontal scaling is harder — at massive scale, I'd consider sharding by user_id or moving read-heavy queries to a read replica. An alternative would be using DynamoDB, which gives us automatic scaling, but we'd lose JOINs and need to denormalize.\"", tips: [
    "Template: 'I chose [A] because [reason]. The trade-off is [downside]. An alternative is [B] which gives [benefit] but loses [drawback].'",
    "NEVER just state a choice. ALWAYS state the alternative and why you didn't pick it",
    "If unsure, say: 'I'm deciding between X and Y. X is better for [reason] but Y handles [case] better. Given our requirements, I'll go with X.'",
  ]},
  { id: "ht7", phase: "Closing (last 2 minutes)", c: C.red, script: "\"To wrap up: we designed a system that handles [QPS] with [latency] target. Key decisions were [choice 1] and [choice 2]. If I had more time, I'd explore: monitoring and alerting setup, disaster recovery across regions, and optimizing the [specific component] which could become a bottleneck at 10x scale.\"", tips: [
    "Summarize 2-3 key decisions you made — shows you remember the big picture",
    "Mention what you'd do NEXT — shows depth beyond what you covered",
    "End confidently — don't apologize for what you didn't cover",
  ]},
];

const GLOSSARY = [
  { term: "Shard / Partition", def: "Splitting data across multiple databases/nodes. Each shard holds a subset of the data (e.g., users A-M on shard 1, N-Z on shard 2). Horizontal scaling." },
  { term: "Replica", def: "A copy of data on another node. Leader-follower: leader handles writes, followers handle reads. Improves read throughput and fault tolerance." },
  { term: "Quorum", def: "Minimum number of nodes that must agree for an operation to succeed. W+R > N ensures consistency. Typical: N=3, W=2, R=2." },
  { term: "Fan-out", def: "One event triggers many operations. Fan-out on write: when you tweet, copy to all 10K followers' feeds. Fan-out on read: merge feeds at read time." },
  { term: "Idempotent", def: "Doing the same operation multiple times produces the same result. POST /pay with idempotency_key: retry safe. Critical for payments and distributed systems." },
  { term: "Denormalize", def: "Duplicate data to avoid JOINs. Instead of joining users + tweets, store author_name directly in tweet. Faster reads, harder updates." },
  { term: "Eventual Consistency", def: "After a write, all replicas will EVENTUALLY have the same value — but not immediately. Reads might return stale data. Acceptable for likes, feeds, not for payments." },
  { term: "Strong Consistency", def: "After a write, ALL subsequent reads return the new value. Guaranteed but slower (requires coordination). Use for money, inventory, bookings." },
  { term: "CAP Theorem", def: "In a distributed system during a network partition, you can have Consistency OR Availability, not both. CP: reject requests. AP: serve stale data." },
  { term: "ACID", def: "Atomicity (all-or-nothing), Consistency (valid state after tx), Isolation (concurrent txs don't interfere), Durability (committed data survives crashes). SQL databases." },
  { term: "BASE", def: "Basically Available, Soft state, Eventually consistent. The NoSQL alternative to ACID. Prioritizes availability and partition tolerance over consistency." },
  { term: "Consistent Hashing", def: "Hash nodes and keys onto a ring. Key goes to nearest clockwise node. Adding a node only moves ~1/N keys, not all of them. Used by: DynamoDB, Cassandra." },
  { term: "Circuit Breaker", def: "If a downstream service fails repeatedly, stop sending requests (open circuit). Periodically try again (half-open). If OK, close circuit. Prevents cascade failures." },
  { term: "Backpressure", def: "When a system is overwhelmed, it signals upstream to slow down. Like a full Kafka consumer: stops pulling messages until it catches up. Prevents OOM crashes." },
  { term: "Dead Letter Queue (DLQ)", def: "Messages that fail processing N times go to a separate queue for manual inspection. Prevents poison messages from blocking the main queue forever." },
  { term: "Tombstone", def: "A marker that says 'this record was deleted.' Used in distributed systems where you can't just delete — other replicas need to know about the deletion." },
  { term: "Write-Ahead Log (WAL)", def: "Before changing data, write the change to an append-only log. If crash happens, replay the log to recover. Used by PostgreSQL, MySQL, Kafka." },
  { term: "Bloom Filter", def: "Space-efficient probabilistic data structure. Tells you 'definitely not in set' or 'probably in set' (false positives OK). Used for URL dedup in crawlers." },
  { term: "Hot Key / Hot Partition", def: "One key/shard receives disproportionate traffic (e.g., celebrity tweet). Solution: replicate the hot key to multiple nodes or add random suffix to spread load." },
  { term: "Cache Stampede", def: "Many requests hit an expired cache key simultaneously, all going to DB. Solution: lock + single-flight (one thread refills, others wait) or stale-while-revalidate." },
  { term: "SLI / SLO / SLA", def: "SLI: the metric (p99 latency). SLO: internal target (p99 < 200ms). SLA: external contract with customers (99.9% uptime or refund). Error budget = 100% - SLO." },
  { term: "CQRS", def: "Command Query Responsibility Segregation. Separate write model (normalized, Postgres) from read model (denormalized, Elasticsearch). Sync via events." },
  { term: "Saga Pattern", def: "Multi-step distributed transaction with compensating actions. Step 1 → Step 2 → Step 3. If Step 3 fails, compensate Step 2 and Step 1 in reverse." },
  { term: "Outbox Pattern", def: "Write to DB + outbox table in same transaction. Background worker publishes outbox rows to Kafka. Solves the dual-write consistency problem." },
  { term: "Leader Election", def: "Choosing one node as coordinator. Use: Raft consensus, ZooKeeper ephemeral nodes. Leader handles writes/coordination. Followers replicate." },
  { term: "Fencing Token", def: "Monotonically increasing number given with a lock. Even if old leader thinks it still has the lock, the new token makes its writes rejected. Prevents split brain." },
  { term: "Snowflake ID", def: "Twitter's globally unique, time-sorted, 64-bit ID: timestamp (41 bits) + machine ID (10 bits) + sequence (12 bits). No coordination needed. 4096 IDs/ms per machine." },
  { term: "Presigned URL", def: "A temporary URL with embedded auth that lets clients upload directly to S3 without going through your server. Reduces server load. Expires in minutes." },
  { term: "Connection Pooling", def: "Reuse database connections instead of opening new ones per request. PgBouncer: 500 app connections → 50 DB connections. Critical at scale." },
  { term: "Rate Limiting", def: "Restrict how many requests a client can make. Token bucket: smooth over time. Sliding window: accurate per window. Return 429 + Retry-After header." },
];

// ─── SVG primitives for architecture diagrams ───
const B = ({ x, y, w = 68, h = 22, label, color = C.blue, sub, multi }) => (
  <g>
    {multi && <rect x={x + 2} y={y + 2} width={w} height={h} rx={4} fill={color} opacity="0.08" stroke={color} strokeOpacity="0.15" />}
    <rect x={x} y={y} width={w} height={h} rx={4} fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.8" />
    <text x={x + w / 2} y={sub ? y + h / 2 + 1 : y + h / 2 + 3} textAnchor="middle" fill={color} fontSize="7" fontWeight="700" fontFamily="'DM Sans', sans-serif">{label}</text>
    {sub && <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle" fill={color} opacity="0.5" fontSize="5" fontFamily="'DM Sans'">{sub}</text>}
  </g>
);
const DB = ({ x, y, w = 54, h = 22, label, color = C.green }) => (
  <g>
    <ellipse cx={x + w / 2} cy={y + 3} rx={w / 2} ry={3} fill={color} fillOpacity="0.08" stroke={color} strokeWidth="0.8" />
    <rect x={x} y={y + 3} width={w} height={h - 6} fill={color} fillOpacity="0.04" />
    <line x1={x} y1={y + 3} x2={x} y2={y + h - 3} stroke={color} strokeWidth="0.8" />
    <line x1={x + w} y1={y + 3} x2={x + w} y2={y + h - 3} stroke={color} strokeWidth="0.8" />
    <ellipse cx={x + w / 2} cy={y + h - 3} rx={w / 2} ry={3} fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.8" />
    <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill={color} fontSize="6" fontWeight="600" fontFamily="'DM Sans'">{label}</text>
  </g>
);
const CL = ({ x, y, label, color = C.purple }) => (
  <g>
    <ellipse cx={x + 27} cy={y + 11} rx={26} ry={10} fill={color} fillOpacity="0.04" stroke={color} strokeWidth="0.8" strokeDasharray="3 2" />
    <text x={x + 27} y={y + 14} textAnchor="middle" fill={color} fontSize="6" fontWeight="600" fontFamily="'DM Sans'">{label}</text>
  </g>
);
const U = ({ x, y, label = "User", color = C.orange }) => (
  <g>
    <circle cx={x + 10} cy={y + 5} r={5} fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" />
    <path d={`M ${x + 2} ${y + 18} Q ${x + 10} ${y + 12} ${x + 18} ${y + 18} L ${x + 18} ${y + 21} L ${x + 2} ${y + 21} Z`} fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" />
    <text x={x + 10} y={y + 30} textAnchor="middle" fill={color} fontSize="6" fontWeight="600" fontFamily="'DM Sans'">{label}</text>
  </g>
);
const A = ({ x1, y1, x2, y2, label, color = "#4b5563", dashed }) => {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len, ex = x2 - ux * 3, ey = y2 - uy * 3;
  const px = -uy * 2.5, py = ux * 2.5;
  const isVert = Math.abs(dy) > Math.abs(dx);
  const lx = (x1 + x2) / 2 + (isVert ? 16 : 0);
  const ly = (y1 + y2) / 2 + (isVert ? 1 : -4);
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth="0.7" strokeDasharray={dashed ? "3 2" : "none"} opacity="0.5" />
      <polygon points={`${x2},${y2} ${ex + px},${ey + py} ${ex - px},${ey - py}`} fill={color} opacity="0.5" />
      {label && <text x={lx} y={ly} textAnchor="middle" fill={color} fontSize="5" fontWeight="600" fontFamily="'IBM Plex Mono'" opacity="0.7">{label}</text>}
    </g>
  );
};
const LY = ({ x, y, w, h, label, color = C.dim }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={6} fill={color} fillOpacity="0.015" stroke={color} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.25" />
    <text x={x + 6} y={y + 9} fill={color} fontSize="5" fontFamily="'IBM Plex Mono'" fontWeight="600" letterSpacing="1" opacity="0.4">{label.toUpperCase()}</text>
  </g>
);
const Note = ({ x, y, text, color = C.dim }) => (
  <text x={x} y={y} textAnchor="middle" fill={color} fontSize="5.5" fontFamily="'DM Sans'" fontStyle="italic" opacity="0.5">{text}</text>
);

// ─── Architecture Diagrams (compact grid layouts) ───
const DiagTwitter = () => (
  <svg viewBox="0 0 340 200" style={{ width: "100%", height: "auto" }}>
    <LY x={70} y={2} w={268} h={182} label="Backend" />
    <U x={5} y={15} label="Write" />
    <U x={5} y={130} label="Read" color={C.cyan} />
    <B x={78} y={40} w={58} label="API GW" color={C.accent} />
    <A x1={28} y1={30} x2={78} y2={48} />
    <A x1={28} y1={145} x2={78} y2={56} />
    <B x={155} y={10} label="Tweet Svc" color={C.blue} />
    <B x={155} y={45} label="Fan-out" color={C.purple} />
    <B x={155} y={110} label="Feed Svc" color={C.pink} />
    <B x={155} y={145} label="Search" color={C.cyan} />
    <A x1={136} y1={47} x2={155} y2={21} label="write" />
    <A x1={136} y1={53} x2={155} y2={56} />
    <A x1={136} y1={58} x2={155} y2={121} label="read" />
    <A x1={190} y1={32} x2={190} y2={45} />
    <A x1={190} y1={67} x2={190} y2={110} dashed label="push" />
    <DB x={248} y={7} label="Tweets DB" color={C.green} />
    <DB x={248} y={42} label="Kafka" color={C.green} />
    <DB x={248} y={107} label="Redis" color={C.red} />
    <DB x={248} y={142} label="ES Index" color={C.cyan} />
    <A x1={223} y1={21} x2={248} y2={16} />
    <A x1={223} y1={56} x2={248} y2={51} />
    <A x1={223} y1={121} x2={248} y2={116} />
    <A x1={223} y1={156} x2={248} y2={151} />
    <Note x={170} y={195} text="Fan-out on write for normal users, pull for celebrities (hybrid)" />
  </svg>
);

const DiagInstagram = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={10} label="Upload" />
    <U x={5} y={115} label="Browse" color={C.cyan} />
    <B x={75} y={15} w={58} label="Upload" color={C.accent} />
    <A x1={28} y1={25} x2={75} y2={24} />
    <CL x={148} y={10} label="S3" color={C.purple} />
    <A x1={133} y1={24} x2={150} y2={20} label="presign" />
    <B x={218} y={12} label="Transcode" color={C.green} />
    <A x1={200} y1={20} x2={218} y2={22} />
    <CL x={218} y={42} label="CDN" color={C.cyan} />
    <A x1={252} y1={34} x2={252} y2={42} />
    <B x={75} y={65} label="Post Svc" color={C.blue} />
    <B x={75} y={100} label="Feed Svc" color={C.pink} />
    <B x={75} y={135} label="Like/Cmt" color={C.purple} />
    <A x1={28} y1={130} x2={75} y2={111} label="feed" />
    <DB x={170} y={62} label="Posts DB" color={C.green} />
    <DB x={170} y={97} label="Redis" color={C.red} />
    <DB x={170} y={132} label="Cassandra" color={C.green} />
    <A x1={143} y1={76} x2={170} y2={71} />
    <A x1={143} y1={111} x2={170} y2={106} />
    <A x1={143} y1={146} x2={170} y2={141} />
    <Note x={170} y={188} text="Presigned URL → S3 upload → resize → CDN" />
  </svg>
);

const DiagWhatsApp = () => (
  <svg viewBox="0 0 340 190" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={10} label="Alice" />
    <U x={5} y={120} label="Bob" color={C.cyan} />
    <B x={62} y={15} w={60} label="WS GW" color={C.accent} />
    <B x={62} y={125} w={60} label="WS GW" color={C.accent} />
    <A x1={28} y1={25} x2={62} y2={24} label="WSS" />
    <A x1={28} y1={135} x2={62} y2={134} label="WSS" />
    <B x={142} y={62} w={70} label="Chat Svc" color={C.blue} />
    <A x1={122} y1={28} x2={165} y2={62} />
    <A x1={165} y1={84} x2={122} y2={128} dashed label="push" />
    <DB x={235} y={10} label="Users" color={C.green} />
    <DB x={235} y={45} label="Messages" color={C.green} />
    <DB x={235} y={80} label="Presence" color={C.red} />
    <A x1={212} y1={68} x2={235} y2={19} />
    <A x1={212} y1={73} x2={235} y2={54} />
    <A x1={212} y1={78} x2={235} y2={89} />
    <B x={142} y={125} w={70} label="Notif Svc" color={C.purple} />
    <A x1={177} y1={84} x2={177} y2={125} />
    <CL x={235} y={122} label="APNS/FCM" color={C.pink} />
    <A x1={212} y1={136} x2={237} y2={132} />
    <Note x={170} y={183} text="E2E encrypted · Cassandra for messages · Redis presence TTL" />
  </svg>
);

const DiagYouTube = () => (
  <svg viewBox="0 0 340 200" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={8} label="Creator" />
    <U x={5} y={135} label="Viewer" color={C.cyan} />
    <B x={68} y={13} label="Upload API" color={C.accent} />
    <A x1={28} y1={23} x2={68} y2={22} />
    <CL x={152} y={8} label="Raw S3" color={C.purple} />
    <A x1={136} y1={22} x2={154} y2={17} />
    <B x={218} y={10} label="Transcode" color={C.green} />
    <A x1={204} y1={17} x2={218} y2={20} label="process" />
    <CL x={218} y={40} label="CDN" color={C.cyan} />
    <A x1={252} y1={32} x2={252} y2={40} />
    <DB x={152} y={45} label="Metadata" color={C.green} />
    <A x1={102} y1={35} x2={179} y2={45} dashed />
    <LY x={58} y={78} w={275} h={42} label="Platform" />
    <B x={65} y={88} w={58} label="Video" color={C.blue} />
    <B x={133} y={88} w={58} label="Search" color={C.cyan} />
    <B x={201} y={88} w={58} label="Recs" color={C.pink} />
    <B x={269} y={88} w={55} label="Ads" color={C.orange} />
    <CL x={148} y={140} label="CDN Edge" color={C.cyan} />
    <A x1={28} y1={150} x2={150} y2={150} />
    <A x1={252} y1={56} x2={200} y2={140} dashed label="serve" />
    <Note x={170} y={193} text="Upload → transcode → CDN · adaptive bitrate (HLS/DASH)" />
  </svg>
);

const DiagUber = () => (
  <svg viewBox="0 0 340 190" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={10} label="Rider" />
    <U x={5} y={120} label="Driver" color={C.green} />
    <B x={62} y={15} w={58} label="API GW" color={C.accent} />
    <A x1={28} y1={25} x2={62} y2={24} />
    <A x1={28} y1={135} x2={62} y2={32} dashed label="loc" />
    <B x={140} y={8} label="Ride Svc" color={C.blue} />
    <B x={140} y={42} label="Matching" color={C.purple} />
    <B x={140} y={76} label="Location" color={C.pink} />
    <B x={140} y={110} label="Payment" color={C.red} />
    <A x1={120} y1={24} x2={140} y2={19} />
    <A x1={174} y1={30} x2={174} y2={42} />
    <A x1={174} y1={64} x2={174} y2={76} label="nearby" />
    <A x1={174} y1={98} x2={174} y2={110} />
    <DB x={238} y={5} label="Rides DB" color={C.green} />
    <DB x={238} y={39} label="GeoHash" color={C.cyan} />
    <DB x={238} y={73} label="Redis Loc" color={C.red} />
    <DB x={238} y={107} label="Stripe" color={C.orange} />
    <A x1={208} y1={19} x2={238} y2={14} />
    <A x1={208} y1={53} x2={238} y2={48} />
    <A x1={208} y1={87} x2={238} y2={82} />
    <A x1={208} y1={121} x2={238} y2={116} />
    <Note x={170} y={183} text="Driver pings every 3s → GeoHash grid → match nearest" />
  </svg>
);

const DiagURL = () => (
  <svg viewBox="0 0 340 175" style={{ width: "100%", height: "auto" }}>
    <text x={170} y={9} textAnchor="middle" fill={C.cyan} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">REDIRECT (GET /{`code`})</text>
    <U x={5} y={16} label="User" />
    <B x={62} y={21} w={60} label="Load Bal" color={C.accent} />
    <A x1={28} y1={31} x2={62} y2={30} />
    <B x={140} y={21} label="App Server" color={C.blue} multi />
    <A x1={122} y1={30} x2={140} y2={30} />
    <DB x={228} y={18} label="Redis" color={C.red} />
    <A x1={208} y1={30} x2={228} y2={27} label="1.check" />
    <DB x={228} y={50} label="URLs DB" color={C.green} />
    <A x1={255} y1={40} x2={255} y2={50} dashed label="2.miss" />
    <line x1={15} y1={82} x2={325} y2={82} stroke={C.border} strokeDasharray="4 3" opacity="0.2" />
    <text x={170} y={93} textAnchor="middle" fill={C.accent} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">SHORTEN (POST /shorten)</text>
    <U x={5} y={100} label="Shorten" color={C.cyan} />
    <B x={62} y={105} label="App Server" color={C.blue} />
    <A x1={28} y1={115} x2={62} y2={114} />
    <B x={150} y={100} label="ID Gen" color={C.purple} sub="Snowflake" />
    <A x1={130} y1={110} x2={150} y2={108} label="1.ID" />
    <B x={150} y={132} label="Base62" color={C.pink} />
    <A x1={184} y1={122} x2={184} y2={132} label="2.enc" />
    <DB x={250} y={112} label="URLs Tbl" color={C.green} />
    <A x1={218} y1={143} x2={250} y2={125} label="3.save" />
    <Note x={170} y={170} text="tinyurl.com/abc → 301 redirect · Base62: 6 chars = 56B URLs" />
  </svg>
);

const DiagGDocs = () => (
  <svg viewBox="0 0 340 170" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={5} label="User A" />
    <U x={5} y={60} label="User B" color={C.green} />
    <U x={5} y={115} label="User C" color={C.purple} />
    <B x={62} y={48} w={62} h={30} label="WS Hub" color={C.accent} sub="sticky" />
    <A x1={28} y1={20} x2={62} y2={55} label="WSS" />
    <A x1={28} y1={75} x2={62} y2={63} label="WSS" />
    <A x1={28} y1={130} x2={62} y2={72} label="WSS" />
    <B x={148} y={48} w={72} h={30} label="OT/CRDT" color={C.purple} />
    <A x1={124} y1={60} x2={148} y2={60} label="ops" />
    <A x1={148} y1={66} x2={124} y2={66} dashed label="bcast" />
    <DB x={248} y={12} label="Snapshots" color={C.green} />
    <DB x={248} y={50} label="Op Log" color={C.cyan} />
    <DB x={248} y={92} label="Blobs" color={C.purple} />
    <A x1={220} y1={55} x2={248} y2={21} dashed label="save" />
    <A x1={220} y1={66} x2={248} y2={59} label="append" />
    <A x1={220} y1={73} x2={248} y2={101} dashed />
    <Note x={170} y={163} text="OT transforms concurrent edits → all clients converge" />
  </svg>
);

const DiagRate = () => (
  <svg viewBox="0 0 340 160" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={15} label="Client" />
    <B x={62} y={20} w={60} label="API GW" color={C.accent} />
    <A x1={28} y1={30} x2={62} y2={29} />
    <B x={142} y={15} w={72} h={28} label="Rate Limit" color={C.blue} sub="Token Bucket" />
    <A x1={122} y1={29} x2={142} y2={28} label="check" />
    <DB x={238} y={18} label="Redis" color={C.red} />
    <A x1={214} y1={29} x2={238} y2={27} label="INCR" />
    <B x={105} y={82} label="✓ Pass" color={C.green} />
    <A x1={170} y1={43} x2={139} y2={82} label="≤ limit" color={C.green} />
    <B x={195} y={82} label="429 Reject" color={C.red} />
    <A x1={185} y1={43} x2={220} y2={82} label="> limit" color={C.red} />
    <B x={105} y={115} label="Backend" color={C.purple} />
    <A x1={139} y1={104} x2={139} y2={115} />
    <Note x={170} y={155} text="Key: user_id or IP · token bucket allows bursts · Lua atomicity" />
  </svg>
);

const DiagNotif = () => (
  <svg viewBox="0 0 340 170" style={{ width: "100%", height: "auto" }}>
    <B x={5} y={15} w={60} label="App Svc" color={C.orange} />
    <B x={5} y={48} w={60} label="Auth Svc" color={C.orange} />
    <B x={5} y={81} w={60} label="Cron" color={C.orange} />
    <B x={85} y={42} w={72} h={28} label="Notif Svc" color={C.accent} sub="priority" />
    <A x1={65} y1={26} x2={85} y2={50} label="send" />
    <A x1={65} y1={59} x2={85} y2={56} />
    <A x1={65} y1={92} x2={85} y2={64} />
    <DB x={178} y={42} label="Kafka" color={C.green} />
    <A x1={157} y1={56} x2={178} y2={51} label="enqueue" />
    <B x={252} y={12} label="Push" color={C.blue} />
    <B x={252} y={48} label="Email" color={C.purple} />
    <B x={252} y={84} label="SMS" color={C.pink} />
    <A x1={232} y1={48} x2={252} y2={23} dashed />
    <A x1={232} y1={53} x2={252} y2={59} dashed />
    <A x1={232} y1={60} x2={252} y2={95} dashed />
    <CL x={135} y={120} label="APNS/FCM" color={C.cyan} />
    <CL x={218} y={120} label="SendGrid" color={C.purple} />
    <A x1={286} y1={34} x2={175} y2={120} dashed />
    <A x1={286} y1={70} x2={252} y2={120} dashed />
    <Note x={170} y={163} text="Kafka decouples producers → per-channel retries + DLQ" />
  </svg>
);

const DiagDropbox = () => (
  <svg viewBox="0 0 340 185" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={5} label="Laptop" />
    <U x={5} y={95} label="Phone" color={C.cyan} />
    <B x={60} y={10} label="Sync Agent" color={C.orange} />
    <B x={60} y={100} label="Sync Agent" color={C.cyan} />
    <A x1={28} y1={20} x2={60} y2={19} />
    <A x1={28} y1={110} x2={60} y2={109} />
    <B x={148} y={48} w={62} h={28} label="API GW" color={C.accent} />
    <A x1={128} y1={22} x2={158} y2={48} />
    <A x1={128} y1={109} x2={158} y2={76} />
    <B x={238} y={8} label="Meta Svc" color={C.blue} />
    <B x={238} y={38} label="Block Svc" color={C.purple} />
    <B x={238} y={68} label="Notif WS" color={C.pink} />
    <B x={238} y={98} label="Sharing" color={C.green} />
    <A x1={210} y1={55} x2={238} y2={19} />
    <A x1={210} y1={59} x2={238} y2={49} />
    <A x1={210} y1={66} x2={238} y2={79} />
    <A x1={210} y1={70} x2={238} y2={109} />
    <DB x={80} y={145} w={50} label="Meta" color={C.green} />
    <DB x={155} y={145} w={50} label="Blocks" color={C.red} />
    <DB x={235} y={145} w={55} label="S3" color={C.purple} />
    <A x1={272} y1={49} x2={262} y2={145} dashed />
    <Note x={170} y={180} text="4MB chunks · delta sync · dedup via SHA-256 hash" />
  </svg>
);

const DiagLLMChat = () => (
  <svg viewBox="0 0 340 190" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={15} label="User" />
    <B x={60} y={20} w={58} label="API GW" color={C.accent} />
    <A x1={28} y1={30} x2={60} y2={29} label="prompt" />
    <B x={140} y={20} label="Chat Svc" color={C.blue} />
    <A x1={118} y1={29} x2={140} y2={29} />
    <DB x={240} y={17} label="History" color={C.green} />
    <A x1={208} y1={29} x2={240} y2={26} label="load" />
    <B x={140} y={58} label="Context" color={C.purple} />
    <A x1={174} y1={42} x2={174} y2={58} />
    <B x={140} y={96} label="Inf Queue" color={C.cyan} />
    <A x1={174} y1={80} x2={174} y2={96} label="batch" />
    <B x={50} y={96} label="GPU" color={C.pink} />
    <A x1={140} y1={107} x2={118} y2={107} />
    <B x={50} y={134} label="Streamer" color={C.accent} />
    <A x1={84} y1={118} x2={84} y2={134} />
    <A x1={80} y1={148} x2={28} y2={42} dashed label="SSE" color={C.accent} />
    <DB x={240} y={93} label="Models" color={C.purple} />
    <A x1={240} y1={107} x2={118} y2={107} dashed />
    <Note x={170} y={183} text="Continuous GPU batching · stream tokens via SSE/WebSocket" />
  </svg>
);

const DiagRAG = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <text x={170} y={9} textAnchor="middle" fill={C.accent} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">INDEXING (OFFLINE)</text>
    <DB x={8} y={17} label="Docs" color={C.green} />
    <B x={82} y={17} label="Chunker" color={C.blue} />
    <A x1={62} y1={26} x2={82} y2={26} />
    <B x={168} y={17} label="Embed" color={C.purple} />
    <A x1={150} y1={26} x2={168} y2={26} label="chunks" />
    <DB x={258} y={14} label="Vector DB" color={C.pink} />
    <A x1={236} y1={26} x2={258} y2={23} label="vectors" />
    <line x1={8} y1={50} x2={332} y2={50} stroke={C.border} strokeDasharray="4 3" opacity="0.2" />
    <text x={170} y={62} textAnchor="middle" fill={C.cyan} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">QUERY (ONLINE)</text>
    <U x={5} y={68} label="User" />
    <B x={62} y={73} label="Chat API" color={C.orange} />
    <A x1={28} y1={83} x2={62} y2={82} />
    <B x={148} y={73} label="Embed Q" color={C.purple} />
    <A x1={130} y1={82} x2={148} y2={82} />
    <B x={238} y={73} label="Similarity" color={C.pink} />
    <A x1={216} y1={82} x2={238} y2={82} label="vector" />
    <A x1={285} y1={36} x2={285} y2={73} dashed label="search" />
    <B x={148} y={118} label="Prompt" color={C.accent} sub="q + context" />
    <A x1={270} y1={95} x2={200} y2={118} label="top-k" />
    <A x1={95} y1={95} x2={162} y2={118} dashed label="question" />
    <B x={148} y={158} label="LLM" color={C.blue} />
    <A x1={182} y1={140} x2={182} y2={158} />
    <A x1={148} y1={169} x2={62} y2={95} dashed label="answer" color={C.accent} />
    <Note x={170} y={192} text="Grounds LLM in your data · reduces hallucinations" />
  </svg>
);

const DiagImageGen = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={8} label="User" />
    <B x={62} y={13} label="API GW" color={C.accent} />
    <A x1={28} y1={23} x2={62} y2={22} label="prompt" />
    <B x={152} y={13} label="Safety" color={C.red} />
    <A x1={130} y1={22} x2={152} y2={22} label="check" />
    <DB x={248} y={10} label="Banned" color={C.red} />
    <A x1={220} y1={22} x2={248} y2={19} dashed />
    <B x={102} y={50} label="Job Queue" color={C.green} />
    <A x1={182} y1={35} x2={136} y2={50} label="enqueue" />
    <B x={102} y={88} label="Encoder" color={C.purple} />
    <A x1={136} y1={72} x2={136} y2={88} />
    <B x={102} y={126} w={72} h={28} label="Diffusion" color={C.pink} sub="GPU worker" />
    <A x1={136} y1={110} x2={136} y2={126} label="embed" />
    <B x={205} y={126} label="NSFW?" color={C.red} />
    <A x1={174} y1={140} x2={205} y2={140} />
    <CL x={205} y={163} label="S3/CDN" color={C.purple} />
    <A x1={239} y1={148} x2={239} y2={163} />
    <A x1={207} y1={173} x2={28} y2={35} dashed label="URL" color={C.accent} />
    <Note x={170} y={192} text="Async job · poll/WS for progress · 5-30s generation" />
  </svg>
);

const DiagRecSys = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <text x={170} y={9} textAnchor="middle" fill={C.accent} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">TRAINING (BATCH)</text>
    <DB x={8} y={17} label="Events" color={C.green} />
    <B x={82} y={17} label="Features" color={C.blue} />
    <A x1={62} y1={26} x2={82} y2={26} />
    <B x={168} y={17} label="Training" color={C.purple} />
    <A x1={150} y1={26} x2={168} y2={26} />
    <DB x={258} y={14} label="Models" color={C.pink} />
    <A x1={236} y1={26} x2={258} y2={23} />
    <line x1={8} y1={50} x2={332} y2={50} stroke={C.border} strokeDasharray="4 3" opacity="0.2" />
    <text x={170} y={62} textAnchor="middle" fill={C.cyan} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">SERVING (REAL-TIME)</text>
    <U x={5} y={68} label="User" />
    <B x={62} y={73} label="Rec Svc" color={C.accent} />
    <A x1={28} y1={83} x2={62} y2={82} />
    <B x={152} y={68} label="Candidates" color={C.blue} />
    <A x1={130} y1={82} x2={152} y2={79} label="retrieve" />
    <B x={152} y={100} label="Ranker" color={C.purple} />
    <A x1={186} y1={90} x2={186} y2={100} />
    <B x={152} y={132} label="Re-rank" color={C.pink} />
    <A x1={186} y1={122} x2={186} y2={132} />
    <A x1={152} y1={143} x2={95} y2={95} dashed label="top 10" color={C.accent} />
    <DB x={258} y={65} label="Features" color={C.green} />
    <DB x={258} y={97} label="Cache" color={C.red} />
    <DB x={258} y={129} label="History" color={C.cyan} />
    <A x1={220} y1={79} x2={258} y2={74} dashed />
    <A x1={220} y1={111} x2={258} y2={106} dashed />
    <A x1={220} y1={143} x2={258} y2={138} dashed />
    <Note x={170} y={190} text="Retrieve 1000s → rank top 10 · A/B test · logs → retrain" />
  </svg>
);

const DiagAIAgent = () => (
  <svg viewBox="0 0 340 185" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={50} label="User" />
    <B x={55} y={55} label="Chat UI" color={C.orange} />
    <A x1={28} y1={65} x2={55} y2={64} label="task" />
    <B x={140} y={52} w={72} h={28} label="Agent Loop" color={C.accent} sub="max N iter" />
    <A x1={123} y1={64} x2={140} y2={63} />
    <B x={240} y={10} label="LLM Plan" color={C.purple} />
    <A x1={212} y1={52} x2={258} y2={32} label="1.think" />
    <A x1={258} y1={32} x2={212} y2={60} dashed label="action" />
    <B x={240} y={48} label="Router" color={C.blue} />
    <A x1={212} y1={68} x2={240} y2={59} label="2.exec" />
    <B x={240} y={82} w={42} h={18} label="Search" color={C.green} />
    <B x={290} y={82} w={42} h={18} label="Code" color={C.cyan} />
    <B x={240} y={106} w={42} h={18} label="DB" color={C.red} />
    <B x={290} y={106} w={42} h={18} label="APIs" color={C.pink} />
    <A x1={261} y1={70} x2={261} y2={82} />
    <B x={140} y={125} label="Observe" color={C.pink} />
    <A x1={240} y1={124} x2={195} y2={125} dashed label="result" />
    <A x1={176} y1={125} x2={212} y2={80} dashed label="3.loop" color={C.accent} />
    <DB x={55} y={125} label="Memory" color={C.green} />
    <A x1={140} y1={136} x2={109} y2={134} dashed />
    <A x1={140} y1={66} x2={55} y2={72} dashed label="final" color={C.accent} />
    <Note x={170} y={180} text="ReAct: reason → act → observe → repeat until done" />
  </svg>
);

const FLOWS = [
  { id: "url", n: "URL Shortener", i: "🔗", d: "Easy", D: DiagURL, w: [
    { q: "Why Base62?", a: "6 chars = 62^6 = 56B URLs. Short, URL-safe. No special characters unlike Base64." },
    { q: "Why cache?", a: "80% of reads hit top 20% URLs (Pareto). Cache-aside with Redis saves DB calls. TTL = 24h, LRU eviction." },
    { q: "Why NOT MD5?", a: "MD5 produces 128 bits — must truncate → collisions. Counter-based IDs guarantee uniqueness without retries." },
    { q: "Estimation?", a: "100M URLs/month → ~40 writes/sec, 400 reads/sec (10:1 ratio). 100M × 500B = 50GB/year. Fits single DB for years." },
    { q: "API Design?", a: "POST /api/shorten {long_url} → {short_url, code}. GET /{code} → 301 redirect. 301 = cacheable, 302 = trackable." },
    { q: "Data Model?", a: "Table: urls(id BIGINT PK, code VARCHAR(7) UNIQUE INDEX, long_url TEXT, created_at, expires_at, click_count)." },
    { q: "How to scale?", a: "Read replicas for GET. Range-based ID partitioning. Cache popular codes in Redis. CDN for 301 redirects at edge." },
    { q: "Analytics?", a: "Async: log clicks to Kafka → batch into analytics DB. Track by country (GeoIP), device, referrer, time." } ]},
  { id: "rate", n: "Rate Limiter", i: "🚦", d: "Easy", D: DiagRate, w: [
    { q: "Why Redis?", a: "Atomic INCR + EXPIRE in one op. Sub-ms latency. Shared state across multiple API gateway instances." },
    { q: "Token Bucket?", a: "Bucket holds N tokens, refills at R/sec. Each request takes 1 token. Allows bursts up to N. Amazon and Stripe use this." },
    { q: "Sliding Window?", a: "Weighted: current_window_count × overlap% + prev_window_count. More accurate than fixed window, less memory than log." },
    { q: "Where to run?", a: "API Gateway layer — blocks bad traffic BEFORE hitting backend. Can also run per-service for internal rate limiting." },
    { q: "Key design?", a: "Key = user_id or IP or API_key. Support multiple rules: 100/min per user AND 1000/hr per user AND 10K/day per IP." },
    { q: "Distributed?", a: "Central Redis for exact counts. OR local counters + periodic sync (slightly over-limit but faster). Race condition: use Lua scripts." },
    { q: "What about 429?", a: "Return 429 Too Many Requests with Retry-After header. Include X-RateLimit-Remaining, X-RateLimit-Reset headers." } ]},
  { id: "notif", n: "Notifications", i: "📬", d: "Easy", D: DiagNotif, w: [
    { q: "Why Kafka?", a: "Decouples producers from workers. Absorbs traffic spikes (Black Friday). Replay capability for debugging." },
    { q: "Why channel workers?", a: "Push (APNS/FCM), Email (SES/SendGrid), SMS (Twilio) have different APIs, retry logic, rate limits, and auth." },
    { q: "At-least-once?", a: "Dedup by notification_id at consumer. Idempotent delivery. Better to receive twice than miss critical alerts." },
    { q: "Priority queues?", a: "Separate Kafka topics: high (password reset, OTP), medium (social), low (marketing). Different consumer pools." },
    { q: "User preferences?", a: "Preference service: user → {push: true, email: false, sms: true, quiet_hours: 22-07}. Check before sending." },
    { q: "Template system?", a: "Templates with variables: 'Hi {{name}}, {{friend}} liked your post'. Supports i18n. Stored in DB, cached in Redis." },
    { q: "Scale numbers?", a: "1B notifications/day → ~12K/sec. Partition Kafka by user_id. 50 consumer instances. Batch email sends (SES: 50/call)." } ]},
  { id: "twitter", n: "Twitter", i: "🐦", d: "Medium", D: DiagTwitter, w: [
    { q: "Why fan-out on write?", a: "Reads 100x more frequent than writes. Pay O(followers) once on write → O(1) feed reads from Redis. Pre-computed feeds." },
    { q: "Why NOT for celebrities?", a: "Elon tweets → 150M fan-out writes. Takes minutes. Hybrid: push for <10K followers, pull (merge on read) for celebrities." },
    { q: "Why Redis feeds?", a: "Sorted sets: ZADD feed:{user_id} timestamp tweet_id. ZREVRANGE for latest 20. O(log N) insert, O(K) read. TTL old entries." },
    { q: "Estimation?", a: "200M DAU × 5 reads/day = 1B reads/day → 12K QPS. 500K tweets/day → 6/sec writes. Fan-out: 6 × avg(200 followers) = 1.2K Redis writes/sec." },
    { q: "Data Model?", a: "Tweets: {id, user_id, content, media_urls[], created_at} in Cassandra. Users: PostgreSQL. Feeds: Redis sorted sets. Search: Elasticsearch." },
    { q: "Search?", a: "Elasticsearch with inverted index. Index on create. Near-real-time (<1s). Trending: count hashtags in sliding window (Redis sorted set)." },
    { q: "Media?", a: "Images/videos uploaded to S3 via presigned URL. Transcode to multiple sizes. Serve via CDN. Store media_url in tweet metadata." },
    { q: "Delete/Edit tweet?", a: "Soft delete: mark as deleted. Fan-out delete to feeds (async, eventual). Edit: append new version, keep history. Propagate to feeds." } ]},
  { id: "instagram", n: "Instagram", i: "📷", d: "Medium", D: DiagInstagram, w: [
    { q: "Why presigned URL?", a: "Client uploads 5MB photo directly to S3. App server only generates the URL — no bandwidth bottleneck. Parallel uploads." },
    { q: "Why async transcode?", a: "Post appears instantly with original image. Background workers generate thumbnails (150px, 600px, 1080px). Notify client when ready." },
    { q: "Why Cassandra for likes?", a: "Write-heavy: 500M+ likes/day. Wide-column: likes(post_id, user_id, timestamp). No joins needed. Horizontal scale." },
    { q: "Estimation?", a: "500M DAU, 100M photos/day × 500KB = 50TB/day raw. Thumbnails 3x = 150TB/day. 5 years = 270PB. CDN absorbs 95% of reads." },
    { q: "Feed generation?", a: "Hybrid fan-out: push for normal users, pull for celebrity accounts. Feed stored in Redis: sorted set of {post_id, timestamp}. Paginated." },
    { q: "Stories?", a: "Separate storage with 24h TTL. Write to user's story list in Redis. Expire automatically. Pre-load stories for followed users in feed service." },
    { q: "Explore / Discover?", a: "ML recommendation service: candidate generation (collaborative filtering) → ranking (engagement prediction). Precomputed hourly, served from cache." },
    { q: "Hashtags & Search?", a: "Elasticsearch indexes caption text and hashtags. Hashtag pages: aggregate posts by tag, sorted by recency or engagement." } ]},
  { id: "whatsapp", n: "WhatsApp", i: "💬", d: "Medium", D: DiagWhatsApp, w: [
    { q: "Why WebSocket?", a: "Full-duplex: server pushes messages instantly without client polling. One persistent connection per device. 1.2M msg/sec with WS gateways." },
    { q: "Offline delivery?", a: "Undelivered messages stored in Cassandra with recipient_id as partition key. On reconnect, WS gateway pulls pending messages. Mark as delivered." },
    { q: "Why E2E encryption?", a: "Signal Protocol: each user has public/private key pair. Server only sees encrypted blobs — can't read content. Key exchange on first contact." },
    { q: "Group messages?", a: "Sender sends once to server. Server fans out to all group members' queues. Group key shared among members. Max 1024 members." },
    { q: "Estimation?", a: "2B users, 100B msg/day → 1.2M msg/sec. Average message 100B → 10TB/day. Store 30 days = 300TB. Cassandra with msg_id timeuuid." },
    { q: "Read receipts & typing?", a: "Lightweight signals via same WS. Sent/delivered/read ticks. Typing indicator: ephemeral, not persisted. Throttled to 1 update/3sec." },
    { q: "Media sharing?", a: "Encrypt media client-side → upload to S3 → send URL + decryption key in message. Recipient downloads and decrypts locally." },
    { q: "Presence (online/last seen)?", a: "Heartbeat every 30s from client. Redis stores {user_id → last_seen}. TTL 60s. If expired = offline. Presence fanout only to chatting users." } ]},
  { id: "youtube", n: "YouTube", i: "▶️", d: "Medium", D: DiagYouTube, w: [
    { q: "Why multi encodings?", a: "Adaptive bitrate (ABR): client measures bandwidth, requests appropriate quality (144p→4K). Seamless quality switching mid-stream." },
    { q: "Why CDN?", a: "Video is 80%+ of internet traffic. Edge servers in 100+ cities. Popular videos cached at edge. Origin only serves cache misses." },
    { q: "Why HLS/DASH?", a: "Video split into 2-10 sec chunks. Manifest file lists all chunks + quality levels. Client downloads chunk-by-chunk. Enables seeking and quality switch." },
    { q: "Upload pipeline?", a: "Resumable upload to raw S3. Transcode workers: H.264/VP9/AV1 × 6 resolutions = 18+ variants. ~1 hour processing for 10min video. Parallel encoding." },
    { q: "Estimation?", a: "500 hrs uploaded/min × 500MB avg = 250GB/min uploaded. 1B views/day. 5min avg watch = 3.5GB/sec bandwidth. CDN handles 95%." },
    { q: "Recommendations?", a: "2-stage ML: candidate gen (1000s from collaborative filtering + content-based) → ranking (CTR prediction, watch time prediction). Personalized per user." },
    { q: "Comments & Likes?", a: "Comments: tree structure (parent_id for replies). Sharded by video_id. Likes: simple counter with Redis for real-time, batch sync to DB." },
    { q: "Copyright/Content ID?", a: "Audio/video fingerprinting on upload. Match against database of copyrighted content. Auto-flag, monetize, or block. Runs async in transcode pipeline." } ]},
  { id: "uber", n: "Uber", i: "🚗", d: "Medium", D: DiagUber, w: [
    { q: "Why GeoHash?", a: "Nearby coordinates share prefix. 'gcpuuz' and 'gcpuv0' are neighbors. Range query on prefix finds all drivers in grid cell. O(1) lookup in Redis." },
    { q: "Why Redis for location?", a: "1M active drivers × ping every 3s = 333K writes/sec. Redis Geo commands: GEOADD, GEORADIUS. In-memory = sub-ms. SQL would collapse." },
    { q: "Why surge pricing?", a: "Supply-demand imbalance: more riders than drivers → price multiplier (1.5x-3x). Incentivizes drivers to move to high-demand areas. Calculated per GeoHash cell." },
    { q: "Matching algorithm?", a: "Find K nearest available drivers within 5km radius (GEORADIUS). Score by: distance, ETA, driver rating, acceptance rate. Offer to best match with 15s timeout." },
    { q: "Estimation?", a: "20M rides/day. 5M concurrent drivers. Location updates: 5M × 1/3s = 1.7M writes/sec. Ride DB: 20M × 1KB = 20GB/day. Payment: 20M transactions/day." },
    { q: "ETA calculation?", a: "Pre-computed shortest paths using road graph + real-time traffic. Dijkstra/A* too slow — use contraction hierarchies. Cache ETAs for common routes." },
    { q: "Trip lifecycle?", a: "States: REQUESTED → MATCHED → DRIVER_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED → PAID. Each transition emits Kafka event. State machine in Ride Service." },
    { q: "Payments?", a: "Fare = base + (distance × rate) + (time × rate) + surge. Pre-authorize payment at request. Charge at completion. Stripe/Braintree integration. Refund flow for cancellations." } ]},
  { id: "dropbox", n: "Dropbox", i: "☁️", d: "Medium", D: DiagDropbox, w: [
    { q: "Why chunk files?", a: "4MB chunks. Change 1 byte in 1GB file → re-upload 1 chunk (4MB), not entire file. Resumable uploads. Parallel upload of chunks." },
    { q: "Why dedup?", a: "Content-addressable: chunk_hash = SHA256(chunk_data). Same content from 100 users stored once in S3. Saves 30-50% storage at scale." },
    { q: "Metadata vs Blocks?", a: "Metadata (file tree, versions, sharing) in PostgreSQL — needs ACID, joins. Block data in S3 — cheap, durable, infinitely scalable." },
    { q: "Sync protocol?", a: "Client watches file system changes (inotify/FSEvents). On change: chunk → hash → check server → upload only new chunks. Server notifies other clients via WS." },
    { q: "Estimation?", a: "500M users, avg 200 files × 500KB = 50PB total. 10M syncs/day. Delta sync saves 70% bandwidth. Metadata DB: 500M users × 200 files = 100B rows." },
    { q: "Conflict resolution?", a: "Last-writer-wins for most files. For simultaneous edits: create conflict copy '(conflicted copy - UserB)'. User manually merges. Versioning preserves all copies." },
    { q: "Sharing & permissions?", a: "Share link → access token. Permission levels: view, edit, admin. ACL stored in metadata DB. Namespace isolation between users. Team spaces with inherited permissions." },
    { q: "Notifications?", a: "WebSocket connection per client for real-time sync. Long polling as fallback. Notification service pushes {file_changed, user_id, file_path} events." } ]},
  { id: "docs", n: "Google Docs", i: "📝", d: "Hard", D: DiagGDocs, w: [
    { q: "Why OT?", a: "Operational Transform: transforms concurrent operations so all clients converge to the same state. Insert at position 5 + delete at position 3 → adjust insert to position 4." },
    { q: "OT vs CRDT?", a: "OT: simpler, needs central server to order ops. CRDT: peer-to-peer, no server needed, but more complex. Google Docs uses OT. Figma uses CRDT." },
    { q: "Why op log?", a: "Every keystroke = operation in append-only log. Enables: undo/redo, version history, time travel, audit trail. Periodic snapshots for fast loading." },
    { q: "WebSocket architecture?", a: "Each doc has a 'room'. Users join via WS. Ops broadcast to all room members. WS hub handles presence (cursor positions, selections). Typically 1 hub per doc shard." },
    { q: "Estimation?", a: "100M docs, 10M concurrent editors. Avg 2 ops/sec per user = 20M ops/sec. Each op ~100B. Op log: 20M × 100B × 86400 = 170TB/day. Compact via snapshots." },
    { q: "Cursor & selection?", a: "Each user's cursor position broadcast as ephemeral state (not persisted). Color-coded per user. Sent via same WS channel. Debounced to 100ms." },
    { q: "Permissions?", a: "ACL: owner, editor, commenter, viewer. Checked at WS connection time and per-op. Share via link or email. Google Drive integration for file management." },
    { q: "Offline editing?", a: "Queue ops locally. On reconnect, send queued ops. Server transforms against concurrent ops from other users. Merge conflicts automatically via OT." } ]},
  { id: "llm", n: "ChatGPT / LLM", i: "🤖", d: "Hard", D: DiagLLMChat, w: [
    { q: "Why token streaming?", a: "SSE/WebSocket streams tokens as generated (50-100 tokens/sec). User sees text appear instantly. Without streaming: 10-30sec blank wait for full response." },
    { q: "Why continuous batching?", a: "GPU processes N prompts in parallel. New requests join mid-batch as others finish. Maximizes GPU utilization from ~30% (naive) to ~80%. Key to cost efficiency." },
    { q: "Why separate queue?", a: "GPUs cost $2-8/hr each. Queue smooths bursty traffic (100x spikes). Priority queues: paid users skip ahead. Backpressure prevents OOM on GPU workers." },
    { q: "KV cache?", a: "Attention computation reuses previous tokens' keys/values. Cache per conversation avoids recomputing all prior tokens. 2-10x speedup for multi-turn chats." },
    { q: "Context window?", a: "GPT-4: 128K tokens. Longer context = more memory + slower. For long conversations: summarize old messages, keep recent + summary. RAG for external knowledge." },
    { q: "Rate limiting?", a: "Per-user token limits (100K tokens/min free, 500K paid). Per-model limits. Queue depth limits. Graceful degradation: smaller model fallback under load." },
    { q: "Safety & moderation?", a: "Input filter (fast classifier) → Generate → Output filter (toxicity, PII detection). Flagged content blocked or warning. Human review for edge cases." },
    { q: "Cost estimation?", a: "GPT-4: ~$30/1M input tokens, ~$60/1M output tokens. Average conversation: 2K tokens → $0.06-0.12. 1M conversations/day = $60-120K/day. Caching + smaller models reduce 70%." } ]},
  { id: "rag", n: "RAG (Retrieval)", i: "🔎", d: "Hard", D: DiagRAG, w: [
    { q: "Why RAG vs fine-tune?", a: "RAG: fresh data without retraining, citeable sources, cheaper ($0 vs $10K+ fine-tune). Fine-tune: change model behavior/style, domain-specific reasoning." },
    { q: "Why chunk documents?", a: "Embedding models have token limits (512-8K). Overlapping chunks (500 tokens, 50 overlap) preserve context at boundaries. Too small = loses context, too big = dilutes relevance." },
    { q: "Why vector DB?", a: "Approximate nearest neighbor (ANN) search in 1536-dim space. HNSW algorithm: O(log N) search. Pinecone, Weaviate, pgvector, Qdrant. Billions of vectors, <50ms search." },
    { q: "Top-K value?", a: "3-10 chunks typically. Too few = missing context. Too many = noise + token cost + distraction. Reranker (cross-encoder) improves precision after initial retrieval." },
    { q: "Chunking strategies?", a: "Fixed-size (simple), sentence-based (natural breaks), semantic (embed then cluster), recursive (split by heading → paragraph → sentence). Document-aware splits best." },
    { q: "Embedding model?", a: "OpenAI ada-002 (1536d), Cohere embed-v3, open-source (BGE, E5). Fine-tune embeddings on your domain for 10-30% retrieval improvement." },
    { q: "Hybrid search?", a: "Vector similarity + keyword (BM25) combined. Reciprocal Rank Fusion merges results. Handles both semantic ('machine learning') and exact ('error code 403')." },
    { q: "Evaluation?", a: "Metrics: recall@K (did we retrieve relevant docs?), answer correctness (LLM judge), faithfulness (is answer grounded in retrieved docs?). RAGAS framework." } ]},
  { id: "imggen", n: "AI Image Gen", i: "🎨", d: "Hard", D: DiagImageGen, w: [
    { q: "Why async queue?", a: "5-30s generation time. Sync HTTP would timeout. Client submits job → gets job_id → polls status endpoint or subscribes via WebSocket." },
    { q: "Why double safety?", a: "Pre-generation: fast text classifier on prompt (block obviously bad). Post-generation: NSFW image classifier on output (catches creative evasions). Blocks <0.1% of traffic." },
    { q: "Why GPU pooling?", a: "A100 GPUs: $2-4/hr each. Batch multiple requests per GPU (4-8 images). Auto-scale pool based on queue depth. Spot instances for non-urgent requests (70% cheaper)." },
    { q: "Store vs regenerate?", a: "Cache by normalized_prompt_hash. Popular prompts (logos, stock images) served from S3 CDN in <100ms. Cache hit rate: 15-25% in production." },
    { q: "Diffusion pipeline?", a: "Text → CLIP encoder → embeddings → UNet denoising (20-50 steps) → VAE decoder → image. Each step: GPU-bound. Classifier-free guidance for quality." },
    { q: "Resolution & variants?", a: "Base: 512×512 or 1024×1024. Upscaler model: 4x resolution. Generate 4 variants per prompt for user selection. Inpainting: edit specific regions." },
    { q: "Estimation?", a: "1M images/day. Avg 15 sec/image on A100. 1M × 15 / 86400 = 174 GPUs needed. × 1.5 headroom = 260 GPUs. Cost: 260 × $3/hr × 24 = $18.7K/day." },
    { q: "User experience?", a: "Progress bar: report denoising step (15/50). Live preview: show intermediate image every 5 steps. Estimated time remaining. Gallery of recent generations." } ]},
  { id: "recsys", n: "Recommendation ML", i: "🎯", d: "Hard", D: DiagRecSys, w: [
    { q: "Why 2-stage?", a: "Retrieval (fast): scan 10M items, return 1000 candidates using cheap model. Ranking (precise): score 1000 candidates with expensive model, return top 10." },
    { q: "Why feature store?", a: "Training and serving MUST use same feature computation. Feature store (Feast, Tecton): compute once, serve to both. Prevents training-serving skew." },
    { q: "Why event logging?", a: "Every impression + click + skip = training data. Log: {user, item, action, timestamp, context}. Feed into next model training cycle. Data flywheel." },
    { q: "Real-time vs batch?", a: "Batch: retrain daily/weekly on full dataset. Real-time: update user embeddings on each interaction. Hybrid: batch for base model + real-time feature updates." },
    { q: "Cold start problem?", a: "New user: use demographics, trending items, popularity. New item: content-based features (category, tags, description). Explore/exploit: show some random items." },
    { q: "Candidate generation?", a: "Collaborative filtering: users who liked X also liked Y. Content-based: item features similarity. ANN search on user/item embeddings. Multiple sources merged." },
    { q: "Ranking model?", a: "Features: user history, item features, context (time, device). Model: deep neural network predicting P(click), P(watch>30s), P(purchase). Multi-objective optimization." },
    { q: "A/B testing?", a: "Route 5% traffic to new model. Measure: CTR, watch time, DAU retention, revenue. Significance testing over 1-2 weeks. Gradual rollout if winning." } ]},
  { id: "agent", n: "AI Agent (Tools)", i: "🛠️", d: "Hard", D: DiagAIAgent, w: [
    { q: "Why ReAct loop?", a: "Reason-Act-Observe: LLM thinks about what to do → calls a tool → observes result → decides next step. Handles multi-step tasks like research, coding, data analysis." },
    { q: "Why tool router?", a: "LLM outputs structured JSON: {tool: 'search', params: {query: '...'}}. Router validates schema, checks permissions, executes in sandbox. Prevents injection attacks." },
    { q: "Why memory store?", a: "Context window is finite (128K tokens max). Long conversations: summarize old turns into memory. Vector store for facts. Working memory + long-term memory separation." },
    { q: "Infinite loop risk?", a: "Cap at N iterations (10-15). Detect repetitive actions (same tool call 3x). Timeout per step (30s). Force 'final_answer' tool after N steps." },
    { q: "Tool design?", a: "Each tool: name, description, JSON schema for params, execution function. Good descriptions = better LLM tool selection. 5-15 tools typical. Too many confuses model." },
    { q: "Planning vs reactive?", a: "Plan-then-execute: LLM creates full plan upfront, execute sequentially. ReAct: plan one step at a time. Hybrid: outline plan, adapt per step. Tree-of-thought for complex." },
    { q: "Error handling?", a: "Tool errors returned as observations. LLM can retry with different params, try alternative tool, or report failure to user. Graceful degradation." },
    { q: "Evaluation?", a: "Task completion rate, tool call accuracy, steps to completion, cost per task. Benchmark on standard tasks (WebArena, SWE-bench). Human eval for quality." } ]},
];

const DIFF_FLOW = { Easy: C.green, Medium: C.accent, Hard: C.red };

export default function App() {
  const [data, setData] = useState({ done: {}, notes: {}, weak: {}, sr: {} });
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("roadmap");
  const [loaded, setLoaded] = useState(false);
  const [exp, setExp] = useState(null);
  const [expStep, setExpStep] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [compIdx, setCompIdx] = useState(0);
  const [flowIdx, setFlowIdx] = useState(0);
  // Mock interview timer
  const [mockIdx, setMockIdx] = useState(0);
  const [mockRunning, setMockRunning] = useState(false);
  const [mockTime, setMockTime] = useState(0);
  const [mockScores, setMockScores] = useState({});
  const [mockDone, setMockDone] = useState(false);
  // Search & filter
  const [searchQ, setSearchQ] = useState("");
  const [showWeak, setShowWeak] = useState(false);
  const [startDismissed, setStartDismissed] = useState(false);
  // Estimation calculator
  const [calcDAU, setCalcDAU] = useState("100");
  const [calcActions, setCalcActions] = useState("10");
  const [calcSize, setCalcSize] = useState("1");
  const [calcRetention, setCalcRetention] = useState("5");
  const [calcPeak, setCalcPeak] = useState("3");
  // Auth (Supabase). authReady is true immediately if Supabase isn't configured.
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSending, setLoginSending] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Theme: reassign the module-level C on every render
  C = theme === "dark" ? DARK : LIGHT;

  // Spaced repetition intervals (days): 1 → 3 → 7 → 14 → 30
  const SR_INTERVALS = [1, 3, 7, 14, 30];
  const sr = data.sr || {};
  const now = Date.now();
  const dayMs = 86400000;
  const srDue = Object.entries(sr).filter(([, v]) => v && v.next <= now);
  const srReview = (id, quality) => {
    const prev = sr[id] || { interval: 0, next: 0 };
    const idx = SR_INTERVALS.indexOf(prev.interval);
    const nextIdx = quality === "good" ? Math.min(idx + 1, SR_INTERVALS.length - 1) : 0;
    const nextInterval = SR_INTERVALS[nextIdx];
    save({ ...data, sr: { ...data.sr, [id]: { interval: nextInterval, next: now + nextInterval * dayMs, lastReview: now } } });
  };
  const srSchedule = () => {
    const first = SR_INTERVALS[0];
    return { interval: first, next: now + first * dayMs, lastReview: now };
  };
  const srRemove = (id) => {
    const newSr = { ...data.sr };
    delete newSr[id];
    return newSr;
  };

  // Subscribe to auth state when Supabase is configured.
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setAuthReady(true); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Load progress whenever auth is ready or the signed-in user changes.
  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    setLoaded(false);
    (async () => {
      try {
        if (window && window.storage) {
          const r = await window.storage.get(KEY);
          if (mounted) {
            if (r && r.value) {
              const parsed = JSON.parse(r.value);
              if (parsed && typeof parsed === "object") {
                setData({ done: {}, notes: {}, weak: {}, sr: {}, ...parsed });
                if (parsed.theme) setTheme(parsed.theme);
              }
            } else {
              setData({ done: {}, notes: {}, weak: {}, sr: {} });
            }
          }
        }
      } catch (e) {}
      if (mounted) setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [authReady, session?.user?.id]);

  const save = async (nd) => {
    setData(nd);
    try {
      if (window && window.storage) {
        await window.storage.set(KEY, JSON.stringify(nd));
      }
    } catch (e) {}
  };

  // Mock interview timer effect
  useEffect(() => {
    let interval;
    if (mockRunning && mockTime > 0) {
      interval = setInterval(() => setMockTime(t => { if (t <= 1) { setMockRunning(false); return 0; } return t - 1; }), 1000);
    }
    return () => clearInterval(interval);
  }, [mockRunning, mockTime]);

  const tog = (id) => save({ ...data, done: { ...data.done, [id]: !data.done[id] } });
  const togW = (id) => {
    const wasWeak = !!data.weak[id];
    const newWeak = { ...data.weak, [id]: !wasWeak };
    const newSr = wasWeak ? srRemove(id) : { ...data.sr, [id]: srSchedule() };
    save({ ...data, weak: newWeak, sr: newSr });
  };
  const saveN = (k, t) => { save({ ...data, notes: { ...data.notes, [k]: t } }); setEditNote(null); };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    save({ ...data, theme: next });
  };
  const reset = () => save({ done: {}, notes: {}, weak: {}, sr: {} });

  if (isSupabaseConfigured() && authReady && !session) {
    const submitLogin = async () => {
      const email = loginEmail.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setLoginError("Please enter a valid email address.");
        return;
      }
      setLoginError("");
      setLoginSending(true);
      const { error } = await signInWithMagicLink(email);
      setLoginSending(false);
      if (error) { setLoginError(error.message || "Could not send link. Try again."); return; }
      setLoginSent(true);
    };
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", color: C.text, padding: 20 }}>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "40px 32px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#000", margin: "0 auto 20px", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>SD</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.headText, fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>System Design Mastery</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 26, letterSpacing: "1.5px", textTransform: "uppercase" }}>{loginSent ? "Check your email" : "Sign in to sync your progress"}</div>
          {loginSent ? (
            <>
              <div style={{ background: C.card2, border: "1px solid " + C.green + "40", borderRadius: 10, padding: "14px 16px", fontSize: 12, color: C.text, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                We sent a one-time sign-in link to <strong style={{ color: C.headText }}>{loginEmail}</strong>. Click it to continue.
              </div>
              <button className="btn" onClick={() => { setLoginSent(false); setLoginEmail(""); }} style={{ marginTop: 16, background: "transparent", border: "none", color: C.dim, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}>Use a different email</button>
            </>
          ) : (
            <>
              <input
                type="email"
                value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }}
                onKeyDown={e => { if (e.key === "Enter") submitLogin(); }}
                placeholder="you@example.com"
                autoFocus
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (loginError ? C.red : C.border), background: C.inputBg, color: C.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: 10 }}
              />
              {loginError && <div style={{ color: C.red, fontSize: 11, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{loginError}</div>}
              <button className="btn" disabled={loginSending} onClick={submitLogin} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + C.accent + "40", background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", color: "#000", fontSize: 13, fontWeight: 700, cursor: loginSending ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'DM Sans', sans-serif", opacity: loginSending ? 0.7 : 1 }}>
                <span style={{ fontSize: 14 }}>✉️</span>{loginSending ? "Sending..." : "Send magic link"}
              </button>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 18, lineHeight: 1.6 }}>No password needed. We'll email you a one-time sign-in link.</div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#000", animation: "pulse 1.5s infinite" }}>SD</div>
      <div style={{ color: C.dim, fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>Loading...</div>
    </div>
  );

  const done = data.done || {};
  const weak = data.weak || {};
  const notes = data.notes || {};
  const dCnt = Object.values(done).filter(Boolean).length;
  const total = BB.length + P.length;
  const pct = total > 0 ? Math.round((dCnt / total) * 100) : 0;
  const wCnt = Object.values(weak).filter(Boolean).length;

  const Bdg = ({ t, c, bg }) => <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 6, fontWeight: 700, background: bg || (c + "12"), color: c, border: "1px solid " + c + "25", textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'DM Sans', sans-serif" }}>{t}</span>;
  const Chk = ({ c, o }) => <div className="check-ani" onClick={o} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer", border: "2px solid " + (c ? C.green : C.checkBorder), background: c ? "linear-gradient(135deg, " + C.green + ", #059669)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.headText, fontWeight: 700, boxShadow: c ? "0 2px 8px rgba(16,185,129,0.3)" : "none" }}>{c ? "✓" : ""}</div>;
  const Str = ({ a, o }) => <div className="star-ani" onClick={o} style={{ cursor: "pointer", fontSize: 14, color: a ? C.accent : C.starOff, textShadow: a ? "0 0 8px rgba(245,158,11,0.4)" : "none" }}>★</div>;
  const isDark = theme === "dark";
  const cs = { background: C.card, border: "1px solid " + C.border, borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", color: C.text }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${C.scrollThumb}; border-radius: 10px }
        ::-webkit-scrollbar-thumb:hover { background: ${C.scrollHover} }
        @keyframes fu { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.7 } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 5px rgba(245,158,11,0.1) } 50% { box-shadow: 0 0 20px rgba(245,158,11,0.15) } }
        @keyframes progressGlow { 0%,100% { filter: brightness(1) } 50% { filter: brightness(1.3) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        .fu { animation: fu 0.4s cubic-bezier(0.22, 1, 0.36, 1) }
        .fade-in { animation: fadeIn 0.3s ease }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) }
        .btn { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1) !important; }
        .btn:hover { filter: brightness(1.25); transform: translateY(-1px) }
        .btn:active { transform: translateY(0) scale(0.98) }
        .card { transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
        .card:hover { border-color: ${C.cardHover} !important; transform: translateY(-1px); box-shadow: 0 4px 24px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'} }
        .row { transition: all 0.15s ease; border-radius: 8px !important; }
        .row:hover { background: ${C.hoverBg} }
        .glow-border { position: relative; }
        .glow-border::after { content: ''; position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(135deg, rgba(245,158,11,0.1), transparent, rgba(6,182,212,0.1)); z-index: -1; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .glow-border:hover::after { opacity: 1; }
        textarea { font-family: 'IBM Plex Mono', monospace; transition: border-color 0.2s; }
        textarea:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 2px ${C.accent}15; }
        a { transition: all 0.2s ease; }
        a:hover { filter: brightness(1.2); }
        .check-ani { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
        .check-ani:hover { transform: scale(1.15); }
        .check-ani:active { transform: scale(0.9); }
        .star-ani { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
        .star-ani:hover { transform: scale(1.3); }
        .nav-tab { position: relative; overflow: hidden; }
        .nav-tab::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(245,158,11,0.08), transparent); opacity: 0; transition: opacity 0.2s; }
        .nav-tab:hover::before { opacity: 1; }
      `}</style>

      <div style={{ background: C.headerBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid " + C.headerBorder, padding: "14px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#000", boxShadow: "0 2px 12px rgba(245,158,11,0.3)" }}>SD</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.3px" }}>
                <span style={{ color: C.headText }}>System Design</span>
                <span style={{ color: C.accent, marginLeft: 5 }}>Mastery</span>
              </div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 1 }}>FAANG Interview Prep</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="btn" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid " + C.border, background: C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", padding: 0 }}>{isDark ? "☀️" : "🌙"}</button>
            <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 700, color: C.accent, fontFamily: "'Outfit', sans-serif" }}>{pct}%</div>
            <div style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "pulse 2s infinite" }}></span>
              {dCnt}/{total}
            </div>
            {wCnt > 0 && <div style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: C.accent }}>★ {wCnt}</div>}
            {session && <button className="btn" onClick={signOut} title={"Signed in as " + (session.user.email || "user") + " · click to sign out"} style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: C.dim, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, maxWidth: 180, fontFamily: "'DM Sans', sans-serif" }}>
              <span style={{ fontSize: 11 }}>👤</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email || "Sign out"}</span>
            </button>}
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "10px auto 0", background: C.progressTrack, borderRadius: 6, height: 5, overflow: "hidden" }}>
          <div style={{ width: pct + "%", background: "linear-gradient(90deg, " + C.accent + ", " + C.cyan + ", " + C.accent + ")", backgroundSize: "200% 100%", animation: "shimmer 3s ease infinite", height: "100%", transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)", borderRadius: 6, boxShadow: "0 0 12px rgba(245,158,11,0.3)" }} />
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px 50px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, borderRadius: 14, padding: 4, border: "1px solid " + C.border, overflowX: "auto", boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
          {[{v:"roadmap",l:"Roadmap",i:"🗺️"},{v:"glossary",l:"Glossary",i:"📖"},{v:"cheat",l:"Cheat",i:"📊"},{v:"method",l:"Method",i:"🎯"},{v:"blocks",l:"Concepts",i:"🧱"},{v:"deep",l:"Deep Dive",i:"🔬"},{v:"tradeoffs",l:"Trade-offs",i:"⚖️"},{v:"nfr",l:"NFR",i:"🛡️"},{v:"problems",l:"Problems",i:"🏗️"},{v:"flows",l:"Flows",i:"🎨"},{v:"schemas",l:"Schemas",i:"🗃️"},{v:"script",l:"Script",i:"🎤"},{v:"calc",l:"Calculator",i:"🧮"},{v:"mock",l:"Mock",i:"⏱️"},{v:"anti",l:"Mistakes",i:"🚫"},{v:"res",l:"Links",i:"📚"}].map(t => (
            <button key={t.v} className="btn nav-tab" onClick={() => setView(t.v)} style={{
              flex: "0 0 auto", padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
              background: view === t.v ? "linear-gradient(135deg, " + C.accent + "18, " + C.accent + "08)" : "transparent",
              color: view === t.v ? C.accent : C.dim,
              boxShadow: view === t.v ? "0 0 12px rgba(245,158,11,0.08)" : "none",
              borderBottom: view === t.v ? "2px solid " + C.accent : "2px solid transparent",
            }}>
              <span style={{ marginRight: 4, fontSize: 13 }}>{t.i}</span>{t.l}
            </button>
          ))}
        </div>

        {/* Search bar + Review Weak + Export */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setShowWeak(false); }} placeholder="Search concepts, problems, schemas, glossary..." style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 10, border: "1px solid " + C.border, background: C.inputBg, color: C.text, fontSize: 11, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.4 }}>🔍</span>
            {searchQ && <span onClick={() => setSearchQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, cursor: "pointer", color: C.dim, fontWeight: 700 }}>✕</span>}
          </div>
          {wCnt > 0 && <button className="btn" onClick={() => { setShowWeak(!showWeak); setSearchQ(""); }} style={{ padding: "8px 12px", borderRadius: 10, border: showWeak ? "1px solid " + C.accent : "1px solid " + C.border, background: showWeak ? C.accent + "15" : C.card, color: showWeak ? C.accent : C.dim, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans'" }}>★ Review Weak ({wCnt}{srDue.length > 0 ? ` · ${srDue.length} due` : ""})</button>}
          <button className="btn" onClick={() => {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pw = 190; let y = 20;
            const addLine = () => { if (y > 270) { doc.addPage(); y = 20; } };
            // Title
            doc.setFontSize(20); doc.setTextColor(217, 119, 6); doc.text("System Design Mastery", 15, y); y += 8;
            doc.setFontSize(10); doc.setTextColor(100); doc.text("Progress Report — " + new Date().toLocaleDateString(), 15, y); y += 10;
            // Progress bar
            doc.setDrawColor(200); doc.setFillColor(240, 240, 240); doc.roundedRect(15, y, pw, 6, 3, 3, "F");
            doc.setFillColor(217, 119, 6); doc.roundedRect(15, y, Math.max(2, pw * pct / 100), 6, 3, 3, "F");
            doc.setFontSize(9); doc.setTextColor(80); doc.text(pct + "% complete (" + dCnt + "/" + total + ")", 15 + pw / 2, y + 4.5, { align: "center" }); y += 14;
            // Stats
            doc.setFontSize(12); doc.setTextColor(30); doc.text("Summary", 15, y); y += 6;
            doc.setFontSize(9); doc.setTextColor(60);
            const bbD = BB.filter(b => done[b.id]).length; const eD = P.filter(p => p.d === "Easy" && done[p.id]).length;
            const mD = P.filter(p => p.d === "Medium" && done[p.id]).length; const hD = P.filter(p => p.d === "Hard" && done[p.id]).length;
            doc.text("Concepts: " + bbD + "/" + BB.length + "   Easy: " + eD + "/" + P.filter(p => p.d === "Easy").length + "   Medium: " + mD + "/" + P.filter(p => p.d === "Medium").length + "   Hard: " + hD + "/" + P.filter(p => p.d === "Hard").length, 15, y); y += 5;
            doc.text("Starred for review: " + wCnt + " items", 15, y); y += 10;
            // Completed Concepts
            const dBB = BB.filter(b => done[b.id]);
            if (dBB.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(16, 185, 129); doc.text("Completed Concepts (" + dBB.length + ")", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); dBB.forEach(b => { addLine(); doc.text("  " + b.i + " " + b.n + " — " + b.cat, 15, y); y += 4.5; }); y += 6; }
            // Completed Problems
            const dP = P.filter(p => done[p.id]);
            if (dP.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(59, 130, 246); doc.text("Completed Problems (" + dP.length + ")", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); dP.forEach(p => { addLine(); doc.text("  [" + p.d + "] " + p.n, 15, y); y += 4.5; }); y += 6; }
            // Starred items
            const sB = BB.filter(b => weak[b.id]); const sP = P.filter(p => weak[p.id]);
            if (sB.length + sP.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(217, 119, 6); doc.text("Starred / Weak Areas (" + (sB.length + sP.length) + ")", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); sB.forEach(b => { addLine(); doc.text("  [Concept] " + b.n, 15, y); y += 4.5; }); sP.forEach(p => { addLine(); doc.text("  [Problem] " + p.n, 15, y); y += 4.5; }); y += 6; }
            // Spaced Repetition Schedule
            const srItems = Object.entries(sr).filter(([,v]) => v);
            if (srItems.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(139, 92, 246); doc.text("Spaced Repetition Schedule", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); srItems.forEach(([id, v]) => { addLine(); const it = BB.find(b => b.id === id) || P.find(p => p.id === id); const name = it ? it.n : id; const nextDate = new Date(v.next).toLocaleDateString(); doc.text("  " + name + " — next review: " + nextDate + " (interval: " + v.interval + "d)", 15, y); y += 4.5; }); y += 6; }
            // Notes
            const nEntries = Object.entries(notes).filter(([,v]) => v);
            if (nEntries.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(6, 182, 212); doc.text("Your Notes", 15, y); y += 6; nEntries.forEach(([k, v]) => { addLine(); doc.setFontSize(9); doc.setTextColor(30); const it = BB.find(b => b.id === k) || P.find(p => p.id === k); doc.text(it ? it.n : k, 15, y); y += 4.5; doc.setTextColor(80); const lines = doc.splitTextToSize(v, pw - 10); lines.forEach(ln => { addLine(); doc.text("  " + ln, 15, y); y += 4; }); y += 4; }); }
            // Footer
            addLine(); doc.setFontSize(8); doc.setTextColor(150); doc.text("Generated by System Design Mastery App — " + new Date().toISOString(), 15, y);
            doc.save("sd-mastery-progress.pdf");
          }} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: C.dim, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans'" }}>📄 Export PDF</button>
        </div>

        {/* Review Weak mode with Spaced Repetition */}
        {showWeak && wCnt > 0 && (() => {
          const allWeak = [...BB.filter(b => weak[b.id]).map(b => ({ ...b, type: "concept" })), ...P.filter(p => weak[p.id]).map(p => ({ ...p, type: "problem" }))];
          const dueItems = allWeak.filter(it => sr[it.id] && sr[it.id].next <= now);
          const upcomingItems = allWeak.filter(it => sr[it.id] && sr[it.id].next > now);
          const unscheduled = allWeak.filter(it => !sr[it.id]);
          return (
          <div className="fu" style={{ marginBottom: 20 }}>
            {/* Due Now section */}
            {dueItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.red, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans'" }}>🔴 Due Now ({dueItems.length})</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                {dueItems.map(it => (
                  <div key={it.id} className="card" style={{ ...cs, padding: "10px 14px", marginBottom: 6, borderLeft: "3px solid " + C.red }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{it.i}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{it.n}</div>
                        <div style={{ fontSize: 9, color: C.dim }}>{it.type === "concept" ? it.cat + " · Concept" : ""}{it.type === "problem" ? <><Bdg t={it.d} c={DC[it.d].text} bg={DC[it.d].bg} /> Problem</> : ""} · interval: {sr[it.id].interval}d</div>
                      </div>
                      <Chk c={done[it.id]} o={() => tog(it.id)} />
                      <Str a={true} o={() => togW(it.id)} />
                    </div>
                    <div style={{ display: "flex", gap: 6, marginLeft: 24 }}>
                      <button className="btn" onClick={() => srReview(it.id, "good")} style={{ padding: "4px 12px", borderRadius: 7, background: C.green + "15", border: "1px solid " + C.green + "30", color: C.green, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans'" }}>✓ Good → {SR_INTERVALS[Math.min(SR_INTERVALS.indexOf(sr[it.id].interval) + 1, SR_INTERVALS.length - 1)]}d</button>
                      <button className="btn" onClick={() => srReview(it.id, "again")} style={{ padding: "4px 12px", borderRadius: 7, background: C.red + "15", border: "1px solid " + C.red + "30", color: C.red, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans'" }}>✗ Again → 1d</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Upcoming reviews */}
            {upcomingItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.cyan, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans'" }}>📅 Upcoming ({upcomingItems.length})</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                {upcomingItems.sort((a, b) => sr[a.id].next - sr[b.id].next).map(it => {
                  const daysLeft = Math.ceil((sr[it.id].next - now) / dayMs);
                  return (
                  <div key={it.id} className="card" style={{ ...cs, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{it.i}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{it.n}</div>
                      <div style={{ fontSize: 9, color: C.dim }}>{it.type === "concept" ? it.cat : it.d} · review in <span style={{ color: C.cyan, fontWeight: 700 }}>{daysLeft}d</span> · interval: {sr[it.id].interval}d</div>
                    </div>
                    <Str a={true} o={() => togW(it.id)} />
                  </div>
                  );
                })}
              </div>
            )}
            {/* Unscheduled starred items */}
            {unscheduled.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans'" }}>★ Starred ({unscheduled.length})</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                {unscheduled.map(it => (
                  <div key={it.id} className="card" style={{ ...cs, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{it.i}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{it.n}</div>
                      <div style={{ fontSize: 9, color: C.dim }}>{it.type === "concept" ? it.cat + " · Concept" : ""}{it.type === "problem" ? <><Bdg t={it.d} c={DC[it.d].text} bg={DC[it.d].bg} /> Problem</> : ""}</div>
                    </div>
                    <Chk c={done[it.id]} o={() => tog(it.id)} />
                    <Str a={true} o={() => togW(it.id)} />
                  </div>
                ))}
              </div>
            )}
            {dueItems.length === 0 && upcomingItems.length > 0 && (
              <div style={{ textAlign: "center", padding: "12px", borderRadius: 10, background: C.green + "08", border: "1px solid " + C.green + "20" }}>
                <span style={{ fontSize: 11, color: C.green, fontFamily: "'DM Sans'", fontWeight: 600 }}>All caught up! Next review in {Math.ceil((Math.min(...upcomingItems.map(it => sr[it.id].next)) - now) / dayMs)} day(s)</span>
              </div>
            )}
          </div>
          );
        })()}

        {/* ═══ START HERE BANNER ═══ */}
        {view === "roadmap" && !startDismissed && pct < 10 && !showWeak && (
          <div className="fu" style={{ ...cs, marginBottom: 16, padding: "20px 18px", background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.06))", borderColor: C.accent + "25", position: "relative" }}>
            <button onClick={() => setStartDismissed(true)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>✕</button>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.headText, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>🚀 Start Here — Your Learning Path</div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Sans'", marginBottom: 16, lineHeight: 1.5 }}>Follow these 5 phases in order. Each builds on the previous one.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { phase: 1, title: "Foundation", desc: "Learn the vocabulary & interview framework", tabs: ["glossary", "cheat", "method"], color: C.accent, icon: "📖" },
                { phase: 2, title: "Concepts", desc: "Master 20 building blocks + deep dives", tabs: ["blocks", "deep"], color: C.cyan, icon: "🧱" },
                { phase: 3, title: "Decisions", desc: "Learn trade-offs & non-functional requirements", tabs: ["tradeoffs", "nfr"], color: C.purple, icon: "⚖️" },
                { phase: 4, title: "Practice", desc: "Design real systems — problems, flows, schemas", tabs: ["problems", "flows", "schemas"], color: C.blue, icon: "🏗️" },
                { phase: 5, title: "Interview", desc: "Scripts, estimation, mock interviews, mistakes to avoid", tabs: ["script", "calc", "mock", "anti"], color: C.green, icon: "🎤" },
              ].map(p => (
                <div key={p.phase} className="card" onClick={() => { setView(p.tabs[0]); setStartDismissed(true); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.card2, border: "1px solid " + C.border, cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: p.color + "15", border: "1px solid " + p.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: p.color, fontFamily: "'DM Sans'", letterSpacing: "0.5px" }}>PHASE {p.phase}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{p.title}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Sans'", marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <span style={{ fontSize: 12, color: p.color, opacity: 0.5 }}>→</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: C.dim, fontFamily: "'DM Sans'", fontStyle: "italic", textAlign: "center" }}>Click any phase to jump in, or follow the 8-week Roadmap below ↓</div>
          </div>
        )}

        {view === "roadmap" && !showWeak && (() => {
          const bbDone = BB.filter(b => done[b.id]).length;
          const eDone = P.filter(p => p.d === "Easy" && done[p.id]).length;
          const mDone = P.filter(p => p.d === "Medium" && done[p.id]).length;
          const hDone = P.filter(p => p.d === "Hard" && done[p.id]).length;
          return (
          <div className="fu">
            {/* Stats Dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Concepts", value: bbDone + "/" + BB.length, icon: "🧱", color: C.cyan, pct: BB.length > 0 ? (bbDone / BB.length * 100) : 0 },
                { label: "Easy", value: eDone + "/" + P.filter(p => p.d === "Easy").length, icon: "🟢", color: C.green, pct: P.filter(p => p.d === "Easy").length > 0 ? (eDone / P.filter(p => p.d === "Easy").length * 100) : 0 },
                { label: "Medium", value: mDone + "/" + P.filter(p => p.d === "Medium").length, icon: "🟡", color: C.accent, pct: P.filter(p => p.d === "Medium").length > 0 ? (mDone / P.filter(p => p.d === "Medium").length * 100) : 0 },
                { label: "Hard", value: hDone + "/" + P.filter(p => p.d === "Hard").length, icon: "🔴", color: C.red, pct: P.filter(p => p.d === "Hard").length > 0 ? (hDone / P.filter(p => p.d === "Hard").length * 100) : 0 },
              ].map((s, i) => (
                <div key={i} className="card" style={{ ...cs, padding: "14px 12px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: Math.max(2, s.pct) + "%", background: "linear-gradient(180deg, " + s.color + "12, " + s.color + "06)", transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quote of the day */}
            <div style={{ ...cs, padding: "14px 16px", marginBottom: 16, borderColor: C.accent + "15", background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.03))" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accent + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💬</div>
                <div>
                  <div style={{ fontSize: 12, color: C.accent, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontStyle: "italic" }}>"{QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]}"</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 3 }}>Daily motivation</div>
                </div>
              </div>
            </div>

            {/* Week cards */}
            {WEEKS.map(w => {
              const wD = w.items.filter(id => done[id]).length;
              const wT = w.items.length;
              const isB = w.type === "b";
              const isComplete = wD === wT && wT > 0;
              return (
                <div key={w.w} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden", borderColor: isComplete ? C.green + "30" : C.border }}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: w.c + "12", border: "1px solid " + w.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{w.e}</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Bdg t={"Week " + w.w} c={w.c} />
                            {isComplete && <span style={{ fontSize: 10, color: C.green }}>✓ Complete</span>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>{w.t}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: isComplete ? C.green : w.c, fontFamily: "'Outfit', sans-serif" }}>{wD}/{wT}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{w.f}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {w.items.map(id => {
                      const it = isB ? BB.find(b => b.id === id) : P.find(p => p.id === id);
                      if (!it) return null;
                      const dn = !!done[id];
                      const wk = !!weak[id];
                      return (
                        <div key={id} className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8 }}>
                          <Chk c={dn} o={() => tog(id)} />
                          <Str a={wk} o={() => togW(id)} />
                          <span onClick={() => { setView(isB ? "blocks" : "problems"); setExp(id); setShowWeak(false); setSearchQ(""); }} style={{ fontSize: 11, color: dn ? C.dim : "#d1d5db", textDecoration: dn ? "line-through" : "none", flex: 1, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>{it.n} <span style={{ fontSize: 8, color: C.accent, opacity: 0.6 }}>→</span></span>
                          {!isB && it.d && DC[it.d] && <Bdg t={it.d} c={DC[it.d].text} bg={DC[it.d].bg} />}
                        </div>
                      );
                    })}
                    </div>
                    <div style={{ marginTop: 10, padding: "8px 10px", background: "linear-gradient(135deg, " + w.c + "08, transparent)", borderRadius: 8, border: "1px solid " + w.c + "12" }}>
                      <span style={{ fontSize: 10, color: w.c, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>💡 {w.tip}</span>
                    </div>
                  </div>
                  <div style={{ background: C.muted, height: 4 }}>
                    <div style={{ width: (wT > 0 ? (wD / wT) * 100 : 0) + "%", background: "linear-gradient(90deg, " + w.c + ", " + w.c + "cc)", height: "100%", transition: "width 0.5s cubic-bezier(0.22, 1, 0.36, 1)", borderRadius: "0 4px 4px 0", boxShadow: wD > 0 ? "0 0 8px " + w.c + "30" : "none" }} />
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}

        {view === "blocks" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? BB.filter(b => b.n.toLowerCase().includes(sq) || b.cat.toLowerCase().includes(sq) || b.desc.toLowerCase().includes(sq)) : BB;
          return (
          <div className="fu">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🧱 Building Blocks {sq && <span style={{ color: C.accent }}>({filtered.length} results)</span>}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, fontFamily: "'Outfit', sans-serif" }}>{BB.filter(b => done[b.id]).length}/{BB.length}</div>
            </div>
            {filtered.map(b => {
              const dn = !!done[b.id];
              const wk = !!weak[b.id];
              const op = exp === b.id;
              return (
                <div key={b.id} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <Chk c={dn} o={() => tog(b.id)} />
                    <Str a={wk} o={() => togW(b.id)} />
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{b.i}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: dn ? C.dim : "#e5e7eb", fontFamily: "'DM Sans', sans-serif" }}>{b.n}</div>
                      <div style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{b.cat} · Depth {b.d}</div>
                    </div>
                    <button className="btn" onClick={() => setExp(op ? null : b.id)} style={{ background: op ? C.accent + "10" : "transparent", border: "1px solid " + (op ? C.accent + "30" : C.border), borderRadius: 7, color: op ? C.accent : C.dim, padding: "5px 8px", cursor: "pointer", fontSize: 9, fontFamily: "inherit" }}>{op ? "▲" : "▼"}</button>
                  </div>
                  {op && (
                    <div style={{ padding: "0 14px 14px" }} className="fu">
                      <div style={{ background: "linear-gradient(135deg, " + C.card2 + ", " + C.bg + ")", borderRadius: 10, padding: "14px 16px", border: "1px solid " + C.border, marginBottom: 8 }}>
                        <div style={{ fontSize: 8, color: C.purple, fontWeight: 700, marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>📖 What Is It?</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>{b.desc}</div>
                      </div>
                      <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", border: "1px solid " + C.cyan + "12", marginBottom: 8 }}>
                        <div style={{ fontSize: 8, color: C.cyan, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>🔑 Key Concepts</div>
                        {b.pts.map((p, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                            <span style={{ color: C.cyan, fontSize: 8, marginTop: 4, flexShrink: 0 }}>●</span>
                            <span style={{ fontSize: 11, color: C.subText, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{p}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div style={{ background: "linear-gradient(135deg, " + C.green + "08, transparent)", borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.green + "15" }}>
                          <div style={{ fontSize: 8, color: C.green, fontWeight: 700, marginBottom: 5, letterSpacing: "0.5px" }}>✅ USE WHEN</div>
                          <div style={{ fontSize: 11, color: "#4ade80", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{b.use}</div>
                        </div>
                        <div style={{ background: "linear-gradient(135deg, " + C.red + "08, transparent)", borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.red + "15" }}>
                          <div style={{ fontSize: 8, color: C.red, fontWeight: 700, marginBottom: 5, letterSpacing: "0.5px" }}>❌ DON'T USE</div>
                          <div style={{ fontSize: 11, color: "#f87171", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{b.dont}</div>
                        </div>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, " + C.accent + "08, transparent)", borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.accent + "15" }}>
                        <div style={{ fontSize: 8, color: C.accent, fontWeight: 700, marginBottom: 5, letterSpacing: "0.5px" }}>🌍 REAL WORLD EXAMPLE</div>
                        <div style={{ fontSize: 11, color: "#fbbf24", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{b.rw}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

        {view === "problems" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? P.filter(p => p.n.toLowerCase().includes(sq) || p.d.toLowerCase().includes(sq)) : P;
          return (
          <div className="fu">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🏗️ Practice Problems {sq && <span style={{ color: C.accent }}>({filtered.length} results)</span>}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, fontFamily: "'Outfit', sans-serif" }}>{P.filter(p => done[p.id]).length}/{P.length}</div>
            </div>
            {["Easy", "Medium", "Hard"].map(diff => {
              const dProbs = filtered.filter(p => p.d === diff);
              if (sq && dProbs.length === 0) return null;
              return (
              <div key={diff} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", background: DC[diff].bg + "40", borderRadius: 10, border: "1px solid " + DC[diff].text + "15" }}>
                  <Bdg t={diff} c={DC[diff].text} bg={DC[diff].bg} />
                  <div style={{ flex: 1, height: 3, background: C.muted, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: (P.filter(p => p.d === diff).length > 0 ? P.filter(p => p.d === diff && done[p.id]).length / P.filter(p => p.d === diff).length * 100 : 0) + "%", height: "100%", background: DC[diff].text, borderRadius: 2, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: DC[diff].text, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{P.filter(p => p.d === diff && done[p.id]).length}/{P.filter(p => p.d === diff).length}</span>
                </div>
                {dProbs.map(p => {
                  const dn = !!done[p.id];
                  const wk = !!weak[p.id];
                  const op = exp === p.id;
                  return (
                    <div key={p.id} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden" }}>
                      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <Chk c={dn} o={() => tog(p.id)} />
                        <Str a={wk} o={() => togW(p.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: dn ? C.dim : "#e5e7eb", textDecoration: dn ? "line-through" : "none", fontFamily: "'DM Sans', sans-serif" }}>{p.n}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                            {p.tags.map(t => <span key={t} style={{ fontSize: 9, color: C.dim, background: C.card2, padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, fontFamily: "'DM Sans', sans-serif" }}>{t}</span>)}
                          </div>
                        </div>
                        <button className="btn" onClick={() => setExp(op ? null : p.id)} style={{ background: op ? C.accent + "10" : "transparent", border: "1px solid " + (op ? C.accent + "30" : C.border), borderRadius: 7, color: op ? C.accent : C.dim, padding: "5px 8px", cursor: "pointer", fontSize: 9, fontFamily: "inherit", flexShrink: 0 }}>{op ? "▲" : "▼"}</button>
                      </div>
                      {op && (
                        <div style={{ padding: "0 14px 14px" }} className="fu">
                          <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 8 }}>
                            {p.s.map((st, si) => {
                              const sc = RESHADED[Math.min(si, 7)] ? RESHADED[Math.min(si, 7)].c : C.dim;
                              return (
                                <div key={si} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
                                  <div style={{ width: 22, height: 22, borderRadius: 7, background: sc + "12", border: "1px solid " + sc + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: sc, flexShrink: 0 }}>{si + 1}</div>
                                  <div style={{ fontSize: 11, color: C.subText, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{st}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <a href={p.v} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: "7px 14px", borderRadius: 8, background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>▶ Watch Video</a>
                            <button className="btn" onClick={() => { setEditNote(editNote === p.id ? null : p.id); setNoteText(notes[p.id] || ""); }} style={{ padding: "7px 14px", borderRadius: 8, background: editNote === p.id ? C.accent + "10" : "transparent", border: "1px solid " + (editNote === p.id ? C.accent + "30" : C.border), color: editNote === p.id ? C.accent : C.dim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>📝 Notes{notes[p.id] ? " ✓" : ""}</button>
                          </div>
                          {editNote === p.id && (
                            <div style={{ marginTop: 8 }}>
                              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add your notes, key learnings, or gotchas..." style={{ width: "100%", minHeight: 70, padding: "10px 12px", borderRadius: 10, background: C.bg, border: "1px solid " + C.border, color: C.text, fontSize: 11, resize: "vertical", outline: "none", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }} />
                              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <button className="btn" onClick={() => saveN(p.id, noteText)} style={{ padding: "6px 14px", borderRadius: 7, background: "linear-gradient(135deg, " + C.green + "15, " + C.green + "08)", border: "1px solid " + C.green + "25", color: C.green, fontSize: 10, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600 }}>Save Notes</button>
                                <button className="btn" onClick={() => setEditNote(null)} style={{ padding: "6px 14px", borderRadius: 7, background: "transparent", border: "1px solid " + C.border, color: C.dim, fontSize: 10, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>
          );
        })()}

        {view === "flows" && !showWeak && (() => {
          const f = FLOWS[flowIdx];
          const D = f.D;
          return (
            <div className="fu">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🎨 Architecture Flows</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.purple, fontFamily: "'Outfit', sans-serif" }}>{flowIdx + 1}/{FLOWS.length}</div>
              </div>

              {/* Flow chip selector */}
              <div style={{ display: "flex", gap: 5, marginBottom: 14, overflowX: "auto", paddingBottom: 6 }}>
                {FLOWS.map((flow, i) => (
                  <button key={flow.id} className="btn" onClick={() => setFlowIdx(i)} style={{
                    flex: "0 0 auto",
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid " + (flowIdx === i ? DIFF_FLOW[flow.d] + "40" : C.border),
                    background: flowIdx === i ? DIFF_FLOW[flow.d] + "12" : "transparent",
                    color: flowIdx === i ? DIFF_FLOW[flow.d] : C.dim,
                    fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                    boxShadow: flowIdx === i ? "0 0 8px " + DIFF_FLOW[flow.d] + "15" : "none",
                  }}>
                    <span style={{ marginRight: 4 }}>{flow.i}</span>{flow.n}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div className="card" style={{ ...cs, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, " + C.card + ", " + DIFF_FLOW[f.d] + "06)" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.headText, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Outfit', sans-serif" }}>
                    <span style={{ fontSize: 24 }}>{f.i}</span>{f.n}
                  </div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 3, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>High-Level Architecture</div>
                </div>
                <Bdg t={f.d} c={DIFF_FLOW[f.d]} />
              </div>

              {/* Diagram */}
              <div className="card" style={{ ...cs, padding: 16, marginBottom: 12, background: C.card }}>
                <D />
              </div>

              {/* Why cards */}
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🧠 Why this design</div>
              {f.w.map((w, i) => (
                <div key={i} className="card" style={{ ...cs, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{w.q}</div>
                  <div style={{ fontSize: 11, color: C.subText, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{w.a}</div>
                </div>
              ))}

              {/* Prev/Next */}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn" onClick={() => setFlowIdx(i => Math.max(0, i - 1))} disabled={flowIdx === 0} style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  border: "1px solid " + C.border, background: C.card,
                  color: flowIdx === 0 ? C.dim : C.text,
                  fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                  cursor: flowIdx === 0 ? "not-allowed" : "pointer",
                  opacity: flowIdx === 0 ? 0.4 : 1,
                }}>← Previous</button>
                <button className="btn" onClick={() => setFlowIdx(i => Math.min(FLOWS.length - 1, i + 1))} disabled={flowIdx === FLOWS.length - 1} style={{
                  flex: 2, padding: "12px", borderRadius: 10,
                  border: "1px solid " + C.accent + "30",
                  background: "linear-gradient(135deg, " + C.accent + "15, " + C.accent + "08)", color: C.accent,
                  fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                  cursor: flowIdx === FLOWS.length - 1 ? "not-allowed" : "pointer",
                  opacity: flowIdx === FLOWS.length - 1 ? 0.4 : 1,
                  boxShadow: flowIdx < FLOWS.length - 1 ? "0 2px 12px rgba(245,158,11,0.1)" : "none",
                }}>Next Flow →</button>
              </div>
            </div>
          );
        })()}

        {view === "method" && !showWeak && (
          <div className="fu">
            {/* RESHADED word banner */}
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.04))", borderColor: C.accent + "15" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                {RESHADED.map((s, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: s.c + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: s.c }}>{s.l}</div>
                ))}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>The 45-Minute Framework</div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Follow this structure for every system design interview</div>
            </div>

            {RESHADED.map((s, i) => {
              const op = expStep === i;
              return (
                <div key={i} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden", cursor: "pointer", borderColor: op ? s.c + "25" : C.border }} onClick={() => setExpStep(op ? null : i)}>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, " + s.c + "18, " + s.c + "08)", border: "1px solid " + s.c + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: s.c, flexShrink: 0 }}>{s.l}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{s.n}</div>
                        <div style={{ fontSize: 9, color: s.c, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{s.t}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? s.c + "12" : "transparent", border: "1px solid " + (op ? s.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? s.c : C.dim, fontSize: 9 }}>{op ? "▲" : "▼"}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{s.d}</div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + s.c + "15" }}>
                        <div style={{ fontSize: 9, color: s.c, fontWeight: 700, marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>Key Questions to Ask:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {s.q.map((q, j) => (
                          <span key={j} style={{ fontSize: 10, color: C.subText, background: s.c + "08", border: "1px solid " + s.c + "15", padding: "4px 8px", borderRadius: 6, fontFamily: "'DM Sans', sans-serif" }}>{q}</span>
                        ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.red, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📋 Grading Rubric</div>
            </div>
            {RUBRIC.map((r, i) => (
              <div key={i} className="card" style={{ ...cs, padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{r.a}</span>
                  <Bdg t={r.w} c={C.accent} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "linear-gradient(135deg, " + C.green + "06, transparent)", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.green + "12" }}>
                    <div style={{ fontSize: 8, color: C.green, fontWeight: 700, marginBottom: 3, letterSpacing: "0.5px" }}>✅ GOOD</div>
                    <div style={{ fontSize: 10, color: "#4ade80", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{r.g}</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, " + C.red + "06, transparent)", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.red + "12" }}>
                    <div style={{ fontSize: 8, color: C.red, fontWeight: 700, marginBottom: 3, letterSpacing: "0.5px" }}>❌ BAD</div>
                    <div style={{ fontSize: 10, color: "#f87171", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{r.b}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ HOW TO TALK / SCRIPT VIEW ═══ */}
        {view === "script" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.04))", borderColor: C.accent + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🎤 How to Talk in a System Design Interview</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Word-for-word scripts for each phase — practice saying these out loud</div>
            </div>
            {HOW_TO_TALK.map((ht, hi) => {
              const op = exp === ht.id;
              return (
                <div key={ht.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden", borderLeft: "3px solid " + ht.c }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : ht.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: ht.c + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: ht.c, fontWeight: 800, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>{hi + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{ht.phase}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? ht.c + "12" : "transparent", border: "1px solid " + (op ? ht.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? ht.c : C.dim, fontSize: 9 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      <div style={{ background: "linear-gradient(135deg, " + ht.c + "06, " + C.bg + ")", borderRadius: 10, padding: "14px 16px", border: "1px solid " + ht.c + "15", marginBottom: 10 }}>
                        <div style={{ fontSize: 8, color: ht.c, fontWeight: 700, marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>💬 Say This</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>{ht.script}</div>
                      </div>
                      <div style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.green + "10" }}>
                        <div style={{ fontSize: 8, color: C.green, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>💡 Pro Tips</div>
                        {ht.tips.map((tip, ti) => (
                          <div key={ti} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                            <span style={{ color: C.green, fontSize: 8, marginTop: 4, flexShrink: 0 }}>●</span>
                            <span style={{ fontSize: 11, color: "#4ade80", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ GLOSSARY VIEW ═══ */}
        {view === "glossary" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? GLOSSARY.filter(g => g.term.toLowerCase().includes(sq) || g.def.toLowerCase().includes(sq)) : GLOSSARY;
          return (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(6,182,212,0.04))", borderColor: C.cyan + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>📖 System Design Glossary</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>{GLOSSARY.length} terms — everything you need to speak fluently in interviews</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 8 }}>
            {filtered.map((g, gi) => (
              <div key={gi} className="card" style={{ ...cs, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{g.term}</div>
                <div style={{ fontSize: 11, color: C.subText, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{g.def}</div>
              </div>
            ))}
            </div>
          </div>
          );
        })()}

        {view === "cheat" && !showWeak && (
          <div className="fu">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[{ t: "🔢 Numbers", k: "nums", c: C.accent }, { t: "📏 Storage Sizes", k: "storage", c: C.cyan }, { t: "⏱️ Latency", k: "latency", c: C.green }, { t: "🚀 Throughput", k: "throughput", c: C.blue }, { t: "🌐 Network / Disk", k: "network", c: C.orange }].map(sec => (
              <div key={sec.k} className="card" style={{ ...cs, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: sec.c, fontWeight: 700, marginBottom: 8, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}>{sec.t}</div>
                {EST[sec.k].map((n, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < EST[sec.k].length - 1 ? "1px solid " + C.border : "none", gap: 6 }}>
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Sans', sans-serif" }}>{n.l}</span>
                    <span style={{ fontSize: 9, color: sec.c, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{n.v}</span>
                  </div>
                ))}
              </div>
            ))}
            </div>

            <div className="card" style={{ ...cs, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.purple, fontWeight: 700, marginBottom: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}>🧮 Estimation Formulas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6 }}>
              {EST.formulas.map((f, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px", border: "1px solid " + C.purple + "10" }}>
                  <div style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>{f.l}</div>
                  <div style={{ fontSize: 10, color: C.purple, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{f.f}</div>
                </div>
              ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚔️ Comparisons</div>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
              {COMPS.map((c, i) => (
                <button key={i} className="btn" onClick={() => setCompIdx(i)} style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 8, fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: "nowrap", background: compIdx === i ? c.c + "12" : "transparent", border: "1px solid " + (compIdx === i ? c.c + "30" : C.border), color: compIdx === i ? c.c : C.dim, cursor: "pointer", boxShadow: compIdx === i ? "0 0 8px " + c.c + "10" : "none" }}>{c.t}</button>
              ))}
            </div>
            {COMPS[compIdx] && (
              <div className="card" style={{ ...cs, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: COMPS[compIdx].c, fontWeight: 700, marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>{COMPS[compIdx].t}</div>
                {COMPS[compIdx].rows.map((r, ri) => {
                  const has3 = !!r.c;
                  return (
                  <div key={ri} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: ri < COMPS[compIdx].rows.length - 1 ? "1px solid " + C.border : "none" }}>
                    <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, marginBottom: 5, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" }}>{r.k}</div>
                    <div style={{ display: "grid", gridTemplateColumns: has3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 6 }}>
                      <div style={{ fontSize: 10, color: "#93c5fd", lineHeight: 1.5, background: C.blue + "08", padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.blue + "12", fontFamily: "'DM Sans', sans-serif" }}>{r.a}</div>
                      <div style={{ fontSize: 10, color: "#fdba74", lineHeight: 1.5, background: C.orange + "08", padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.orange + "12", fontFamily: "'DM Sans', sans-serif" }}>{r.b}</div>
                      {has3 && <div style={{ fontSize: 10, color: "#a78bfa", lineHeight: 1.5, background: C.purple + "08", padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.purple + "12", fontFamily: "'DM Sans', sans-serif" }}>{r.c}</div>}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ DEEP DIVES VIEW ═══ */}
        {view === "deep" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? DEEP_DIVES.filter(d => d.n.toLowerCase().includes(sq) || d.cat.toLowerCase().includes(sq) || d.summary.toLowerCase().includes(sq)) : DEEP_DIVES;
          return (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(139,92,246,0.04))", borderColor: C.purple + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🔬 Deep Dives</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Core distributed systems concepts every senior engineer must know</div>
            </div>
            {filtered.map(dd => {
              const op = exp === dd.id;
              return (
                <div key={dd.id} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden", cursor: "pointer", borderColor: op ? dd.c + "25" : C.border }} onClick={() => setExp(op ? null : dd.id)}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, " + dd.c + "18, " + dd.c + "08)", border: "1px solid " + dd.c + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{dd.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{dd.n}</div>
                        <div style={{ fontSize: 9, color: dd.c, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{dd.cat}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? dd.c + "12" : "transparent", border: "1px solid " + (op ? dd.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? dd.c : C.dim, fontSize: 9 }}>{op ? "▲" : "▼"}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{dd.summary}</div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu" onClick={e => e.stopPropagation()}>
                      {dd.sections.map((sec, si) => (
                        <div key={si} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + dd.c + "12", marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: dd.c, fontWeight: 700, marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>{sec.t}</div>
                          <div style={{ fontSize: 11, color: C.subText, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{sec.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* ═══ TRADE-OFFS VIEW ═══ */}
        {view === "tradeoffs" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(59,130,246,0.04))", borderColor: C.blue + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>⚖️ Trade-off Decision Trees</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Use these flowcharts to pick the right tool. Interviewers love structured reasoning.</div>
            </div>
            {TRADEOFFS.map(to => {
              const op = exp === to.id;
              return (
                <div key={to.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : to.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: to.c + "12", border: "1px solid " + to.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{to.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{to.n}</div>
                        <div style={{ fontSize: 10, color: to.c, fontFamily: "'DM Sans', sans-serif" }}>❓ {to.question}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? to.c + "12" : "transparent", border: "1px solid " + (op ? to.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? to.c : C.dim, fontSize: 9 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      {to.branches.map((br, bi) => (
                        <div key={bi} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: "1px solid " + br.color + "15", marginBottom: 6, borderLeft: "3px solid " + br.color }}>
                          <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>IF: <span style={{ color: C.text }}>{br.condition}</span></div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: br.color, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>→ {br.answer}</div>
                          <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Sans', sans-serif" }}>📌 {br.examples}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ NFR VIEW ═══ */}
        {view === "nfr" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(6,182,212,0.04))", borderColor: C.cyan + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🛡️ Non-Functional Requirements</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>The things that separate senior engineers from juniors in interviews</div>
            </div>
            {NFR_DATA.map(nfr => {
              const op = exp === nfr.id;
              return (
                <div key={nfr.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : nfr.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: nfr.c + "12", border: "1px solid " + nfr.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{nfr.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{nfr.n}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? nfr.c + "12" : "transparent", border: "1px solid " + (op ? nfr.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? nfr.c : C.dim, fontSize: 9 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      {nfr.sections.map((sec, si) => (
                        <div key={si} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + nfr.c + "10", marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: nfr.c, fontWeight: 700, marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>{sec.t}</div>
                          {sec.items.map((item, ii) => (
                            <div key={ii} style={{ display: "flex", gap: 8, marginBottom: 3, alignItems: "flex-start" }}>
                              <span style={{ color: nfr.c, fontSize: 8, marginTop: 3 }}>●</span>
                              <span style={{ fontSize: 11, color: C.subText, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ MOCK INTERVIEW TIMER ═══ */}
        {view === "mock" && !showWeak && (() => {
          const mp = MOCK_PROBLEMS[mockIdx];
          const mins = Math.floor(mockTime / 60);
          const secs = mockTime % 60;
          const totalSec = mp.time * 60;
          const pctLeft = totalSec > 0 ? (mockTime / totalSec) * 100 : 0;
          const timerColor = pctLeft > 50 ? C.green : pctLeft > 20 ? C.accent : C.red;
          const avgScore = Object.keys(mockScores).length > 0 ? (Object.values(mockScores).reduce((a, b) => a + b, 0) / Object.keys(mockScores).length).toFixed(1) : null;
          return (
            <div className="fu">
              <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.04))", borderColor: C.accent + "15" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>⏱️ Mock Interview Practice</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Pick a problem, start the timer, and grade yourself honestly</div>
              </div>

              {/* Problem selector */}
              <div style={{ display: "flex", gap: 5, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                {MOCK_PROBLEMS.map((p, i) => (
                  <button key={p.id} className="btn" onClick={() => { setMockIdx(i); setMockRunning(false); setMockTime(0); setMockScores({}); setMockDone(false); }} style={{
                    flex: "0 0 auto", padding: "6px 12px", borderRadius: 8, fontSize: 10,
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                    background: mockIdx === i ? (DC[p.d]?.bg || C.card2) : "transparent",
                    border: "1px solid " + (mockIdx === i ? (DC[p.d]?.text || C.accent) + "40" : C.border),
                    color: mockIdx === i ? (DC[p.d]?.text || C.accent) : C.dim,
                  }}>{p.n}</button>
                ))}
              </div>

              {/* Timer display */}
              <div className="card" style={{ ...cs, padding: "24px 20px", marginBottom: 14, textAlign: "center", background: "linear-gradient(135deg, " + C.card + ", " + timerColor + "04)" }}>
                <Bdg t={mp.d} c={DC[mp.d]?.text || C.accent} bg={DC[mp.d]?.bg} />
                <div style={{ fontSize: 22, fontWeight: 800, color: C.headText, fontFamily: "'Outfit', sans-serif", marginTop: 10 }}>{mp.n}</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: timerColor, fontFamily: "'Outfit', sans-serif", marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </div>
                <div style={{ maxWidth: 300, margin: "12px auto 0", background: C.muted, borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ width: pctLeft + "%", background: timerColor, height: "100%", transition: "width 1s linear", borderRadius: 6 }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  {!mockRunning && mockTime === 0 && !mockDone && (
                    <button className="btn" onClick={() => { setMockTime(mp.time * 60); setMockRunning(true); setMockScores({}); setMockDone(false); }} style={{ padding: "10px 28px", borderRadius: 10, background: "linear-gradient(135deg, " + C.green + "20, " + C.green + "10)", border: "1px solid " + C.green + "30", color: C.green, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, cursor: "pointer" }}>▶ Start ({mp.time} min)</button>
                  )}
                  {mockRunning && (
                    <>
                      <button className="btn" onClick={() => setMockRunning(false)} style={{ padding: "10px 20px", borderRadius: 10, background: C.accent + "12", border: "1px solid " + C.accent + "30", color: C.accent, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>⏸ Pause</button>
                      <button className="btn" onClick={() => { setMockRunning(false); setMockDone(true); }} style={{ padding: "10px 20px", borderRadius: 10, background: C.red + "12", border: "1px solid " + C.red + "30", color: C.red, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>⏹ Finish</button>
                    </>
                  )}
                  {!mockRunning && mockTime > 0 && !mockDone && (
                    <>
                      <button className="btn" onClick={() => setMockRunning(true)} style={{ padding: "10px 20px", borderRadius: 10, background: C.green + "12", border: "1px solid " + C.green + "30", color: C.green, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>▶ Resume</button>
                      <button className="btn" onClick={() => { setMockRunning(false); setMockDone(true); }} style={{ padding: "10px 20px", borderRadius: 10, background: C.blue + "12", border: "1px solid " + C.blue + "30", color: C.blue, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>✓ Done, Grade Me</button>
                    </>
                  )}
                  {(mockDone || (mockTime === 0 && Object.keys(mockScores).length > 0)) && (
                    <button className="btn" onClick={() => { setMockTime(0); setMockScores({}); setMockDone(false); }} style={{ padding: "10px 20px", borderRadius: 10, background: C.purple + "12", border: "1px solid " + C.purple + "30", color: C.purple, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>🔄 Reset</button>
                  )}
                </div>
              </div>

              {/* Self-assessment rubric */}
              {(mockDone || (mockTime === 0 && mockRunning === false && Object.keys(mockScores).length > 0)) && (
                <div className="fu">
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📝 Self-Assessment</div>
                  {mp.rubric.map((r, ri) => (
                    <div key={ri} className="card" style={{ ...cs, padding: "12px 16px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{r}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: (mockScores[ri] || 0) >= 4 ? C.green : (mockScores[ri] || 0) >= 2 ? C.accent : C.dim, fontFamily: "'Outfit', sans-serif" }}>{mockScores[ri] || "–"}/5</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} className="btn" onClick={() => setMockScores({ ...mockScores, [ri]: s })} style={{
                            flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            background: (mockScores[ri] || 0) >= s ? (s >= 4 ? C.green : s >= 2 ? C.accent : C.red) + "15" : "transparent",
                            border: "1px solid " + ((mockScores[ri] || 0) >= s ? (s >= 4 ? C.green : s >= 2 ? C.accent : C.red) + "30" : C.border),
                            color: (mockScores[ri] || 0) >= s ? (s >= 4 ? C.green : s >= 2 ? C.accent : C.red) : C.dim,
                          }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {avgScore && (
                    <div style={{ ...cs, padding: "16px", marginTop: 10, textAlign: "center", background: "linear-gradient(135deg, " + C.card + ", " + (parseFloat(avgScore) >= 4 ? C.green : parseFloat(avgScore) >= 2.5 ? C.accent : C.red) + "06)" }}>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Overall Score</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: parseFloat(avgScore) >= 4 ? C.green : parseFloat(avgScore) >= 2.5 ? C.accent : C.red, fontFamily: "'Outfit', sans-serif", marginTop: 4 }}>{avgScore}/5</div>
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                        {parseFloat(avgScore) >= 4.5 ? "🎉 Strong hire!" : parseFloat(avgScore) >= 3.5 ? "👍 Hire — minor areas to improve" : parseFloat(avgScore) >= 2.5 ? "⚠️ Borderline — practice weak areas" : "📚 Keep studying — review the method tab"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rubric reference */}
              {!mockDone && mockTime === 0 && Object.keys(mockScores).length === 0 && (
                <div style={{ ...cs, padding: "14px 16px", marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>Grading Criteria</div>
                  {mp.rubric.map((r, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "center" }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: C.accent + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.accent, fontWeight: 700, flexShrink: 0 }}>{ri + 1}</span>
                      <span style={{ fontSize: 11, color: C.subText, fontFamily: "'DM Sans', sans-serif" }}>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ ESTIMATION CALCULATOR ═══ */}
        {view === "calc" && !showWeak && (() => {
          const dau = parseFloat(calcDAU) * 1e6 || 0;
          const actions = parseFloat(calcActions) || 0;
          const sizeKB = parseFloat(calcSize) || 0;
          const retYrs = parseFloat(calcRetention) || 0;
          const peak = parseFloat(calcPeak) || 1;
          const qps = dau > 0 ? Math.round(dau * actions / 86400) : 0;
          const peakQps = Math.round(qps * peak);
          const storageDay = dau * actions * sizeKB / 1e6; // GB/day
          const storageYear = storageDay * 365;
          const storageTotal = storageYear * retYrs;
          const bwMBps = (qps * sizeKB) / 1000;
          const cacheGB = storageDay * 0.2;
          const fmt = (n) => {
            if (n >= 1e12) return (n / 1e12).toFixed(1) + " TB";
            if (n >= 1e9) return (n / 1e9).toFixed(1) + " PB";
            if (n >= 1e6) return (n / 1e6).toFixed(1) + " PB";
            if (n >= 1e3) return (n / 1e3).toFixed(1) + " TB";
            return n.toFixed(1) + " GB";
          };
          const fmtQps = (n) => {
            if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
            if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
            return n.toString();
          };
          const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, background: C.bg, border: "1px solid " + C.border, color: C.accent, fontSize: 14, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", outline: "none", textAlign: "right" };
          return (
            <div className="fu">
              <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(6,182,212,0.04))", borderColor: C.cyan + "15" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🧮 Back-of-Envelope Calculator</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Plug in numbers and get instant estimates for your system design</div>
              </div>

              {/* Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "DAU (millions)", value: calcDAU, set: setCalcDAU, icon: "👥" },
                  { label: "Actions/user/day", value: calcActions, set: setCalcActions, icon: "🔄" },
                  { label: "Avg record size (KB)", value: calcSize, set: setCalcSize, icon: "📦" },
                  { label: "Retention (years)", value: calcRetention, set: setCalcRetention, icon: "📅" },
                  { label: "Peak multiplier (x)", value: calcPeak, set: setCalcPeak, icon: "📈" },
                ].map((inp, i) => (
                  <div key={i} style={{ ...cs, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: C.dim, marginBottom: 6, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" }}>{inp.icon} {inp.label}</div>
                    <input type="number" value={inp.value} onChange={e => inp.set(e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>

              {/* Results */}
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📊 Estimated Results</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Avg QPS", value: fmtQps(qps), color: C.blue, detail: dau > 0 ? (dau / 1e6).toFixed(0) + "M × " + actions + " / 86,400" : "—" },
                  { label: "Peak QPS", value: fmtQps(peakQps), color: C.red, detail: fmtQps(qps) + " × " + peak },
                  { label: "Bandwidth", value: bwMBps.toFixed(1) + " MB/s", color: C.purple, detail: fmtQps(qps) + " × " + sizeKB + "KB" },
                ].map((r, i) => (
                  <div key={i} className="card" style={{ ...cs, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: r.color, fontFamily: "'Outfit', sans-serif" }}>{r.value}</div>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>{r.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Storage/day", value: storageDay >= 1000 ? (storageDay / 1000).toFixed(1) + " TB" : storageDay.toFixed(1) + " GB", color: C.green },
                  { label: "Storage/year", value: fmt(storageYear), color: C.accent },
                  { label: "Total (" + retYrs + "yr)", value: fmt(storageTotal), color: C.orange },
                ].map((r, i) => (
                  <div key={i} className="card" style={{ ...cs, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: r.color, fontFamily: "'Outfit', sans-serif" }}>{r.value}</div>
                  </div>
                ))}
              </div>

              {/* Cache estimate */}
              <div className="card" style={{ ...cs, padding: "14px 16px", marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.red, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚡ Cache Estimate (20% rule)</div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Cache ~20% of daily data for hot reads</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.red, fontFamily: "'Outfit', sans-serif" }}>{cacheGB >= 1000 ? (cacheGB / 1000).toFixed(1) + " TB" : cacheGB.toFixed(1) + " GB"}</div>
                </div>
              </div>

              {/* Quick presets */}
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginTop: 16, marginBottom: 8, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚡ Quick Presets</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { n: "Twitter", dau: "200", act: "5", size: "1", ret: "5", pk: "3" },
                  { n: "Instagram", dau: "500", act: "3", size: "500", ret: "10", pk: "2" },
                  { n: "WhatsApp", dau: "1000", act: "50", size: "0.5", ret: "5", pk: "3" },
                  { n: "YouTube", dau: "1000", act: "5", size: "50000", ret: "10", pk: "2" },
                  { n: "URL Shortener", dau: "100", act: "1", size: "0.5", ret: "5", pk: "10" },
                ].map((p, i) => (
                  <button key={i} className="btn" onClick={() => { setCalcDAU(p.dau); setCalcActions(p.act); setCalcSize(p.size); setCalcRetention(p.ret); setCalcPeak(p.pk); }} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 10, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600, cursor: "pointer", background: C.card2, border: "1px solid " + C.border, color: C.text,
                  }}>{p.n}</button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══ SCHEMA DESIGNS VIEW ═══ */}
        {view === "schemas" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? SCHEMAS.filter(s => s.n.toLowerCase().includes(sq) || s.tables.some(t => t.name.toLowerCase().includes(sq))) : SCHEMAS;
          return (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(139,92,246,0.04))", borderColor: C.purple + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🗃️ Schema Design Examples</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Concrete table designs for top interview problems — ready to draw on whiteboard</div>
            </div>
            {filtered.map(sc => {
              const op = exp === sc.id;
              return (
                <div key={sc.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : sc.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: sc.c + "12", border: "1px solid " + sc.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{sc.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{sc.n}</div>
                        <div style={{ fontSize: 9, color: sc.c, fontFamily: "'DM Sans', sans-serif" }}>{sc.tables.length} tables/stores</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? sc.c + "12" : "transparent", border: "1px solid " + (op ? sc.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? sc.c : C.dim, fontSize: 9 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      {sc.tables.map((tbl, ti) => (
                        <div key={ti} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + sc.c + "10", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: "#000", background: sc.c, padding: "1px 6px", borderRadius: 4, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{tbl.name}</span>
                          </div>
                          <div style={{ fontSize: 10, color: C.cyan, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.7, background: C.card2, borderRadius: 6, padding: "8px 10px", marginBottom: 6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{tbl.cols}</div>
                          <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>💡 {tbl.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* ═══ INTERVIEW ANTI-PATTERNS VIEW ═══ */}
        {view === "anti" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(239,68,68,0.04))", borderColor: C.red + "15" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🚫 Common Interview Mistakes</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Avoid these and you're already ahead of 80% of candidates</div>
            </div>
            {ANTI_PATTERNS.map((ap, ai) => {
              const sevColor = ap.severity === "critical" ? C.red : ap.severity === "high" ? C.orange : C.accent;
              return (
                <div key={ap.id} className="card" style={{ ...cs, marginBottom: 8, borderLeft: "3px solid " + sevColor, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: sevColor + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: sevColor, fontWeight: 800, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>{ai + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{ap.mistake}</span>
                        <span style={{ fontSize: 8, color: sevColor, background: sevColor + "12", padding: "1px 6px", borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>{ap.severity}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.green, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", background: C.green + "06", padding: "8px 10px", borderRadius: 6, border: "1px solid " + C.green + "10", marginTop: 4 }}>
                        ✅ <span style={{ color: "#4ade80" }}>{ap.fix}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "res" && !showWeak && (
          <div className="fu">
            <div className="card" style={{ ...cs, padding: "14px 16px", marginBottom: 16, borderColor: C.green + "15", background: "linear-gradient(135deg, " + C.card + ", rgba(16,185,129,0.03))" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🚀</div>
                <div>
                  <div style={{ fontSize: 12, color: C.green, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Recommended Path</div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Alex Xu Vol 1 + ByteByteGo → Grokking → Mock Interviews</div>
                </div>
              </div>
            </div>
            {RES.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{cat.cat}</div>
                {cat.items.map((it, ii) => (
                  <div key={ii} className="card" style={{ ...cs, marginBottom: 8, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <a href={it.u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: C.headText, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}>{it.n} <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span></a>
                        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>{it.d}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: it.p === "Free" ? C.green : C.accent, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: it.p === "Free" ? C.green + "10" : C.accent + "10", fontFamily: "'DM Sans', sans-serif" }}>{it.p}</div>
                        <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{it.r}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ ...cs, padding: "14px", marginTop: 20, borderColor: C.red + "10" }}>
              <button className="btn" onClick={reset} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))", border: "1px solid rgba(239,68,68,0.12)", color: "#f87171", fontSize: 10, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600, letterSpacing: "0.5px" }}>🗑️ Reset All Progress</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "24px 0 12px", marginTop: 20 }}>
          <div style={{ fontSize: 9, color: "#1a1d2e", letterSpacing: "3px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>Trade-offs, Not Textbook Answers</div>
        </div>
      </div>
    </div>
  );
}
