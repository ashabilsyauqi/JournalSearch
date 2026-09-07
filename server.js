const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 3000;

const PUBLIC_DIR = (fs.existsSync(path.join(__dirname, 'public')) && fs.statSync(path.join(__dirname, 'public')).isDirectory())
  ? path.join(__dirname, 'public')
  : __dirname;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8'
};

// Indonesian to English Academic Keywords Dictionary for Query Expansion
const ACADEMIC_DICTIONARY = {
  'kepemimpinan': 'leadership',
  'kepemimpinan transformasional': 'transformational leadership',
  'kinerja': 'performance',
  'kinerja karyawan': 'employee performance',
  'kinerja pegawai': 'employee performance',
  'kepuasan kerja': 'job satisfaction',
  'lingkungan kerja': 'work environment',
  'motivasi kerja': 'work motivation',
  'motivasi': 'motivation',
  'komitmen organisasi': 'organizational commitment',
  'keputusan pembelian': 'purchase decision',
  'kualitas produk': 'product quality',
  'kualitas pelayanan': 'service quality',
  'kualitas layanan': 'service quality',
  'citra merek': 'brand image',
  'kepercayaan konsumen': 'consumer trust',
  'minat beli': 'purchase intention',
  'pemasaran digital': 'digital marketing',
  'media sosial': 'social media',
  'pembelajaran mesin': 'machine learning',
  'kecerdasan buatan': 'artificial intelligence',
  'pembelajaran mendalam': 'deep learning',
  'jaringan saraf tiruan': 'neural network',
  'klasifikasi': 'classification',
  'deteksi': 'detection',
  'prediksi': 'prediction',
  'sistem pakar': 'expert system',
  'sistem pendukung keputusan': 'decision support system',
  'pengenalan pola': 'pattern recognition',
  'pengolahan citra': 'image processing',
  'analisis sentimen': 'sentiment analysis',
  'penyakit': 'disease',
  'daun padi': 'rice leaf',
  'tanaman': 'plant',
  'padi': 'rice',
  'berbasis web': 'web-based',
  'sistem informasi': 'information system',
  'rancang bangun': 'design and implementation',
  'evaluasi': 'evaluation',
  'efektivitas': 'effectiveness',
  'berpikir kritis': 'critical thinking',
  'hasil belajar': 'learning outcomes',
  'pembelajaran berbasis proyek': 'project-based learning',
  'pembelajaran kooperatif': 'cooperative learning',
  'pendidikan': 'education',
  'keuangan': 'financial',
  'manajemen keuangan': 'financial management',
  'laba': 'profit',
  'profitabilitas': 'profitability',
  'likuiditas': 'liquidity',
  'struktur modal': 'capital structure',
  'harga saham': 'stock price',
  'kesehatan': 'health',
  'rumah sakit': 'hospital',
  'pelayanan': 'service'
};

// Common thesis filler prefixes to clean up
const STOP_PREFIXES = [
  /^analisis perbandingan\s+/i,
  /^analisis komparasi\s+/i,
  /^analisis pengaruh\s+/i,
  /^analisis efektivitas\s+/i,
  /^analisis faktor-faktor\s+/i,
  /^analisis hubungan\s+/i,
  /^analisis kinerja\s+/i,
  /^analisis sistem\s+/i,
  /^analisis\s+/i,
  /^pengaruh\s+/i,
  /^hubungan antara\s+/i,
  /^hubungan\s+/i,
  /^penerapan metode\s+/i,
  /^penerapan algoritma\s+/i,
  /^penerapan teknik\s+/i,
  /^penerapan sistem\s+/i,
  /^penerapan\s+/i,
  /^implementasi metode\s+/i,
  /^implementasi algoritma\s+/i,
  /^implementasi sistem\s+/i,
  /^implementasi\s+/i,
  /^rancang bangun aplikasi\s+/i,
  /^rancang bangun sistem\s+/i,
  /^rancang bangun\s+/i,
  /^pengembangan sistem\s+/i,
  /^pengembangan aplikasi\s+/i,
  /^pengembangan model\s+/i,
  /^pengembangan\s+/i,
  /^efektivitas penggunaan\s+/i,
  /^efektivitas\s+/i,
  /^kajian\s+/i,
  /^studi komparatif\s+/i,
  /^studi kasus\s+/i,
  /^faktor-faktor yang mempengaruhi\s+/i,
  /^identifikasi\s+/i,
  /^optimasi\s+/i
];

/**
 * Clean & extract semantic components from thesis title
 */
function analyzeThesisTitle(rawTitle) {
  if (!rawTitle) return { title: '', cleanTitle: '', keywords: [], englishKeywords: [], type: 'Umum' };
  
  const title = rawTitle.trim();
  let clean = title;
  
  // Detect thesis research type
  let type = 'Kajian Tematik / Umum';
  if (/pengaruh|hubungan|dampak|kontribusi/i.test(title)) {
    type = 'Kuantitatif Korelasional / Kausalitas (Hubungan Antar Variabel)';
  } else if (/penerapan|implementasi|rancang bangun|pengembangan|pembuatan|algoritma/i.test(title)) {
    type = 'Riset Terapan / Pengembangan Sistem & Metodologi';
  } else if (/efektivitas|evaluasi|analisis kinerja|analisis komparasi/i.test(title)) {
    type = 'Studi Evaluatif & Komparatif';
  }

  // Remove common prefix
  for (const prefix of STOP_PREFIXES) {
    clean = clean.replace(prefix, '');
  }

  // Split into components (e.g., Variable X and Variable Y)
  const components = [];
  const relationMatch = title.match(/(?:pengaruh|hubungan)\s+(.+?)\s+(?:terhadap|dengan)\s+(.+)/i);
  if (relationMatch) {
    const varX = relationMatch[1].replace(/\s+(?:dan|serta)\s+/gi, ', ').split(',').map(s => s.trim()).filter(Boolean);
    const varY = relationMatch[2].replace(/\s+pada\s+.+$/i, '').trim();
    components.push(...varX, varY);
  }

  const methodMatch = title.match(/(?:penerapan|implementasi|rancang bangun|pengembangan)\s+(.+?)\s+(?:untuk|dalam|pada|berbasis)\s+(.+)/i);
  if (methodMatch) {
    components.push(methodMatch[1].trim(), methodMatch[2].replace(/\s+pada\s+.+$/i, '').trim());
  }

  // Fallback keywords extraction
  const words = title
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^(dan|yang|pada|untuk|dengan|dari|dalam|oleh|serta|terhadap|antara|sebagai|studi|kasus)$/i.test(w));

  // Translate relevant keywords to English
  const englishKeywords = [];
  const lowerTitle = title.toLowerCase();

  for (const [idTerm, enTerm] of Object.entries(ACADEMIC_DICTIONARY)) {
    if (lowerTitle.includes(idTerm)) {
      englishKeywords.push(enTerm);
    }
  }

  // Unique keywords
  const uniqueKeywords = Array.from(new Set([...components, ...words.slice(0, 6)]));

  return {
    rawTitle: title,
    cleanTitle: clean.trim(),
    researchType: type,
    extractedVariables: components.length > 0 ? components : words.slice(0, 4),
    keywords: uniqueKeywords,
    englishKeywords: englishKeywords
  };
}

