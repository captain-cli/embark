import { Command } from "commander";
import path from "node:path";

import {
    DebPackagePlan,
    materializeDebRoot,
    writeDebControl,
    buildDebPackage,
    patchElfRpath
} from "../core/debPackager.js";

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

                const plan: DebPackagePlan = {
                    packageName:
                        "vibrancy-nucleus",
                    version:
                        "1.0.0",
                    architecture:
                        "amd64"
                };

                console.log(
                    "Debian Package Stage"
                );

                console.log("");

                console.log(
                    `Staged filesystem: ${stagedDirectory}`
                );

                const result =
                    materializeDebRoot(
                        stagedDirectory,
                        outputDirectory,
                        plan
                    );

                const controlPath =
                    writeDebControl(
                        result.rootDirectory,
                        {
                            packageName:
                            plan.packageName,
                            version:
                            plan.version,
                            architecture:
                            plan.architecture,
                            maintainer:
                                "Captain CLI",
                            description:
                                "Vibrancy Nucleus native audio engine"
                        }
                    );

                const stagedBinary =
                    path.join(
                        result.rootDirectory,
                        "usr/bin/vibrancy"
                    );

                patchElfRpath(
                    stagedBinary,
                    "$ORIGIN/../lib/vibrancy"
                );

                const packageFile =
                    buildDebPackage(
                        result.rootDirectory,
                        outputDirectory
                    );

                console.log("");

                console.log(
                    `Control file: ${controlPath}`
                );

                console.log(
                    `Package root: ${result.rootDirectory}`
                );

                console.log("");
                console.log(
                    `Debian package: ${packageFile}`
                );

                console.log("");
                console.log(
                    "Package result: succeeded"
                );

                console.log("");

                console.log(
                    "Stage result: succeeded"
                );
            }
        );
}