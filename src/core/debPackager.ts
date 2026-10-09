import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface DebPackagePlan {
    packageName: string;
    version: string;
    architecture: string;
}

export interface DebMaterializeResult {
    rootDirectory: string;
}

export interface DebControlMetadata {
    packageName: string;
    version: string;
    architecture: string;
    maintainer: string;
    description: string;
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
            recursive: true,
            mode: 0o755
        }
    );

    // dpkg-deb requires DEBIAN to have ordinary directory permissions.
    // Explicit chmod is necessary because mkdir mode does not alter an
    // existing directory and parent directories may carry setgid.
    fs.chmodSync(
        debianDirectory,
        0o755
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

export function writeDebConffiles(
    packageRoot: string,
    configFiles: readonly string[]
): string | null {
    if (configFiles.length === 0) {
        return null;
    }

    const debianDirectory =
        path.join(
            packageRoot,
            "DEBIAN"
        );

    fs.mkdirSync(
        debianDirectory,
        {
            recursive: true,
            mode: 0o755
        }
    );

    // dpkg-deb requires DEBIAN to have ordinary directory permissions.
    // Explicit chmod is necessary because mkdir mode does not alter an
    // existing directory and parent directories may carry setgid.
    fs.chmodSync(
        debianDirectory,
        0o755
    );

    const conffilesPath =
        path.join(
            debianDirectory,
            "conffiles"
        );

    const contents =
        configFiles
            .map(
                file =>
                    `/${file.replace(/^\/+/, "")}`
            )
            .join("\n") + "\n";

    fs.writeFileSync(
        conffilesPath,
        contents,
        {
            mode: 0o644
        }
    );

    return conffilesPath;
}

export function materializeDebRoot(
    stagedDirectory: string,
    outputDirectory: string,
    plan: DebPackagePlan
): DebMaterializeResult {
    const packageRoot =
        path.resolve(
            outputDirectory,
            `${plan.packageName}_${plan.version}_${plan.architecture}`
        );

    if (!fs.existsSync(stagedDirectory)) {
        throw new Error(
            `Staged filesystem does not exist: ${stagedDirectory}`
        );
    }

    if (!fs.statSync(stagedDirectory).isDirectory()) {
        throw new Error(
            `Staged filesystem is not a directory: ${stagedDirectory}`
        );
    }

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

    fs.cpSync(
        stagedDirectory,
        packageRoot,
        {
            recursive: true
        }
    );

    function restoreDirectoryModes(
        source: string,
        destination: string
    ): void {
        const sourceMode =
            fs.statSync(source).mode & 0o7777;

        fs.chmodSync(destination, sourceMode);

        for (const entry of fs.readdirSync(source, {
            withFileTypes: true
        })) {
            if (!entry.isDirectory()) {
                continue;
            }

            restoreDirectoryModes(
                path.join(source, entry.name),
                path.join(destination, entry.name)
            );
        }
    }

    restoreDirectoryModes(
        stagedDirectory,
        packageRoot
    );

    return {
        rootDirectory: packageRoot
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
