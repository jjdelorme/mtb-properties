export interface ParsedAddress {
  raw: string;
  houseNumber?: string;
  street?: string;
  unit?: string;
  aliases: string[];
  city?: string;
  state?: string;
  postalcode?: string;
}

export interface GeocodeCandidate {
  query?: string;
  structured?: {
    street?: string;
    city?: string;
    state?: string;
    postalcode?: string;
  };
  matchLevel: 'exact' | 'alias' | 'street' | 'area';
  description?: string;
}

const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

const STATE_CODES = new Set(Object.values(US_STATES));

export function cleanString(str: string): string {
  return str
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
}

/**
 * Extracts components and aliases from raw address string
 */
export function parseAddress(rawInput: string): ParsedAddress {
  const raw = rawInput.trim();
  const aliases: string[] = [];

  // Extract parenthetical expressions (e.g., "(Gothic Road)" or "(Highway 135)")
  const parenMatches = [...raw.matchAll(/\(([^)]+)\)/g)];
  for (const match of parenMatches) {
    const alias = cleanString(match[1]);
    if (alias && !aliases.includes(alias)) {
      aliases.push(alias);
    }
  }

  // Remove parentheses for primary clean
  let cleaned = cleanString(raw.replace(/\([^)]*\)/g, ' '));

  // Extract ZIP Code (5 digits or ZIP+4)
  let postalcode: string | undefined;
  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) {
    postalcode = zipMatch[1];
  }

  // Extract State
  let state: string | undefined;
  const tokens = cleaned.replace(/,/g, ' ').split(/\s+/);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].toUpperCase();
    if (STATE_CODES.has(t)) {
      state = t;
      break;
    }
    const fullStateKey = tokens[i].toLowerCase();
    if (US_STATES[fullStateKey]) {
      state = US_STATES[fullStateKey];
      break;
    }
  }

  // Extract Unit / Suite / Apt
  let unit: string | undefined;
  const unitMatch = cleaned.match(/\b(?:apt|apartment|suite|ste|unit|bldg|building|floor|fl|#|lot|cabin|space|spc)\s*[\w\d-]+/i);
  if (unitMatch) {
    unit = unitMatch[0];
  }

  // Extract House Number
  let houseNumber: string | undefined;
  const houseMatch = cleaned.match(/^(\d+[\w-]*)\b/);
  if (houseMatch) {
    houseNumber = houseMatch[1];
  }

  // Extract City and Street if comma-separated
  let city: string | undefined;
  let street: string | undefined;
  const commaParts = cleaned.split(',').map(p => cleanString(p)).filter(Boolean);

  if (commaParts.length >= 2) {
    street = commaParts[0];
    city = commaParts[1];
    // If state/zip was grouped into city part, strip it
    if (city && state) {
      city = cleanString(city.replace(new RegExp(`\\b${state}\\b`, 'i'), ''));
    }
    if (city && postalcode) {
      city = cleanString(city.replace(new RegExp(`\\b${postalcode}\\b`, 'g'), ''));
    }
  } else {
    street = cleaned;
  }

  return {
    raw,
    houseNumber,
    street,
    unit,
    aliases,
    city,
    state,
    postalcode
  };
}

/**
 * Generates an ordered list of geocoding query candidates with various normalization,
 * abbreviation expansion, alias substitutions, and graceful fallback levels.
 */
export function generateGeocodeCandidates(rawInput: string): GeocodeCandidate[] {
  const candidates: GeocodeCandidate[] = [];
  const raw = rawInput.trim();
  if (!raw) return candidates;

  const parsed = parseAddress(raw);
  const seenQueries = new Set<string>();

  const addQuery = (query: string, matchLevel: GeocodeCandidate['matchLevel'], description?: string) => {
    const cleaned = cleanString(query);
    const key = cleaned.toLowerCase();
    if (cleaned.length > 0 && !seenQueries.has(key)) {
      seenQueries.add(key);
      candidates.push({ query: cleaned, matchLevel, description });
    }
  };

  const addStructured = (structured: GeocodeCandidate['structured'], matchLevel: GeocodeCandidate['matchLevel'], description?: string) => {
    if (!structured) return;
    const key = `struct_${(structured.street || '').toLowerCase()}_${(structured.city || '').toLowerCase()}_${(structured.state || '').toLowerCase()}_${(structured.postalcode || '').toLowerCase()}`;
    if (!seenQueries.has(key)) {
      seenQueries.add(key);
      candidates.push({ structured, matchLevel, description });
    }
  };

  // 1. Raw query
  addQuery(raw, 'exact', 'Raw query');

  // 2. Parenthetical Aliases substitutions (e.g. "1701 County Road 317 (Gothic Road)..." -> "1701 Gothic Road...")
  if (parsed.aliases.length > 0) {
    for (const alias of parsed.aliases) {
      // Replace the road pattern preceding the paren with the alias
      const replacedPreceding = raw.replace(
        /(?:County Road|CR|Co Rd|Highway|Hwy|State Hwy|State Route|SH|SR|US|US Highway|Route)?\s*[\w\d-]+\s*\([^)]+\)/i,
        alias
      );
      addQuery(replacedPreceding, 'alias', `Alias substitution: ${alias}`);

      // Replace just the parenthetical substring with the alias
      const parenMatch = raw.match(new RegExp(`\\(${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'i'));
      if (parenMatch) {
        const replacedJustParen = raw.replace(parenMatch[0], alias);
        addQuery(replacedJustParen, 'alias', `Paren replacement: ${alias}`);
      }

      // Try House number + alias + city/state/zip if available
      if (parsed.houseNumber && (parsed.city || parsed.state || parsed.postalcode)) {
        const customCombo = [
          `${parsed.houseNumber} ${alias}`,
          parsed.city,
          parsed.state,
          parsed.postalcode
        ].filter(Boolean).join(', ');
        addQuery(customCombo, 'alias', `House + Alias combo: ${alias}`);
      }
    }

    // Strip parens completely
    const stripped = raw.replace(/\([^)]*\)/g, ' ');
    addQuery(stripped, 'exact', 'Parentheses stripped');
  }

  // 3. Strip Unit/Apt/Suite numbers
  const unitRegex = /\b(?:apt|apartment|suite|ste|unit|bldg|building|floor|fl|#|lot|cabin|space|spc)\s*[\w\d-]+/gi;
  const currentQueries = candidates.filter(c => c.query).map(c => c.query as string);
  for (const q of currentQueries) {
    const noUnit = q.replace(unitRegex, '');
    if (noUnit !== q) {
      addQuery(noUnit, 'exact', 'Unit stripped');
    }
  }

  // 4. Road name variations (County Road <-> CR <-> Co Rd, Highway <-> Hwy, etc.)
  const roadReplacements = [
    { from: /\bCounty Road\s*(\d+)\b/gi, to: 'CR $1' },
    { from: /\bCounty Road\s*(\d+)\b/gi, to: 'Co Rd $1' },
    { from: /\bCounty Road\s*(\d+)\b/gi, to: 'County Route $1' },
    { from: /\bCR\s*(\d+)\b/gi, to: 'County Road $1' },
    { from: /\bCo Rd\s*(\d+)\b/gi, to: 'County Road $1' },
    { from: /\bCR-(\d+)\b/gi, to: 'County Road $1' },
    { from: /\bState (?:Highway|Route|Hwy|Rte)\s*(\d+)\b/gi, to: 'Highway $1' },
    { from: /\b(?:SH|SR)\s*(\d+)\b/gi, to: 'Highway $1' },
    { from: /\b(?:SH|SR)\s*(\d+)\b/gi, to: 'State Highway $1' },
    { from: /\bHighway\s*(\d+)\b/gi, to: 'Hwy $1' },
    { from: /\bHwy\s*(\d+)\b/gi, to: 'Highway $1' },
    { from: /\bUS\s*(?:Highway|Hwy|Route)?\s*(\d+)\b/gi, to: 'US-$1' },
    { from: /\bUS-(\d+)\b/gi, to: 'US Highway $1' },
  ];

  const queriesForRoads = candidates.filter(c => c.query).map(c => c.query as string);
  for (const q of queriesForRoads) {
    for (const r of roadReplacements) {
      const rep = q.replace(r.from, r.to);
      if (rep !== q) {
        addQuery(rep, 'exact', 'Road designation variant');
      }
    }
  }

  // 5. Street suffix standardizations (Rd <-> Road, St <-> Street, Ave <-> Avenue, etc.)
  const suffixReplacements = [
    { from: /\bRd\b/gi, to: 'Road' },
    { from: /\bRoad\b/gi, to: 'Rd' },
    { from: /\bSt\b/gi, to: 'Street' },
    { from: /\bStreet\b/gi, to: 'St' },
    { from: /\bAve\b/gi, to: 'Avenue' },
    { from: /\bAvenue\b/gi, to: 'Ave' },
    { from: /\bBlvd\b/gi, to: 'Boulevard' },
    { from: /\bBoulevard\b/gi, to: 'Blvd' },
    { from: /\bDr\b/gi, to: 'Drive' },
    { from: /\bDrive\b/gi, to: 'Dr' },
    { from: /\bLn\b/gi, to: 'Lane' },
    { from: /\bLane\b/gi, to: 'Ln' },
    { from: /\bTrl\b/gi, to: 'Trail' },
    { from: /\bTrail\b/gi, to: 'Trl' },
    { from: /\bCt\b/gi, to: 'Court' },
    { from: /\bCourt\b/gi, to: 'Ct' },
    { from: /\bPkwy\b/gi, to: 'Parkway' },
    { from: /\bParkway\b/gi, to: 'Pkwy' },
  ];

  const queriesForSuffix = candidates.filter(c => c.query).map(c => c.query as string);
  for (const q of queriesForSuffix) {
    for (const s of suffixReplacements) {
      const rep = q.replace(s.from, s.to);
      if (rep !== q) {
        addQuery(rep, 'exact', 'Suffix variant');
      }
    }
  }

  // 6. Structured Query Candidates
  if (parsed.city || parsed.state || parsed.postalcode) {
    if (parsed.aliases.length > 0) {
      for (const alias of parsed.aliases) {
        const streetWithAlias = parsed.houseNumber ? `${parsed.houseNumber} ${alias}` : alias;
        addStructured({
          street: streetWithAlias,
          city: parsed.city,
          state: parsed.state,
          postalcode: parsed.postalcode
        }, 'alias', `Structured with alias: ${alias}`);
      }
    }

    if (parsed.street) {
      const cleanStreet = cleanString(parsed.street.replace(/\([^)]*\)/g, '').replace(unitRegex, ''));
      addStructured({
        street: cleanStreet,
        city: parsed.city,
        state: parsed.state,
        postalcode: parsed.postalcode
      }, 'exact', 'Structured clean street');
    }
  }

  // 7. Street-Level Fallback (without house number)
  const queriesForStreetLevel = candidates.filter(c => c.query && c.matchLevel !== 'area').map(c => c.query as string);
  for (const q of queriesForStreetLevel) {
    const withoutHouseNumber = cleanString(q.replace(/^\d+[\w-]*\s+/, ''));
    if (withoutHouseNumber !== q && withoutHouseNumber.length > 5) {
      addQuery(withoutHouseNumber, 'street', 'Street fallback (without house number)');
    }
  }

  // 8. City / State / ZIP area fallbacks
  if (parsed.city && parsed.state) {
    addQuery(`${parsed.city}, ${parsed.state} ${parsed.postalcode || ''}`.trim(), 'area', 'City + State area fallback');
    addQuery(`${parsed.city}, ${parsed.state}`, 'area', 'City + State fallback');
  } else if (parsed.postalcode) {
    addQuery(parsed.postalcode, 'area', 'ZIP code area fallback');
  }

  return candidates;
}
