export type CanonicalArchitecture = "x86_64";

export interface ElfRpathTransform {
    type: "elf-rpath";
    path: string;
    value: string;
}

export type PackageTransform =
    ElfRpathTransform;

export interface PackageDefinition {
    name: string;
    version: string;
    architecture: CanonicalArchitecture;
    description: string;
    dependencies?: string[];

    maintainer?: string;
    license?: string;
    release?: string;
    configFiles?: string[];
    transforms?: PackageTransform[];
}
