import { main } from "@ppt/selection/suite";

main(["list", ...process.argv.slice(2)]).catch((error: unknown) => {
  // SAFETY: the owned command rejects with Error instances from its checks or Node APIs.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const failure = error as Error;

  console.error(failure.message);
  process.exitCode = 1;
});
