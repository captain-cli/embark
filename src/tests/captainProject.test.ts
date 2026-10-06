import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadCaptainPackageDefinition } from "../core/captainProject.js";

function fixture(split: boolean): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "embark-captain-"));
    const config = {
        package: {
            name: "sample",
            version: "1.0.0",
            architecture: "x86_64",
            description: "sample package"
        }
    };
    const manifest: Record<string, unknown> = {
        schema: "captain/manifest/v1",
        project: { name: "sample", type: "native", version: "1.0.0" },
    };
    if (split) {
        fs.mkdirSync(path.join(root, "manifests"));
        manifest.manifests = { embark: "manifests/embark.json" };
        fs.writeFileSync(path.join(root, "manifests", "embark.json"), JSON.stringify({
            schema: "captain/tool-manifest/v1", tool: "embark", config
        }));
    } else {
        manifest.embark = config;
    }
    fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest));
    return root;
}

for (const split of [false, true]) {
    test(`loads ${split ? "split" : "inline"} Captain-owned Embark configuration`, () => {
        const root = fixture(split);
        const prior = process.env.CAPTAIN_CORE_COMMAND;
        process.env.CAPTAIN_CORE_COMMAND = JSON.stringify([
            "python3", "-m", "captain_core"
        ]);
        try {
            const result = loadCaptainPackageDefinition(root);
            assert.equal(result.package.name, "sample");
            assert.equal(result.package.architecture, "x86_64");
        } finally {
            if (prior === undefined) delete process.env.CAPTAIN_CORE_COMMAND;
            else process.env.CAPTAIN_CORE_COMMAND = prior;
        }
    });
}

test("discovers a sibling captain-core source checkout for development", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "embark-core-discovery-"));
    const embarkRoot = path.join(temp, "embark");
    const coreSource = path.join(temp, "captain-core", "src");
    fs.mkdirSync(path.join(coreSource, "captain_core"), { recursive: true });
    fs.mkdirSync(embarkRoot, { recursive: true });
    fs.writeFileSync(path.join(coreSource, "captain_core", "__init__.py"), "");

    const { resolveCaptainCorePythonPath } = await import("../core/captainProject.js");
    assert.equal(resolveCaptainCorePythonPath(embarkRoot), coreSource);
});

test("CAPTAIN_CORE_PYTHONPATH overrides sibling discovery", async () => {
    const explicit = fs.mkdtempSync(path.join(os.tmpdir(), "embark-explicit-core-"));
    const prior = process.env.CAPTAIN_CORE_PYTHONPATH;
    process.env.CAPTAIN_CORE_PYTHONPATH = explicit;
    try {
        const { resolveCaptainCorePythonPath } = await import("../core/captainProject.js");
        assert.equal(resolveCaptainCorePythonPath("/does/not/matter"), explicit);
    } finally {
        if (prior === undefined) delete process.env.CAPTAIN_CORE_PYTHONPATH;
        else process.env.CAPTAIN_CORE_PYTHONPATH = prior;
    }
});
