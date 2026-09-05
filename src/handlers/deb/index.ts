import path from "node:path";

import {
    DebPackagePlan,
    materializeDebRoot,
    writeDebControl,
    buildDebPackage,
    patchElfRpath
} from "../../core/debPackager.js";

import {
    PackageDefinition
} from "../../models/packageDefinition.js";

export interface DebBuildOptions {
    stagedDirectory: string;
    outputDirectory: string;
    package: PackageDefinition;
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
        packageName: options.package.name,
        version: options.package.version,
        architecture: options.package.architecture
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
                packageName: options.package.name,
                version: options.package.version,
                architecture: options.package.architecture,
                maintainer:
                    options.package.maintainer ??
                    "Captain CLI",
                description:
                options.package.description
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
        rootDirectory: result.rootDirectory,
        packageFile
    };
}