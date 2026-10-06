import { Command } from "commander";
import path from "node:path";

import {
    loadPackageDefinition
} from "../core/packageDefinition.js";
import { loadCaptainPackageDefinition } from "../core/captainProject.js";

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
            "Legacy standalone Embark package definition"
        )
        .option(
            "--project <directory>",
            "Captain project directory; resolves the Captain-owned embark configuration"
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
                    package?: string;
                    project?: string;
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

                if (options.project && options.package) {
                    throw new Error("Use either --project or --package, not both.");
                }

                const resolvedPackage = options.project
                    ? loadCaptainPackageDefinition(options.project)
                    : {
                        package: loadPackageDefinition(options.package ?? "embark.package.json"),
                        source: path.resolve(options.package ?? "embark.package.json")
                    };

                const packageDefinition = resolvedPackage.package;

                console.log(
                    "Debian Package Build"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
                );

                console.log(
                    `Package definition: ${resolvedPackage.source}`
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
