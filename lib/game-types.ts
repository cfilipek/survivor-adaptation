export type Kingdom = "Animal" | "Plant" | "Fungi" | "Protist" | "Bacteria" | "Archaea"
export type Environment = "Grassland" | "Desert" | "Tundra" | "Jungle"
export type OrganismStatus =
  | "alive"
  | "thriving"
  | "surviving"
  | "struggling"
  | "extinct"
  | "city_survivor"
  | "city_adapter"
export type GameState = "waiting" | "environment" | "city" | "results"

// New stat types for each kingdom
export type AnimalStatName =
  | "consumer"
  | "agility"
  | "strength"
  | "intelligence"
  | "audacity"
  | "nocturnal"
  | "acuteSense"
  | "stealth"
  | "heatResistance"
  | "coldResistance"
  | "opportunism"
  | "sociability"

export type PlantStatName =
  | "photosynthesis"
  | "succulence"
  | "heatResistance"
  | "coldResistance"
  | "spinescence"
  | "flexibility"
  | "hairiness"
  | "waxiness"
  | "height"
  | "perennial"
  | "biennial"
  | "annual"

export type FungiStatName =
  | "decomposer"
  | "parasitic"
  | "symbiotic"
  | "heatResistance"
  | "coldResistance"
  | "perfect"
  | "imperfect"
  | "toxic"
  | "unicellular"
  | "multicellular"
  | "aerobic"
  | "anaerobic"

export type ProtistStatName =
  | "aquatic"
  | "flagella"
  | "cilia"
  | "pseudopod"
  | "ingestor"
  | "absorptive"
  | "photosynthetic"
  | "heatResistance"
  | "coldResistance"

export type BacteriaStatName =
  | "mutation"
  | "horizontalGeneTransfer"
  | "heatResistance"
  | "coldResistance"
  | "pathogenic"
  | "beneficial"
  | "antibioticResistance"
  | "parallelEvolution"
  | "coevolution"
  | "aerobic"
  | "anaerobic"

export type ArchaeaStatName =
  | "extremophile"
  | "thermophilic"
  | "psychrophilic"
  | "halophilic"
  | "acidophilic"
  | "alkaliphilic"
  | "piezophilic"

// Union type of all possible stats
export type StatName =
  | AnimalStatName
  | PlantStatName
  | FungiStatName
  | ProtistStatName
  | BacteriaStatName
  | ArchaeaStatName

// Stat descriptions for tooltips
export const statDescriptions: Record<StatName, string> = {
  // Animal stats
  consumer: "Animals eat to survive",
  agility: "Speed, evasion of predators",
  strength: "Muscle, good in fights for mates, hunting and conquering difficult terrain",
  intelligence: "You can use tools, you have culture",
  audacity: "Bold, risk tolerant, ex. colonizing new habitats",
  nocturnal: "Heat resistance, easy prey and excellent vision",
  acuteSense: "Sensitive to sound, taste, touch, smell; strong vision",
  stealth: "Camouflage, aptitude for hunting and evasion of predators",
  heatResistance: "Can withstand hotter temperatures and extremes",
  coldResistance: "Can withstand colder temperatures and extremes",
  opportunism: "Willingness to take advantage of anyone or anything to survive",
  sociability: "Cooperates with its own species, pack and social behavior",

  // Plant stats
  photosynthesis: "Plants harness energy from the sun",
  succulence: "Drought resistance, how much water can you hold?",
  spinescence: "You have a dense spine but lack flexibility, if you're not strong enough you may break in the wind",
  flexibility: "Ability to bend without breaking",
  hairiness:
    "You have 'trichomes'; can help avoid sun and wind damage, naturally insect repellant...unless the insect is a mite",
  waxiness: "Helps retain moisture in drought and repel excess water in tropical climates",
  height: "How close are you to your source of energy, the sun?",
  perennial: "Slow to mature and hardy, it takes more than a harsh winter to kill you",
  biennial: "You live fast but take a bit longer to mature–this plant completes its life cycle in 2 years",
  annual: "Live fast and die young! This plant completes its entire life cycle in 1 year",

  // Fungi stats
  decomposer: "Fungi metabolize dead matter, one organism's trash is another's treasure",
  parasitic: "You like a live meal, nematodes and athletes' feet beware",
  symbiotic: "You work with another species and both get what you need, mutualism",
  perfect: "You can reproduce asexually and sexually",
  imperfect: "You can reproduce asexually only",
  toxic: "Can keep you safe from herbivores and enthusiasts",
  unicellular: "You're a yeast cell!",
  multicellular: "Complex",
  aerobic: "You need oxygen to survive",
  anaerobic: "You do not need oxygen to survive",

  // Protist stats
  aquatic: "You need moisture to survive",
  flagella: "Like a tail, but for a microscopic eukaryotic",
  cilia: "Like a flagella except short and covering the entire organism",
  pseudopod: "'False feet' of amoeba-types, extensions of cytoplasm used for movement",
  ingestor: "You engulf bacteria and the like for food",
  absorptive: "You diffuse molecules in for food",
  photosynthetic: "You need light for food",

  // Bacteria stats
  mutation: "Your life cycle and reproduction process lends itself to mutations and highly adaptive populations",
  horizontalGeneTransfer: "You share genetic mutations and advantageous traits within and between species",
  pathogenic: "You're part of a minority of the kingdom that thrive on other organisms' suffering",
  beneficial: "You inhabit the world around less offensively, sometimes you even help organisms out",
  antibioticResistance: "What doesn't kill you only makes you stronger",
  parallelEvolution: "You were forged in the fires of your environment alone",
  coevolution: "You coevolved with another species of bacteria in a mutually beneficial way",

  // Archaea stats
  extremophile: "You can survive in intense environments",
  thermophilic:
    "Proteins have a prominent hydrophobic core and increased electrostatic interactions to maintain activity at high temps",
  psychrophilic:
    "Proteins have a reduced hydrophobic core and a less charged protein surface to maintain flexibility and activity in cold temps",
  halophilic: "Increased negative surface charge, which compensates for the extreme ionic conditions",
  acidophilic: "You survive in an extremely acidic environment",
  alkaliphilic: "You survive in an extremely basic environment",
  piezophilic: "Your optimal growth is under high hydrostatic pressure",
}

