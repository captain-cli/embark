import {
    RpmPackagePlan,
    materializeRpmBuildRoot,
    writeRpmSpec,
    buildRpmPackage,
    collectRpmFiles
} from "../../core/rpmPackager.js";

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

    const plan: RpmPackagePlan = {
        packageName: options.package.name,
        version: options.package.version,
        release: options.package.release ?? "1",
        architecture: options.package.architecture
    };

    const result =
        materializeRpmBuildRoot(
            options.stagedDirectory,
            options.outputDirectory,
            plan
        );

    const files =
        collectRpmFiles(
            options.stagedDirectory
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
        buildRoot:
        result.buildRoot,
        specPath:
        result.specPath
    };
}