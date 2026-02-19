Config = {}

-- اعدادات عامة
Config.Debug = false
Config.Command = "adminmenu"
Config.OpenKey = "F10"

-- الرتب المسموح لها تفتح المنيو
Config.AllowedGroups = {
  "god",
  "admin",
  "mod"
}

-- معرفات مسموح لها دائمًا
Config.AllowedIdentifiers = {
  "license:",
  "discord:1050041378404569098"
}

-- يسمح للمعرفات اعلاه بتجاوز صلاحيات الاكشن
Config.IdentifierBypassPerms = true

-- حدود السجلات والمواقع المحفوظة
Config.LogLimit = 50
Config.LocationLimit = 30

-- قاعدة البيانات
Config.SQL = {
  Resource = "oxmysql"
}

-- نظام الانفنتوري: qb او ox او auto
Config.Inventory = {
  Mode = "",
  QBResource = "qb-inventory",
  OXResource = "ox_inventory"
}

-- حفظ المركبات والقارج الافتراضي
Config.SaveVehicles = true
Config.DefaultGarage = ""


-- ديسكورد ويب هوك (اختياري)
Config.Webhook = ""
Config.WebhookName = ""
Config.WebhookAvatar = ""

-- صورة اللاعب من ديسكورد (اختياري)
Config.Discord = {
  BotToken = "",
  CacheSeconds = 100,
}
-- صلاحيات كل اكشن
Config.ActionPerms = {
  announce = "mod",
  warn = "mod",
  message = "mod",
  kick = "mod",
  ban = "admin",
  spectatePlayer = "mod",
  ["goto"] = "mod",
  bring = "mod",
  freezePlayer = "mod",
  unfreezePlayer = "mod",
  freezeAll = "admin",
  unfreezeAll = "admin",
  giveCash = "admin",
  giveBank = "admin",
  removeMoney = "admin",
  giveAllMoney = "admin",
  giveItem = "mod",
  giveAllItems = "mod",
  openInventory = "mod",
  openStash = "mod",
  openTrunk = "mod",
  clearInventory = "admin",
  removeItem = "mod",
  clearOffline = "admin",
  clearOfflineInventory = "admin",
  clearOfflineByLicense = "admin",
  deleteOfflineCharacter = "god",
  offlineGiveItem = "admin",
  offlineRemoveItem = "admin",
  offlineMoney = "admin",
  offlineSetJob = "admin",
  offlineSetGang = "admin",
  offlineSetName = "admin",
  offlineSetMetadata = "admin",
  offlineBanLicense = "admin",
  offlineUnbanLicense = "admin",
  saveLocation = "mod",
  teleportSaved = "mod",
  setWeather = "mod",
  setTime = "mod",
  blackout = "mod",
  toggleTraffic = "mod",
  togglePeds = "mod",
  revivePlayer = "mod",
  reviveAll = "admin",
  reviveRadius = "admin",
  killPlayer = "admin",
  explodePlayer = "admin",
  makeDrunk = "mod",
  fullHeal = "mod",
  fullArmor = "mod",
  removeStress = "mod",
  setAmmo = "mod",
  feedPlayer = "mod",
  setPed = "admin",
  setJob = "admin",
  setGang = "admin",
  setPermissions = "god",
  setBucket = "mod",
  changeCharacterName = "admin",
  deleteCharacter = "god",
  checkPerms = "admin",
  giveVehicle = "admin",
  adminCar = "mod",
  spawnOwnedVehicle = "mod",
  giveNuiFocus = "mod",
  reloadResources = "god",
  restartServer = "god",
  resourceStart = "god",
  resourceRestart = "god",
  resourceStop = "god",
  runCommand = "god",
  printConsole = "mod",
  tpMarker = "mod",
  copyCoords = "mod",
  copyHeading = "mod",
  copyVector2 = "mod",
  copyVector3 = "mod",
  copyVector4 = "mod",
  spawnVehicle = "mod",
  fixVehicle = "mod",
  deleteVehicle = "mod",
  flipVehicle = "mod",
  teleportCoords = "mod",
  clearArea = "mod",
  carWipe = "admin",
  tpBack = "mod",
  changePlate = "mod",
  setVehicleState = "mod",
  refuelVehicle = "mod",
  maxMods = "admin",
  sitInVehicle = "mod",
  toggleLaser = "mod",
  toggleDuty = "mod",
  toggleCuffs = "mod",
  toggleNames = "mod",
  toggleBlips = "mod",
  toggleCoords = "mod",
  invisible = "mod",
  godMode = "admin",
  infiniteAmmo = "mod",
  noclip = "mod"
}

