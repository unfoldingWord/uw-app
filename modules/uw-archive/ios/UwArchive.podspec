Pod::Spec.new do |s|
  s.name           = 'UwArchive'
  s.version        = '1.0.0'
  s.summary        = 'Extracts a burrito archive natively'
  s.description    = 'Inflates the entries of a zip archive into a directory, refusing unsafe paths and archives over their limits'
  s.license        = 'MIT'
  s.author         = 'unfoldingWord'
  s.homepage       = 'https://github.com/unfoldingWord/uw-app'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/unfoldingWord/uw-app.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Compression'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
