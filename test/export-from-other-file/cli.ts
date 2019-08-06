import * as yargs from "yargs";
import command from "./";
import { E } from './enum'

export default function main(): void {
  yargs
    .strict()
    .command(
      "$0 <foo> [options]",
      "",
      yargs => {
        return yargs
          .positional("foo", { choices: [E.A] })
          .option("bar", { type: "string" });
      },
      args => {
        const { _, $0, foo, ...options } = args;
        if (undefined === foo) throw new TypeError("Argument foo was required");
        command(foo, options);
      }
    )
    .help()
    .alias("help", "h")
    .version().argv;
}
