import { db, articlesTable, productsTable } from "@workspace/db";

const productSeeds = [
  {
    slug: "laneucap-daw",
    name: "LaneuCap DAW",
    shortDescription: "The flagship music-production environment being developed for Connect Sphere.",
    description:
      "LaneuCap DAW is in development. No installer, verified system requirements, or tested feature set has been published yet. Product and compatibility information will be updated when a release is ready.",
    category: "daw",
    kind: "daw",
  },
  {
    slug: "cinder-drive",
    name: "Cinder Drive",
    shortDescription: "A saturation-plugin concept from the planned LaneuCap collection.",
    description:
      "Cinder Drive is a concept in the LaneuCap plugin collection. It is not currently available; processing behavior, supported formats, compatibility, and pricing have not been published.",
    category: "saturation",
    kind: "plugin",
  },
  {
    slug: "spectral-eq",
    name: "Spectral EQ",
    shortDescription: "An equalizer concept for the planned LaneuCap plugin collection.",
    description:
      "Spectral EQ is a concept in the LaneuCap plugin collection. It is not currently available; its capabilities, supported formats, compatibility, and pricing have not been published.",
    category: "eq",
    kind: "plugin",
  },
  {
    slug: "cedar-room",
    name: "Cedar Room",
    shortDescription: "A space-and-time effect concept in the LaneuCap plugin collection.",
    description:
      "Cedar Room is a concept in the LaneuCap plugin collection. It is not currently available; its capabilities, supported formats, compatibility, and pricing have not been published.",
    category: "reverb-delay",
    kind: "plugin",
  },
  {
    slug: "keystone-comp",
    name: "Keystone Compressor",
    shortDescription: "A dynamics-plugin concept for the planned LaneuCap collection.",
    description:
      "Keystone Compressor is a concept in the LaneuCap plugin collection. It is not currently available; its capabilities, supported formats, compatibility, and pricing have not been published.",
    category: "compressors",
    kind: "plugin",
  },
  {
    slug: "northstar-synth",
    name: "Northstar Synth",
    shortDescription: "A virtual-instrument concept from the LaneuCap ecosystem.",
    description:
      "Northstar Synth is a concept in the LaneuCap instrument collection. It is not currently available; its capabilities, supported formats, compatibility, and pricing have not been published.",
    category: "synthesizers",
    kind: "plugin",
  },
  {
    slug: "orbit-instruments",
    name: "Orbit Instruments",
    shortDescription: "A virtual-studio and instrument concept for Connect Sphere.",
    description:
      "Orbit Instruments is a concept in the Connect Sphere ecosystem. It is not currently available; its capabilities, supported formats, compatibility, and pricing have not been published.",
    category: "instruments",
    kind: "plugin",
  },
  {
    slug: "laneucap-audio-tools",
    name: "LaneuCap Audio Tools",
    shortDescription: "A collection of audio-utility concepts in development.",
    description:
      "LaneuCap Audio Tools is a planned collection. No utilities are currently available, and compatibility and pricing have not been published.",
    category: "audio-tools",
    kind: "tool",
  },
].map((product) => ({
  ...product,
  priceCents: null,
  currency: "USD",
  status: "coming_soon",
  version: null,
  featureTags: ["Concept", "In development"],
  coverImageUrl: null,
  isPublished: true,
}));

const articleSeeds = [
  {
    slug: "connect-sphere-in-development",
    title: "Connect Sphere is in development",
    summary:
      "An introduction to Huskagent Technology Company's music-software project and the LaneuCap product family.",
    content:
      "Connect Sphere is the music-software platform from Huskagent Technology Company. LaneuCap DAW is its flagship product in development, with a wider collection of audio tools and learning resources planned for the same ecosystem. No public software release is available yet. We will publish verified system requirements, release notes, and download files here when they are ready.",
    category: "news",
  },
  {
    slug: "start-a-beat-making-session",
    title: "A practical starting point for a beat-making session",
    summary:
      "A software-independent way to turn a short musical idea into an organized first draft.",
    content:
      "Start with a short loop rather than a full song. Pick a tempo that supports the mood, make a simple kick-and-snare pattern, and add one contrasting rhythm. Record or program a bass idea that supports the kick without competing with it. Save a new version before changing the arrangement. These steps apply across music software; this guide does not require LaneuCap DAW.",
    category: "beat-making",
  },
  {
    slug: "prepare-a-vocal-recording",
    title: "Prepare a vocal session before you record",
    summary:
      "A simple checklist for a repeatable vocal-recording session in any recording setup.",
    content:
      "Set the microphone and performer position before adjusting levels. Record a short test at the loudest expected performance, leaving headroom so transient peaks do not clip. Listen back for room noise, headphone bleed, and plosive sounds. Save a separate take for each performance, label it clearly, and keep an untouched copy before editing. This is general recording guidance, not a LaneuCap-specific feature guide.",
    category: "recording",
  },
  {
    slug: "gain-staging-before-the-mix",
    title: "Gain staging before the mix",
    summary:
      "A straightforward level-checking routine to keep a mix session clear and manageable.",
    content:
      "Begin by lowering individual tracks until the master output has comfortable headroom. Compare levels at a consistent monitoring volume rather than making every track louder. Check for clipping at the source, plugin, bus, and output stages. Use meters as a warning system and your ears for balance. Leave final loudness decisions until the mix is stable.",
    category: "mixing",
  },
  {
    slug: "a-mastering-checklist",
    title: "A mastering checklist for a finished mix",
    summary:
      "Review translation, peaks, and exports before you deliver a final master.",
    content:
      "Listen from start to finish without adjusting anything. Check transitions, fades, edits, and the beginning and end of the file. Compare on more than one playback system at a matched volume. Confirm the requested sample rate, bit depth, channel layout, and file format with the recipient. Keep the mix and master as separate files, and do not overwrite the source export.",
    category: "mastering",
  },
  {
    slug: "organize-a-first-daw-session",
    title: "Organize your first session in any DAW",
    summary:
      "A few habits that make music projects easier to reopen, share, and finish.",
    content:
      "Give the project a useful name and save it in a dedicated folder before recording. Keep source audio with the project where possible, use clear track names, and group related recordings. Make dated checkpoints when you reach a meaningful milestone. Before sharing the project, confirm that the recipient has the audio files and any required plugins. This guide is software-independent and does not imply LaneuCap DAW is released.",
    category: "getting-started",
  },
].map((article) => ({
  ...article,
  coverImageUrl: null,
  isPublished: true,
  publishedAt: new Date(),
}));

export async function seedConnectSphereContent(): Promise<void> {
  await db.insert(productsTable).values(productSeeds).onConflictDoNothing({
    target: productsTable.slug,
  });
  await db.insert(articlesTable).values(articleSeeds).onConflictDoNothing({
    target: articlesTable.slug,
  });
}
