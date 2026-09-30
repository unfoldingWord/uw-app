import { readFileSync } from 'node:fs';
import { apkPermissionFindings, apkPermissionsOf } from './checks/apk-permissions.ts';
import { installerFlag } from './checks/permissions.ts';

const [dumpFile] = process.argv.slice(2);
if (dumpFile === undefined) {
  console.log('usage: tsx scripts/apk-permissions.ts <file holding the output of aapt2 dump permissions>');
  process.exit(2);
}

const installerBuild = process.env[installerFlag] === '1';
const apk = apkPermissionsOf(readFileSync(dumpFile, 'utf8'));
const findings = apkPermissionFindings(apk, installerBuild);
const build = installerBuild ? 'the apk build' : 'a store build';
if (findings.length > 0) {
  console.log(`apk permissions: FAIL for ${build} of ${apk.package ?? 'an unknown package'}`);
  for (const finding of findings) {
    console.log(`  ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `apk permissions: pass for ${build} of ${apk.package ?? ''}; ${apk.used.length} merged permissions, each admitted: ${apk.used.join(', ')}`,
  );
}
