export type Lang = "en" | "cs";

export interface Translations {
  // Setup page
  subtitle: string;
  players: string;
  playerPlaceholder: string;
  noPlayers: string;
  editor: string;
  startRace: string;
  addMorePlayers: (n: number) => string;
  tournamentMode: string;
  defaultMap: string;
  noCustomMaps: string;
  volume: string;
  off: string;
  mute: string;
  unmute: string;
  footer: string;
  // Legend
  howToPlay: string;
  launchPads: string;
  wind: string; windDesc: string;
  pegs: string; pegsDesc: string;
  rails: string; railsDesc: string;
  uRamps: string; uRampsDesc: string;
  platforms: string; platformsDesc: string;
  stuckKick: string; stuckKickDesc: string;
  greenPad: string; greenPadDesc: string;
  orangePad: string; orangePadDesc: string;
  redPad: string; redPadDesc: string;
  // Shared
  home: string;
  back: string;
  setupBack: string;
  // Race page
  marbleRace: string;
  marblesCount: (n: number) => string;
  startingPositions: string;
  shuffle: string;
  go: string;
  finishLine: string;
  winsExclaim: (name: string) => string;
  endRace: string;
  raceComplete: string;
  // WinnerModal
  winnerLabel: string;
  watch: string;
  results: string;
  // Results page
  finalResults: string;
  raceOver: string;
  takesGold: (name: string) => string;
  goldSuffix: string;
  fullStandings: string;
  raceAgain: string;
  dnf: string;
  // Tournament setup
  tournament: string;
  tournamentSubtitle: string;
  mapsToRace: string;
  mapsRaceHint: string;
  totalRacesLabel: (n: number) => string;
  winnerCriteria: string;
  beginTournament: string;
  needPlayers: string;
  needRaces: string;
  infoLine: (players: number, races: number, maps: number) => string;
  // Tournament race page
  standingsBack: string;
  raceOf: (n: number, total: number, map: string) => string;
  startRaceN: (n: number) => string;
  raceNWinner: (n: number) => string;
  raceNWins: (n: number, name: string) => string;
  raceNComplete: (n: number) => string;
  // Tournament standings
  tournamentStandings: string;
  allDone: string;
  afterRaceN: (n: number) => string;
  racesComplete: (done: number, total: number) => string;
  overallStandings: string;
  startRaceNMap: (n: number, map: string) => string;
  finalResultsBtn: string;
  abandonTournament: string;
  avgPlaceShort: (n: string) => string;
  // Tournament results
  tournamentChampionLabel: string;
  champion: string;
  winsTournamentSuffix: string;
  racesAndPlayers: (races: number, players: number) => string;
  finalStandings: string;
  playerCol: string;
  avgPlaceCol: string;
  avgTimeCol: string;
  newTournament: string;
  // Map editor
  mapEditor: string;
  newMapBtn: string;
  mapNamePlaceholder: string;
  editingSavedMap: string;
  savedBtn: string;
  updateBtn: string;
  saveBtn: string;
  obstaclesCount: (n: number) => string;
  stampMode: (label: string) => string;
  controlsHint: string;
  paletteTab: string;
  mapsTab: string;
  background: string;
  obstaclesHeading: string;
  stampOn: string;
  selectedKind: (kind: string) => string;
  angle: string;
  deleteObstacle: string;
  clearAll: string;
  savedMapsCount: (n: number) => string;
  noSavedMaps: string;
  editingLabel: string;
  loadEdit: string;
  goToSetup: string;
  // Palette items
  palPeg: string;         palPegDesc: string;
  palRail: string;        palRailDesc: string;
  palPlatform: string;    palPlatformDesc: string;
  palURamp: string;       palURampDesc: string;
  palLaunchLeft: string;  palLaunchLeftDesc: string;
  palLaunchRight: string; palLaunchRightDesc: string;
  palBoostUp: string;     palBoostUpDesc: string;
}

