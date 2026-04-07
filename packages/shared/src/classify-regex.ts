export interface ClassifyResult {
  category: string | null;
  domain: string | null;
  confidence: 'high' | 'medium' | 'none';
}

// ── URL-based classification ──

const URL_DOMAIN_RULES: [RegExp, { category?: string; domain?: string }][] = [
  [/github\.com|gitlab\.com|codeberg\.org/i, { category: 'tool', domain: 'web-dev' }],
  [/huggingface\.co/i, { category: 'tool', domain: 'ai' }],
  [/arxiv\.org/i, { category: 'research', domain: 'ai' }],
  [/amazon\.com|amzn\.to/i, { category: 'commerce' }],
  [/producthunt\.com/i, { category: 'launch', domain: 'startups' }],
  [/npmjs\.com|pypi\.org|crates\.io/i, { category: 'tool', domain: 'web-dev' }],
  [/medium\.com|substack\.com|dev\.to/i, { category: 'technique' }],
  [/youtube\.com|youtu\.be/i, { category: 'media' }],
  [/reddit\.com/i, { category: 'discussion' }],
  [/stackoverflow\.com/i, { category: 'technique', domain: 'web-dev' }],
];

// ── Text-based classification ──

const TEXT_PATTERN_RULES: [RegExp, { category?: string; domain?: string }][] = [
  // Security
  [/CVE-\d{4}-\d+/i, { category: 'security', domain: 'cybersecurity' }],
  [/\b(vulnerability|exploit|zero[- ]day|RCE|XSS|SQLi|breach)\b/i, { category: 'security', domain: 'cybersecurity' }],

  // Tool
  [/\b(npm install|pip install|cargo add|brew install|apt install)\b/i, { category: 'tool' }],
  [/\b(open[- ]source|self[- ]hosted|CLI tool)\b/i, { category: 'tool' }],

  // Technique
  [/\b(how (I|we|to)|tutorial|step[- ]by[- ]step|deep dive|under the hood)\b/i, { category: 'technique' }],
  [/\b(TIL|today I learned|pro tip)\b/i, { category: 'technique' }],

  // Launch
  [/\b(just (launched|shipped|released)|announcing|now available|v\d+\.\d+)\b/i, { category: 'launch', domain: 'startups' }],

  // Research
  [/\b(paper|study (finds|shows)|preprint|state[- ]of[- ]the[- ]art|benchmark)\b/i, { category: 'research' }],

  // Opinion
  [/\b(unpopular opinion|hot take|controversial|lessons learned)\b/i, { category: 'opinion' }],

  // AI domain
  [/\b(LLM|GPT|transformer|diffusion|neural|fine[- ]tun(e|ing)|embedding|RAG)\b/i, { domain: 'ai' }],

  // Crypto domain
  [/\b(bitcoin|ethereum|solana|defi|NFT|web3|blockchain|airdrop|onchain)\b/i, { domain: 'crypto' }],

  // Finance domain
  [/\b(stock|portfolio|S&P|NASDAQ|dividend|hedge fund|valuation|IPO)\b/i, { domain: 'finance' }],

  // DevOps domain
  [/\b(kubernetes|docker|terraform|CI\/CD|deploy|infrastructure)\b/i, { domain: 'devops' }],
];

/**
 * Classify a bookmark using regex patterns. Returns null fields if
 * no confident match -- caller should fall through to LLM.
 *
 * Inspired by fieldtheory-cli's two-tier classification system.
 */
export function classifyByRegex(
  contentText: string,
  urls: string[] = [],
): ClassifyResult {
  let category: string | null = null;
  let domain: string | null = null;

  // 1. Check URLs first (higher confidence)
  for (const url of urls) {
    for (const [pattern, result] of URL_DOMAIN_RULES) {
      if (pattern.test(url)) {
        category = category || result.category || null;
        domain = domain || result.domain || null;
      }
    }
  }

  // 2. Check text patterns
  for (const [pattern, result] of TEXT_PATTERN_RULES) {
    if (pattern.test(contentText)) {
      category = category || result.category || null;
      domain = domain || result.domain || null;
    }
  }

  const confidence = category && domain ? 'high' : category || domain ? 'medium' : 'none';
  return { category, domain, confidence };
}
