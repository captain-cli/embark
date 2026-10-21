# Embark

<p align="center">
  <img src="./assets/embark-banner.png"
       alt="Embark — Stager builds the filesystem. Embark makes it native."
       width="100%" />
</p>

Embark turns a filesystem already prepared by Captain Stager into a native operating-system package.

> Stager builds the filesystem. Embark makes it native.

Embark does not decide where an application's files belong. It receives a staged install root, package metadata, and a small set of native-package transforms, then emits a package for the selected backend.

## Quick Start

Build your first native Linux package using Embark.

This walkthrough creates a tiny shell application, prepares its installation filesystem, and packages it as a Debian `.deb` file.

### 1. Install the build tools

On Ubuntu or Debian:

```bash
sudo apt update
sudo apt install nodejs npm dpkg-dev
```

Clone and build Embark:

```bash
git clone https://github.com/captain-cli/embark.git
cd embark
npm install
npm run build
npm link
```

Check the CLI:

```bash
embark --help
```

### 2. Prepare a staged filesystem

Create an example application:

```bash
mkdir -p demo/staged/usr/bin
```

Create a simple executable:

```bash
cat > demo/staged/usr/bin/hello-embark <<'EOF'
#!/bin/sh
echo "Hello from Embark!"
EOF

chmod +x demo/staged/usr/bin/hello-embark
```

The staged directory represents the filesystem that will be installed on the target machine:

```text
demo/
└── staged/
    └── usr/
        └── bin/
            └── hello-embark
```

In a full Captain workflow, Stager prepares this filesystem. We're creating it manually here to keep the example simple.

### 3. Define the package

Create `demo/embark.package.json`:

```json
{
  "schema": "embark/package/v1",
  "package": {
    "name": "hello-embark",
    "version": "1.0.0",
    "architecture": "x86_64",
    "description": "My first Embark package",
    "maintainer": "Example Developer",
    "license": "MIT",
    "release": "1"
  }
}
```

The package definition describes the native package. The staged filesystem supplies its contents.

### 4. Build the Debian package

From the Embark repository root:

```bash
embark deb build \
  --staged demo/staged \
  --package demo/embark.package.json
```

Embark creates the native package using `dpkg-deb`.

The default build workspace is `.embark/deb`.

### 5. Inspect the result

Find the generated package:

```bash
find .embark/deb -name '*.deb'
```

Inspect its metadata and contents:

```bash
PACKAGE=".embark/deb/hello-embark_1.0.0_amd64.deb"

dpkg-deb --info "$PACKAGE"
dpkg-deb --contents "$PACKAGE"
```

**Verify the extracted application:**

```bash
mkdir -p demo/extracted

dpkg-deb --extract "$PACKAGE" demo/extracted

./demo/extracted/usr/bin/hello-embark
```

You should see the `hello-embark` executable under `/usr/bin`.

You have now built your first native package with Embark!

### 6. Build an RPM package

On a compatible Linux build host with `rpmbuild` installed, use the same staged filesystem and package definition:

```bash
embark rpm build \
  --staged demo/staged \
  --package demo/embark.package.json
```

The default RPM build workspace is `.embark/rpm`.

The package definition stays the same. Embark handles the backend-specific packaging.

**Inspect and verify the RPM package:**

```bash
RPM=".embark/rpm/rpmbuild/RPMS/x86_64/hello-embark-1.0.0-1.x86_64.rpm"

rpm -qip "$RPM"
rpm -qlp "$RPM"

mkdir -p demo/rpm-extracted

(
  cd demo/rpm-extracted
  rpm2cpio "../../$RPM" | cpio -idm
)

./demo/rpm-extracted/usr/bin/hello-embark
```

### Verified packaging workflow

Both DEB and RPM packaging backends were successfully tested on Ubuntu Linux on October 20, 2026.

| Verification | DEB | RPM |
| --- | --- | --- |
| Package generation | Passed | Passed |
| Metadata inspection | Passed | Passed |
| Package contents inspection | Passed | Passed |
| Filesystem extraction | Passed | Passed |
| Extracted application execution | Passed | Passed |

Both packages used the same staged filesystem and package definition.

Expected application output:

```text
Hello from Embark!
```

These tests validate native package generation and extracted application execution. System installation, upgrades, and removal are not yet covered.

---

## Package support

| Format | Platform family | Status |
| --- | --- | --- |
| DEB | Debian / Ubuntu | Implemented |
| RPM | RHEL / Fedora / openSUSE families | Implemented |
| PKG | Arch Linux | Planned |
| APK | Alpine Linux | Planned |
| MSI | Windows | Planned |

Implemented backends depend on their native host build tools. Support for additional formats is a roadmap direction, not a currently available CLI feature.

For integration with a Captain project, Embark also supports `--project`, which resolves Captain-owned packaging configuration instead of using a standalone `--package` file.

## Package definition

Both Debian and RPM handlers consume the same canonical package definition. The v1 contract is documented in `schemas/package.schema.json`:

```json
{
  "schema": "embark/package/v1",
  "package": {
    "name": "example",
    "version": "1.0.0",
    "architecture": "x86_64",
    "description": "Example native application",
    "maintainer": "Captain CLI",
    "license": "Proprietary",
    "release": "1",
    "configFiles": [
      "etc/example/config.json"
    ],
    "transforms": [
      {
        "type": "elf-rpath",
        "path": "usr/bin/example",
        "value": "$ORIGIN/../lib/example"
      }
    ]
  }
}
```

The current canonical architecture is `x86_64`. Embark maps it to backend vocabulary (`amd64` for Debian and `x86_64` for RPM).

`configFiles` are translated into native configuration semantics: Debian `conffiles` and RPM `%config(noreplace)` entries.

`elf-rpath` transforms are applied to the materialized package filesystem before package generation. The transform target must remain inside the package root.

## Build packages

```bash
embark deb build \
  --staged /tmp/example-staged \
  --package manifest/embark.package.json

embark rpm build \
  --staged /tmp/example-staged \
  --package manifest/embark.package.json
```

Both commands default `--package` to `embark.package.json` and use `.embark/deb` or `.embark/rpm` as their output workspace.

## Host tooling

The current Linux backends invoke native host tools:

- Debian: `dpkg-deb`
- RPM: `rpmbuild`
- ELF RUNPATH transforms: `patchelf`

These are intended to become Outfit capabilities so Captain can verify/provision packaging prerequisites before invoking Embark.

## Development

```bash
npm test
```

The test command builds TypeScript and runs the Node test suite.
