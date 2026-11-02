import { readFile } from "node:fs/promises";

import { evidenceFile } from "@ppt/runtime/evidence-paths";
import type {
  ComponentEvidenceMap,
  ComponentCatalog,
  NativeInventory,
  EvidenceRegistry,
  NativeCaptureManifest,
  UtilityBehaviorEvidence,
  UtilityInstallationEvidence,
  InstallationEvidence,
  RepeatabilityEvidence,
  GlyphProvenance,
  GlyphObservationEvidence,
  NativeGlyphCaptureManifest,
} from "@ppt/runtime/map-evidence";

export const readComponentMap = async (file: string) => {
  // SAFETY: this retained ComponentEvidenceMap document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as ComponentEvidenceMap;

  return parsed;
};

export const readComponentCatalog = async (file: string) => {
  // SAFETY: this retained ComponentCatalog document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as ComponentCatalog;

  return parsed;
};

export const readNativeInventory = async (file: string) => {
  // SAFETY: this retained NativeInventory document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as NativeInventory;

  return parsed;
};

export const readEvidenceRegistry = async (file: string) => {
  // SAFETY: this retained EvidenceRegistry document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as EvidenceRegistry;

  return parsed;
};

export const readNativeCaptureManifest = async (file: string) => {
  // SAFETY: this retained NativeCaptureManifest document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as NativeCaptureManifest;

  return parsed;
};

export const readUtilityBehavior = async (file: string) => {
  // SAFETY: this retained UtilityBehaviorEvidence document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as UtilityBehaviorEvidence;

  return parsed;
};

export const readUtilityInstallation = async (file: string) => {
  // SAFETY: this retained UtilityInstallationEvidence document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as UtilityInstallationEvidence;

  return parsed;
};

export const readInstallationEvidence = async (file: string) => {
  // SAFETY: this retained InstallationEvidence document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as InstallationEvidence;

  return parsed;
};

export const readRepeatabilityEvidence = async (file: string) => {
  // SAFETY: this retained RepeatabilityEvidence document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as RepeatabilityEvidence;

  return parsed;
};

export const readGlyphProvenance = async (file: string) => {
  // SAFETY: this retained GlyphProvenance document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as GlyphProvenance;

  return parsed;
};

export const readGlyphObservation = async (file: string) => {
  // SAFETY: this retained GlyphObservationEvidence document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as GlyphObservationEvidence;

  return parsed;
};

export const readNativeGlyphCaptureManifest = async (file: string) => {
  // SAFETY: this retained NativeGlyphCaptureManifest document follows its authored producer; caller integrity checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as NativeGlyphCaptureManifest;

  return parsed;
};
