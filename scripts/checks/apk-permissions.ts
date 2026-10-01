import { androidBlockedOn, isAdmitted } from './android-permissions.ts';

export type ApkPermissions = {
  package: string | undefined;
  declared: readonly string[];
  used: readonly string[];
};

const packageLine = /^package:\s*(\S+)/;
const declaredLine = /^permission:\s*(\S+)/;
const usedLine = /^uses-permission(?:-sdk-23|-sdk-m)?:\s*name='([^']+)'/;

export function apkPermissionsOf(dump: string): ApkPermissions {
  let found: string | undefined;
  const declared: string[] = [];
  const used: string[] = [];
  for (const line of dump.split(/\r?\n/).map((text) => text.trim())) {
    const packageName = packageLine.exec(line)?.[1];
    const declaredName = declaredLine.exec(line)?.[1];
    const usedName = usedLine.exec(line)?.[1];
    if (packageName !== undefined) {
      found = packageName;
    } else if (declaredName !== undefined) {
      declared.push(declaredName);
    } else if (usedName !== undefined && !used.includes(usedName)) {
      used.push(usedName);
    }
  }
  return { package: found, declared, used };
}

const receiverPermissionSuffix = '.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION';

function isOwnReceiverPermission(apk: ApkPermissions, name: string): boolean {
  return (
    apk.package !== undefined &&
    name === `${apk.package}${receiverPermissionSuffix}` &&
    apk.declared.includes(name)
  );
}

export function apkPermissionFindings(apk: ApkPermissions, installerBuild: boolean): string[] {
  if (apk.package === undefined) {
    return ['the aapt2 permissions dump names no package; it is empty or not an aapt2 dump'];
  }
  const blocked = new Set(androidBlockedOn(installerBuild));
  const findings: string[] = [];
  for (const name of apk.used) {
    if (isAdmitted(name, installerBuild) || isOwnReceiverPermission(apk, name)) {
      continue;
    }
    findings.push(
      blocked.has(name)
        ? `${name} is in the APK although android.blockedPermissions removes it; a Maven dependency merged it past the block`
        : `${name} is in the APK and neither admitted in scripts/checks/android-permissions.ts nor blocked in app.config.ts`,
    );
  }
  return findings;
}