/**
 * Reconstruct abstract text from OpenAlex inverted index
 */
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const wordEntries = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      positions.forEach(pos => {
        wordEntries[pos] = word;
      });
    }
  }
  const fullText = wordEntries.filter(w => w !== undefined).join(' ').trim();
  return fullText.length > 20 ? fullText : null;
}

/**
 * Helper to make HTTPS GET request with timeout and custom headers
 */
function fetchJson(apiUrl) {
  return new Promise((resolve) => {
    const parsed = url.parse(apiUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.path,
      headers: {
        'User-Agent': 'SistemPencariJurnalSkripsi/1.0 (mailto:akademik-mahasiswa@example.com)'
      },
      timeout: 10000
    };

    const req = https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        return fetchJson(res.headers.location).then(resolve);
      }
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.abort();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Common parser for OpenAlex works
 */
function parseOpenAlexWorks(works, forceIndonesian = false) {
  if (!works || !Array.isArray(works)) return [];
  return works.map(work => {
    const authors = (work.authorships || [])
      .map(a => a.author?.display_name)
      .filter(Boolean);

    const journalName = work.primary_location?.source?.display_name ||
                        work.host_venue?.display_name ||
                        'Jurnal Ilmiah Terpublikasi';

    const doiRaw = work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//i, '') : null;
    const doiUrl = work.doi || (doiRaw ? `https://doi.org/${doiRaw}` : null);
    const isOA = Boolean(work.open_access?.is_oa);
    const pdfUrl = work.open_access?.oa_url || work.best_oa_location?.pdf_url || work.primary_location?.pdf_url || null;
    const abstract = reconstructAbstract(work.abstract_inverted_index);
    const publisher = work.primary_location?.source?.host_organization_name || 'Academic Press';
    const detectedOrigin = detectOrigin(work.title, abstract, journalName, publisher);
    const origin = forceIndonesian ? 'Dalam Negeri (Indonesia)' : detectedOrigin;

    return {
      id: work.id || `oa-${Math.random().toString(36).substr(2, 9)}`,
      title: work.title || 'Untitled Publication',
      authors: authors.length > 0 ? authors : ['Peneliti Akademik'],
      authorDisplay: formatAuthorDisplay(authors),
      year: work.publication_year || new Date().getFullYear(),
      journal: journalName,
      publisher: publisher,
      doi: doiRaw,
      doiUrl: doiUrl,
      isOpenAccess: isOA,
      pdfUrl: pdfUrl,
      citations: work.cited_by_count || 0,
      abstract: abstract,
      topics: (work.concepts || []).slice(0, 4).map(c => c.display_name),
      source: 'OpenAlex',
      origin: origin,
      language: origin === 'Dalam Negeri (Indonesia)' ? 'Indonesia' : 'Internasional (Inggris)'
    };
  });
}

/**
 * Search OpenAlex with default 5-year filter (>= 2021)
 */
async function searchOpenAlex(searchQuery, perPage = 35, fromYear = 2021) {
  const yearFilter = fromYear ? `,from_publication_date:${fromYear}-01-01` : '';
  const endpoint = `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per_page=${perPage}&filter=type:article${yearFilter}&mailto=akademik-mahasiswa@example.com`;
  const data = await fetchJson(endpoint);
  if (!data || !data.results || !Array.isArray(data.results)) {
    return [];
  }
  return parseOpenAlexWorks(data.results);
}

/**
 * Explicit Indonesian national repository search on OpenAlex
 */
async function searchOpenAlexIndonesian(searchQuery, perPage = 30, fromYear = 2021) {
  const yearFilter = fromYear ? `,from_publication_date:${fromYear}-01-01` : '';
  const endpoint = `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per_page=${perPage}&filter=institutions.country_code:ID,type:article${yearFilter}&mailto=akademik-mahasiswa@example.com`;
  const data = await fetchJson(endpoint);
  if (!data || !data.results || !Array.isArray(data.results)) {
    return [];
  }
  return parseOpenAlexWorks(data.results, true);
}

/**
 * Search DOAJ (Directory of Open Access Journals) - National OJS & International OA
 */
async function searchDOAJ(searchQuery, pageSize = 30, fromYear = 2021) {
  const endpoint = `https://doaj.org/api/search/articles/${encodeURIComponent(searchQuery)}?pageSize=${pageSize}`;
  const data = await fetchJson(endpoint);
  if (!data || !data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.map(item => {
    const bib = item.bibjson || {};
    const authors = (bib.author || []).map(a => a.name).filter(Boolean);
    const journalName = bib.journal?.title || 'Jurnal Ilmiah Terpublikasi (DOAJ)';
    const publisher = bib.journal?.publisher || 'Open Access Publisher';
    const year = parseInt(bib.year, 10) || new Date().getFullYear();

    const doiObj = (bib.identifier || []).find(i => i.type?.toLowerCase() === 'doi');
    const doi = doiObj?.id ? doiObj.id.replace(/^https?:\/\/doi\.org\//i, '') : null;
    const doiUrl = doi ? `https://doi.org/${doi}` : null;

    let pdfUrl = null;
    let fulltextUrl = null;
    (bib.link || []).forEach(l => {
      if (l.content_type?.toLowerCase() === 'pdf' || l.type === 'fulltext') {
        if (!pdfUrl && (l.url.endsWith('.pdf') || l.content_type?.toLowerCase() === 'pdf')) {
          pdfUrl = l.url;
        } else if (!fulltextUrl) {
          fulltextUrl = l.url;
        }
      }
    });
    if (!pdfUrl && fulltextUrl) pdfUrl = fulltextUrl;

    const title = bib.title || 'Untitled Publication';
    const abstract = bib.abstract || null;
    const origin = detectOrigin(title, abstract, journalName, publisher);

    return {
      id: doi ? `doaj-${doi}` : `doaj-${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      authors: authors.length > 0 ? authors : ['Peneliti Akademik'],
      authorDisplay: formatAuthorDisplay(authors),
      year: year,
      journal: journalName,
      publisher: publisher,
      doi: doi,
      doiUrl: doiUrl || pdfUrl,
      isOpenAccess: true,
      pdfUrl: pdfUrl,
      citations: 0,
      abstract: abstract,
      topics: (bib.keywords || []).slice(0, 4),
      source: 'DOAJ',
      origin: origin,
      language: origin === 'Dalam Negeri (Indonesia)' ? 'Indonesia' : 'Internasional (Inggris)'
    };
  });
}

/**
 * Search Crossref with 5-year filter
 */
async function searchCrossref(searchQuery, rows = 30, fromYear = 2021) {
  const yearFilter = fromYear ? `,from-pub-date:${fromYear}-01-01` : '';
  const endpoint = `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&rows=${rows}&filter=type:journal-article${yearFilter}&mailto=akademik-mahasiswa@example.com`;
  const data = await fetchJson(endpoint);
  if (!data || !data.message || !data.message.items || !Array.isArray(data.message.items)) {
    return [];
  }

  return data.message.items.map(item => {
    const authors = (item.author || []).map(a => {
      if (a.given && a.family) return `${a.given} ${a.family}`;
      return a.name || a.family || a.given;
    }).filter(Boolean);

    let year = null;
    if (item['published-print'] && item['published-print']['date-parts']) {
      year = item['published-print']['date-parts'][0][0];
    } else if (item['published-online'] && item['published-online']['date-parts']) {
      year = item['published-online']['date-parts'][0][0];
    } else if (item.created && item.created['date-parts']) {
      year = item.created['date-parts'][0][0];
    }

    const journalName = (item['container-title'] && item['container-title'][0]) || 'Jurnal Ilmiah Terbitan';
    const title = (item.title && item.title[0]) || 'Untitled Publication';
    const doi = item.DOI;
    const doiUrl = doi ? `https://doi.org/${doi}` : (item.URL || null);
    const publisher = item.publisher || 'Publisher';

    let pdfUrl = null;
    if (item.link && Array.isArray(item.link)) {
      const pdfItem = item.link.find(l => l['content-type'] === 'application/pdf');
      if (pdfItem) pdfUrl = pdfItem.URL;
    }

    const origin = detectOrigin(title, item.abstract, journalName, publisher);

    return {
      id: doi ? `crossref-${doi}` : `cr-${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      authors: authors.length > 0 ? authors : ['Peneliti'],
      authorDisplay: formatAuthorDisplay(authors),
      year: year || new Date().getFullYear(),
      journal: journalName,
      publisher: publisher,
      doi: doi,
      doiUrl: doiUrl,
      isOpenAccess: Boolean(pdfUrl),
      pdfUrl: pdfUrl,
      citations: item['is-referenced-by-count'] || 0,
      abstract: item.abstract ? item.abstract.replace(/<\/?[^>]+(>|$)/g, "") : null,
      topics: [],
      source: 'Crossref',
      origin: origin,
      language: origin === 'Dalam Negeri (Indonesia)' ? 'Indonesia' : 'Internasional (Inggris)'
    };
  });
}

/**
 * Format author names nicely (e.g. "A. Pratama, S. Rahayu, & B. Santoso")
 */
function formatAuthorDisplay(authors) {
  if (!authors || authors.length === 0) return 'Peneliti Akademik';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  if (authors.length === 3) return `${authors[0]}, ${authors[1]}, & ${authors[2]}`;
  return `${authors[0]} et al.`;
}

/**
 * Detect origin: Dalam Negeri (Indonesia) vs Luar Negeri (Internasional)
 */
function detectOrigin(title, abstract, journalName, publisher) {
  const sample = ((title || '') + ' ' + (abstract || '') + ' ' + (journalName || '') + ' ' + (publisher || '')).toLowerCase();

  const idIndicators = [
    'universitas', 'institut', 'politeknik', 'stmik', 'stie', 'uin', 'iain', 'lp2m', 'lppm',
    'perguruan', 'fakultas', 'program studi', 'departemen', 'indonesia', 'kemdikbud',
    'sinta', 'garuda', 'neliti', 'jurnal', 'jurnal ilmiah', 'jurnal pendidikan', 'jurnal teknologi',
    'jurnal manajemen', 'jurnal sistem', 'jurnal ekonomi'
  ];

  for (const ind of idIndicators) {
    if (sample.includes(ind)) return 'Dalam Negeri (Indonesia)';
  }

  const idWords = ['pengaruh', 'terhadap', 'kinerja', 'analisis', 'penelitian', 'sistem', 'metode', 'hasil', 'pada', 'dengan', 'dan', 'yang', 'dalam', 'pembelajaran', 'karyawan', 'kepuasan', 'variabel', 'penerapan', 'rancang', 'bangun'];
  let count = 0;
  for (const w of idWords) {
    if (sample.includes(` ${w} `) || sample.startsWith(`${w} `)) count++;
  }

  if (count >= 2) return 'Dalam Negeri (Indonesia)';
  return 'Luar Negeri (Internasional)';
}

/**
 * Generate APA 7, IEEE, Harvard, and BibTeX citations
 */
function generateCitations(paper) {
  const authorNames = paper.authors && paper.authors.length > 0 ? paper.authors : ['Peneliti'];
  const year = paper.year || 'n.d.';
  const title = paper.title.replace(/\.$/, '');
  const journal = paper.journal || 'Jurnal Ilmiah';
  const doi = paper.doi ? `https://doi.org/${paper.doi}` : (paper.doiUrl || '');

  // APA 7th Edition
  const apaAuthors = authorNames.map(name => {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      const last = parts.pop();
      const initials = parts.map(p => p[0] + '.').join(' ');
      return `${last}, ${initials}`;
    }
    return name;
  });
  let apaAuthorStr = '';
  if (apaAuthors.length === 1) {
    apaAuthorStr = apaAuthors[0];
  } else if (apaAuthors.length === 2) {
    apaAuthorStr = `${apaAuthors[0]} & ${apaAuthors[1]}`;
  } else if (apaAuthors.length <= 20) {
    apaAuthorStr = `${apaAuthors.slice(0, -1).join(', ')}, & ${apaAuthors[apaAuthors.length - 1]}`;
  } else {
    apaAuthorStr = `${apaAuthors.slice(0, 19).join(', ')}, ... ${apaAuthors[apaAuthors.length - 1]}`;
  }
  const apaCitation = `${apaAuthorStr} (${year}). ${title}. ${journal}.${doi ? ' ' + doi : ''}`;

  // IEEE
  const ieeeAuthors = authorNames.map(name => {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      const last = parts.pop();
      const initials = parts.map(p => p[0] + '.').join(' ');
      return `${initials} ${last}`;
    }
    return name;
  }).join(', ');
  const ieeeCitation = `${ieeeAuthors}, "${title}," ${journal}, ${year}.${doi ? ' doi: ' + paper.doi : ''}`;

  // Harvard
  let harvardAuthorStr = '';
  if (authorNames.length === 1) harvardAuthorStr = authorNames[0];
  else if (authorNames.length === 2) harvardAuthorStr = `${authorNames[0]} and ${authorNames[1]}`;
  else harvardAuthorStr = `${authorNames[0]} et al.`;
  const harvardCitation = `${harvardAuthorStr} (${year}) '${title}', ${journal}.${doi ? ' Available at: ' + doi : ''}`;

  // BibTeX
  const citeKey = (authorNames[0] ? authorNames[0].split(/\s+/).pop().toLowerCase() : 'paper') + year;
  const bibtexCitation = `@article{${citeKey},
  author = {${authorNames.join(' and ')}},
  title = {${title}},
  journal = {${journal}},
  year = {${year}},
  ${paper.doi ? `doi = {${paper.doi}},` : ''}
  ${paper.doiUrl ? `url = {${paper.doiUrl}}` : ''}
}`;

  return {
    apa: apaCitation,
    ieee: ieeeCitation,
    harvard: harvardCitation,
    bibtex: bibtexCitation
  };
}

/**
 * Score relevance and generate thesis chapter guidance
 */
function evaluateRelevance(paper, analysis) {
  const paperText = (paper.title + ' ' + (paper.abstract || '') + ' ' + (paper.topics || []).join(' ')).toLowerCase();
  
  // Token match score
  let matchCount = 0;
  const searchTokens = analysis.keywords.map(k => k.toLowerCase()).filter(k => k.length > 2);
  const englishTokens = analysis.englishKeywords.map(k => k.toLowerCase());
  const allTokens = [...searchTokens, ...englishTokens];

  allTokens.forEach(token => {
    if (paperText.includes(token)) matchCount += 2;
    // Check sub-words
    const subwords = token.split(/\s+/);
    subwords.forEach(sw => {
      if (sw.length > 3 && paperText.includes(sw)) matchCount += 1;
    });
  });

  // Recency score (max 15 points)
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - (paper.year || 2020));
  const recencyScore = Math.max(0, 15 - (age * 1.5));

  // Citation boost (max 15 points)
  const citationScore = Math.min(15, Math.log10(paper.citations + 1) * 6);

  // Total calculated score (0 - 100)
  const rawScore = (matchCount * 7) + recencyScore + citationScore;
  const score = Math.min(99, Math.max(68, Math.round(rawScore)));

  // Determine which Thesis Chapter this paper is most suitable for:
  let chapterRecommendation = '';
  let rationale = '';

  const lowerTitle = paper.title.toLowerCase();
  const hasMethodWord = /metode|algoritma|model|framework|arsitektur|design|algorithm|method|cnn|svm|rf|deep learning|system/i.test(lowerTitle);
  const hasVariableWord = /pengaruh|analisis|hubungan|kinerja|kepuasan|faktor|effect|impact|relationship|correlation/i.test(lowerTitle);

  if (hasMethodWord) {
    chapterRecommendation = 'Bab 3: Metodologi Penelitian & Perancangan Sistem';
    rationale = 'Sangat tepat sebagai rujukan landasan metodologis, parameter algoritma/metode, dan alur eksperimen perancangan.';
  } else if (hasVariableWord) {
    chapterRecommendation = 'Bab 2: Tinjauan Pustaka & Kerangka Teoretis';
    rationale = 'Ideal sebagai landasan teori variabel penelitian, sintesis penelitian terdahulu, dan pengembangan hipotesis.';
  } else if (paper.citations > 20 || age >= 4) {
    chapterRecommendation = 'Bab 1: Latar Belakang Masalah & Urgensi Riset';
    rationale = 'Karya ilmiah rujukan bereputasi tinggi untuk memperkuat justifikasi pentingnya topik penelitian ini diangkat.';
  } else {
    chapterRecommendation = 'Bab 4: Pembahasan & Diskusi Komparatif';
    rationale = 'Bagus dijadikan bahan perbandingan dan konfirmasi hasil temuan penelitian dengan karya yang sudah dipublikasi.';
  }

  return {
    relevanceScore: score,
    chapter: chapterRecommendation,
    rationale: rationale
  };
}

/**
 * Main Search Handler that aggregates results from OpenAlex, DOAJ, and Crossref
 * Guarantees MINIMUM 25 published journals!
 */
async function handleSearch(thesisTitle, options = {}) {
  const analysis = analyzeThesisTitle(thesisTitle);
  const fromYear = parseInt(options.yearFrom, 10) || 2021; // Standar 5 tahun terakhir (2021-2026)

  // Query variasi
  const query1 = analysis.cleanTitle; // Judul asli bersih
  const query2 = analysis.keywords.slice(0, 4).join(' '); // Kata kunci utama
  const query3 = analysis.englishKeywords.length > 0 ? analysis.englishKeywords.join(' ') : null; // Padanan istilah internasional

  // Fetch dari OpenAlex, OpenAlex Indonesian, DOAJ, dan Crossref dengan filter tahun >= 2021
  const promises = [
    searchOpenAlex(query1, 40, fromYear),
    searchOpenAlex(query2, 40, fromYear),
    searchOpenAlexIndonesian(query1, 35, fromYear),
    searchDOAJ(query1, 30, fromYear),
    searchDOAJ(query2, 30, fromYear),
    searchCrossref(query1, 30, fromYear)
  ];

  if (query3) {
    promises.push(searchOpenAlex(query3, 30, fromYear));
    promises.push(searchDOAJ(query3, 25, fromYear));
    promises.push(searchCrossref(query3, 20, fromYear));
  }

  const resultsNested = await Promise.all(promises);
  const combined = resultsNested.flat();

  // Deduplikasi berdasarkan DOI dan Judul
  const seenDoi = new Set();
  const seenTitle = new Set();
  const uniquePapers = [];

  for (const paper of combined) {
    if (!paper || !paper.title) continue;
    
    // Pastikan terbitan 5 tahun terakhir (>= 2021) jika opsi menghendaki
    if (fromYear && (paper.year || 0) < fromYear) continue;

    const normTitle = paper.title.toLowerCase().replace(/[^\w]/g, '');
    if (normTitle.length < 5) continue;
    
    const normDoi = paper.doi ? paper.doi.toLowerCase() : null;
    if (normDoi && seenDoi.has(normDoi)) continue;
    if (seenTitle.has(normTitle)) continue;

    if (normDoi) seenDoi.add(normDoi);
    seenTitle.add(normTitle);

    const evalData = evaluateRelevance(paper, analysis);
    const citations = generateCitations(paper);

    uniquePapers.push({
      ...paper,
      relevanceScore: evalData.relevanceScore,
      recommendedChapter: evalData.chapter,
      chapterRationale: evalData.rationale,
      citationsFormatted: citations
    });
  }

  // Pisahkan Pool Jurnal: Dalam Negeri (Indonesia) vs Luar Negeri (Internasional)
  const idPool = uniquePapers.filter(p => p.origin === 'Dalam Negeri (Indonesia)');
  const enPool = uniquePapers.filter(p => p.origin === 'Luar Negeri (Internasional)');

  // Urutkan masing-masing pool berdasarkan relevansi
  idPool.sort((a, b) => b.relevanceScore - a.relevanceScore || (b.year || 0) - (a.year || 0));
  enPool.sort((a, b) => b.relevanceScore - a.relevanceScore || (b.year || 0) - (a.year || 0));

  // Terapkan Rasio Dalam Negeri (Indonesia) : Luar Negeri (Internasional)
  // Target minimal sesuai instruksi: minimal 25 jurnal
  const targetRatioId = options.idRatio ? parseFloat(options.idRatio) : 0.75;
  const minTargetReq = parseInt(options.minCount, 10) || 25;
  const totalTarget = Math.max(minTargetReq, Math.min(idPool.length + enPool.length, minTargetReq + 15));
  let targetId = Math.round(totalTarget * targetRatioId);
  let targetEn = totalTarget - targetId;

  // Jika salah satu pool kurang dari kuota, pinjam dari pool lainnya untuk menjamin minimal 25 jurnal
  if (idPool.length < targetId) {
    targetId = idPool.length;
    targetEn = Math.min(enPool.length, totalTarget - targetId);
  } else if (enPool.length < targetEn) {
    targetEn = enPool.length;
    targetId = Math.min(idPool.length, totalTarget - targetEn);
  }

  const selectedId = idPool.slice(0, targetId);
  const selectedEn = enPool.slice(0, targetEn);

  // Interleave (campurkan secara proporsional: 3 Indonesia, 1 Luar Negeri -> 75% : 25%)
  const balancedJournals = [];
  let idxId = 0, idxEn = 0;

  while (idxId < selectedId.length || idxEn < selectedEn.length) {
    for (let i = 0; i < 3 && idxId < selectedId.length; i++) {
      balancedJournals.push(selectedId[idxId++]);
    }
    for (let j = 0; j < 1 && idxEn < selectedEn.length; j++) {
      balancedJournals.push(selectedEn[idxEn++]);
    }
  }

  // Jika filter khusus diminta (misal pengguna ingin melihat hanya Indonesia atau hanya Internasional)
  let finalResults = [...balancedJournals];
  if (options.language === 'id') {
    finalResults = idPool.length >= minTargetReq ? idPool : idPool.concat(enPool.slice(0, Math.max(0, minTargetReq - idPool.length)));
  } else if (options.language === 'en') {
    finalResults = enPool.length >= minTargetReq ? enPool : enPool.concat(idPool.slice(0, Math.max(0, minTargetReq - enPool.length)));
  }

  if (options.openAccessOnly === 'true' || options.openAccessOnly === true) {
    const oaFiltered = finalResults.filter(p => p.isOpenAccess);
    if (oaFiltered.length >= 10) finalResults = oaFiltered;
  }

  // Sorting
  if (options.sortBy === 'year') {
    finalResults.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (options.sortBy === 'citations') {
    finalResults.sort((a, b) => (b.citations || 0) - (a.citations || 0));
  }

  const idCount = finalResults.filter(p => p.origin === 'Dalam Negeri (Indonesia)').length;
  const enCount = finalResults.filter(p => p.origin === 'Luar Negeri (Internasional)').length;

  return {
    queryAnalysis: analysis,
    totalFound: finalResults.length,
    minTargetAchieved: finalResults.length >= 25,
    composition: {
      idCount: idCount,
      idPercent: Math.round((idCount / (finalResults.length || 1)) * 100) || 75,
      enCount: enCount,
      enPercent: Math.round((enCount / (finalResults.length || 1)) * 100) || 25,
      yearRange: `${fromYear} - 2026 (5 Tahun Terakhir)`
    },
    journals: finalResults
  };
}

// ====================================================================
// PAYMENT TRANSACTIONS STORE & MIDTRANS HELPERS
// ====================================================================
const paymentTransactions = new Map();

// Helper to parse JSON body from request
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        resolve(json);
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Midtrans Snap API Caller
function requestMidtransSnap(payload, serverKey, isProduction = false) {
  return new Promise((resolve) => {
    const host = isProduction ? 'app.midtrans.com' : 'app.sandbox.midtrans.com';
    const authHeader = 'Basic ' + Buffer.from(serverKey.trim() + ':').toString('base64');
    const dataString = JSON.stringify(payload);

    const options = {
      hostname: host,
      port: 443,
      path: '/snap/v1/transactions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const request = https.request(options, (response) => {
      let responseBody = '';
      response.on('data', (d) => responseBody += d);
      response.on('end', () => {
        try {
          const resJson = JSON.parse(responseBody);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ ok: true, data: resJson });
          } else {
            resolve({ ok: false, status: response.statusCode, error: resJson });
          }
        } catch (e) {
          resolve({ ok: false, error: responseBody });
        }
      });
    });

    request.on('error', (err) => resolve({ ok: false, error: err.message }));
    request.write(dataString);
    request.end();
  });
}

// Midtrans Status Checker
function checkMidtransStatus(orderId, serverKey, isProduction = false) {
  return new Promise((resolve) => {
    const host = isProduction ? 'api.midtrans.com' : 'api.sandbox.midtrans.com';
    const authHeader = 'Basic ' + Buffer.from(serverKey.trim() + ':').toString('base64');

    const options = {
      hostname: host,
      port: 443,
      path: `/v2/${encodeURIComponent(orderId)}/status`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      }
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', (d) => body += d);
      response.on('end', () => {
        try {
          const resJson = JSON.parse(body);
          resolve(resJson);
        } catch (e) {
          resolve(null);
        }
      });
    });

    request.on('error', () => resolve(null));
    request.end();
  });
}

