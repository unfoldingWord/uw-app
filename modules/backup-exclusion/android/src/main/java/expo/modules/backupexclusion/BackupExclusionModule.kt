package expo.modules.backupexclusion

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BackupExclusionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BackupExclusion")

    Function("excludeFromBackup") { _: String ->
      false
    }

    Function("isExcludedFromBackup") { _: String ->
      false
    }
  }
}
