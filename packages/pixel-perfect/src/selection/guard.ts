import { collectBrowserCases, assertBaseExecution } from "@ppt/selection/suite";

export default async function browserSelectionGuard() {
  const args = process.argv.slice(2);

  if (args[0] === "test") {
    args.shift();
  }

  // The child only lists; it does not execute global setup, start browsers, or
  // run cases. Retain effective CLI filters so --grep cannot widen the suite.
  const cases = collectBrowserCases(args, { effectiveSelection: true });

  if (process.env.GRASSCN_BROWSER_SCOPE === "full") {
    const { assertFullBrowserExecution } = await import("@ppt/full-runs/run");

    assertFullBrowserExecution(cases);
  } else {
    assertBaseExecution(cases);
  }
}
