import { Command } from "commander";
import path from "node:path";

import {
    buildRpmPackageHandler
} from "../handlers/rpm/index.js";

export function registerRpmCommand(
    program: Command
): void {

    const rpm =
        program
            .command("rpm")
            .description(
                "Build RPM package artifacts"
            );

    rpm
        .command("build")
        .requiredOption(
            "--staged <path>",
            "Staged filesystem root"
        )
        .option(
            "--output <path>",
            "Embark output directory",
            ".embark/rpm"
        )
        .action(
            (
                options: {
                    staged: string;
                    output: string;
                }
            ) => {

                const stagedDirectory =
                    path.resolve(
                        options.staged
                    );

                const outputDirectory =
                    path.resolve(
                        options.output
                    );

                console.log(
                    "RPM Package Build"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
                );

                const result =
                    buildRpmPackageHandler({
                        stagedDirectory,
                        outputDirectory
                    });

                console.log("");

                console.log(
                    `RPM package: ${result.packageFile}`
                );

                console.log("");

                console.log(
                    "Build result: succeeded"
                );
            }
        );
}