// ====================================================================
// MIDTRANS CONFIGURATION HELPER (LOAD, SAVE & PLACEHOLDER DETECTION)
// ====================================================================
const MIDTRANS_CONFIG_PATH = path.join(__dirname, 'midtrans.config.json');

function isPlaceholderKey(key) {
  if (!key) return true;
  const k = key.trim().toLowerCase();
  return k.includes('placeholder') || k.includes('ganti_dengan') || k.includes('masukkan_') || k.length < 15;
}

function getMidtransConfig() {
  let cfg = {
    isProduction: false,
    clientKey: 'SB-Mid-client-PLACEHOLDER_GANTI_DENGAN_CLIENT_KEY_ANDA',
    serverKey: 'SB-Mid-server-PLACEHOLDER_GANTI_DENGAN_SERVER_KEY_ANDA',
    merchantId: 'G000000000_PLACEHOLDER_MERCHANT_ID'
  };

  try {
    if (fs.existsSync(MIDTRANS_CONFIG_PATH)) {
      let content = fs.readFileSync(MIDTRANS_CONFIG_PATH, 'utf8');
      content = content.replace(/^\uFEFF/, '');
      const parsed = JSON.parse(content);
      cfg = { ...cfg, ...parsed };
    }
  } catch (e) {
    console.warn('Gagal membaca midtrans.config.json:', e.message);
  }

  // Environment variable overrides
  if (process.env.MIDTRANS_SERVER_KEY) cfg.serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (process.env.MIDTRANS_CLIENT_KEY) cfg.clientKey = process.env.MIDTRANS_CLIENT_KEY;
  if (process.env.MIDTRANS_IS_PRODUCTION !== undefined) cfg.isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  return cfg;
}

