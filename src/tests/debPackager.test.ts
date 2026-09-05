import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
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
