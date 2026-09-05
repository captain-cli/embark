import { Command } from "commander";
import path from "node:path";

import {
    buildDebPackageHandler
} from "../handlers/deb/index.js";

import {
    PackageDefinition
} from "../models/packageDefinition.js";

export function registerDebCommand(
    program: Command
): void {

    const packageDefinition: PackageDefinition = {
        name: "vibrancy-nucleus",
        version: "1.0.0",
        architecture: "amd64",
        description: "Vibrancy Nucleus native audio engine",
        maintainer: "Captain CLI",
        license: "Proprietary"
    };

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
            "--output <path>",
            "Embark output directory",
            ".embark/deb"
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
                    "Debian Package Build"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
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
                    "Package result: succeeded"
                );

                console.log("");

                console.log(
                    "Build result: succeeded"
                );
            }
        );
}