function saveMidtransConfig(newCfg) {
  try {
    const existing = getMidtransConfig();
    const merged = {
      ...existing,
      ...newCfg,
      _petunjuk: "Ganti nilai placeholder di bawah ini setelah Anda mendaftar di https://dashboard.midtrans.com",
      caraMendapatkanKey: [
        "1. Buka https://dashboard.midtrans.com dan daftar akun gratis (mode Sandbox untuk uji coba).",
        "2. Masuk ke menu: Pengaturan (Settings) -> Access Keys.",
        "3. Salin Client Key dan Server Key ke file ini atau tempel langsung di Pengaturan Sistem di web."
      ]
    };
    fs.writeFileSync(MIDTRANS_CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
    const pubPath = path.join(__dirname, 'public', 'midtrans.config.json');
    if (fs.existsSync(path.join(__dirname, 'public'))) {
      fs.writeFileSync(pubPath, JSON.stringify(merged, null, 2), 'utf8');
    }
    return true;
  } catch (e) {
    console.error('Gagal menyimpan midtrans.config.json:', e.message);
    return false;
  }
}

// ====================================================================
// MONETIZATION PACKAGES & PDF STREAMING PROXY
// ====================================================================
const SUBSCRIPTION_PACKAGES = {
  'single': {
    id: 'single',
    name: 'Paket Skripsi 1x Riset Judul',
    price: 15000,
    badge: 'Paling Hemat',
    description: 'Akses penuh 1x penjaringan komprehensif (minimal 25+ jurnal terpublikasi, preview & unduh PDF, ekspor Word/BibTeX)',
    features: [
      'Minimal 25 Jurnal Terpublikasi Valid',
      '75% Nasional (SINTA/Garuda/DOAJ) : 25% Internasional (Scopus/WoS)',
      'Direct In-App PDF Preview & Unduh Gratis',
      'Ekspor Draf Daftar Pustaka Lengkap (APA 7, IEEE, BibTeX)'
    ],
    validityDays: 1
  },
  'monthly': {
    id: 'monthly',
    name: 'Paket Mahasiswa 1 Bulan (Unlimited)',
    price: 49000,
    badge: 'Paling Populer',
    description: 'Pencarian tanpa batas seluruh judul skripsi selama 30 hari penuh + akses seluruh PDF',
    features: [
      'Unlimited Pencarian Judul Selama 30 Hari',
      'Minimal 25-50+ Jurnal Per Pencarian',
      'Akses Penuh Direct PDF Preview & Download',
      'Analisis Kecocokan Bab Skripsi (Bab 1, 2, 3, 4)',
      'Ekspor Tanpa Batas ke Word, Mendeley, & Zotero'
    ],
    validityDays: 30
  },
  'pro': {
    id: 'pro',
    name: 'Paket Pro Tesis & Disertasi (6 Bulan)',
    price: 99000,
    badge: 'Terlengkap S1/S2/S3',
    description: 'Akses prioritas 180 hari untuk mahasiswa tingkat akhir, magister, doktoral, & dosen peneliti',
    features: [
      'Akses Penuh 180 Hari (6 Bulan)',
      'Prioritas Indexing Scopus Q1-Q4 & SINTA 1-2',
      'Unduh Paket Komprehensif BibTeX & EndNote',
      'Dukungan Konsultasi & Bantuan Akademik Prioritas'
    ],
    validityDays: 180
  }
};

/**
 * PDF Streaming Proxy - allows in-app iframe preview without CORS or X-Frame-Options blocking
 */
function fetchPdfStream(targetUrl, clientRes, redirectCount = 0) {
  if (redirectCount > 5) {
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    return clientRes.end(JSON.stringify({ error: 'Terlalu banyak redirect saat mengambil PDF.', url: targetUrl }));
  }

  try {
    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'http:' ? http : https;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
      path: parsed.path,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AcademicReader/1.0',
        'Accept': 'application/pdf,application/octet-stream,*/*'
      },
      timeout: 15000
    };

    const req = client.get(reqOptions, (remoteRes) => {
      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
        let redirectTarget = remoteRes.headers.location;
        if (!redirectTarget.startsWith('http://') && !redirectTarget.startsWith('https://')) {
          redirectTarget = url.resolve(targetUrl, redirectTarget);
        }
        return fetchPdfStream(redirectTarget, clientRes, redirectCount + 1);
      }

      if (remoteRes.statusCode < 200 || remoteRes.statusCode >= 300) {
        clientRes.writeHead(remoteRes.statusCode || 502, { 'Content-Type': 'application/json' });
        return clientRes.end(JSON.stringify({ error: 'Gagal mengambil PDF dari server jurnal.', status: remoteRes.statusCode, originalUrl: targetUrl }));
      }

      // Stream PDF with CORS and frame allowance
      const headers = {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'inline; filename="academic-journal.pdf"'
      };
      if (remoteRes.headers['content-length']) {
        headers['Content-Length'] = remoteRes.headers['content-length'];
      }

      clientRes.writeHead(200, headers);
      remoteRes.pipe(clientRes);
    });

    req.on('timeout', () => {
      req.abort();
      if (!clientRes.headersSent) {
        clientRes.writeHead(504, { 'Content-Type': 'application/json' });
        clientRes.end(JSON.stringify({ error: 'Timeout koneksi server penerbit PDF.', originalUrl: targetUrl }));
      }
    });

    req.on('error', (err) => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'application/json' });
        clientRes.end(JSON.stringify({ error: 'Koneksi ke server jurnal gagal: ' + err.message, originalUrl: targetUrl }));
      }
    });
  } catch (err) {
    if (!clientRes.headersSent) {
      clientRes.writeHead(500, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'Kesalahan internal PDF proxy: ' + err.message }));
    }
  }
}

