export * from '@ppt/full-runs/run.mjs'
import {main} from '@ppt/full-runs/run.mjs'
main().catch(error=>{console.error(error.message);process.exitCode=1})
