import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    collectRpmFiles,
    writeRpmSpec
} from "../core/rpmPackager.js";

import {
    PackageDefinition
} from "../models/packageDefinition.js";


test(
    "collects staged files without application-specific paths",
    () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "embark-rpm-"
                )
            );

        fs.mkdirSync(
            path.join(root, "usr/bin"),
            {
                recursive: true
            }
        );

        fs.writeFileSync(
            path.join(root, "usr/bin/example"),
            "example"
        );

        assert.deepEqual(
            collectRpmFiles(root),
            [
                "/usr/bin/example"
            ]
        );
    }
);


test(
    "marks declared RPM configuration files noreplace",
    () => {
        const directory =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "embark-spec-"
                )
            );

        const specPath =
            path.join(
                directory,
                "example.spec"
            );

        const definition: PackageDefinition = {
            name: "example",
            version: "1.0.0",
            architecture: "x86_64",
            description: "Example package",
            configFiles: [
                "etc/example/config.json"
            ]
        };

        writeRpmSpec(
            specPath,
            {
                packageName: "example",
                version: "1.0.0",
                release: "1",
                architecture: "x86_64"
            },
            definition,
            [
                "/etc/example/config.json",
                "/usr/bin/example"
            ]
        );

        const spec =
            fs.readFileSync(
                specPath,
                "utf-8"
            );

        assert.match(
            spec,
            /%config\(noreplace\) \/etc\/example\/config\.json/
        );

        assert.match(
            spec,
            /\/usr\/bin\/example/
        );
    }
);
