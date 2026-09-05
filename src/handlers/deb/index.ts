import path from "node:path";

import {
    DebPackagePlan,
    materializeDebRoot,
    writeDebControl,
    buildDebPackage,
    patchElfRpath
} from "../../core/debPackager.js";

export interface DebBuildOptions {
    stagedDirectory: string;
    outputDirectory: string;
}

export interface DebBuildResult {
    controlPath: string;
    rootDirectory: string;
    packageFile: string;
}

export function buildDebPackageHandler(
    options: DebBuildOptions
): DebBuildResult {

    const plan: DebPackagePlan = {
        packageName: "vibrancy-nucleus",
        version: "1.0.0",
        architecture: "amd64"
    };

    const result =
        materializeDebRoot(
            options.stagedDirectory,
            options.outputDirectory,
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
            options.outputDirectory
        );

    return {
        controlPath,
        rootDirectory:
        result.rootDirectory,
        packageFile
    };
}