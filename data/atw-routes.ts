export type StatKey = 'goals' | 'goalsAssists' | 'games' | 'yellowCards'
export type Continent = 'europe' | 'africa' | 'n_america' | 's_america' | 'asia'

export const STAT_LABELS: Record<StatKey, string> = {
  goals:        'Goals',
  goalsAssists: 'Goals + Assists',
  games:        'PL Appearances',
  yellowCards:  'Yellow Cards',
}

export const STAT_KEYS: StatKey[] = ['goals', 'goalsAssists', 'games', 'yellowCards']

// FIFA nationality code → ISO 3166-1 numeric (for map geography.id matching)
export const FIFA_TO_ISO: Record<string, number> = {
  // British Isles (ENG/SCO/WAL/NIR all share ISO 826 = United Kingdom)
  ENG: 826, SCO: 826, WAL: 826, NIR: 826, IRL: 372,
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
  USA: 840, CAN: 124,
  MEX: 484, GUA: 320, HON: 340, SLV: 222, NCA: 558,
  CRC: 188, PAN: 591,
  // Asia / Middle East
  JPN: 392, KOR: 410, CHN: 156, IRN: 364, IRQ: 368,
  SYR: 760, LBN: 422, ISR: 376, JOR: 400,
  // Russia/Eurasia
  RUS: 643,
}

export const COUNTRY_NAMES: Record<string, string> = {
  ENG: 'England',      SCO: 'Scotland',     WAL: 'Wales',        NIR: 'N. Ireland',
  IRL: 'Ireland',
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
  USA: 'USA',          CAN: 'Canada',
  MEX: 'Mexico',       GUA: 'Guatemala',    HON: 'Honduras',     SLV: 'El Salvador',
  NCA: 'Nicaragua',    CRC: 'Costa Rica',   PAN: 'Panama',
  JPN: 'Japan',        KOR: 'South Korea',  LBN: 'Lebanon',      ISR: 'Israel',
  JOR: 'Jordan',       IRQ: 'Iraq',         IRN: 'Iran',         SYR: 'Syria',
  RUS: 'Russia',
}

export interface ATWRoute {
  id: string
  name: string
  countries: string[] // FIFA codes, each adjacent to the next
  continent: Continent
}

