import {collectBrowserCases, assertBaseExecution} from './browser-suite.mjs'

export default function browserSelectionGuard() {
  const args = process.argv.slice(2)
  if (args[0] === 'test') args.shift()
  // The child only lists; it does not execute global setup, start browsers, or
  // run cases. Retain effective CLI filters so --grep cannot widen the suite.
  assertBaseExecution(collectBrowserCases(args, {effectiveSelection: true}))
}
