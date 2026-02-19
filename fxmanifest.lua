fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'REDA'
description 'REDA Admin Menu'
version '1.0.0'

ui_page 'html/index.html'

files {
  'html/index.html',
  'html/style.css',
  'html/app.js'
}

shared_scripts {
  'config.lua'
}

client_scripts {
  'client.lua'
}

server_scripts {
  'server/server.lua'
}

dependency 'qb-core'

escrow_ignore {
  'config.lua'
}
dependency '/assetpacks'