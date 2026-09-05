import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
    PackageDefinition
} from "../models/packageDefinition.js";

export interface RpmPackagePlan {
    packageName: string;
    version: string;
    release: string;
    architecture: string;
}

export interface RpmMaterializeResult {
    buildRoot: string;
    topDirectory: string;
    specPath: string;
}

export function collectRpmFiles(
    stagedDirectory: string
): string[] {

    const files: string[] = [];

    function walk(
        currentDirectory: string
    ): void {

        const entries =
            fs.readdirSync(
                currentDirectory,
                {
                    withFileTypes: true
                }
            );

        for (const entry of entries) {

            const entryPath =
                path.join(
                    currentDirectory,
                    entry.name
                );

            if (entry.isDirectory()) {
                walk(entryPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const relativePath =
                path.relative(
                    stagedDirectory,
                    entryPath
                );

            files.push(
                "/" +
                relativePath
                    .split(path.sep)
                    .join("/")
            );
        }
    }

    walk(stagedDirectory);

    return files.sort();
}

export function materializeRpmBuildRoot(
    stagedDirectory: string,
    outputDirectory: string,
    plan: RpmPackagePlan
): RpmMaterializeResult {

    const topDirectory =
        path.join(
            outputDirectory,
            "rpmbuild"
        );

    const buildRoot =
        path.join(
            topDirectory,
            "BUILDROOT",
            `${plan.packageName}-${plan.version}-${plan.release}.${plan.architecture}`
        );

    const specsDirectory =
        path.join(
            topDirectory,
            "SPECS"
        );

    fs.rmSync(
        topDirectory,
        {
            recursive: true,
            force: true
        }
    );

    fs.mkdirSync(
        buildRoot,
        {
            recursive: true
        }
    );

    fs.mkdirSync(
        specsDirectory,
        {
            recursive: true
        }
    );

    fs.cpSync(
        stagedDirectory,
        buildRoot,
        {
            recursive: true
        }
    );

    const specPath =
        path.join(
            specsDirectory,
            `${plan.packageName}.spec`
        );

    return {
        buildRoot,
        topDirectory,
        specPath
    };
}

export function writeRpmSpec(
    specPath: string,
    plan: RpmPackagePlan,
    packageDefinition: PackageDefinition,
    files: string[]
): void {

    const fileList =
        files.join("\n");

    const spec = `
Name: ${plan.packageName}
Version: ${plan.version}
Release: ${plan.release}
Summary: ${packageDefinition.description}
License: ${packageDefinition.license ?? "Unspecified"}
BuildArch: ${plan.architecture}

%description
${packageDefinition.description}

%files
${fileList}
`;

    fs.writeFileSync(
        specPath,
        spec.trimStart()
    );
}

export function buildRpmPackage(
    topDirectory: string,
    specPath: string
): string {

    execFileSync(
        "rpmbuild",
        [
            "-bb",
            "--define",
            `_topdir ${topDirectory}`,
            specPath
        ],
        {
            stdio: "inherit"
        }
    );

    const rpmDirectory =
        path.join(
            topDirectory,
            "RPMS"
        );

    const packageFile =
        findFirstRpm(
            rpmDirectory
        );

    if (!packageFile) {
        throw new Error(
            "RPM build completed but no package artifact was found."
        );
    }

    return packageFile;
}

function findFirstRpm(
    directory: string
): string | null {

    if (!fs.existsSync(directory)) {
        return null;
    }

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        const entryPath =
            path.join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {

            const nested =
                findFirstRpm(
                    entryPath
                );

            if (nested) {
                return nested;
            }

            continue;
        }

        if (
            entry.isFile() &&
            entry.name.endsWith(".rpm")
        ) {
            return entryPath;
        }
    }

    return null;
}