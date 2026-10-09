import assert from "node:assert/strict";
import test from "node:test";

import {
    mapDebArchitecture,
    mapRpmArchitecture,
    parsePackageDefinition
} from "../core/packageDefinition.js";


test(
    "parses a generic package definition",
    () => {
        const definition =
            parsePackageDefinition({
                package: {
                    name: "example",
                    version: "1.2.3",
                    architecture: "x86_64",
                    description: "Example package",
                    configFiles: [
                        "etc/example/config.json"
                    ],
                    transforms: [
                        {
                            type: "elf-rpath",
                            path: "usr/bin/example",
                            value: "$ORIGIN/../lib/example"
                        }
                    ]
                }
            });

        assert.equal(
            definition.name,
            "example"
        );

        assert.equal(
            definition.architecture,
            "x86_64"
        );

        assert.deepEqual(
            definition.configFiles,
            [
                "etc/example/config.json"
            ]
        );

        assert.equal(
            definition.transforms?.[0].type,
            "elf-rpath"
        );
    }
);


test(
    "maps canonical architecture per package backend",
    () => {
        assert.equal(
            mapDebArchitecture("x86_64"),
            "amd64"
        );

        assert.equal(
            mapRpmArchitecture("x86_64"),
            "x86_64"
        );
    }
);


test(
    "rejects transform paths that escape the package root",
    () => {
        assert.throws(
            () =>
                parsePackageDefinition({
                    name: "example",
                    version: "1.0.0",
                    architecture: "x86_64",
                    description: "Example",
                    transforms: [
                        {
                            type: "elf-rpath",
                            path: "../../tmp/example",
                            value: "$ORIGIN"
                        }
                    ]
                }),
            /safe package-relative path/
        );
    }
);


test(
    "rejects unsupported package definition schemas",
    () => {
        assert.throws(
            () =>
                parsePackageDefinition({
                    schema: "embark/package/v99",
                    package: {
                        name: "example",
                        version: "1.0.0",
                        architecture: "x86_64",
                        description: "Example"
                    }
                }),
            /Unsupported package definition schema/
        );
    }
);

test(
    "parses package dependencies",
    () => {
        const definition = parsePackageDefinition({
            name: "example",
            version: "1.0.0",
            architecture: "x86_64",
            description: "Example",
            dependencies: [
                "libc6 (>= 2.34)",
                "libstdc++6"
            ]
        });

        assert.deepEqual(
            definition.dependencies,
            [
                "libc6 (>= 2.34)",
                "libstdc++6"
            ]
        );
    }
);

test(
    "rejects invalid package dependencies",
    () => {
        const base = {
            name: "example",
            version: "1.0.0",
            architecture: "x86_64",
            description: "Example"
        };

        for (const dependencies of [
            "libc6",
            [""],
            ["libc6\nMaintainer: injected"],
            [123],
            ["libc6 (>= )"]
        ]) {
            assert.throws(
                () => parsePackageDefinition({
                    ...base,
                    dependencies
                }),
                /dependenc/i
            );
        }
    }
);
