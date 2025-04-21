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

// New stat types
export type StatName =
  | "agility"
  | "strength"
  | "intelligence"
  | "resilience"
  | "temerity"
  | "resourcefulness"
  | "magnetism"
  | "auralAbility"
  | "vision"
  | "fertility"
  | "sexAppeal"
  | "heatResistance"
  | "coldResistance"
  | "opportunism"
  | "altruism"
  | "sociability"
  | "stealth"

// Define contra-stats relationships
export const contraStats: Record<StatName, StatName[]> = {
  agility: ["strength"],
  strength: ["agility", "stealth"],
  intelligence: ["strength"],
  resilience: ["temerity"],
  temerity: ["resilience"],
  resourcefulness: ["strength", "temerity"],
  magnetism: ["stealth"],
  auralAbility: ["intelligence"],
  vision: ["intelligence"],
  fertility: ["resourcefulness", "resilience", "agility"],
  sexAppeal: ["stealth"],
  heatResistance: ["coldResistance"],
  coldResistance: ["heatResistance"],
  opportunism: ["altruism", "sociability"],
  altruism: ["magnetism", "opportunism"],
  sociability: ["temerity", "strength"],
  stealth: ["magnetism", "sexAppeal"]
}

// Define available stats for each kingdom
export const kingdomStats: Record<Kingdom, StatName[]> = {
  Animal: [
    "agility", "strength", "intelligence", "resilience", "temerity", 
    "resourcefulness", "magnetism", "auralAbility", "vision", "fertility", 
    "sexAppeal", "heatResistance", "coldResistance", "opportunism", 
    "altruism", "sociability", "stealth"
  ],
  Plant: [
    "resilience", "temerity", "fertility", "magnetism", "heatResistance", 
    "coldResistance", "opportunism", "altruism", "sociability"
  ],
  Fungi: [
    "resilience", "temerity", "fertility", "magnetism", "heatResistance", 
    "coldResistance", "opportunism", "altruism", "sociability"
  ],
  Protist: [
    "resilience", "temerity", "fertility", "magnetism", "heatResistance", 
    "coldResistance", "opportunism", "altruism", "sociability"
  ],
  Bacteria: [
    "temerity", "fertility", "magnetism", "heatResistance", 
    "coldResistance", "opportunism", "altruism", "sociability"
  ],
  Archaea: [
    "temerity", "fertility", "magnetism", "heatResistance", 
    "coldResistance", "opportunism", "altruism", "sociability"
  ]
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
