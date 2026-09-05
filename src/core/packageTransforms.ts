import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
    PackageTransform
} from "../models/packageDefinition.js";

function resolveInsidePackageRoot(
    packageRoot: string,
    relativePath: string
): string {
    const root =
        path.resolve(
            packageRoot
        );

    const resolved =
        path.resolve(
            root,
            relativePath
        );

    if (
        resolved !== root &&
        !resolved.startsWith(
            root + path.sep
        )
    ) {
        throw new Error(
            `Package transform path escapes package root: ${relativePath}`
        );
    }

    return resolved;
}

function patchElfRpath(
    binaryPath: string,
    rpath: string
): void {
    if (!fs.existsSync(binaryPath)) {
        throw new Error(
            `ELF transform target does not exist: ${binaryPath}`
        );
    }

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

export function applyPackageTransforms(
    packageRoot: string,
    transforms: readonly PackageTransform[] = []
): void {
    for (const transform of transforms) {
        switch (transform.type) {
            case "elf-rpath": {
                const targetPath =
                    resolveInsidePackageRoot(
                        packageRoot,
                        transform.path
                    );

                patchElfRpath(
                    targetPath,
                    transform.value
                );

                break;
            }
        }
    }
}
