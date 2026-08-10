import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inventoryPath = path.join(root, "docs", "bugdex-nederland-complete-inventory.json");
const outputDir = path.join(root, "output", "visual-factory", "nl-common-complete");
const outputPath = path.join(outputDir, "manifest.json");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));

function anatomyFor(group) {
  if (["spin", "teek"].includes(group)) {
    return "arachnid anatomy: exactly eight correctly attached legs, no antennae and no wings";
  }
  if (["slak"].includes(group)) {
    return "terrestrial snail anatomy: soft muscular foot, shell or no shell exactly as the species has, no insect legs and no antennae beyond the real tentacles";
  }
  if (["watergeleedpotige"].includes(group)) {
    return "real freshwater crustacean anatomy with the correct segmented body and appendages, no invented legs or wings";
  }
  if (["pissebed", "miljoenpoot", "duizendpoot"].includes(group)) {
    return "real terrestrial arthropod anatomy with plausible segmentation and the correct number and arrangement of legs for the requested group";
  }
  return "insect anatomy: exactly six correctly attached legs, the correct antennae and the correct visible wing count for the requested species";
}

function promptFor(item) {
  return [
    "BugBaas BugDex individual species asset.",
    `One real ${item.name} (${item.scientificName}) from the Netherlands, not a generic substitute and not a fantasy variant.`,
    `Group: ${item.group}. Encounter context: ${item.contexts.join(", ")}.`,
    "Polished semi-realistic 3D field-guide game art matching the existing BugBaas BugDex: natural proportions, restrained materials, sharp diagnostic details, neutral three-quarter field-guide pose, whole subject centered and readable at 96 px.",
    anatomyFor(item.group) + ".",
    "Preserve the species' natural coloration, markings, body segmentation and diagnostic silhouette. Keep every appendage inside the canvas with at least 7% edge breathing room.",
    "Transparent RGBA background with clean alpha; no checkerboard, no white background, no white halo, no cast shadow, no scenery, no text, no label, no frame, no watermark, no clothing, no tools, no weapons, no face and no oversized eyes.",
    "Square 768x768 canvas; subject occupies approximately 68-78% of the canvas."
  ].join(" ");
}

const items = inventory.missingSpecificSpecies.map((item) => ({
  id: item.id,
  group: item.group,
  priority: item.priority,
  prompt: promptFor(item),
  target: `assets/bugdex/${item.id}.png`,
  webpTarget: `assets/bugdex-webp/${item.id}.webp`,
  size: 768,
  transparent: true,
  status: "planned"
}));

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  batch: "nl-common-complete",
  generatedFrom: "docs/bugdex-nederland-complete-inventory.json",
  itemCount: items.length,
  items
}, null, 2) + "\n", "utf8");

console.log(`wrote ${items.length} asset manifest items to ${path.relative(root, outputPath)}`);
