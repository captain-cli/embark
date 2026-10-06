import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { parsePackageDefinition } from "./packageDefinition.js";
import { PackageDefinition } from "../models/packageDefinition.js";

interface ResolvedToolConfig {
    tool: string;
    path: string;
    inline: boolean;
    config: unknown;
}

function coreCommand(): string[] {
    const raw = process.env.CAPTAIN_CORE_COMMAND;
    if (!raw) return ["python3", "-m", "captain_core"];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some(value => typeof value !== "string" || !value)) {
        throw new Error('CAPTAIN_CORE_COMMAND must be a non-empty JSON string array.');
    }
    return parsed as string[];
}

function embarkPackageRoot(): string {
    return path.resolve(__dirname, "..", "..");
}

export function resolveCaptainCorePythonPath(packageRoot = embarkPackageRoot()): string | undefined {
    const explicit = process.env.CAPTAIN_CORE_PYTHONPATH;
    if (explicit) return path.resolve(explicit);

    const siblingSource = path.resolve(packageRoot, "..", "captain-core", "src");
    if (fs.existsSync(path.join(siblingSource, "captain_core", "__init__.py"))) {
        return siblingSource;
    }
    return undefined;
}

function coreEnvironment(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    const corePythonPath = resolveCaptainCorePythonPath();
    if (!corePythonPath) return env;

    env.PYTHONPATH = env.PYTHONPATH
        ? `${corePythonPath}${path.delimiter}${env.PYTHONPATH}`
        : corePythonPath;
    return env;
}

export function loadCaptainPackageDefinition(projectDirectory: string): { package: PackageDefinition; source: string } {
    const project = path.resolve(projectDirectory);
    const [command, ...prefix] = coreCommand();
    const result = spawnSync(command, [
        ...prefix,
        "manifest", "resolve",
        "--project", project,
        "--tool", "embark",
        "--required",
        "--json",
    ], { encoding: "utf8", env: coreEnvironment() });

    if (result.error) {
        throw new Error(`Captain Core could not start: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`Captain Core failed to resolve Embark configuration: ${result.stderr.trim() || `exit ${result.status}`}`);
    }

    let resolved: ResolvedToolConfig;
    try {
        resolved = JSON.parse(result.stdout) as ResolvedToolConfig;
    } catch {
        throw new Error("Captain Core returned invalid JSON while resolving Embark configuration.");
    }
    if (resolved.tool !== "embark" || typeof resolved.path !== "string" || typeof resolved.config !== "object" || resolved.config === null) {
        throw new Error("Captain Core returned an invalid Embark configuration envelope.");
    }

    return {
        package: parsePackageDefinition(resolved.config),
        source: resolved.inline ? path.join(project, "manifest.json") : resolved.path,
    };
}