const en: Translations = {
  subtitle: "MARBLE RACE",
  players: "PLAYERS",
  playerPlaceholder: "Player name...",
  noPlayers: "Add at least 2 players",
  editor: "MAP EDITOR",
  startRace: "START RACE",
  addMorePlayers: (n) => `Add ${n} more player${n === 1 ? "" : "s"}`,
  tournamentMode: "TOURNAMENT",
  defaultMap: "DEFAULT",
  noCustomMaps: "No custom maps yet",
  volume: "VOLUME",
  off: "OFF",
  mute: "MUTE",
  unmute: "UNMUTE",
  footer: "Built with physics & chaos",
  howToPlay: "HOW TO PLAY",
  launchPads: "Launch Pads",
  wind: "Wind",             windDesc: "Invisible force pushing all marbles sideways",
  pegs: "Pegs",             pegsDesc: "Round bumpers that deflect marbles on contact",
  rails: "Rails",           railsDesc: "Flat surfaces marbles slide and bounce along",
  uRamps: "U-Ramps",        uRampsDesc: "Curved ramps that redirect marbles upward",
  platforms: "Platforms",   platformsDesc: "Solid ledges that marbles land and roll on",
  stuckKick: "Stuck kick",  stuckKickDesc: "Idle marbles get launched in a random direction",
  greenPad: "Green pad",    greenPadDesc: "Boosts marble upward with a strong launch",
  orangePad: "Orange pad",  orangePadDesc: "Launches marble left at an angle",
  redPad: "Red pad",        redPadDesc: "Launches marble right at an angle",
  home: "HOME",
  back: "BACK",
  setupBack: "SETUP",
  marbleRace: "MARBLE RACE",
  marblesCount: (n) => `${n} marble${n === 1 ? "" : "s"}`,
  startingPositions: "Starting positions",
  shuffle: "Shuffle",
  go: "GO",
  finishLine: "FINISH",
  winsExclaim: (name) => `${name} wins\!`,
  endRace: "End Race",
  raceComplete: "Race Complete",
  winnerLabel: "Winner\!",
  watch: "Watch",
  results: "RESULTS",
  finalResults: "Final Results",
  raceOver: "RACE OVER",
  takesGold: (name) => `${name} takes the gold\!`,
  goldSuffix: " takes the gold\!",
  fullStandings: "Full Standings",
  raceAgain: "RACE AGAIN",
  dnf: "DNF",
  tournament: "TOURNAMENT",
  tournamentSubtitle: "Multi-map championship",
  mapsToRace: "Maps to race",
  mapsRaceHint: "Set how many times each map is raced. Use + to add repeats. Need 2+ total races.",
  totalRacesLabel: (n) => `${n} ${n === 1 ? "race" : "races"}`,
  winnerCriteria: "Winner by lowest average finish place",
  beginTournament: "BEGIN TOURNAMENT",
  needPlayers: "Need at least 2 players",
  needRaces: "Need at least 2 total races",
  infoLine: (players, races, maps) =>
    `${players} player${players === 1 ? "" : "s"} \u00b7 ${races} race${races === 1 ? "" : "s"} \u00b7 ${maps} map${maps === 1 ? "" : "s"} \u00b7 Winner by lowest avg place`,
  standingsBack: "STANDINGS",
  raceOf: (n, total, map) => `Race ${n} of ${total} \u00b7 ${map}`,
  startRaceN: (n) => `START RACE ${n}`,
  raceNWinner: (n) => `Race ${n} Winner`,
  raceNWins: (n, name) => `Race ${n} winner: ${name}`,
  raceNComplete: (n) => `Race ${n} Complete`,
  tournamentStandings: "Tournament Standings",
  allDone: "ALL DONE",
  afterRaceN: (n) => `AFTER RACE ${n}`,
  racesComplete: (done, total) => `${done} of ${total} races complete`,
  overallStandings: "Overall Standings",
  startRaceNMap: (n, map) => `START RACE ${n}: ${map}`,
  finalResultsBtn: "FINAL RESULTS",
  abandonTournament: "ABANDON TOURNAMENT",
  avgPlaceShort: (n) => `avg #${n}`,
  tournamentChampionLabel: "Tournament Champion",
  champion: "CHAMPION",
  winsTournamentSuffix: " wins the tournament\!",
  racesAndPlayers: (races, players) => `${races} race${races === 1 ? "" : "s"} \u00b7 ${players} player${players === 1 ? "" : "s"}`,
  finalStandings: "Final Standings",
  playerCol: "Player",
  avgPlaceCol: "Avg Place",
  avgTimeCol: "Avg Time",
  newTournament: "NEW TOURNAMENT",
  mapEditor: "MAP EDITOR",
  newMapBtn: "+ NEW",
  mapNamePlaceholder: "Map name\u2026",
  editingSavedMap: "EDITING SAVED MAP",
  savedBtn: "Saved\!",
  updateBtn: "Update",
  saveBtn: "Save",
  obstaclesCount: (n) => `${n} obstacle${n === 1 ? "" : "s"}`,
  stampMode: (label) => `STAMP: ${label} \u2014 click to place \u00b7 Esc to cancel`,
  controlsHint: "Click palette item to stamp \u00b7 Drag to place once\nClick obstacle to select \u00b7 Del to remove \u00b7 Esc exits stamp",
  paletteTab: "Palette",
  mapsTab: "Maps",
  background: "BACKGROUND",
  obstaclesHeading: "OBSTACLES \u2014 click to stamp",
  stampOn: "ON",
  selectedKind: (kind) => `SELECTED: ${kind}`,
  angle: "Angle",
  deleteObstacle: "Delete obstacle",
  clearAll: "Clear all",
  savedMapsCount: (n) => `SAVED MAPS (${n})`,
  noSavedMaps: "No custom maps yet.\nSave one to see it here.",
  editingLabel: "EDITING",
  loadEdit: "\u270f LOAD & EDIT",
  goToSetup: "GO TO SETUP",
  palPeg: "Peg",           palPegDesc: "Round bumper",
  palRail: "Rail",         palRailDesc: "Flat surface",
  palPlatform: "Platform", palPlatformDesc: "Solid ledge",
  palURamp: "U-Ramp",      palURampDesc: "Curved redirect",
  palLaunchLeft: "Launch \u2190",  palLaunchLeftDesc: "Boosts left",
  palLaunchRight: "Launch \u2192", palLaunchRightDesc: "Boosts right",
  palBoostUp: "Boost \u2191",      palBoostUpDesc: "Boosts upward",
};

