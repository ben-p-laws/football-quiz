export type P10Player = {
  id: string
  name: string
  // 0–100 for each of the 10 categories
  lf: number   // left foot
  rf: number   // right foot
  fin: number  // finishing
  head: number // heading
  pace: number // pace
  tb: number   // through balls
  drib: number // dribbling
  lp: number   // long passing
  tack: number // tackling
  eng: number  // engine / work-rate
}

export const CATEGORY_KEYS = ['lf','rf','fin','head','pace','tb','drib','lp','tack','eng'] as const
export type CategoryKey = typeof CATEGORY_KEYS[number]

export const CATEGORIES: { key: CategoryKey; label: string; short: string }[] = [
  { key:'lf',   label:'Left Foot',     short:'L.Foot' },
  { key:'rf',   label:'Right Foot',    short:'R.Foot' },
  { key:'fin',  label:'Finishing',     short:'Finish' },
  { key:'head', label:'Heading',       short:'Header' },
  { key:'pace', label:'Pace',          short:'Pace'   },
  { key:'tb',   label:'Through Balls', short:'T.Ball' },
  { key:'drib', label:'Dribbling',     short:'Dribble'},
  { key:'lp',   label:'Long Passing',  short:'L.Pass' },
  { key:'tack', label:'Tackling',      short:'Tackle' },
  { key:'eng',  label:'Engine',        short:'Engine' },
]