export const ROUTES: ATWRoute[] = [
  // === BRITISH ISLES (sea crossings allowed within the isles) ===
  { id: 'uk-01', name: 'Ireland → Wales',           continent: 'europe',   countries: ['IRL','NIR','SCO','ENG','WAL'] },

  // === EUROPE ===
  { id: 'eur-01', name: 'Portugal → Netherlands',   continent: 'europe',   countries: ['POR','ESP','FRA','BEL','NED'] },
  { id: 'eur-02', name: 'Portugal → Denmark',       continent: 'europe',   countries: ['POR','ESP','FRA','GER','DEN'] },
  { id: 'eur-03', name: 'Netherlands → Portugal',   continent: 'europe',   countries: ['NED','BEL','FRA','ESP','POR'] },
  { id: 'eur-04', name: 'Italy → Netherlands',      continent: 'europe',   countries: ['ITA','SUI','GER','BEL','NED'] },
  { id: 'eur-05', name: 'Italy → Spain',            continent: 'europe',   countries: ['ITA','FRA','ESP','POR'] },
  { id: 'eur-06', name: 'Italy → Denmark',          continent: 'europe',   countries: ['ITA','AUT','GER','DEN'] },
  { id: 'eur-07', name: 'Czech Rep → Spain',        continent: 'europe',   countries: ['CZE','AUT','ITA','FRA','ESP'] },
  { id: 'eur-08', name: 'Czech Rep → Belgium',      continent: 'europe',   countries: ['CZE','GER','BEL','FRA','ESP'] },
  { id: 'eur-09', name: 'Greece → Germany',         continent: 'europe',   countries: ['GRE','BUL','SRB','CRO','AUT','GER'] },
  { id: 'eur-10', name: 'Greece → France',          continent: 'europe',   countries: ['GRE','BUL','SRB','CRO','AUT','SUI','FRA'] },
  { id: 'eur-11', name: 'Turkey → Germany',         continent: 'europe',   countries: ['TUR','GRE','BUL','SRB','CRO','AUT','GER'] },
  { id: 'eur-12', name: 'Turkey → Italy',           continent: 'europe',   countries: ['TUR','BUL','SRB','CRO','AUT','SUI','ITA'] },
  { id: 'eur-13', name: 'Greece → Portugal',        continent: 'europe',   countries: ['GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP','POR'] },
  { id: 'eur-14', name: 'Serbia → Netherlands',     continent: 'europe',   countries: ['SRB','CRO','AUT','GER','BEL','NED'] },
  { id: 'eur-15', name: 'Turkey → Spain',           continent: 'europe',   countries: ['TUR','GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP'] },
  { id: 'eur-16', name: 'Czech Rep → Portugal',     continent: 'europe',   countries: ['CZE','AUT','SUI','FRA','ESP','POR'] },
  { id: 'eur-17', name: 'Bulgaria → Netherlands',   continent: 'europe',   countries: ['BUL','SRB','CRO','AUT','GER','NED'] },
  { id: 'eur-18', name: 'Italy → Belgium',          continent: 'europe',   countries: ['ITA','SUI','FRA','BEL','NED'] },
  // Scandinavia
  { id: 'eur-19', name: 'Portugal → Norway',        continent: 'europe',   countries: ['POR','ESP','FRA','GER','DEN','SWE','NOR'] },
  { id: 'eur-20', name: 'Italy → Norway',           continent: 'europe',   countries: ['ITA','SUI','GER','DEN','SWE','NOR'] },
  { id: 'eur-21', name: 'Spain → Sweden',           continent: 'europe',   countries: ['ESP','FRA','BEL','NED','GER','DEN','SWE'] },
  { id: 'eur-22', name: 'Netherlands → Norway',     continent: 'europe',   countries: ['NED','GER','DEN','SWE','NOR'] },
  { id: 'eur-23', name: 'Spain → Finland',          continent: 'europe',   countries: ['ESP','FRA','GER','DEN','SWE','FIN'] },
  // Russia / Eastern Europe
  { id: 'eur-24', name: 'Netherlands → Russia',     continent: 'europe',   countries: ['NED','GER','POL','UKR','RUS'] },
  { id: 'eur-25', name: 'Spain → Russia',           continent: 'europe',   countries: ['ESP','FRA','GER','POL','UKR','RUS'] },
  { id: 'eur-26', name: 'Russia → Germany (north)', continent: 'europe',   countries: ['RUS','FIN','SWE','DEN','GER'] },
  { id: 'eur-27', name: 'Portugal → Russia',        continent: 'europe',   countries: ['POR','ESP','FRA','GER','POL','UKR','RUS'] },
  { id: 'eur-28', name: 'Russia → Netherlands',     continent: 'europe',   countries: ['RUS','FIN','NOR','SWE','DEN','GER','NED'] },
  { id: 'eur-29', name: 'Italy → Russia',           continent: 'europe',   countries: ['ITA','AUT','CZE','POL','UKR','RUS'] },
  { id: 'eur-30', name: 'Turkey → Russia',          continent: 'europe',   countries: ['TUR','BUL','SRB','CRO','AUT','CZE','POL','UKR','RUS'] },

  // === AFRICA ===
  { id: 'afr-01', name: 'Morocco → Netherlands',    continent: 'africa',   countries: ['MAR','ESP','FRA','BEL','NED'] },
  { id: 'afr-02', name: 'Tunisia → France',         continent: 'africa',   countries: ['TUN','ALG','MAR','ESP','FRA'] },
  { id: 'afr-03', name: 'France → Tunisia',         continent: 'africa',   countries: ['FRA','ESP','MAR','ALG','TUN'] },
  { id: 'afr-04', name: 'Morocco → Germany',        continent: 'africa',   countries: ['MAR','ESP','FRA','BEL','GER'] },
  { id: 'afr-05', name: 'Morocco → Italy',          continent: 'africa',   countries: ['MAR','ESP','FRA','SUI','ITA'] },
  { id: 'afr-06', name: 'Senegal → Togo',           continent: 'africa',   countries: ['SEN','GUI','CIV','GHA','TGO'] },
  { id: 'afr-07', name: 'Ivory Coast → Nigeria',    continent: 'africa',   countries: ['CIV','GHA','TGO','BEN','NGA'] },
  { id: 'afr-08', name: 'Senegal → Nigeria',        continent: 'africa',   countries: ['SEN','GUI','CIV','GHA','TGO','BEN','NGA'] },
  { id: 'afr-09', name: 'Ivory Coast → Cameroon',   continent: 'africa',   countries: ['CIV','GHA','TGO','BEN','NGA','CMR'] },
  { id: 'afr-10', name: 'Greece → Tunisia',         continent: 'africa',   countries: ['GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP','MAR','ALG','TUN'] },
  { id: 'afr-11', name: 'Turkey → Morocco',         continent: 'africa',   countries: ['TUR','GRE','BUL','SRB','CRO','AUT','SUI','FRA','ESP','MAR'] },
  { id: 'afr-12', name: 'Tunisia → Netherlands',    continent: 'africa',   countries: ['TUN','ALG','MAR','ESP','FRA','BEL','NED'] },
  { id: 'afr-13', name: 'Morocco → Nigeria',        continent: 'africa',   countries: ['MAR','ALG','MLI','BFA','BEN','NGA'] },
  { id: 'afr-14', name: 'Senegal → Nigeria (north)',continent: 'africa',   countries: ['SEN','MLI','BFA','TGO','BEN','NGA'] },
  { id: 'afr-15', name: 'Morocco → Ghana',          continent: 'africa',   countries: ['MAR','ALG','MLI','CIV','GHA'] },
  { id: 'afr-16', name: 'Morocco → Senegal',        continent: 'africa',   countries: ['MAR','ALG','MLI','SEN','GUI','CIV','GHA'] },
  { id: 'afr-17', name: 'Senegal → Cameroon',       continent: 'africa',   countries: ['SEN','GUI','CIV','GHA','TGO','BEN','NGA','CMR'] },
  { id: 'afr-18', name: 'Morocco → Cameroon',       continent: 'africa',   countries: ['MAR','ALG','MLI','BFA','BEN','NGA','CMR'] },
  { id: 'afr-19', name: 'Guinea → Nigeria',         continent: 'africa',   countries: ['GUI','CIV','BFA','TGO','BEN','NGA'] },
  { id: 'afr-20', name: 'Mali → Cameroon',          continent: 'africa',   countries: ['MLI','BFA','BEN','NGA','CMR'] },

  // === SOUTH AMERICA ===
  { id: 'sam-01', name: 'Argentina → Colombia',         continent: 's_america', countries: ['ARG','URU','BRA','VEN','COL'] },
  { id: 'sam-02', name: 'Argentina → Colombia (west)',  continent: 's_america', countries: ['ARG','CHI','PER','ECU','COL'] },
  { id: 'sam-03', name: 'Colombia → Uruguay',           continent: 's_america', countries: ['COL','VEN','BRA','ARG','URU'] },
  { id: 'sam-04', name: 'Chile → Venezuela',            continent: 's_america', countries: ['CHI','PER','ECU','COL','VEN'] },
  { id: 'sam-05', name: 'Colombia → Chile (long)',      continent: 's_america', countries: ['COL','ECU','PER','CHI','ARG','URU'] },
  { id: 'sam-06', name: 'South America loop',           continent: 's_america', countries: ['VEN','BRA','ARG','CHI','PER','ECU','COL'] },
  { id: 'sam-07', name: 'Uruguay → Colombia',           continent: 's_america', countries: ['URU','ARG','CHI','PER','ECU','COL'] },
  { id: 'sam-08', name: 'Brazil → Chile',               continent: 's_america', countries: ['BRA','ARG','CHI','PER','ECU'] },

  // === NORTH/CENTRAL AMERICA ===
  { id: 'nam-01', name: 'Mexico → Colombia',            continent: 'n_america', countries: ['MEX','GUA','HON','NCA','CRC','PAN','COL'] },
  { id: 'nam-02', name: 'USA → Colombia',               continent: 'n_america', countries: ['USA','MEX','GUA','HON','NCA','CRC','PAN','COL'] },
  { id: 'nam-03', name: 'Canada → Panama',              continent: 'n_america', countries: ['CAN','USA','MEX','GUA','HON','NCA','CRC','PAN'] },
  { id: 'nam-04', name: 'USA → Brazil',                 continent: 'n_america', countries: ['USA','MEX','GUA','HON','NCA','CRC','PAN','COL','VEN','BRA'] },
  { id: 'nam-05', name: 'Mexico → Argentina',           continent: 'n_america', countries: ['MEX','GUA','HON','NCA','CRC','PAN','COL','ECU','PER','CHI','ARG'] },
  // Bering Strait — N.America into Europe
  { id: 'nam-06', name: 'Canada → Norway',              continent: 'n_america', countries: ['CAN','USA','RUS','NOR','SWE'] },
  { id: 'nam-07', name: 'USA → Germany',                continent: 'n_america', countries: ['USA','RUS','FIN','SWE','DEN','GER'] },
  { id: 'nam-08', name: 'Canada → Netherlands',         continent: 'n_america', countries: ['CAN','USA','RUS','FIN','NOR','SWE','DEN','GER','NED'] },
  { id: 'nam-09', name: 'USA → Spain',                  continent: 'n_america', countries: ['USA','RUS','UKR','POL','GER','FRA','ESP'] },

  // === ASIA / MIDDLE EAST ===
  { id: 'asi-01', name: 'Greece → Israel',              continent: 'asia',      countries: ['GRE','TUR','SYR','LBN','ISR'] },
  { id: 'asi-02', name: 'Bulgaria → Israel',            continent: 'asia',      countries: ['BUL','TUR','SYR','JOR','ISR'] },
  { id: 'asi-03', name: 'Serbia → Iran',                continent: 'asia',      countries: ['SRB','BUL','TUR','IRQ','IRN'] },
  { id: 'asi-04', name: 'Serbia → Jordan',              continent: 'asia',      countries: ['SRB','BUL','TUR','SYR','JOR'] },
  { id: 'asi-05', name: 'Turkey → Israel (via Iraq)',   continent: 'asia',      countries: ['TUR','IRQ','JOR','ISR'] },
]
