Pod::Spec.new do |s|
  s.name           = 'UwRadio'
  s.version        = '1.0.0'
  s.summary        = 'Bonjour discovery through dns_sd for phone-to-phone transfer in the unfoldingWord app'
  s.description    = 'Publishes and browses the _uwapp._tcp service and reports the local IPv4 address'
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

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
