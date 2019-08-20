import * as yargs from "yargs";
import main from "./index";
import * as getStdin from 'get-stdin';
export default async function cli(args: string[] = process.argv.slice(2)): Promise<void> {
  let stdin = (await getStdin()).trim()
  if('' !== stdin) {
    yargs
    .strict()
    .command(
      "$0 [entry] [...options]",
      "Yet another cli generator based TypeScript code",
      yargs => {
        return yargs
          .positional("entry", { type: "string", description: "entry file" })
          .option("output", {
            type: "string",
            description: "Output file path, output to stdout when not set",
            alias: "o"
          })
          .option("force", {
            type: "boolean",
            description:
              "Force override output file content when file already exists, request Y/n when not set"
          })
          .option("json", { type: "boolean", description: "Output json data" })
          .option("color", {
            type: "boolean",
            description: "Colourful output with write to stdout"
          })
          .option("verbose", {
            type: "boolean",
            description: "Output full infomations"
          })
          .option("functionName", {
            type: "string",
            description: "Generate Wrapper function name, default to 'cli'"
          })
          .option("asyncFunction", {
            type: "boolean",
            description: "Use async function, default to true"
          })
          .option("strict", {
            type: "boolean",
            description: "Enable strict mode, default true"
          })
          .option("help", {
            type: "boolean",
            description: "Enable --help opiotn, default true"
          })
          .option("helpAlias", {
            type: "boolean",
            description: "Enable -h alias for helper, default true"
          })
          .option("version", {
            type: "boolean",
            description: "Enable --version option, default true"
          });
      },
      args => {
        const { _, $0, entry, ...options } = args;
        main.__CLICONTEXT__ = { stdin: undefined === entry }
        main(entry || stdin, options);
      }
    )
    .help()
    .alias("help", "h")
    .version()
    .parse(args)
  } else {
    yargs
      .strict()
      .command(
        "$0 <entry> [...options]",
        "Yet another cli generator based TypeScript code",
        yargs => {
          return yargs
            .positional("entry", { type: "string", description: "entry file", demandOption: "true" })
            .option("output", {
              type: "string",
              description: "Output file path, output to stdout when not set",
              alias: "o"
            })
            .option("force", {
              type: "boolean",
              description:
                "Force override output file content when file already exists, request Y/n when not set"
            })
            .option("json", { type: "boolean", description: "Output json data" })
            .option("color", {
              type: "boolean",
              description: "Colourful output with write to stdout"
            })
            .option("verbose", {
              type: "boolean",
              description: "Output full infomations"
            })
            .option("functionName", {
              type: "string",
              description: "Generate Wrapper function name, default to 'cli'"
            })
            .option("asyncFunction", {
              type: "boolean",
              description: "Use async function, default to true"
            })
            .option("strict", {
              type: "boolean",
              description: "Enable strict mode, default true"
            })
            .option("help", {
              type: "boolean",
              description: "Enable --help opiotn, default true"
            })
            .option("helpAlias", {
              type: "boolean",
              description: "Enable -h alias for helper, default true"
            })
            .option("version", {
              type: "boolean",
              description: "Enable --version option, default true"
            });
        },
        args => {
          const { _, $0, entry, ...options } = args;
          main(entry, options);
        }
      )
      .help()
      .alias("help", "h")
      .version()
      .parse(args)
  }
}
