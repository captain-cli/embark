import { Command } from "commander";
import path from "node:path";

import {
    loadPackageDefinition
} from "../core/packageDefinition.js";

import {
    buildDebPackageHandler
} from "../handlers/deb/index.js";

export function registerDebCommand(
    program: Command
): void {
    const deb =
        program
            .command("deb")
            .description(
                "Build Debian package artifacts"
            );

    deb
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
            ".embark/deb"
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
                    "Debian Package Build"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
                );

                console.log(
                    `Package definition: ${path.resolve(options.package)}`
                );

                const result =
                    buildDebPackageHandler({
                        stagedDirectory,
                        outputDirectory,
                        package: packageDefinition
                    });

                console.log("");

                console.log(
                    `Control file: ${result.controlPath}`
                );

                console.log(
                    `Package root: ${result.rootDirectory}`
                );

                console.log("");

                console.log(
                    `Debian package: ${result.packageFile}`
                );

                console.log("");

                console.log(
                    "Build result: succeeded"
                );
            }
        );
}