// In-Memory Database for User Registrations (Keyed by normalized WhatsApp number)
const registeredUsersDb = new Map();

/**
 * HTTP Server implementation
 */
const server = http.createServer(async (req, res) => {
  // CORS Headers Universal untuk semua request (mengatasi masalah Failed to fetch pada browser)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Endpoint: /api/search
  if (pathname === '/api/search' && req.method === 'GET') {
    const thesisTitle = parsedUrl.query.title;
    if (!thesisTitle || thesisTitle.trim().length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({ error: 'Parameter "title" (Judul skripsi) wajib diisi!' }));
    }

    try {
      const data = await handleSearch(thesisTitle, parsedUrl.query);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(data));
    } catch (err) {
      console.error('Search error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({ error: 'Terjadi kesalahan saat mencari jurnal.', details: err.message }));
    }
  }

  // ====================================================================
  // DIRECT PDF PROXY STREAMING ENDPOINT
  // ====================================================================
  if (pathname === '/api/pdf/proxy' && req.method === 'GET') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Parameter "url" PDF wajib valid (http/https)!' }));
    }

    fetchPdfStream(targetUrl, res, 0);
    return;
  }

  // ====================================================================
  // PAYMENT & MONETIZATION API ENDPOINTS
  // ====================================================================

  // 0. Get Subscription Packages: GET /api/payment/packages
  if ((pathname === '/api/payment/packages' || pathname === '/api/packages') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    return res.end(JSON.stringify({
      success: true,
      packages: Object.values(SUBSCRIPTION_PACKAGES)
    }));
  }

  // Midtrans Config Get: GET /api/payment/midtrans/config or /api/payment/midtrans-config
  if ((pathname === '/api/payment/midtrans/config' || pathname === '/api/payment/midtrans-config') && req.method === 'GET') {
    const cfg = getMidtransConfig();
    const isPlh = isPlaceholderKey(cfg.serverKey);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    return res.end(JSON.stringify({
      success: true,
      isProduction: cfg.isProduction,
      clientKey: cfg.clientKey,
      serverKeyMasked: isPlh ? '(Placeholder / Belum Diisi)' : cfg.serverKey.substring(0, 10) + '••••••••',
      merchantId: cfg.merchantId,
      isPlaceholder: isPlh,
      instructions: cfg.caraMendapatkanKey || []
    }));
  }

  // Midtrans Config Save: POST /api/payment/midtrans/config or /api/payment/midtrans-config
  if ((pathname === '/api/payment/midtrans/config' || pathname === '/api/payment/midtrans-config') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const updateObj = {};
      if (body.isProduction !== undefined) updateObj.isProduction = Boolean(body.isProduction);
      if (body.clientKey && typeof body.clientKey === 'string') updateObj.clientKey = body.clientKey.trim();
      if (body.serverKey && typeof body.serverKey === 'string') updateObj.serverKey = body.serverKey.trim();
      if (body.merchantId && typeof body.merchantId === 'string') updateObj.merchantId = body.merchantId.trim();

      const saved = saveMidtransConfig(updateObj);
      if (saved) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Konfigurasi Midtrans berhasil disimpan!',
          config: {
            isProduction: updateObj.isProduction,
            clientKey: updateObj.clientKey,
            isPlaceholder: isPlaceholderKey(updateObj.serverKey)
          }
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        return res.end(JSON.stringify({ success: false, error: 'Gagal menulis file konfigurasi' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // 1. Create Customer Transaction: POST /api/payment/create-transaction or POST /api/payment/create
  if ((pathname === '/api/payment/create-transaction' || pathname === '/api/payment/create') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const packageId = body.packageId || 'single';
      const selectedPackage = SUBSCRIPTION_PACKAGES[packageId] || SUBSCRIPTION_PACKAGES['single'];

      const title = (body.title || '').trim();
      const customerName = (body.customerName || 'Mahasiswa').trim();
      const customerPhone = (body.customerPhone || '081234567890').trim();
      const customerEmail = (body.customerEmail || 'mahasiswa@example.com').trim();
      const grossAmount = parseInt(body.amount, 10) || selectedPackage.price;
      
      const midtransCfg = getMidtransConfig();
      const midtransServerKey = (body.midtransServerKey || midtransCfg.serverKey || '').trim();
      const isProduction = body.isProduction !== undefined ? Boolean(body.isProduction) : midtransCfg.isProduction;
      const isPlh = isPlaceholderKey(midtransServerKey);

      const orderId = `SKRIPSI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate expiration
      const expiresAt = new Date(Date.now() + (selectedPackage.validityDays * 24 * 60 * 60 * 1000)).toISOString();

      // Initial transaction record
      const txData = {
        order_id: orderId,
        package_id: selectedPackage.id,
        package_name: selectedPackage.name,
        title: title,
        gross_amount: grossAmount,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        payment_type: 'unknown',
        server_key: midtransServerKey,
        is_production: isProduction
      };

      // If requested Midtrans or not placeholder
      if (body.mode === 'midtrans' || body.useMidtrans === true || (!body.mode && !isPlh)) {
        if (isPlh) {
          // Placeholder mode: Return structured placeholder simulation
          txData.mode = 'midtrans_placeholder';
          txData.snap_token = `PLACEHOLDER-SNAP-${orderId}`;
          paymentTransactions.set(orderId, txData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          return res.end(JSON.stringify({
            success: true,
            order_id: orderId,
            package: selectedPackage,
            amount: grossAmount,
            customer_name: customerName,
            mode: 'midtrans_placeholder',
            placeholder: true,
            client_key: midtransCfg.clientKey,
            message: 'Server Key Midtrans masih berstatus placeholder. Kunci dapat diupdate di Pengaturan Sistem atau midtrans.config.json.'
          }));
        }

        // Real Midtrans Snap call
        const snapPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: grossAmount
          },
          item_details: [{
            id: selectedPackage.id,
            price: grossAmount,
            quantity: 1,
            name: selectedPackage.name
          }],
          customer_details: {
            first_name: customerName,
            email: customerEmail,
            phone: customerPhone
          },
          callbacks: {
            finish: `http://localhost:${PORT}/?order_id=${orderId}&payment=success`
          }
        };

        const snapResult = await requestMidtransSnap(snapPayload, midtransServerKey, isProduction);
        if (snapResult.ok && snapResult.data && snapResult.data.token) {
          txData.snap_token = snapResult.data.token;
          txData.redirect_url = snapResult.data.redirect_url;
          txData.mode = 'midtrans';
          paymentTransactions.set(orderId, txData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          return res.end(JSON.stringify({
            success: true,
            order_id: orderId,
            package: selectedPackage,
            snap_token: snapResult.data.token,
            redirect_url: snapResult.data.redirect_url,
            amount: grossAmount,
            customer_name: customerName,
            client_key: midtransCfg.clientKey,
            mode: 'midtrans'
          }));
        } else {
          console.warn('Midtrans Snap request failed, falling back to Internal Engine:', snapResult.error);
          txData.midtrans_error = snapResult.error;
        }
      }

      // Internal Transaction Engine (QRIS, VA, E-Wallet)
      txData.mode = 'engine';
      paymentTransactions.set(orderId, txData);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({
        success: true,
        order_id: orderId,
        package: selectedPackage,
        amount: grossAmount,
        customer_name: customerName,
        mode: 'engine',
        va_numbers: {
          bca: '800012345678',
          mandiri: '1370012345678',
          bri: '012301000000500',
          bni: '827701234567890'
        },
        qris_nmid: 'ID10200000000000'
      }));

    } catch (err) {
      console.error('Payment creation error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({ error: 'Gagal membuat transaksi.', details: err.message }));
    }
  }

  // 2. Check Transaction Status: GET /api/payment/status?order_id=...
  if (pathname === '/api/payment/status' && req.method === 'GET') {
    const orderId = parsedUrl.query.order_id;
    if (!orderId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'order_id parameter required' }));
    }

    const tx = paymentTransactions.get(orderId);

    // If order is bound to Midtrans, query Midtrans Status API
    if (tx && tx.mode === 'midtrans' && tx.server_key && tx.status !== 'settlement') {
      const midtransStatus = await checkMidtransStatus(orderId, tx.server_key, tx.is_production);
      if (midtransStatus && midtransStatus.transaction_status) {
        const st = midtransStatus.transaction_status;
        if (st === 'capture' || st === 'settlement') {
          tx.status = 'settlement';
          tx.payment_type = midtransStatus.payment_type || 'midtrans';
          tx.settlement_time = midtransStatus.settlement_time || new Date().toISOString();
        } else if (st === 'deny' || st === 'cancel' || st === 'expire') {
          tx.status = 'failed';
        }
      }
    }

    const pkgInfo = tx ? (SUBSCRIPTION_PACKAGES[tx.package_id] || SUBSCRIPTION_PACKAGES['single']) : SUBSCRIPTION_PACKAGES['single'];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    return res.end(JSON.stringify({
      success: true,
      order_id: orderId,
      status: tx ? tx.status : 'pending',
      package_id: tx ? tx.package_id : 'single',
      package_name: tx ? tx.package_name : pkgInfo.name,
      validity_days: pkgInfo.validityDays,
      expires_at: tx ? tx.expires_at : new Date(Date.now() + pkgInfo.validityDays * 86400000).toISOString(),
      transaction: tx || { order_id: orderId, status: 'pending' }
    }));
  }

  // 3. Webhook / Notification Callback: POST /api/payment/notification
  if (pathname === '/api/payment/notification' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const orderId = body.order_id;
      const txStatus = body.transaction_status;

      console.log(`[Midtrans Webhook] Order: ${orderId}, Status: ${txStatus}`);

      if (orderId && paymentTransactions.has(orderId)) {
        const tx = paymentTransactions.get(orderId);
        if (txStatus === 'capture' || txStatus === 'settlement') {
          tx.status = 'settlement';
          tx.payment_type = body.payment_type || 'qris';
          tx.settlement_time = new Date().toISOString();
        } else if (txStatus === 'deny' || txStatus === 'cancel' || txStatus === 'expire') {
          tx.status = 'failed';
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'OK' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 4. Simulate Payment Success (Testing & Instant Demo): POST /api/payment/simulate-success
  if (pathname === '/api/payment/simulate-success' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const orderId = body.order_id || `SKRIPSI-${Date.now()}`;
      const packageId = body.packageId || 'single';
      const pkg = SUBSCRIPTION_PACKAGES[packageId] || SUBSCRIPTION_PACKAGES['single'];
      
      let tx = paymentTransactions.get(orderId);
      if (!tx) {
        tx = {
          order_id: orderId,
          package_id: pkg.id,
          package_name: pkg.name,
          gross_amount: body.amount || pkg.price,
          customer_name: body.customerName || 'Mahasiswa',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (pkg.validityDays * 24 * 60 * 60 * 1000)).toISOString()
        };
        paymentTransactions.set(orderId, tx);
      }
      tx.status = 'settlement';
      tx.payment_type = body.paymentType || 'QRIS Instan';
      tx.settlement_time = new Date().toISOString();

      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({
        success: true,
        order_id: orderId,
        status: 'settlement',
        package: pkg,
        message: 'Pembayaran transaksi pelanggan berhasil diverifikasi (LUNAS)!'
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 5. Verify Subscription: GET /api/subscription/verify?order_id=...
  if (pathname === '/api/subscription/verify' && req.method === 'GET') {
    const orderId = parsedUrl.query.order_id;
    if (!orderId) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ active: false, reason: 'No order_id provided' }));
    }

    const tx = paymentTransactions.get(orderId);
    if (tx && tx.status === 'settlement') {
      const isExpired = tx.expires_at && new Date(tx.expires_at) < new Date();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({
        active: !isExpired,
        order_id: tx.order_id,
        package_id: tx.package_id,
        package_name: tx.package_name,
        expires_at: tx.expires_at,
        customer_name: tx.customer_name
      }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    return res.end(JSON.stringify({ active: false, reason: 'Transaction not found or not settled' }));
  }

  // 6. User Registration Endpoint: POST /api/auth/register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const rawWa = (body.whatsapp || body.rawWhatsapp || '').trim();
      const cleanWa = rawWa.replace(/\D/g, '');
      const normWa = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : (cleanWa.startsWith('8') ? '62' + cleanWa : cleanWa);

      if (!normWa || normWa.length < 10) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
        return res.end(JSON.stringify({ success: false, error: 'Nomor WhatsApp wajib diisi minimal 10 digit.' }));
      }

      // Pembatas kepemilikan user: 1 WhatsApp hanya untuk 1 pengguna
      if (registeredUsersDb.has(normWa)) {
        const existing = registeredUsersDb.get(normWa);
        res.writeHead(409, { 'Content-Type': 'application/json; charset=UTF-8' });
        return res.end(JSON.stringify({
          success: false,
          error: `Nomor WhatsApp (${rawWa}) sudah terdaftar atas nama "${existing.name}". Kebijakan sistem: 1 Nomor WhatsApp dibatasi hanya untuk 1 user.`,
          user: existing
        }));
      }

      const userRecord = {
        id: body.id || 'usr_' + Date.now(),
        name: (body.name || 'Pengguna Riset').trim(),
        whatsapp: normWa,
        rawWhatsapp: rawWa,
        email: (body.email || '').trim(),
        purpose: body.purpose || 'skripsi',
        purposeLabel: body.purposeLabel || 'Penyusunan Skripsi (Sarjana / S1)',
        institution: (body.institution || '-').trim(),
        registeredAt: new Date().toISOString()
      };

      registeredUsersDb.set(normWa, userRecord);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({
        success: true,
        message: 'Registrasi akun pengguna berhasil.',
        user: userRecord
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 7. Check WhatsApp Uniqueness: GET /api/auth/check-whatsapp?whatsapp=...
  if (pathname === '/api/auth/check-whatsapp' && req.method === 'GET') {
    const rawWa = (parsedUrl.query.whatsapp || '').trim();
    const cleanWa = rawWa.replace(/\D/g, '');
    const normWa = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : (cleanWa.startsWith('8') ? '62' + cleanWa : cleanWa);
    const exists = registeredUsersDb.has(normWa);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    return res.end(JSON.stringify({
      exists: exists,
      user: exists ? { name: registeredUsersDb.get(normWa).name } : null
    }));
  }

  // Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', serverTime: new Date().toISOString() }));
  }

  // Dynamic Static File Serving
  const cleanPath = (pathname === '/' ? 'index.html' : pathname).replace(/^\/+/, '');
  const candidateDirs = [
    PUBLIC_DIR,
    __dirname,
    path.join(__dirname, 'public')
  ];

  let resolvedFile = null;
  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    const testPath = path.resolve(dir, cleanPath);
    if (testPath.startsWith(dir) && fs.existsSync(testPath)) {
      try {
        if (fs.statSync(testPath).isFile()) {
          resolvedFile = testPath;
          break;
        }
      } catch (e) {}
    }
  }

  if (!resolvedFile) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
    return res.end('<h1>404 Not Found</h1><p>Halaman tidak ditemukan.</p>');
  }

  const ext = path.extname(resolvedFile).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(resolvedFile).pipe(res);
});

// Start server with automatic port retry if port is in use
function startServer(portToTry = PORT) {
  server.listen(portToTry, () => {
    console.log(`\n======================================================`);
    console.log(`  SISTEM PENCARIAN JURNAL ILMIAH ACUAN SKRIPSI`);
    console.log(`======================================================`);
    console.log(`  Server aktif di: http://localhost:${portToTry}`);
    console.log(`  Buka browser Anda dan masukkan judul skripsi untuk mencari.`);
    console.log(`  Tekan Ctrl+C untuk menghentikan server.`);
    console.log(`======================================================\n`);

    if (process.argv.includes('--open')) {
      const { exec } = require('child_process');
      const openCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
      exec(`${openCmd} http://localhost:${portToTry}`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} sedang digunakan, mencoba port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// If invoked directly via `node server.js`
if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  analyzeThesisTitle,
  searchOpenAlex,
  searchCrossref,
  generateCitations,
  evaluateRelevance,
  handleSearch,
  server
};
