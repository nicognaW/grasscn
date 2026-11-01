import { main } from "@ppt/selection/suite";

main(["list", ...process.argv.slice(2)]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
