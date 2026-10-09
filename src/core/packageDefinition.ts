import fs from "node:fs";
import path from "node:path";

import {
    CanonicalArchitecture,
    PackageDefinition,
    PackageTransform
} from "../models/packageDefinition.js";

function requireString(
    value: unknown,
    field: string
): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(
            `Package definition field \"${field}\" must be a non-empty string.`
        );
    }

    return value.trim();
}

function optionalString(
    value: unknown,
    field: string
): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    return requireString(value, field);
}

function normalizePackagePath(
    value: unknown,
    field: string
): string {
    const raw =
        requireString(
            value,
            field
        );

    const normalized =
        raw
            .replace(/\\/g, "/")
            .replace(/^\/+/, "");

    const segments =
        normalized.split("/");

    if (
        !normalized ||
        path.posix.isAbsolute(normalized) ||
        segments.some(
            segment =>
                segment === ".." ||
                segment === "." ||
                segment === ""
        )
    ) {
        throw new Error(
            `Package definition field \"${field}\" must be a safe package-relative path.`
        );
    }

    return normalized;
}

function parseArchitecture(
    value: unknown
): CanonicalArchitecture {
    const architecture =
        requireString(
            value,
            "architecture"
        );

    if (architecture !== "x86_64") {
        throw new Error(
            `Unsupported package architecture: ${architecture}`
        );
    }

    return architecture;
}

function parseTransforms(
    value: unknown
): PackageTransform[] | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new Error(
            'Package definition field "transforms" must be an array.'
        );
    }

    return value.map(
        (item, index) => {
            if (
                typeof item !== "object" ||
                item === null ||
                Array.isArray(item)
            ) {
                throw new Error(
                    `Package transform at index ${index} must be an object.`
                );
            }

            const candidate =
                item as Record<string, unknown>;

            const type =
                requireString(
                    candidate.type,
                    `transforms[${index}].type`
                );

            if (type !== "elf-rpath") {
                throw new Error(
                    `Unsupported package transform type: ${type}`
                );
            }

            return {
                type: "elf-rpath",
                path: normalizePackagePath(
                    candidate.path,
                    `transforms[${index}].path`
                ),
                value: requireString(
                    candidate.value,
                    `transforms[${index}].value`
                )
            };
        }
    );
}

function parseConfigFiles(
    value: unknown
): string[] | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new Error(
            'Package definition field "configFiles" must be an array.'
        );
    }

    return value.map(
        (entry, index) =>
            normalizePackagePath(
                entry,
                `configFiles[${index}]`
            )
    );
}

function parseDependencies(
    value: unknown
): string[] | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new Error(
            'Package definition field "dependencies" must be an array.'
        );
    }

    return value.map((entry, index) => {
        if (typeof entry !== "string") {
            throw new Error(
                `Dependency at index ${index} must be a string.`
            );
        }

        const dependency = entry.trim();

        // Simple Debian-compatible package names with optional
        // version constraints.
        const pattern =
            /^[a-z0-9][a-z0-9+.-]*(?:\s+\((?:>=|<=|=|>>|<<)\s+[A-Za-z0-9.+:~_-]+\))?$/;

        if (!pattern.test(dependency)) {
            throw new Error(
                `Invalid dependency at index ${index}: ${entry}`
            );
        }

        return dependency;
    });
}

export function parsePackageDefinition(
    value: unknown
): PackageDefinition {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        throw new Error(
            "Package definition must be a JSON object."
        );
    }

    const document =
        value as Record<string, unknown>;

    if (
        document.schema !== undefined &&
        document.schema !== "embark/package/v1"
    ) {
        throw new Error(
            `Unsupported package definition schema: ${String(document.schema)}`
        );
    }

    const packageValue =
        document.package ?? document;

    if (
        typeof packageValue !== "object" ||
        packageValue === null ||
        Array.isArray(packageValue)
    ) {
        throw new Error(
            'Package definition field "package" must be an object.'
        );
    }

    const definition =
        packageValue as Record<string, unknown>;

    return {
        name: requireString(
            definition.name,
            "name"
        ),
        version: requireString(
            definition.version,
            "version"
        ),
        architecture: parseArchitecture(
            definition.architecture
        ),
        description: requireString(
            definition.description,
            "description"
        ),
        dependencies: parseDependencies(
            definition.dependencies
        ),
        maintainer: optionalString(
            definition.maintainer,
            "maintainer"
        ),
        license: optionalString(
            definition.license,
            "license"
        ),
        release: optionalString(
            definition.release,
            "release"
        ),
        configFiles: parseConfigFiles(
            definition.configFiles
        ),
        transforms: parseTransforms(
            definition.transforms
        )
    };
}

export function loadPackageDefinition(
    definitionPath: string
): PackageDefinition {
    const resolvedPath =
        path.resolve(
            definitionPath
        );

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(
            `Package definition does not exist: ${resolvedPath}`
        );
    }

    const contents =
        fs.readFileSync(
            resolvedPath,
            "utf-8"
        );

    let document: unknown;

    try {
        document = JSON.parse(contents);
    } catch (error) {
        throw new Error(
            `Package definition is not valid JSON: ${resolvedPath}`,
            {
                cause: error
            }
        );
    }

    return parsePackageDefinition(
        document
    );
}

export function validatePackageAgainstStagedRoot(
    stagedDirectory: string,
    definition: PackageDefinition
): void {
    const root =
        path.resolve(
            stagedDirectory
        );

    if (!fs.existsSync(root)) {
        throw new Error(
            `Staged filesystem does not exist: ${root}`
        );
    }

    if (!fs.statSync(root).isDirectory()) {
        throw new Error(
            `Staged filesystem is not a directory: ${root}`
        );
    }

    const requiredPaths = [
        ...(definition.configFiles ?? []),
        ...(definition.transforms ?? []).map(
            transform => transform.path
        )
    ];

    for (const relativePath of requiredPaths) {
        const candidate =
            path.resolve(
                root,
                relativePath
            );

        if (
            candidate !== root &&
            !candidate.startsWith(
                root + path.sep
            )
        ) {
            throw new Error(
                `Package path escapes staged root: ${relativePath}`
            );
        }

        if (!fs.existsSync(candidate)) {
            throw new Error(
                `Package declaration references a missing staged path: ${relativePath}`
            );
        }
    }
}

export function mapDebArchitecture(
    architecture: CanonicalArchitecture
): string {
    switch (architecture) {
        case "x86_64":
            return "amd64";
    }
}

export function mapRpmArchitecture(
    architecture: CanonicalArchitecture
): string {
    switch (architecture) {
        case "x86_64":
            return "x86_64";
    }
}
