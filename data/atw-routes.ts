export type StatKey = 'goals' | 'goalsAssists' | 'games' | 'yellowCards'

export const STAT_LABELS: Record<StatKey, string> = {
  goals:        'Goals',
  goalsAssists: 'Goals + Assists',
  games:        'PL Appearances',
  yellowCards:  'Yellow Cards',
}

export const STAT_KEYS: StatKey[] = ['goals', 'goalsAssists', 'games', 'yellowCards']

// FIFA nationality code → ISO 3166-1 numeric (for map geography.id matching)
export const FIFA_TO_ISO: Record<string, number> = {
  // Europe
  FRA: 250, ESP: 724, POR: 620, GER: 276, NED: 528,
  BEL:  56, DEN: 208, SWE: 752, NOR: 578, ITA: 380,
  SUI: 756, AUT:  40, CZE: 203, GRE: 300, TUR: 792,
  SRB: 688, CRO: 191, BUL: 100, POL: 616, SVK: 703,
  FIN: 246, HUN: 348, ROU: 642, UKR: 804, ALB:   8,
  MNE: 499, MKD: 807, SVN: 705, BIH:  70,
  // Africa
  MAR: 504, ALG:  12, TUN: 788, EGY: 818, LBA: 434,
  SEN: 686, GUI: 324, CIV: 384, GHA: 288, GAM: 270,
  TGO: 768, BEN: 204, NGA: 566, CMR: 120, SLE: 694,
  GAB: 266, COD: 180, COG: 178, ZIM: 716, ZAF: 710,
  ZAM: 894, ANG:  24, MOZ: 508, MLI: 466, MTN: 478,
  BFA: 854, LBR: 430, GNB: 624, EQG: 226, RWA: 646,
  // South America
  ARG:  32, BRA:  76, URU: 858, COL: 170, VEN: 862,
  CHI: 152, ECU: 218, PER: 604, BOL:  68, PAR: 600,
  GUY: 328, SUR: 740,
  // North/Central America
  MEX: 484, GUA: 320, HON: 340, SLV: 222, NCA: 558,
  CRC: 188, PAN: 591,
  // Asia
  JPN: 392, KOR: 410, CHN: 156, IRN: 364, IRQ: 368,
  SYR: 760, LBN: 422, ISR: 376, JOR: 400,
}

export const COUNTRY_NAMES: Record<string, string> = {
  FRA: 'France',       ESP: 'Spain',        POR: 'Portugal',     GER: 'Germany',
  NED: 'Netherlands',  BEL: 'Belgium',      DEN: 'Denmark',      SWE: 'Sweden',
  NOR: 'Norway',       ITA: 'Italy',        SUI: 'Switzerland',  AUT: 'Austria',
  CZE: 'Czech Rep.',   GRE: 'Greece',       TUR: 'Turkey',       SRB: 'Serbia',
  CRO: 'Croatia',      BUL: 'Bulgaria',     POL: 'Poland',       SVK: 'Slovakia',
  FIN: 'Finland',      HUN: 'Hungary',      ROU: 'Romania',      UKR: 'Ukraine',
  ALB: 'Albania',      MNE: 'Montenegro',   MKD: 'N. Macedonia', SVN: 'Slovenia',
  BIH: 'Bosnia',
  MAR: 'Morocco',      ALG: 'Algeria',      TUN: 'Tunisia',      EGY: 'Egypt',
  SEN: 'Senegal',      GUI: 'Guinea',       CIV: 'Ivory Coast',  GHA: 'Ghana',
  TGO: 'Togo',         BEN: 'Benin',        NGA: 'Nigeria',      CMR: 'Cameroon',
  GAB: 'Gabon',        COD: 'DR Congo',     ZIM: 'Zimbabwe',     ZAF: 'South Africa',
  ZAM: 'Zambia',       ANG: 'Angola',       MOZ: 'Mozambique',   MLI: 'Mali',
  MTN: 'Mauritania',   BFA: 'Burkina Faso', SLE: 'Sierra Leone', LBR: 'Liberia',
  GAM: 'Gambia',       GNB: 'Guinea-Bissau',
  ARG: 'Argentina',    BRA: 'Brazil',       URU: 'Uruguay',      COL: 'Colombia',
  VEN: 'Venezuela',    CHI: 'Chile',        ECU: 'Ecuador',      PER: 'Peru',
  BOL: 'Bolivia',      PAR: 'Paraguay',     GUY: 'Guyana',       SUR: 'Suriname',
  MEX: 'Mexico',       GUA: 'Guatemala',    HON: 'Honduras',     CRC: 'Costa Rica',
  PAN: 'Panama',
  JPN: 'Japan',        KOR: 'South Korea',  LBN: 'Lebanon',      ISR: 'Israel',
}

export interface ATWRoute {
  id: string
  name: string
  countries: string[] // FIFA codes, each adjacent to the next
}

