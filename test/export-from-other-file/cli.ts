import * as yargs from "yargs";
import command from "./";
export default function main(): void {
  yargs
    .strict()
    .command(
      "$0 [options]",
      "",
      yargs => {
        return yargs.option("foo", { type: "string" });
      },
      args => {
        const { _, $0, ...options } = args;
        command(options);
      }
    )
    .help()
    .alias("help", "h")
    .version().argv;
}
