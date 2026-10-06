import { Command } from "commander";
import path from "node:path";

import {
    loadPackageDefinition
} from "../core/packageDefinition.js";
import { loadCaptainPackageDefinition } from "../core/captainProject.js";

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
            "Legacy standalone Embark package definition"
        )
        .option(
            "--project <directory>",
            "Captain project directory; resolves the Captain-owned embark configuration"
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
                    "RPM Package Build"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
                );

                console.log(
                    `Package definition: ${resolvedPackage.source}`
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
