لوحة إدارة متكاملة لسيرفرات QBCore بواجهة NUI حديثة، مركّزة على السرعة، وضوح الصلاحيات وسهولة التحكم باللاعبين أونلاين وأوفلاين.

## المميزات
- إدارة اللاعبين مباشرة: kick, ban, warn, رسالة خاصة، bring, goto, freeze, spectate، تغيير الوظيفة/العصابة/الصلاحيات.  
- بطاقة لاعب تفصيلية: بيانات الشخصية، الوظيفة، العصابة، الأموال، الجرد، المركبات.  
- أدوات المركبات: سباون، إصلاح، حذف، قلب، تغيير لوحة، Car Wipe.  
- التنقل: نسخ الإحداثيات، تيليبورت للإحداثيات أو للماركر، حفظ مواقع واسترجاعها.  
- التحكم بالعالم: الوقت، الطقس، blackout، التحكم في traffic و peds.  
- إدارة أوفلاين: تعديل شخصيات غير المتصلين (المال، الجرد، الوظيفة، العصابة، الاسم، الميتاداتا) مع البان وفك البان من قاعدة البيانات.  
- سجل إداري في SQL مع Webhook لديسكورد لكل العمليات.  
- يدعم qb-inventory و ox_inventory بتغيير خيار واحد في الكونفيق.

## المتطلبات
- qb-core  
- مورد SQL (يفضل oxmysql أو أي مورد تضبطه في Config.SQL.Resource)  
- نظام جرد واحد على الأقل: qb-inventory أو ox_inventory  

## طريقة التثبيت
1. ضع المجلد في resources/reda_adminmenu.  
2. استورد ملف sql.sql في قاعدة البيانات.  
3. أضف في server.cfg:  
```cfg
ensure reda_adminmenu
```  
4. عدّل الإعدادات من config.lua على حسب سيرفرك.

## أهم الإعدادات في config.lua
- Config.Command: أمر فتح القائمة (افتراضيًا adminmenu).  
- Config.OpenKey: زر فتح القائمة (افتراضيًا F10).  
- Config.AllowedGroups: الرتب المسموح لها بالدخول.  
- Config.ActionPerms: تحديد صلاحية كل إجراء.  
- Config.Inventory.Mode: `qb` أو `ox` أو `auto`.  
- Config.AllowedIdentifiers: معرفات استثنائية (اختياري).  
- إعدادات ديسكورد:
  - Config.Webhook  
  - Config.WebhookName  
  - Config.WebhookAvatar  

## التواصل
- Discord: `mt_reda`  
- X: `https://x.com/mt_reda1`