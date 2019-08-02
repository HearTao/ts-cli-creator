import * as yargs from "yargs";
import command, { Options } from "./index";
export default function main(): void {
  (yargs as yargs.Argv<Options>)
    .strict()
    .command(
      "$0 <entry>",
      "",
      yargs => {
        return yargs
          .positional("entry", { type: "string" })
          .option("output", { type: "string" });
      },
      args => {
        const {
          _: [entry],
          $0,
          ...options
        } = args;
        command(entry, options);
      }
    )
    .help()
    .alias("help", "h").argv;
}
