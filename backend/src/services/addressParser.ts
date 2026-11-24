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

export const US_STATES: Record<string, string> = {
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
  const unitRegex = /(?:\b(?:apt|apartment|suite|ste|unit|bldg|building|floor|fl|lot|cabin|space|spc)\.?\s*(?:#\s*)?|#\s*)[\w\d-]+/gi;
  const unitMatch = cleaned.match(unitRegex);
  if (unitMatch) {
    unit = unitMatch[0];
  }

  // Extract House Number
  let houseNumber: string | undefined;
  const isPureZip = /^\d{5}(?:-\d{4})?$/.test(cleaned.trim());
  if (!isPureZip) {
    const houseMatch = cleaned.match(/^(\d+[\w-]*)\b/);
    if (houseMatch) {
      houseNumber = houseMatch[1];
    }
  }

  // Extract City and Street if comma-separated
  let city: string | undefined;
  let street: string | undefined;
  const commaParts = cleaned.split(',').map(p => cleanString(p)).filter(Boolean);

  const streetIndicatorRegex = /\b(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|blvd|boulevard|ct|court|way|pl|place|cir|circle|pkwy|parkway|trl|trail|loop|run|path|hwy|highway|route|rt|cswy|causeway|ter|terrace|aly|alley)\b/i;

  if (commaParts.length >= 2) {
    const part0HasStreetIndicator = streetIndicatorRegex.test(commaParts[0]) || /\d/.test(commaParts[0]);
    const part1HasStateOrZip = (state && new RegExp(`\\b${state}\\b`, 'i').test(commaParts[1])) ||
                               (postalcode && commaParts[1].includes(postalcode)) ||
                               /^[A-Z]{2}\b/i.test(commaParts[1]) ||
                               /\b\d{5}\b/.test(commaParts[1]);

    if (!houseNumber && !part0HasStreetIndicator && part1HasStateOrZip) {
      city = commaParts[0];
      street = undefined;
    } else {
      street = commaParts[0];
      city = commaParts[1];
      // If state/zip was grouped into city part, strip it
      if (city && state) {
        city = cleanString(city.replace(new RegExp(`\\b${state}\\b`, 'i'), ''));
      }
      if (city && postalcode) {
        city = cleanString(city.replace(new RegExp(`\\b${postalcode}\\b`, 'g'), ''));
      }
    }
  } else {
    if (isPureZip) {
      street = undefined;
    } else {
      street = cleaned;
    }
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
    let cleaned = cleanString(query);
    if (description !== 'Raw query') {
      cleaned = cleanString(cleaned.replace(/#+/g, ' '));
    }
    const key = `q_${cleaned.toLowerCase()}`;
    if (cleaned.length > 0 && !seenQueries.has(key)) {
      seenQueries.add(key);
      candidates.push({ query: cleaned, matchLevel, description });
    }
  };

  const addStructured = (structured: GeocodeCandidate['structured'], matchLevel: GeocodeCandidate['matchLevel'], description?: string) => {
    if (!structured) return;
    const cleanStreet = structured.street ? cleanString(structured.street.replace(/#+/g, ' ')) : undefined;
    const cleanCity = structured.city ? cleanString(structured.city.replace(/#+/g, ' ')) : undefined;
    const cleanState = structured.state ? cleanString(structured.state) : undefined;
    const cleanPostal = structured.postalcode ? cleanString(structured.postalcode) : undefined;

    const s = {
      ...(cleanStreet ? { street: cleanStreet } : {}),
      ...(cleanCity ? { city: cleanCity } : {}),
      ...(cleanState ? { state: cleanState } : {}),
      ...(cleanPostal ? { postalcode: cleanPostal } : {})
    };

    const key = `struct_${(s.street || '').toLowerCase()}_${(s.city || '').toLowerCase()}_${(s.state || '').toLowerCase()}_${(s.postalcode || '').toLowerCase()}`;
    if (!seenQueries.has(key)) {
      seenQueries.add(key);
      candidates.push({ structured: s, matchLevel, description });
    }
  };

  const unitRegex = /(?:\b(?:apt|apartment|suite|ste|unit|bldg|building|floor|fl|lot|cabin|space|spc)\.?\s*(?:#\s*)?|#\s*)[\w\d-]+/gi;
  const cleanStreet = parsed.street
    ? cleanString(parsed.street.replace(/\([^)]*\)/g, '').replace(unitRegex, '').replace(/#+/g, ' '))
    : undefined;
  const streetWithoutNum = cleanStreet
    ? cleanString(cleanStreet.replace(/^\d+[\w-]*\s+/, ''))
    : undefined;

  // Directional prefix normalization (e.g. East Burke -> Burke, VT)
  let parentTown: string | undefined;
  if (parsed.city && /^(?:East|West|North|South)\s+/i.test(parsed.city)) {
    parentTown = cleanString(parsed.city.replace(/^(?:East|West|North|South)\s+/i, ''));
  }

  // 1. Alias Handling (if parenthetical aliases exist)
  if (parsed.aliases.length > 0) {
    // 1a. Structured candidate
    if (cleanStreet && (parentTown || parsed.city || parsed.postalcode)) {
      addStructured({
        street: cleanStreet,
        city: parentTown || parsed.city,
        state: parsed.state,
        postalcode: parsed.postalcode
      }, 'exact', 'Structured exact');
    }

    // 1b. Alias replacement
    for (const alias of parsed.aliases) {
      if (parsed.houseNumber && (parsed.city || parsed.state || parsed.postalcode)) {
        const aliasQuery = [
          `${parsed.houseNumber} ${alias}`,
          parsed.city,
          parsed.state,
          parsed.postalcode
        ].filter(Boolean).join(', ');
        addQuery(aliasQuery, 'alias', `Alias query: ${alias}`);
      } else {
        const replacedPreceding = raw.replace(
          /(?:County Road|CR|Co Rd|Highway|Hwy|State Hwy|State Route|SH|SR|US|US Highway|Route)?\s*[\w\d-]+\s*\([^)]+\)/i,
          alias
        );
        addQuery(cleanString(replacedPreceding.replace(unitRegex, '')), 'alias', `Alias replacement: ${alias}`);
      }
    }

    // 1c. Parens stripped
    const noParen = cleanString(raw.replace(/\([^)]*\)/g, ' ').replace(unitRegex, '').replace(/#+/g, ' '));
    addQuery(noParen || raw, 'exact', 'Parentheses stripped');

    // 1d. CR road variant
    const crVariant = noParen.replace(/\bCounty Road\s*(\d+)\b/gi, 'CR $1');
    if (crVariant !== noParen) {
      addQuery(crVariant, 'exact', 'CR road variant');
    }

    // 1e. Street fallback
    if (streetWithoutNum && (parsed.city || parsed.state)) {
      addQuery([streetWithoutNum, parsed.city, parsed.state, parsed.postalcode].filter(Boolean).join(', '), 'street', 'Street fallback');
    }

    // 1f. Area fallback
    if (parsed.city && parsed.state) {
      addQuery(`${parsed.city}, ${parsed.state} ${parsed.postalcode || ''}`.trim(), 'area', 'Area fallback');
    }
    return candidates;
  }

  // 2. Structured Exact Candidate (prioritizing parent civil town if applicable)
  if (cleanStreet && (parentTown || parsed.city || parsed.postalcode)) {
    addStructured({
      street: cleanStreet,
      city: parentTown || parsed.city,
      state: parsed.state,
      postalcode: parsed.postalcode
    }, 'exact', parentTown ? `Structured exact with parent town: ${parentTown}` : 'Structured exact');
  }

  // 3. Structured Street-Level Candidate (street name without house number)
  if (streetWithoutNum && streetWithoutNum !== cleanStreet && (parentTown || parsed.city || parsed.postalcode)) {
    addStructured({
      street: streetWithoutNum,
      city: parentTown || parsed.city,
      state: parsed.state,
      postalcode: parsed.postalcode
    }, 'street', 'Structured street without house number');
  }

  // 4. Unit stripped candidate
  if (parsed.unit) {
    const noUnit = cleanString(raw.replace(unitRegex, '').replace(/#+/g, ' '));
    if (noUnit && noUnit !== raw) {
      addQuery(noUnit, 'exact', 'Unit stripped');
    }
  }

  // 5. Normalized Full Query String
  const isAreaQuery = !parsed.houseNumber && !parsed.street;
  const normalizedFull = isAreaQuery
    ? [parsed.city, parsed.state, parsed.postalcode].filter(Boolean).join(', ') || raw
    : [cleanStreet || raw, parsed.city, parsed.state, parsed.postalcode].filter(Boolean).join(', ');
  addQuery(cleanString(normalizedFull), 'exact', 'Normalized full string');

  // 6. Area Fallback (City/State or ZIP)
  if (parsed.city && parsed.state) {
    addQuery(`${parsed.city}, ${parsed.state} ${parsed.postalcode || ''}`.trim(), 'area', 'City + State area fallback');
  } else if (parsed.postalcode) {
    addQuery(parsed.postalcode, 'area', 'ZIP code area fallback');
  }

  return candidates;
}