// Define inherent traits for each kingdom (traits with asterisks)
export const inherentTraits: Record<Kingdom, StatName[]> = {
  Animal: ["consumer"],
  Plant: ["photosynthesis"],
  Fungi: ["decomposer"],
  Protist: ["aquatic"],
  Bacteria: ["mutation", "horizontalGeneTransfer"],
  Archaea: ["extremophile"],
}

// Define contra-stats relationships
export const contraStats: Record<StatName, StatName[]> = {
  // Animal contra-stats
  consumer: [],
  agility: ["strength"],
  strength: ["agility"],
  intelligence: ["acuteSense"],
  audacity: ["stealth"],
  nocturnal: [],
  acuteSense: ["intelligence"],
  stealth: ["audacity"],
  heatResistance: ["coldResistance"],
  coldResistance: ["heatResistance"],
  opportunism: ["sociability"],
  sociability: ["opportunism"],

  // Plant contra-stats
  photosynthesis: [],
  succulence: ["coldResistance", "flexibility"],
  spinescence: ["flexibility", "annual", "biennial"],
  flexibility: ["spinescence"],
  hairiness: ["waxiness"],
  waxiness: ["hairiness"],
  height: ["annual", "biennial"],
  perennial: ["annual", "biennial"],
  biennial: ["perennial"],
  annual: ["perennial"],

  // Fungi contra-stats
  decomposer: [],
  parasitic: ["symbiotic", "toxic"],
  symbiotic: ["parasitic"],
  perfect: ["imperfect"],
  imperfect: ["perfect"],
  toxic: ["parasitic"],
  unicellular: ["multicellular"],
  multicellular: ["unicellular"],
  aerobic: ["anaerobic"],
  anaerobic: ["aerobic"],

  // Protist contra-stats
  aquatic: [],
  flagella: ["cilia", "pseudopod"],
  cilia: ["flagella", "pseudopod"],
  pseudopod: ["cilia", "flagella"],
  ingestor: ["absorptive", "photosynthetic"],
  absorptive: ["ingestor", "photosynthetic"],
  photosynthetic: ["ingestor", "absorptive"],

  // Bacteria contra-stats
  mutation: [],
  horizontalGeneTransfer: [],
  pathogenic: ["beneficial"],
  beneficial: ["pathogenic"],
  antibioticResistance: [],
  parallelEvolution: ["coevolution"],
  coevolution: ["parallelEvolution"],

  // Archaea contra-stats
  extremophile: [],
  thermophilic: ["psychrophilic", "halophilic"],
  psychrophilic: ["thermophilic", "halophilic"],
  halophilic: ["psychrophilic", "thermophilic"],
  acidophilic: ["alkaliphilic"],
  alkaliphilic: ["acidophilic"],
  piezophilic: [],
}

// Define available stats for each kingdom
export const kingdomStats: Record<Kingdom, StatName[]> = {
  Animal: [
    "consumer",
    "agility",
    "strength",
    "intelligence",
    "audacity",
    "nocturnal",
    "acuteSense",
    "stealth",
    "heatResistance",
    "coldResistance",
    "opportunism",
    "sociability",
  ],
  Plant: [
    "photosynthesis",
    "succulence",
    "heatResistance",
    "coldResistance",
    "spinescence",
    "flexibility",
    "hairiness",
    "waxiness",
    "height",
    "perennial",
    "biennial",
    "annual",
  ],
  Fungi: [
    "decomposer",
    "parasitic",
    "symbiotic",
    "heatResistance",
    "coldResistance",
    "perfect",
    "imperfect",
    "toxic",
    "unicellular",
    "multicellular",
    "aerobic",
    "anaerobic",
  ],
  Protist: [
    "aquatic",
    "flagella",
    "cilia",
    "pseudopod",
    "ingestor",
    "absorptive",
    "photosynthetic",
    "heatResistance",
    "coldResistance",
  ],
  Bacteria: [
    "mutation",
    "horizontalGeneTransfer",
    "heatResistance",
    "coldResistance",
    "pathogenic",
    "beneficial",
    "antibioticResistance",
    "parallelEvolution",
    "coevolution",
    "aerobic",
    "anaerobic",
  ],
  Archaea: [
    "extremophile",
    "thermophilic",
    "psychrophilic",
    "halophilic",
    "acidophilic",
    "alkaliphilic",
    "piezophilic",
  ],
}

export interface Organism {
  id?: string
  name: string
  kingdom: Kingdom
  environment: Environment
  stats: Record<string, number>
  status: OrganismStatus
  playerName?: string
}
