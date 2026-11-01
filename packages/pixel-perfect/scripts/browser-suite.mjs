export * from '@ppt/selection/suite.mjs'
import {main} from '@ppt/selection/suite.mjs'
main().catch(error=>{console.error(error.message);process.exitCode=1})