const cs: Translations = {
  subtitle: "KUL\u010cI\u010cKA Z\u00c1VOD",
  players: "HR\u00c1\u010cI",
  playerPlaceholder: "Jm\u00e9no hr\u00e1\u010de...",
  noPlayers: "P\u0159idej alespo\u0148 2 hr\u00e1\u010de",
  editor: "EDITOR MAP",
  startRace: "SPUSTIT Z\u00c1VOD",
  addMorePlayers: (n) => `P\u0159idej je\u0161t\u011b ${n} hr\u00e1\u010d${n === 1 ? "e" : "e"}`,
  tournamentMode: "TURNAJ",
  defaultMap: "V\u00ddCHOZ\u00cd",
  noCustomMaps: "\u017d\u00e1dn\u00e9 vlastn\u00ed mapy",
  volume: "HLASITOST",
  off: "VYP",
  mute: "ZTLUMIT",
  unmute: "ZAPNOUT ZVUK",
  footer: "Postaveno s fyzikou a chaosem",
  howToPlay: "JAK HR\u00c1T",
  launchPads: "Odpalovac\u00ed plochy",
  wind: "V\u00edtr",           windDesc: "Neviditeln\u00e1 s\u00edla tla\u010duj\u00edc\u00ed kuli\u010dky do strany",
  pegs: "Kol\u00edky",         pegsDesc: "Kulat\u00e9 nar\u00e1\u017ee\u010de odr\u00e1\u017eej\u00edc\u00ed kuli\u010dky",
  rails: "Li\u0161ty",         railsDesc: "Plo\u010dn\u00e9 povrchy, po kter\u00fdch kuli\u010dky klou\u017eou",
  uRamps: "U-rampy",            uRampsDesc: "Zahnut\u00e9 rampy p\u0159esm\u011brov\u00e1vaj\u00edc\u00ed kuli\u010dky nahoru",
  platforms: "Plo\u0161iny",   platformsDesc: "Pevn\u00e9 \u0159\u00edmsy, na kter\u00e9 kuli\u010dky dopadaj\u00ed",
  stuckKick: "Kopanec",         stuckKickDesc: "Nehybn\u00e9 kuli\u010dky jsou vyst\u0159eleny n\u00e1hodn\u00fdm sm\u011brem",
  greenPad: "Zelen\u00e1 plocha",    greenPadDesc: "Siln\u011b katapultuje kuli\u010dku nahoru",
  orangePad: "Oran\u017eov\u00e1 plocha", orangePadDesc: "Vyst\u0159el\u00ed kuli\u010dku doleva do \u00fahlu",
  redPad: "\u010cerven\u00e1 plocha",  redPadDesc: "Vyst\u0159el\u00ed kuli\u010dku doprava do \u00fahlu",
  home: "DOM\u016e",
  back: "ZP\u011aT",
  setupBack: "NASTAVEN\u00cd",
  marbleRace: "Z\u00c1VOD KULI\u010cEK",
  marblesCount: (n) => `${n} kuli\u010d${n === 1 ? "ka" : "ky"}`,
  startingPositions: "Startovn\u00ed pozice",
  shuffle: "Zam\u00edchat",
  go: "START",
  finishLine: "C\u00cdL",
  winsExclaim: (name) => `${name} vyhr\u00e1l\!`,
  endRace: "Ukon\u010dit z\u00e1vod",
  raceComplete: "Z\u00e1vod dokon\u010den",
  winnerLabel: "V\u00edt\u011bz\!",
  watch: "Sledovat",
  results: "V\u00ddSLEDKY",
  finalResults: "Kone\u010dn\u00e9 v\u00fdsledky",
  raceOver: "KONEC Z\u00c1VODU",
  takesGold: (name) => `${name} bere zlato\!`,
  goldSuffix: " bere zlato\!",
  fullStandings: "Celkov\u00e9 po\u0159ad\u00ed",
  raceAgain: "Z\u00c1VOD ZNOVU",
  dnf: "DNF",
  tournament: "TURNAJ",
  tournamentSubtitle: "Mistrovstv\u00ed na v\u00edce map\u00e1ch",
  mapsToRace: "Mapy k z\u00e1vod\u011bn\u00ed",
  mapsRaceHint: "Nastav, kolikr\u00e1t se ka\u017ed\u00e1 mapa pojede. Pou\u017eij + pro opakov\u00e1n\u00ed. Pot\u0159eba 2+ z\u00e1vody.",
  totalRacesLabel: (n) => `${n} ${n === 1 ? "z\u00e1vod" : "z\u00e1vody"}`,
  winnerCriteria: "V\u00edt\u011bz dle nejni\u017e\u0161\u00edho pr\u016fm\u011brn\u00e9ho um\u00edst\u011bn\u00ed",
  beginTournament: "ZA\u010c\u00cdT TURNAJ",
  needPlayers: "Pot\u0159eba alespo\u0148 2 hr\u00e1\u010de",
  needRaces: "Pot\u0159eba alespo\u0148 2 z\u00e1vody celkem",
  infoLine: (players, races, maps) =>
    `${players} hr\u00e1\u010d${players === 1 ? "" : "i"} \u00b7 ${races} z\u00e1vod${races === 1 ? "" : "y"} \u00b7 ${maps} map${maps === 1 ? "a" : "y"} \u00b7 V\u00edt\u011bz dle nejni\u017e\u0161\u00edho pr\u016fm. um\u00edst\u011bn\u00ed`,
  standingsBack: "PO\u0158AD\u00cd",
  raceOf: (n, total, map) => `Z\u00e1vod ${n} z ${total} \u00b7 ${map}`,
  startRaceN: (n) => `SPUSTIT Z\u00c1VOD ${n}`,
  raceNWinner: (n) => `V\u00edt\u011bz z\u00e1vodu ${n}`,
  raceNWins: (n, name) => `V\u00edt\u011bz z\u00e1vodu ${n}: ${name}`,
  raceNComplete: (n) => `Z\u00e1vod ${n} dokon\u010den`,
  tournamentStandings: "Po\u0159ad\u00ed turnaje",
  allDone: "HOTOVO",
  afterRaceN: (n) => `PO Z\u00c1VOD\u011a ${n}`,
  racesComplete: (done, total) => `${done} z ${total} z\u00e1vod\u016f hotovo`,
  overallStandings: "Celkov\u00e9 po\u0159ad\u00ed",
  startRaceNMap: (n, map) => `SPUSTIT Z\u00c1VOD ${n}: ${map}`,
  finalResultsBtn: "FIN\u00c1LN\u00cd V\u00ddSLEDKY",
  abandonTournament: "OPUSTIT TURNAJ",
  avgPlaceShort: (n) => `pr\u016fm. #${n}`,
  tournamentChampionLabel: "\u0160ampion turnaje",
  champion: "\u0160AMPION",
  winsTournamentSuffix: " vyhr\u00e1l turnaj\!",
  racesAndPlayers: (races, players) => `${races} z\u00e1vod${races === 1 ? "" : "y"} \u00b7 ${players} hr\u00e1\u010d${players === 1 ? "" : "i"}`,
  finalStandings: "Kone\u010dn\u00e9 po\u0159ad\u00ed",
  playerCol: "Hr\u00e1\u010d",
  avgPlaceCol: "Pr\u016fm. um\u00edst\u011bn\u00ed",
  avgTimeCol: "Pr\u016fm. \u010das",
  newTournament: "NOV\u00dd TURNAJ",
  mapEditor: "EDITOR MAP",
  newMapBtn: "+ NOV\u00c1",
  mapNamePlaceholder: "N\u00e1zev mapy\u2026",
  editingSavedMap: "\u00daPRAVA ULO\u017dEN\u00c9 MAPY",
  savedBtn: "Ulo\u017eeno\!",
  updateBtn: "Aktualizovat",
  saveBtn: "Ulo\u017eit",
  obstaclesCount: (n) => `${n} p\u0159ek\u00e1\u017ek${n === 1 ? "a" : "y"}`,
  stampMode: (label) => `RAZ\u00cdTKO: ${label} \u2014 klikni pro um\u00edst\u011bn\u00ed \u00b7 Esc pro zru\u0161en\u00ed`,
  controlsHint: "Klikni na prvek pro raz\u00edtkov\u00e1n\u00ed \u00b7 Ta\u017een\u00edm um\u00edst\u00ed\u0161 jednou\nKlikni na p\u0159ek\u00e1\u017eku pro v\u00fdb\u011br \u00b7 Del pro smaz\u00e1n\u00ed \u00b7 Esc ukon\u010d\u00ed raz\u00edtko",
  paletteTab: "Paleta",
  mapsTab: "Mapy",
  background: "POZAD\u00cd",
  obstaclesHeading: "P\u0158EK\u00c1\u017dKY \u2014 klikni pro raz\u00edtkov\u00e1n\u00ed",
  stampOn: "ZAP",
  selectedKind: (kind) => `VYBR\u00c1NO: ${kind}`,
  angle: "\u00dahel",
  deleteObstacle: "Smazat p\u0159ek\u00e1\u017eku",
  clearAll: "Smazat v\u0161e",
  savedMapsCount: (n) => `ULO\u017dEN\u00c9 MAPY (${n})`,
  noSavedMaps: "\u017d\u00e1dn\u00e9 vlastn\u00ed mapy.\nUlo\u017e jednu, aby se zobrazila.",
  editingLabel: "\u00daPRAVA",
  loadEdit: "\u270f NA\u010c\u00cdST A UPRAVIT",
  goToSetup: "DO NASTAVEN\u00cd",
  palPeg: "Kol\u00edk",        palPegDesc: "Kulat\u00fd nar\u00e1\u017ee\u010d",
  palRail: "Li\u0161ta",       palRailDesc: "Plo\u010dn\u00fd povrch",
  palPlatform: "Plo\u0161ina", palPlatformDesc: "Pevn\u00e1 \u0159\u00edmsa",
  palURamp: "U-rampa",          palURampDesc: "Zahnut\u00e9 p\u0159esm\u011brov\u00e1n\u00ed",
  palLaunchLeft: "Odp. \u2190", palLaunchLeftDesc: "Boost doleva",
  palLaunchRight: "Odp. \u2192", palLaunchRightDesc: "Boost doprava",
  palBoostUp: "Boost \u2191",  palBoostUpDesc: "Boost nahoru",
};

export const translations: Record<Lang, Translations> = { en, cs };
