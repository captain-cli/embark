export interface PackageDefinition {
    name: string;
    version: string;
    architecture: string;
    description: string;

    maintainer?: string;
    license?: string;
    release?: string;
}