// lf, rf, fin, head, pace, tb, drib, lp, tack, eng
const RAW: [string, string, ...number[]][] = [
  // ── All-time legends (FUT Icons / pre-modern era) ──
  ['maradona',      'Diego Maradona',        99,70,90,72,88,97,99,80,45,75],
  ['pele',          'Pelé',                  85,97,98,88,92,87,92,78,55,82],
  ['cruyff',        'Johan Cruyff',          88,85,88,75,85,92,95,85,60,82],
  ['ronaldo_r9',    'Ronaldo (R9)',           82,97,98,80,99,70,99,65,35,72],
  ['ronaldinho',    'Ronaldinho',            95,92,85,72,88,90,99,82,40,72],
  ['zidane',        'Zinedine Zidane',       96,92,82,75,72,95,96,90,60,70],
  ['best',          'George Best',           90,82,88,70,90,85,98,72,52,78],
  ['beckenbauer',   'Franz Beckenbauer',     75,85,65,82,75,85,75,90,90,82],
  ['platini',       'Michel Platini',        85,82,88,78,70,92,82,88,55,78],
  ['eusebio',       'Eusébio',               78,95,97,82,90,70,88,68,45,80],
  ['puskas',        'Ferenc Puskás',         97,70,97,80,78,78,85,68,42,72],
  ['gullit',        'Ruud Gullit',           85,88,90,85,87,82,90,80,55,83],
  ['van_basten',    'Marco van Basten',      80,97,98,88,85,72,82,70,45,78],
  ['rijkaard',      'Frank Rijkaard',        72,80,65,80,78,78,75,80,90,92],

  // ── Italian legends ──
  ['baggio',        'Roberto Baggio',        90,88,88,65,75,92,90,82,45,72],
  ['del_piero',     'Alessandro Del Piero',  90,85,88,70,80,88,88,80,45,75],
  ['totti',         'Francesco Totti',       88,85,88,72,72,92,88,78,48,70],
  ['maldini',       'Paolo Maldini',         80,82,50,85,75,70,70,78,97,85],
  ['baresi',        'Franco Baresi',         72,78,52,88,72,75,68,78,97,82],
  ['inzaghi',       'Filippo Inzaghi',       65,85,95,90,72,42,52,45,40,78],
  ['pirlo',         'Andrea Pirlo',          90,72,70,65,60,97,75,97,65,70],
  ['gattuso',       'Gennaro Gattuso',       70,72,60,72,72,60,65,65,97,99],
  ['vieri',         'Christian Vieri',       72,88,93,88,80,52,65,52,45,80],
  ['shevchenko',    'Andriy Shevchenko',     78,92,95,82,90,68,78,65,42,80],
  ['nesta',         'Alessandro Nesta',      70,75,48,90,78,68,62,75,95,82],
  ['cannavaro',     'Fabio Cannavaro',       65,72,45,88,82,62,65,70,95,85],
  ['zanetti',       'Javier Zanetti',        72,82,60,72,80,68,72,72,90,97],
  ['seedorf',       'Clarence Seedorf',      82,82,75,72,80,85,82,85,70,88],
  ['kaka',          'Kaká',                  78,95,85,72,88,92,88,85,45,82],

  // ── Spanish / Portuguese / South American legends ──
  ['figo',          'Luís Figo',             72,95,80,68,88,90,95,88,55,78],
  ['raul',          'Raúl',                  78,88,88,75,78,82,82,75,52,80],
  ['rivaldo',       'Rivaldo',               92,90,90,75,80,88,90,80,42,75],
  ['roberto_carlos','Roberto Carlos',        95,62,62,60,92,65,75,72,75,88],
  ['cafu',          'Cafu',                  52,90,55,65,97,58,72,68,82,97],
  ['romario',       'Romário',               78,90,97,72,90,72,90,60,38,70],
  ['batistuta',     'Gabriel Batistuta',     78,97,97,88,82,60,72,62,45,82],
  ['riquelme',      'Juan Román Riquelme',   88,72,78,65,58,97,88,90,48,60],
  ['veron',         'Juan S. Verón',         82,85,70,68,70,90,78,92,68,80],
  ['adriano',       'Adriano',               95,80,90,82,90,58,78,65,42,72],
  ['kluivert',      'Patrick Kluivert',      72,88,90,80,92,70,85,62,38,75],
  ['trezeguet',     'David Trezeguet',       65,90,95,82,80,55,68,52,38,72],
  ['etoo',          "Samuel Eto'o",          75,90,92,72,97,68,88,60,42,88],
  ['falcao',        'Radamel Falcao',        72,93,96,88,85,62,80,58,40,82],
  ['forlan',        'Diego Forlán',          82,88,88,72,75,68,78,65,38,80],
  ['saviola',       'Javier Saviola',        85,80,85,60,90,80,90,65,42,72],

  // ── German / Northern European greats ──
  ['ballack',       'Michael Ballack',       75,88,80,85,75,82,72,82,82,90],
  ['klose',         'Miroslav Klose',        65,80,88,97,80,55,58,50,40,80],
  ['schweinsteiger','Bastian Schweinsteiger',75,85,72,72,72,85,72,85,80,90],
  ['muller',        'Thomas Müller',         72,82,82,80,80,85,70,75,55,88],
  ['kroos',         'Toni Kroos',            85,88,65,65,62,92,68,97,68,80],
  ['ozil',          'Mesut Özil',            78,88,62,58,72,97,82,88,45,65],
  ['kimmich',       'Joshua Kimmich',        70,85,68,68,75,88,72,90,82,90],
  ['lewandowski',   'Robert Lewandowski',    78,92,97,88,80,70,72,65,42,85],
  ['musiala',       'Jamal Musiala',         85,80,78,62,82,85,88,75,52,82],
  ['gnabry',        'Serge Gnabry',          80,80,80,65,88,72,82,65,50,82],

  // ── Dutch greats ──
  ['bergkamp',      'Dennis Bergkamp',       90,96,88,65,72,97,92,85,52,70],
  ['robben',        'Arjen Robben',          45,97,88,60,95,75,95,72,38,78],
  ['van_persie',    'Robin van Persie',      92,90,95,78,80,75,82,70,40,78],
  ['sneijder',      'Wesley Sneijder',       82,88,80,70,72,90,80,90,58,78],
  ['depay',         'Memphis Depay',         90,80,82,65,85,78,85,70,42,78],

  // ── Spanish golden generation ──
  ['xavi',          'Xavi',                  82,85,68,62,68,97,80,90,62,88],
  ['iniesta',       'Andrés Iniesta',        88,85,75,60,80,92,95,78,58,85],
  ['messi',         'Lionel Messi',          99,72,95,68,92,98,99,88,35,82],
  ['alonso_x',      'Xabi Alonso',           78,85,68,70,68,85,68,97,72,82],
  ['david_villa',   'David Villa',           90,85,90,72,82,72,82,70,42,80],
  ['torres',        'Fernando Torres',       82,85,90,72,95,68,80,62,38,80],
  ['ramos',         'Sergio Ramos',          70,78,72,90,82,62,68,75,92,85],
  ['puyol',         'Carles Puyol',          68,75,48,90,82,65,65,70,95,88],
  ['cazorla',       'Santi Cazorla',         90,88,75,60,72,90,88,82,55,80],
  ['fabregas',      'Cesc Fàbregas',         82,85,72,62,68,97,78,90,52,78],
  ['silva_d',       'David Silva',           90,78,72,58,72,97,88,80,48,78],

  // ── French greats ──
  ['henry',         'Thierry Henry',         97,80,95,75,98,88,92,75,45,82],
  ['vieira',        'Patrick Vieira',        78,82,72,80,78,80,75,82,92,93],
  ['pires',         'Robert Pirès',          95,78,78,65,88,85,90,72,48,78],
  ['ribery',        'Franck Ribéry',         92,78,78,60,90,80,95,68,42,80],
  ['mbappé',        'Kylian Mbappé',         95,82,92,72,99,80,95,72,42,88],
  ['benzema',       'Karim Benzema',         80,88,90,80,78,88,82,78,45,80],
  ['griezmann',     'Antoine Griezmann',     82,82,82,72,82,82,82,72,52,88],
  ['dembele_o',     'Ousmane Dembélé',       80,82,80,62,92,70,90,65,40,78],
  ['camavinga',     'Eduardo Camavinga',     80,72,60,62,80,70,72,68,75,88],

  // ── Global greats — extraordinary 00s ──
  ['ibrahimovic',   'Zlatan Ibrahimović',    82,90,94,93,78,75,88,72,38,75],
  ['bale',          'Gareth Bale',           70,92,88,82,97,72,90,75,45,85],

  // ── Premier League classic era ──
  ['shearer',       'Alan Shearer',          62,95,97,93,80,52,62,58,42,85],
  ['owen',          'Michael Owen',          78,85,93,65,98,65,75,55,42,72],
  ['cantona',       'Eric Cantona',          80,88,88,85,72,88,85,80,52,78],
  ['giggs',         'Ryan Giggs',            95,75,78,65,90,82,92,75,58,87],
  ['scholes',       'Paul Scholes',          92,80,82,65,65,92,78,90,72,85],
  ['keane_r',       'Roy Keane',             72,82,65,75,72,72,68,75,95,97],
  ['beckham',       'David Beckham',         52,97,72,72,78,75,65,97,62,82],
  ['lampard',       'Frank Lampard',         75,92,90,78,72,85,75,88,78,93],
  ['gerrard',       'Steven Gerrard',        80,90,82,80,80,88,82,90,87,95],
  ['fowler',        'Robbie Fowler',         78,90,93,72,75,68,75,58,42,78],
  ['yorke',         'Dwight Yorke',          80,82,88,80,80,68,80,62,42,80],
  ['ginola',        'David Ginola',          92,78,75,68,82,75,90,68,42,70],
  ['le_tissier',    'Matt Le Tissier',       85,90,88,70,60,85,85,78,42,55],
  ['sheringham',    'Teddy Sheringham',      72,85,82,82,62,80,70,68,45,72],
  ['solskjaer',     'Ole Gunnar Solskjær',   72,88,95,72,78,62,72,52,40,78],
  ['okocha',        'Jay-Jay Okocha',        82,80,75,62,80,82,92,68,42,75],

  // ── Early 2000s world greats ──
  ['van_nistelrooy','Ruud van Nistelrooy',   68,95,97,90,80,55,65,52,40,78],
  ['rooney',        'Wayne Rooney',          82,90,90,82,88,80,88,78,65,88],
  ['cr7',           'Cristiano Ronaldo',     78,97,95,88,98,72,97,72,42,90],
  ['berbatov',      'Dimitar Berbatov',      80,90,90,78,70,82,82,72,42,60],
  ['tevez',         'Carlos Tevez',          80,80,85,72,85,72,80,65,55,97],
  ['anelka',        'Nicolas Anelka',        78,88,88,72,92,68,80,62,42,78],
  ['drogba',        'Didier Drogba',         68,85,90,93,80,62,72,58,48,88],
  ['essien',        'Michael Essien',        70,82,70,72,82,72,72,78,88,93],
  ['makelele',      'Claude Makélélé',       65,72,48,60,72,58,62,62,97,97],
  ['ferdinand_r',   'Rio Ferdinand',         72,78,45,88,80,72,68,80,85,78],
  ['terry',         'John Terry',            65,72,45,92,65,52,55,68,93,82],
  ['vidic',         'Nemanja Vidić',         60,72,45,93,70,48,50,62,97,82],
  ['overmars',      'Marc Overmars',         88,75,78,58,97,72,90,65,45,82],

  // ── 2006–2015 world class ──
  ['suarez',        'Luis Suárez',           88,88,92,78,85,82,90,75,42,88],
  ['aguero',        'Sergio Agüero',         82,90,93,72,88,72,85,62,38,82],
  ['toure_y',       'Yaya Touré',            78,82,75,72,82,78,78,82,75,90],
  ['sterling',      'Raheem Sterling',       82,80,80,62,95,72,88,65,45,88],
  ['coutinho',      'Philippe Coutinho',     90,80,80,65,78,88,88,80,48,78],
  ['hazard',        'Eden Hazard',           92,80,85,62,88,85,97,75,42,72],
  ['dybala',        'Paulo Dybala',          88,85,85,68,82,82,88,75,42,75],
  ['di_maria',      'Ángel Di María',        88,75,78,62,85,85,90,72,42,80],
  ['thiago_a',      'Thiago Alcântara',      88,85,68,60,72,92,85,88,65,78],
  ['eriksen',       'Christian Eriksen',     82,82,72,65,68,90,75,88,52,75],
  ['perisic',       'Ivan Perišić',          92,78,75,80,80,72,78,70,55,88],

  // ── Modern era (FIFA 18–24 top rated) ──
  ['de_bruyne',     'Kevin De Bruyne',       82,96,78,70,78,98,83,95,65,88],
  ['salah',         'Mohamed Salah',         97,75,94,70,97,80,92,72,42,85],
  ['mane',          'Sadio Mané',            90,78,88,78,95,72,92,65,52,90],
  ['vvd',           'Virgil van Dijk',       82,85,72,97,82,72,65,82,97,82],
  ['taa',           'Trent Alexander-Arnold',55,88,58,65,80,75,70,95,68,80],
  ['firmino',       'Roberto Firmino',       80,82,78,72,82,85,80,72,55,92],
  ['bernardo',      'Bernardo Silva',        85,80,72,62,78,85,88,78,62,90],
  ['mahrez',        'Riyad Mahrez',          75,92,80,60,85,80,92,72,42,72],
  ['foden',         'Phil Foden',            88,82,78,65,78,88,88,80,52,82],
  ['sane',          'Leroy Sané',            88,78,78,58,95,72,88,68,42,82],
  ['haaland',       'Erling Haaland',        72,88,97,82,92,52,68,52,38,85],
  ['kane',          'Harry Kane',            80,92,93,88,72,85,72,82,45,82],
  ['son',           'Son Heung-min',         90,82,88,68,88,72,88,68,45,85],
  ['rashford',      'Marcus Rashford',       82,82,82,65,92,68,82,62,45,85],
  ['fernandes_b',   'Bruno Fernandes',       82,88,80,72,72,90,80,88,55,82],
  ['pogba',         'Paul Pogba',            80,85,75,72,80,82,82,88,68,78],
  ['vardy',         'Jamie Vardy',           72,82,88,68,95,60,72,55,42,88],
  ['grealish',      'Jack Grealish',         92,68,72,62,78,78,90,65,52,80],
  ['saka',          'Bukayo Saka',           72,85,78,65,85,78,85,72,55,85],
  ['odegaard',      'Martin Ødegaard',       82,82,72,62,72,92,82,85,55,80],
  ['modric',        'Luka Modrić',           82,82,72,62,72,90,80,85,68,85],
  ['casemiro',      'Casemiro',              65,75,60,72,70,65,60,72,95,92],
  ['valverde',      'Federico Valverde',     72,82,70,70,85,72,72,78,82,95],
  ['vinicius',      'Vinicius Jr',           90,72,85,60,97,72,95,62,38,82],
  ['bellingham',    'Jude Bellingham',       78,82,80,72,82,82,80,80,75,92],
  ['pedri',         'Pedri',                 85,80,70,60,75,90,85,80,60,82],
  ['gavi',          'Gavi',                  82,75,65,60,80,85,82,75,68,95],
  ['de_jong_f',     'Frenkie de Jong',       82,80,65,65,78,85,78,85,68,85],
  ['rodri',         'Rodri',                 72,78,60,68,68,80,65,82,90,88],
  ['tchouameni',    'Aurélien Tchouaméni',   70,78,62,68,78,70,68,75,88,88],
  ['neymar',        'Neymar',                90,80,88,68,90,88,97,75,38,75],
  ['lautaro',       'Lautaro Martínez',      78,82,88,78,85,68,78,60,42,82],
  ['hakimi',        'Achraf Hakimi',         45,88,55,60,92,60,72,68,78,90],
  ['osimhen',       'Victor Osimhen',        72,80,90,78,95,55,72,52,38,85],
  ['kvara',         'Khvicha Kvaratskhelia', 90,72,80,62,88,78,92,68,42,82],
  ['chiesa',        'Federico Chiesa',       82,78,80,65,88,72,82,65,48,82],
  ['barella',       'Nicolò Barella',        72,78,68,65,78,78,72,75,78,93],
  ['palmer',        'Cole Palmer',           85,82,80,65,78,85,85,80,52,75],
  ['maddison',      'James Maddison',        82,82,78,65,72,88,82,80,52,75],
  ['nkunku',        'Christopher Nkunku',    85,80,82,68,82,82,85,72,48,82],
  ['jota',          'Diogo Jota',            80,80,85,72,82,68,80,62,45,82],
]

// De-duplicate by id (keep first occurrence)
const seen = new Set<string>()
export const PLAYERS: P10Player[] = RAW
  .filter(([id]) => { if (seen.has(id as string)) return false; seen.add(id as string); return true })
  .map(([id, name, lf, rf, fin, head, pace, tb, drib, lp, tack, eng]) => ({
    id: id as string,
    name: name as string,
    lf: lf as number, rf: rf as number, fin: fin as number, head: head as number,
    pace: pace as number, tb: tb as number, drib: drib as number, lp: lp as number,
    tack: tack as number, eng: eng as number,
  }))
