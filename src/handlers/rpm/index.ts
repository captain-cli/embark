import {
    RpmPackagePlan,
    materializeRpmBuildRoot,
    writeRpmSpec,
    buildRpmPackage,
    collectRpmFiles
} from "../../core/rpmPackager.js";

import {
    mapRpmArchitecture,
    validatePackageAgainstStagedRoot
} from "../../core/packageDefinition.js";

import {
    applyPackageTransforms
} from "../../core/packageTransforms.js";

import {
    PackageDefinition
} from "../../models/packageDefinition.js";

export interface RpmBuildResult {
    packageFile: string;
    buildRoot: string;
    specPath: string;
}

export interface RpmBuildOptions {
    stagedDirectory: string;
    outputDirectory: string;
    package: PackageDefinition;
}

export function buildRpmPackageHandler(
    options: RpmBuildOptions
): RpmBuildResult {
    validatePackageAgainstStagedRoot(
        options.stagedDirectory,
        options.package
    );

    const plan: RpmPackagePlan = {
        packageName: options.package.name,
        version: options.package.version,
        release: options.package.release ?? "1",
        architecture:
            mapRpmArchitecture(
                options.package.architecture
            )
    };

    const result =
        materializeRpmBuildRoot(
            options.stagedDirectory,
            options.outputDirectory,
            plan
        );

    applyPackageTransforms(
        result.buildRoot,
        options.package.transforms
    );

    const files =
        collectRpmFiles(
            result.buildRoot
        );

    writeRpmSpec(
        result.specPath,
        plan,
        options.package,
        files
    );

    const packageFile =
        buildRpmPackage(
            result.topDirectory,
            result.specPath
        );

    return {
        packageFile,
        buildRoot: result.buildRoot,
        specPath: result.specPath
    };
}
