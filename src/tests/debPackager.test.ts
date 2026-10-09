import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    materializeDebRoot,
    writeDebConffiles,
    writeDebControl
} from "../core/debPackager.js";


test(
    "writes Debian control metadata generically",
    () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "embark-deb-"
                )
            );

        const controlPath =
            writeDebControl(
                root,
                {
                    packageName: "example",
                    version: "1.0.0",
                    architecture: "amd64",
                    maintainer: "Captain CLI",
                    description: "Example package"
                }
            );

        const contents =
            fs.readFileSync(
                controlPath,
                "utf-8"
            );

        assert.match(
            contents,
            /Package: example/
        );

        assert.match(
            contents,
            /Architecture: amd64/
        );
    }
);


test(
    "writes Debian conffiles from canonical config declarations",
    () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "embark-conffiles-"
                )
            );

        const conffilesPath =
            writeDebConffiles(
                root,
                [
                    "etc/example/config.json"
                ]
            );

        assert.ok(conffilesPath);

        assert.equal(
            fs.readFileSync(
                conffilesPath,
                "utf-8"
            ),
            "/etc/example/config.json\n"
        );
    }
);

test(
    "normalizes Debian control directory permissions when setgid is inherited",
    () => {
        const root =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "embark-deb-mode-"
                )
            );

        const debianDirectory =
            path.join(
                root,
                "DEBIAN"
            );

        /*
         * Reproduce a package tree created beneath a setgid workspace.
         * dpkg-deb rejects DEBIAN directories carrying the setgid bit.
         */
        fs.mkdirSync(
            debianDirectory,
            {
                mode: 0o775
            }
        );

        fs.chmodSync(
            debianDirectory,
            0o2775
        );

        assert.equal(
            fs.statSync(debianDirectory).mode & 0o7777,
            0o2775
        );

        writeDebControl(
            root,
            {
                packageName: "example",
                version: "1.0.0",
                architecture: "amd64",
                maintainer: "Captain CLI",
                description: "Permission normalization test"
            }
        );

        assert.equal(
            fs.statSync(debianDirectory).mode & 0o7777,
            0o755
        );
    }
);

test(
    "preserves staged directory permissions in Debian payload",
    () => {
        const workspace = fs.mkdtempSync(
            path.join(os.tmpdir(), "embark-payload-mode-")
        );

        try {
            const staged = path.join(workspace, "staged");
            const nested = path.join(staged, "usr/lib/example");

            fs.mkdirSync(nested, { recursive: true });

            fs.chmodSync(staged, 0o755);
            fs.chmodSync(path.join(staged, "usr"), 0o755);
            fs.chmodSync(path.join(staged, "usr/lib"), 0o755);
            fs.chmodSync(nested, 0o750);

            fs.writeFileSync(
                path.join(nested, "example.so"),
                "test"
            );

            const result = materializeDebRoot(
                staged,
                path.join(workspace, "packages"),
                {
                    packageName: "example",
                    version: "1.0.0",
                    architecture: "amd64"
                }
            );

            for (const relative of [".", "usr", "usr/lib"]) {
                const destination = path.join(
                    result.rootDirectory,
                    relative
                );

                assert.equal(
                    fs.statSync(destination).mode & 0o7777,
                    0o755,
                    relative
                );
            }

            assert.equal(
                fs.statSync(
                    path.join(result.rootDirectory, "usr/lib/example")
                ).mode & 0o7777,
                0o750
            );
        } finally {
            fs.rmSync(workspace, {
                recursive: true,
                force: true
            });
        }
    }
);
