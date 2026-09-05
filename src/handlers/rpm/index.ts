import {
    RpmPackagePlan,
    materializeRpmBuildRoot,
    writeRpmSpec,
    buildRpmPackage
} from "../../core/rpmPackager.js";

export interface RpmBuildOptions {
    stagedDirectory: string;
    outputDirectory: string;
}

export interface RpmBuildResult {
    packageFile: string;
    buildRoot: string;
    specPath: string;
}

export function buildRpmPackageHandler(
    options: RpmBuildOptions
): RpmBuildResult {

    const plan: RpmPackagePlan = {
        packageName: "vibrancy-nucleus",
        version: "1.0.0",
        release: "1",
        architecture: "x86_64"
    };

    const result =
        materializeRpmBuildRoot(
            options.stagedDirectory,
            options.outputDirectory,
            plan
        );

    writeRpmSpec(
        result.specPath,
        plan
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