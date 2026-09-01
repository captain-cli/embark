import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface DebPackageMapping {
    source: string;
    destination: string;
}

export interface DebPackagePlan {
    packageName: string;
    version: string;
    architecture: string;
    mappings: DebPackageMapping[];
}

export interface DebMaterializeResult {
    rootDirectory: string;
    copied: DebPackageMapping[];
}

export interface DebControlMetadata {
    packageName: string;
    version: string;
    architecture: string;
    maintainer: string;
    description: string;
}

function ensureInsideRoot(
    rootDirectory: string,
    destination: string
): string {
    const relativeDestination =
        destination.replace(/^\/+/, "");

    const resolved =
        path.resolve(
            rootDirectory,
            relativeDestination
        );

    const resolvedRoot =
        path.resolve(
            rootDirectory
        );

    if (
        resolved !== resolvedRoot &&
        !resolved.startsWith(
            resolvedRoot + path.sep
        )
    ) {
        throw new Error(
            `Destination escapes package root: ${destination}`
        );
    }

    return resolved;
}

export function writeDebControl(
    packageRoot: string,
    metadata: DebControlMetadata
): string {
    const debianDirectory =
        path.join(
            packageRoot,
            "DEBIAN"
        );

    fs.mkdirSync(
        debianDirectory,
        {
            recursive: true
        }
    );

    const controlPath =
        path.join(
            debianDirectory,
            "control"
        );

    const contents = [
        `Package: ${metadata.packageName}`,
        `Version: ${metadata.version}`,
        `Architecture: ${metadata.architecture}`,
        `Maintainer: ${metadata.maintainer}`,
        `Description: ${metadata.description}`,
        ""
    ].join("\n");

    fs.writeFileSync(
        controlPath,
        contents,
        {
            mode: 0o644
        }
    );

    return controlPath;
}

export function materializeDebRoot(
    artifactDirectory: string,
    outputDirectory: string,
    plan: DebPackagePlan
): DebMaterializeResult {
    const packageRoot =
        path.resolve(
            outputDirectory,
            `${plan.packageName}_${plan.version}_${plan.architecture}`
        );

    fs.rmSync(
        packageRoot,
        {
            recursive: true,
            force: true
        }
    );

    fs.mkdirSync(
        packageRoot,
        {
            recursive: true
        }
    );

    const copied: DebPackageMapping[] =
        [];

    for (
        const mapping
        of plan.mappings
        ) {
        const sourcePath =
            path.resolve(
                artifactDirectory,
                mapping.source
            );

        if (
            !fs.existsSync(
                sourcePath
            )
        ) {
            throw new Error(
                `Missing artifact entry: ${mapping.source}`
            );
        }

        const destinationPath =
            ensureInsideRoot(
                packageRoot,
                mapping.destination
            );

        const sourceStats =
            fs.statSync(
                sourcePath
            );

        if (
            sourceStats.isDirectory()
        ) {
            fs.mkdirSync(
                destinationPath,
                {
                    recursive: true
                }
            );

            fs.cpSync(
                sourcePath,
                destinationPath,
                {
                    recursive: true
                }
            );
        } else {
            fs.mkdirSync(
                path.dirname(
                    destinationPath
                ),
                {
                    recursive: true
                }
            );

            fs.copyFileSync(
                sourcePath,
                destinationPath
            );
        }

        copied.push(
            mapping
        );
    }

    return {
        rootDirectory:
        packageRoot,
        copied
    };
}

export function buildDebPackage(
    packageRoot: string,
    outputDirectory: string
): string {
    fs.mkdirSync(
        outputDirectory,
        {
            recursive: true
        }
    );

    const packageFile =
        path.join(
            outputDirectory,
            `${path.basename(packageRoot)}.deb`
        );

    const result =
        spawnSync(
            "dpkg-deb",
            [
                "--root-owner-group",
                "--build",
                packageRoot,
                packageFile
            ],
            {
                stdio: "inherit"
            }
        );

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `dpkg-deb failed with exit code ${result.status}`
        );
    }

    if (!fs.existsSync(packageFile)) {
        throw new Error(
            `Debian package was not created: ${packageFile}`
        );
    }

    return packageFile;
}

export function patchElfRpath(
    binaryPath: string,
    rpath: string
): void {
    const result =
        spawnSync(
            "patchelf",
            [
                "--set-rpath",
                rpath,
                binaryPath
            ],
            {
                stdio: "inherit"
            }
        );

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `patchelf failed with exit code ${result.status}`
        );
    }
}