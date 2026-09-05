import { Command } from "commander";
import path from "node:path";

import {
    loadPackageDefinition
} from "../core/packageDefinition.js";

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
            "--package <path>",
            "Embark package definition",
            "embark.package.json"
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
                    package: string;
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

                const packageDefinition =
                    loadPackageDefinition(
                        options.package
                    );

                console.log(
                    "RPM Package Build"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
                );

                console.log(
                    `Package definition: ${path.resolve(options.package)}`
                );

                const result =
                    buildRpmPackageHandler({
                        stagedDirectory,
                        outputDirectory,
                        package: packageDefinition
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
