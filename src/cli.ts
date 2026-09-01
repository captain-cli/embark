#!/usr/bin/env node

import { Command } from "commander";

import {
    registerDebCommand
} from "./commands/deb.js";

const program =
    new Command();

program
    .name("embark")
    .description(
        "Captain native package builder"
    )
    .version(
        "0.1.0-dev.0"
    );

registerDebCommand(
    program
);

program.parse();