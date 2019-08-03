import * as yargs from "yargs"
import command from "./index"
export default function main(): void {
  yargs
    .strict()
    .command(
      "$0 <entry> [options]",
      "",
      yargs => {
        return yargs
          .positional("entry", { type: "string", default: '' })
          .option("output", { type: "string" });
      },
      args => {
        const { _, $0, entry, ...options } = args;
        command(entry, options);
      }
    )
    .help()
    .alias("help", "h").argv;
}
