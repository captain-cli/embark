import {
    DebPackagePlan,
    materializeDebRoot,
    writeDebControl,
    writeDebConffiles,
    buildDebPackage
} from "../../core/debPackager.js";

import {
    mapDebArchitecture,
    validatePackageAgainstStagedRoot
} from "../../core/packageDefinition.js";

import {
    applyPackageTransforms
} from "../../core/packageTransforms.js";

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
    validatePackageAgainstStagedRoot(
        options.stagedDirectory,
        options.package
    );

    const architecture =
        mapDebArchitecture(
            options.package.architecture
        );

    const plan: DebPackagePlan = {
        packageName: options.package.name,
        version: options.package.version,
        architecture
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
                architecture,
                maintainer:
                    options.package.maintainer ??
                    "Captain CLI",
                description:
                    options.package.description
            }
        );

    writeDebConffiles(
        result.rootDirectory,
        options.package.configFiles ?? []
    );

    applyPackageTransforms(
        result.rootDirectory,
        options.package.transforms
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
