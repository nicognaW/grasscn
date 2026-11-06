import type { TestResult } from "@playwright/test/reporter";

/** Source identities written by the checkpoint reporter, including legacy v2 receipts. */
export interface CheckpointSource {
  file: string;
  sha256: string;
}

export interface CheckpointDeclaration {
  definitionFile?: string;
  definitionSha256?: string;
  file?: string;
  id: string;
  line?: number;
  sourceFiles?: CheckpointSource[];
  sourceSha256: string;
  title?: string[];
}

export interface CheckpointCatalogue {
  rootDir: string;
  schemaVersion: 2 | 3;
  sourceRoot?: string;
  tests: CheckpointDeclaration[];
}

export interface VerificationArtifact {
  decodedRgbaSha256?: string;
  file: string;
  height?: number;
  pngSha256: string;
  width?: number;
}

/** Attachment produced by the general verification fixture and consumed unchanged. */
export interface BrowserVerification {
  artifacts: VerificationArtifact[];
  bundleSha256?: string;
  fixtureUrl?: string;
  outputDirectory: string;
  previewUrl?: string;
  renderedUrl?: string;
  subjectElement?: string;
  subjectSlot?: string | null;
  testId?: string;
  titlePath?: string[];
}

export interface CheckpointResult extends CheckpointDeclaration {
  expectedStatus: string;
  file?: string;
  retry: number;
  sourceChanged?: boolean;
  status: TestResult["status"];
  title?: string[];
  verification?: BrowserVerification;
}

export interface CheckpointCandidate {
  filename: string;
  report: { startedAt?: string };
}

export interface ReusableBrowserTest {
  from: string;
  id: string;
  line: string;
  verification?: BrowserVerification;
}
