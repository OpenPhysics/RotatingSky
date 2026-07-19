/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { CelestialSphereScreen } from "./celestial-sphere/CelestialSphereScreen.js";
import {
  createCelestialSphereIcon,
  createExplorerIcon,
  createHorizonSystemIcon,
} from "./common/RotatingSkyScreenIcons.js";
import { ExplorerScreen } from "./explorer/ExplorerScreen.js";
import { HorizonSystemScreen } from "./horizon-system/HorizonSystemScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import { RotatingSkyPreferencesModel } from "./preferences/RotatingSkyPreferencesModel.js";
import { RotatingSkyPreferencesNode } from "./preferences/RotatingSkyPreferencesNode.js";
import RotatingSkyColors from "./RotatingSkyColors.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();
  const screenNames = stringManager.getScreenNames();

  // Simulation-specific preferences; initial values come from rotatingSkyQueryParameters.
  const simPreferences = new RotatingSkyPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  // Screen name Properties update automatically when the locale changes.
  // Each screen seeds its own SkyModel from the shared preference defaults.
  const screens = [
    new HorizonSystemScreen({
      name: screenNames.horizonSystemStringProperty,
      tandem: Tandem.ROOT.createTandem("horizonSystemScreen"),
      backgroundColorProperty: RotatingSkyColors.backgroundColorProperty,
      homeScreenIcon: createHorizonSystemIcon(),
      navigationBarIcon: createHorizonSystemIcon(),
      preferences: simPreferences,
    }),
    new CelestialSphereScreen({
      name: screenNames.celestialSphereStringProperty,
      tandem: Tandem.ROOT.createTandem("celestialSphereScreen"),
      backgroundColorProperty: RotatingSkyColors.backgroundColorProperty,
      homeScreenIcon: createCelestialSphereIcon(),
      navigationBarIcon: createCelestialSphereIcon(),
      preferences: simPreferences,
    }),
    new ExplorerScreen({
      name: screenNames.explorerStringProperty,
      tandem: Tandem.ROOT.createTandem("explorerScreen"),
      backgroundColorProperty: RotatingSkyColors.backgroundColorProperty,
      homeScreenIcon: createExplorerIcon(),
      navigationBarIcon: createExplorerIcon(),
      preferences: simPreferences,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new RotatingSkyPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "OpenPhysics",
      softwareDevelopment: "OpenPhysics",
      team: "NAAP / OpenPhysics",
      qualityAssurance: "OpenPhysics",
    },
  });

  sim.start();
});
