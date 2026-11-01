export interface BrowserCase {
  file: string;
  titlePath: string[];
  package: string;
  projectName: string;
  id?: string;
}
export interface BaseCase {
  file: string;
  title: string;
  titlePath: string[];
  components: string[];
  evidence: { kind: string; reason: string; route?: string; url?: string; upstreamTest?: string };
}
export declare const browserRoot: string;
export declare const caseKey: (test: Pick<BrowserCase, "file" | "titlePath">) => string;
export declare const baseCatalogue: () => BaseCase[];
export declare const baseGrep: () => RegExp;
export declare const collectBrowserCases: (args?: string[], options?: { effectiveSelection?: boolean }) => BrowserCase[];
export declare const classifyBrowserCases: (cases: BrowserCase[]) => {base: BrowserCase[]; full: BrowserCase[]; evidence: Map<string, BaseCase>};
export declare const assertBaseExecution: (cases: BrowserCase[]) => void;
export declare const flattenBrowserReport: (report: import("@playwright/test/reporter").JSONReport) => BrowserCase[];
export declare const main: (args?: string[]) => Promise<void>;