export const ROUTES: ATWRoute[] = [
  // === EUROPE (land borders only) ===
  { id: 'eur-01', name: 'Portugal → Netherlands',   countries: ['POR','ESP','FRA','BEL','NED'] },
  { id: 'eur-02', name: 'Portugal → Denmark',       countries: ['POR','ESP','FRA','GER','DEN'] },
  { id: 'eur-03', name: 'Netherlands → Portugal',   countries: ['NED','BEL','FRA','ESP','POR'] },
  { id: 'eur-04', name: 'Italy → Netherlands',      countries: ['ITA','SUI','GER','BEL','NED'] },
  { id: 'eur-05', name: 'Italy → Spain',            countries: ['ITA','FRA','ESP','POR'] },
  { id: 'eur-06', name: 'Italy → Denmark',          countries: ['ITA','AUT','GER','DEN'] },
  { id: 'eur-07', name: 'Czech Rep → Spain',        countries: ['CZE','AUT','ITA','FRA','ESP'] },
  { id: 'eur-08', name: 'Czech Rep → Belgium',      countries: ['CZE','GER','BEL','FRA','ESP'] },
  { id: 'eur-09', name: 'Greece → Germany',         countries: ['GRE','BUL','SRB','CRO','AUT','GER'] },
  { id: 'eur-10', name: 'Greece → France',          countries: ['GRE','BUL','SRB','CRO','AUT','SUI','FRA'] },
  { id: 'eur-11', name: 'Turkey → Germany',         countries: ['TUR','GRE','BUL','SRB','CRO','AUT','GER'] },
  { id: 'eur-12', name: 'Turkey → Italy',           countries: ['TUR','BUL','SRB','CRO','AUT','SUI','ITA'] },
  { id: 'eur-13', name: 'Greece → Portugal',        countries: ['GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP','POR'] },
  { id: 'eur-14', name: 'Serbia → Netherlands',     countries: ['SRB','CRO','AUT','GER','BEL','NED'] },
  { id: 'eur-15', name: 'Turkey → Spain',           countries: ['TUR','GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP'] },
  { id: 'eur-16', name: 'Czech Rep → Portugal',     countries: ['CZE','AUT','SUI','FRA','ESP','POR'] },
  { id: 'eur-17', name: 'Bulgaria → Netherlands',   countries: ['BUL','SRB','CRO','AUT','GER','NED'] },
  { id: 'eur-18', name: 'Italy → Belgium',          countries: ['ITA','SUI','FRA','BEL','NED'] },
  // === AFRICA / TRANS-CONTINENTAL ===
  { id: 'afr-01', name: 'Morocco → Netherlands',   countries: ['MAR','ESP','FRA','BEL','NED'] },
  { id: 'afr-02', name: 'Tunisia → France',        countries: ['TUN','ALG','MAR','ESP','FRA'] },
  { id: 'afr-03', name: 'France → Tunisia',        countries: ['FRA','ESP','MAR','ALG','TUN'] },
  { id: 'afr-04', name: 'Morocco → Germany',       countries: ['MAR','ESP','FRA','BEL','GER'] },
  { id: 'afr-05', name: 'Morocco → Italy',         countries: ['MAR','ESP','FRA','SUI','ITA'] },
  { id: 'afr-06', name: 'Senegal → Togo',          countries: ['SEN','GUI','CIV','GHA','TGO'] },
  { id: 'afr-07', name: 'Ivory Coast → Nigeria',   countries: ['CIV','GHA','TGO','BEN','NGA'] },
  { id: 'afr-08', name: 'Senegal → Nigeria',       countries: ['SEN','GUI','CIV','GHA','TGO','BEN','NGA'] },
  { id: 'afr-09', name: 'Ivory Coast → Gabon',     countries: ['CIV','GHA','TGO','BEN','NGA','CMR','GAB'] },
  { id: 'afr-10', name: 'Greece → Tunisia',        countries: ['GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP','MAR','ALG','TUN'] },
  { id: 'afr-11', name: 'Turkey → Morocco',        countries: ['TUR','GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP','MAR'] },
  { id: 'afr-12', name: 'Tunisia → Netherlands',   countries: ['TUN','ALG','MAR','ESP','FRA','BEL','NED'] },
  // === SOUTH AMERICA ===
  { id: 'sam-01', name: 'Argentina → Colombia',        countries: ['ARG','URU','BRA','VEN','COL'] },
  { id: 'sam-02', name: 'Argentina → Colombia (west)', countries: ['ARG','CHI','PER','ECU','COL'] },
  { id: 'sam-03', name: 'Colombia → Uruguay',          countries: ['COL','VEN','BRA','ARG','URU'] },
  { id: 'sam-04', name: 'Chile → Venezuela',           countries: ['CHI','PER','ECU','COL','VEN'] },
  { id: 'sam-05', name: 'Colombia → Chile (long)',     countries: ['COL','ECU','PER','CHI','ARG','URU'] },
  { id: 'sam-06', name: 'South America full',          countries: ['VEN','BRA','ARG','CHI','PER','ECU','COL'] },
  { id: 'sam-07', name: 'Uruguay → Colombia',          countries: ['URU','ARG','CHI','PER','ECU','COL'] },
  { id: 'sam-08', name: 'Brazil → Chile',              countries: ['BRA','ARG','CHI','PER','ECU'] },
]
