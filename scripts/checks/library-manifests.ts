import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { permissionsInManifest, type LibraryPermission } from './android-permissions.ts';

const androidSourceRoots = ['android', 'ReactAndroid'];

const testVariants: ReadonlySet<string> = new Set(['test', 'androidTest']);

function directories(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }
  return readdirSync(path)
    .filter((name) => !name.startsWith('.'))
    .map((name) => join(path, name))
    .filter((child) => statSync(child).isDirectory());
}

function packageRoots(modulesDirectory: string): string[] {
  return directories(modulesDirectory).flatMap((child) => {
    const scoped = child.slice(modulesDirectory.length + 1).startsWith('@');
    const roots = scoped ? directories(child) : [child];
    return roots.flatMap((root) => [root, ...packageRoots(join(root, 'node_modules'))]);
  });
}

function manifestsOf(packageRoot: string): string[] {
  return androidSourceRoots.flatMap((sourceRoot) =>
    directories(join(packageRoot, sourceRoot, 'src'))
      .filter((variant) => !testVariants.has(variant.slice(variant.lastIndexOf('/') + 1)))
      .map((variant) => join(variant, 'AndroidManifest.xml'))
      .filter((manifest) => existsSync(manifest)),
  );
}

export type LibraryScan = { manifests: number; permissions: LibraryPermission[] };

export function scanLibraryManifests(repositoryRoot: string): LibraryScan {
  const roots = [
    ...packageRoots(join(repositoryRoot, 'node_modules')),
    ...directories(join(repositoryRoot, 'modules')),
  ];
  const manifests = roots.flatMap(manifestsOf).sort();
  return {
    manifests: manifests.length,
    permissions: manifests.flatMap((manifest) =>
      permissionsInManifest(readFileSync(manifest, 'utf8')).map((name) => ({
        manifest: relative(repositoryRoot, manifest),
        name,
      })),
    ),
  };
}
