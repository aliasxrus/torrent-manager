module.exports = {
    /*
    * Данное ПО предназначено для изучения API торрент клиентов.
    * ПО предоставлено в ознакомительных целях и имеет открытый исходный код https://github.com/aliasxrus/torrent-manager
    * и любой желающий может доработать функционал. Любое использование на свой страх и риск!
    * Для обсуждения создана группа: https://t.me/btt_manager
    * */

    /*
    * Открываем доступ до веб интерфейса: Настройки программы (Ctrl+P) -> Дополнительно -> Веб интерфейс.
    * Ставим галку "Использовать веб-интерфейс".
    * Придумываем логин и пароль (без спецсимволов или экранируем их), при желании ставим галку "Альтернативный порт" и указываем другой порт.
    * Заполняем поля ниже.
    * */
    username: 'admin',
    password: 'admin',
    port: 8080,

    // Это интервал в миллисекундах с которым программа будет получать список IP адресов и блокировать их. 10000 миллисекунд = 10 секунд.
    interval: 2000,
    // Стратегия блокировки: 0 - блокируем все сторонние клиенты, 1 - не блокирует тех кто отдаёт больше чем качает
    strategy: 1,
    // Блокировка неактивных пиров, в секундах
    inactiveLimit: 600,

    /*
    * Функция автоматического перевода баланса SPEED IN-APP на другой кошелёк каждую минуту.
    * Функция спасёт от случайной потери баланса при случайной скачке или просто для объединения балансов на 1 кошелёк.
    * Перевод работает на балансах от 0.000020 BTT, комиссия 5%.
    * */
    autoBttTransfer: {
        /*
        * Включить автоматический перевод между IN APP совместно со скриптом блокировок.
        * При запуске через transfer.bat данная настройка игнорируется.
        * true - автоматический перевод включен.
        * false - автоматический перевод выключен.
        * */
        autoTransfer: false,

        /*
        * Кошелёк С КОТОРОГО будет перевод. Необходимо указать секретный ключ или 12 слов
        *
        * ПРИМЕРЫ:
        * muffin,elbow,monster,regular,burger,lady,thrive,virtual,curve,mammal,reflect,venue
        * 7eb6948762712c08a1ff079dcdf8948e7e9fc9844ca9f619e770ed1fdd83ecf2
        * CAISIH62lIdicSwIof8Hnc34lI5+n8mETKn2Gedw7R/dg+zy
        * Muffin Elbow Monster Regular Burger Lady Thrive Virtual Curve Mammal Reflect Venue
        * */
        from: '', // Значение вставляем между кавычек

        /*
        * Кошелёк НА КОТОРЫЙ будет перевод. Необходимо указать секретный ключ или 12 слов или адрес SPEED IN-APP кошелька.
        * Для безопасности рекомендуется использовать АДРЕС SPEED IN-APP кошелька. Так злоумышленник не сможет украсть кошелёк получателя.
        * Скачать программу для получения адреса SPEED IN-APP кошелька можно здесь:
        * https://t.me/btt_manager/105802
        *
        * ПРИМЕРЫ:
        * BHZJ3obt9IYWJWO8r1wQwhpmGpMHjgru1QhZRNq50o30K0FuDF3DaAeI8Wc9fChkjLyFbtH8ajdeLjZiVwEH3rU=
        * muffin,elbow,monster,regular,burger,lady,thrive,virtual,curve,mammal,reflect,venue
        * 7eb6948762712c08a1ff079dcdf8948e7e9fc9844ca9f619e770ed1fdd83ecf2
        * CAISIH62lIdicSwIof8Hnc34lI5+n8mETKn2Gedw7R/dg+zy
        * Muffin Elbow Monster Regular Burger Lady Thrive Virtual Curve Mammal Reflect Venue
        * */
        to: '', // Значение вставляем между кавычек
    },

    filters: {
        /*
        * Правила фильтрования
        * true - разрешить.
        * false - запретить.
        * */
        uTorrent: true,
        BitTorrent: true,
        LibTorrent: true,
    },

    /*
    * Расположение торрент клиента. На текущий момент только для работы с ipfilter.dat
    * Указывать если программа сама не смогла правильно определить директорию расположения клиента.
    * При указании пути необходимо экранировать обратные слэши, например: 'C:\\Users\\Administrator\\AppData\\Roaming\\uTorrent\\uTorrent.exe'
    * */
    torrentClientPath: '',

    /*
    * Очищать ipfilter.dat при запуске.
    * true - удалять историю.
    * false - только дописывать новые IP.
    * */
    flagClearIpFilter: true,

    // Останавливает активные загрузки
    stopActiveDownloads: false,

    /*
    * ВНИМАНИЕ! ФУНКЦИОНАЛ НЕ ЯВЛЯЕТСЯ НАДЕЖНЫМ, ВСЕ BTT МОГУТ ПРОПАСТЬ!
    * Автоматический вывод.
    * Команда для отдельного запуска: node src\autoWithdraw\index.js
    * */
    autoBttWithdraw: {
        /*
        * Включить автоматический перевод из IN APP в ON CHAIN совместно со скриптом блокировок.
        * При запуске через withdraw.bat данная настройка игнорируется.
        * true - автоматический вывод включен.
        * false - автоматический вывод выключен.
        * */
        autoWithdraw: false,
        // Пароль от кошелька с BTFS
        btfsPassword: '',
        // Порт со страницы BTFS, взять в адресной строке, пример http://127.0.0.1:5001/hostui/#/wallet тут он будет 5001.
        port: 5001,
        interval: 3000,
        // Максимальная сумма вывода, если баланс меньше то выведет максимально доступный.
        amountLimit: 99999,
        // Минимальный баланс BTT на шлюзе при котором начинать попытку вывода.
        minAmount: 1001,
        // Минимальный необходимый баланс TRX на шлюзе при котором начинать попытку вывода.
        minTrxAmount: 0.7,
        // Минимальная пропускная способность на шлюзе при которой начинать попытку вывода.
        minFreeNetRemaining: 600,
        // Выводить только когда есть другие выводы из шлюза. Минимальная разница в балансе шлюза для попытки вывода.
        minDifference: 0,
        // Выводить в консоль свой текущий баланс.
        logBalance: true,
        // Адрес получения информации.
        url: 'https://apilist.tronscan.org/api/account?address=TTZu7wpHa9tnQjFUDrsjgPfXE7fck7yYs5',
    },

/*
	* Модуль автоматической остановки/удаления лишних торрентов. Полезно при автоматической закачке через RSS или другими способами.
	* Для работы модуля необходим доступ к веб-интерфейсу клиента.
	* Включаем и настраиваем, как написано в начале файла.
	* При обнаружении багов репортить Lex`у @lexandros2 в телеграм.
	*/
	autostop: {
		/*
		* Включить/выключить функцию автоматической остановки/удаления торрентов.
		* При запуске через autostop.bat данный параметр игнорируется.
		*/
		autoStop: false,
		
		//Максимальный размер (Mb) (0 - выключено)
		maxSize: 0,
		//Максимальный размер (Mb) (0 - выключено)
		minSize: 0,
		//Максимальный соотношение сиды/пиры (0 - выключено)
		seedPeer: 0,
		// Максимальное количество активных раздач
		maxTorrent: 20,
		// Минимальное время раздачи торрента (в минутах)
		minTime: 120,
		// Минимальный рейтинг раздачи (в процентах)
		minRatio: 0,
		
		/*
		* Метод отбора торрентов для удаления из тех, которые подходят под предыдущие параметры. Возможны четыре варианта.
		* 1 - самые старые торренты;
		* 2 - торренты с минимальным количеством подсоединенных к вам пиров;
		* 3 - торренты с минимальным количеством пиров на трекере;
		* 4 - торренты с максимальным соотношением сиды/пиры
		*/
		selectMethod: 4,
		
		/*
		* Метод остановки торрентов. Возможно три варианта.
		* 1 - остановка торрента;
		* 2 - удаление торрента без удаления данных;
		* 3 - удаление торрента вместе с данными. ИСПОЛЬЗОВАТЬ С ОСТОРОЖНОСТЬЮ!!!
		*/
		stopMethod: 1,
		
		/*
		* Фунционал отслеживания свободного места на диске. Чтобы отключить - установить minAvail: 0.
		* ВНИМАНИЕ! При остатке свободного места меньше указанного, торренты будут удаляться вместе с содержимым (минуя корзину!) по одному за каждый цикл,
		* пока свободного места не станет больше указанного лимита. Поэтому, будьте внимательны. Если по ошибке указать слишком большой лимит (например больше,
		* чем размер диска) - будут удалены вообще все торренты, лежащие на отслеживаемом диске.
		* Сначала будут удаляться самые старые из остановленных, если такие есть. Если таких нет, то из активных раздач. Отбор будет вестись
		* по вышеуказанному методу отбора.
		* Этот функционал имеет приоритет перед обычной остановкой/удалением.
		* Т.е. если места на диске меньше установленного - торренты будут удаляться, даже если их меньше, чем установлен лимит выше.
		*/
		// Минимальное доступное место на диске (Gb)
		minAvail: 10,
		
		/* Отслеживаемые диски (массив).
		* Можно указать несколько дисков  (для тех случаев когда торренты лежат на нескольких дисках).
		* в квадратных скобках и в одинарных ковычках через запятую. Например: disks: ['C:','D:']. Двоеточие после буквы диска обязательно!
		*/
		disks: ['C:'],
		
		// Пауза между циклами проверки (в миллисекундах). Минимум 120000 (две минуты). Чтобы торрент успел удалиться с диска и система обновила данные о свободном месте.
		timeout: 120000,
	},



    /*
    * ###############################################
    * #                                             #
    * #                НЕ ТРОГАЕМ                   #
    * #  ДАЛЕЕ НАСТРОЙКИ ДЛЯ ОПЫТНЫХ ПОЛЬЗОВАТЕЛЕЙ  #
    * #                                             #
    * ###############################################
    * */

    /*
    * Выводить больше логов, нужно для поиска ошибок
    * true - включен
    * false - выключен
    * */
    debugLog: false,

    apiTorrentUrl: 'http://127.0.0.1',
    apiBttUrl: 'http://127.0.0.1',
    authToken: '',

	/*
	* Управление qBitTorrent
	*/
    qBitTorrent: {
        qBitTorrent: false, // Вкл/выкл управление qBitTorrent. При запуске через qbit.bat - эта опция игнорируется
        username: 'admin', //логин для веб-интерфейса. Задается в настройках qBitTorrent
        password: 'admin', //пароль для веб-интерфейса. Задается в настройках qBitTorrent
        port: 8080, //порт для веб-интерфейса. Задается в настройках qBitTorrent (желательно ставить в диапазоне  49152—65535).
        downloadTimeOut: 120, // Таймаут на закачку, в минутах (0 для отключения). При превышении времени неактивности торрент будет удален вместе с данными.
        recheckTimeOut: 100, // Таймаут на принудительную проверку, в минутах (0 для отключения)
        maxSize: 50000, // Максимальный размер торрента (Mb). Торренты больше этого размера будут удаляться, (0 для отключения).
        minSize: 0, // Минимальный размер торрента (Mb). Торренты меньше этого размера будут удаляться, (0 для отключения).
        seedPeer: 0, //Максимальное отношение сиды/пиры. Торренты с большим значением будут удаляться. (0 для отключения).
        scanInterval: 5000,
        sort: true, //Сортирует очередь торрентов по размеру. Самые маленькие в начало очереди. Полезно, если на закачке много торрентов, и "толстые" торренты в начале очереди тормозят всю очередь.
                    //Имеет смысл только, если в qBittorrent включена и настроена очередность торрентов.
        sortInterval: 600000, //Периодичность сортировки (ms). Выставлять меньше 10 мин. нецелесообразно.
        qBitTorrentApiUrl: 'http://127.0.0.1',
        autoConfig: false,  //Вкл|выкл автоматическую настройку qBittorrent (включайте и меняйте опции только если понимаете, что делаете).
        config: {
            "listen_port": 39346,
            "preallocate_all": true, // Резервировать место для всех файлов
            "save_path": "C:\\downloads\\", // В конце необходимо указывать: \\
            "export_dir_fin": "C:\\torrents",
            "up_limit": 30720, // Кратное 1024
            "dl_limit": 0, // Кратное 1024
            "max_ratio_enabled": true,
            "max_ratio": 0,
            "max_ratio_act": 1, // 1 - удалить торрент из клиента после закачки
            "queueing_enabled": true, // Очередность закачек
            "max_active_downloads": 5,
            "max_active_uploads": 1,
            "max_active_torrents": 10,
            // "add_trackers": "",
            // "add_trackers_enabled": false,
            // "alt_dl_limit": 10240,
            // "alt_up_limit": 10240,
            // "alternative_webui_enabled": false,
            // "alternative_webui_path": "",
            // "announce_ip": "",
            // "announce_to_all_tiers": true,
            // "announce_to_all_trackers": false,
            // "anonymous_mode": false,
            // "async_io_threads": 10,
            // "auto_delete_mode": 0,
            // "auto_tmm_enabled": false,
            // "autorun_enabled": false,
            // "autorun_program": "",
            // "banned_IPs": "",
            // "bittorrent_protocol": 0,
            // "block_peers_on_privileged_ports": false,
            // "bypass_auth_subnet_whitelist": "",
            // "bypass_auth_subnet_whitelist_enabled": false,
            // "bypass_local_auth": false,
            // "category_changed_tmm_enabled": false,
            // "checking_memory_use": 32,
            // "current_interface_address": "",
            // "current_network_interface": "",
            // "dht": true,
            // "disk_cache": -1,
            // "disk_cache_ttl": 60,
            // "dont_count_slow_torrents": false,
            // "dyndns_domain": "changeme.dyndns.org",
            // "dyndns_enabled": false,
            // "dyndns_password": "",
            // "dyndns_service": 0,
            // "dyndns_username": "",
            // "embedded_tracker_port": 9000,
            // "enable_coalesce_read_write": true,
            // "enable_embedded_tracker": false,
            // "enable_multi_connections_from_same_ip": false,
            // "enable_os_cache": true,
            // "enable_piece_extent_affinity": false,
            // "enable_upload_suggestions": false,
            // "encryption": 0,
            // "export_dir": "",
            // "file_pool_size": 40,
            // "hashing_threads": 2,
            // "idn_support_enabled": false,
            // "incomplete_files_ext": false,
            // "ip_filter_enabled": false,
            // "ip_filter_path": "",
            // "ip_filter_trackers": false,
            // "limit_lan_peers": true,
            // "limit_tcp_overhead": false,
            // "limit_utp_rate": true,
            // "locale": "ru",
            // "lsd": true,
            // "mail_notification_auth_enabled": false,
            // "mail_notification_email": "",
            // "mail_notification_enabled": false,
            // "mail_notification_password": "",
            // "mail_notification_sender": "qBittorrent_notification@example.com",
            // "mail_notification_smtp": "smtp.changeme.com",
            // "mail_notification_ssl_enabled": false,
            // "mail_notification_username": "",
            // "max_concurrent_http_announces": 50,
            // "max_connec": 500,
            // "max_connec_per_torrent": 100,
            // "max_seeding_time": -1,
            // "max_seeding_time_enabled": false,
            // "max_uploads": 20,
            // "max_uploads_per_torrent": 4,
            // "outgoing_ports_max": 0,
            // "outgoing_ports_min": 0,
            // "peer_tos": 32,
            // "peer_turnover": 4,
            // "peer_turnover_cutoff": 90,
            // "peer_turnover_interval": 300,
            // "pex": true,
            // "proxy_auth_enabled": false,
            // "proxy_ip": "0.0.0.0",
            // "proxy_password": "",
            // "proxy_peer_connections": false,
            // "proxy_port": 8080,
            // "proxy_torrents_only": false,
            // "proxy_type": 0,
            // "proxy_username": "",
            // "random_port": false,
            // "recheck_completed_torrents": false,
            // "resolve_peer_countries": true,
            // "rss_auto_downloading_enabled": false,
            // "rss_download_repack_proper_episodes": true,
            // "rss_max_articles_per_feed": 50,
            // "rss_processing_enabled": false,
            // "rss_refresh_interval": 30,
            // "rss_smart_episode_filters": "s(\\d+)e(\\d+)\n(\\d+)x(\\d+)\n(\\d{4}[.\\-]\\d{1,2}[.\\-]\\d{1,2})\n(\\d{1,2}[.\\-]\\d{1,2}[.\\-]\\d{4})",
            // "save_path_changed_tmm_enabled": false,
            // "save_resume_data_interval": 60,
            // "scan_dirs": {}, // Не будет работать при проверке конфига
            // "schedule_from_hour": 8,
            // "schedule_from_min": 0,
            // "schedule_to_hour": 20,
            // "schedule_to_min": 0,
            // "scheduler_days": 0,
            // "scheduler_enabled": false,
            // "send_buffer_low_watermark": 10,
            // "send_buffer_watermark": 500,
            // "send_buffer_watermark_factor": 50,
            // "slow_torrent_dl_rate_threshold": 2,
            // "slow_torrent_inactive_timer": 60,
            // "slow_torrent_ul_rate_threshold": 2,
            // "socket_backlog_size": 30,
            // "start_paused_enabled": false,
            // "stop_tracker_timeout": 5,
            // "temp_path": "C:\\Users\\Administrator\\Downloads\\temp\\",
            // "temp_path_enabled": false,
            // "torrent_changed_tmm_enabled": true,
            // "torrent_content_layout": "Original",
            // "upload_choking_algorithm": 1,
            // "upload_slots_behavior": 0,
            // "upnp": true,
            // "upnp_lease_duration": 0,
            // "use_https": false,
            // "utp_tcp_mixed_mode": 0,
            // "validate_https_tracker_certificate": true,
            // "web_ui_address": "*",
            // "web_ui_ban_duration": 3600,
            // "web_ui_clickjacking_protection_enabled": true,
            // "web_ui_csrf_protection_enabled": true,
            // "web_ui_custom_http_headers": "",
            // "web_ui_domain_list": "*",
            // "web_ui_host_header_validation_enabled": false,
            // "web_ui_https_cert_path": "",
            // "web_ui_https_key_path": "",
            // "web_ui_max_auth_fail_count": 5,
            // "web_ui_port": 20000,
            // "web_ui_secure_cookie_enabled": true,
            // "web_ui_session_timeout": 3600,
            // "web_ui_upnp": false,
            // "web_ui_use_custom_http_headers_enabled": false,
            // "web_ui_username": "admin",
        }
    },
    downloadMinBtt: 10,

    /*
    * Включение автоматической настройки.
    * Значение флагов в autoConfig: Вкл = 1, Выкл = 0
    * Команда для запуска: node src/autoConfig/index.js
    * Запуск совместно со скрипом блокировок:
    * true - включен
    * false - выключен
    *
    * Для включения некоторых параметров уберите впереди: //
    * */
    setSetting: false,
    autoConfig: {
        /*
        * Куда качать файлы, путь до папки.
        * */
        // dir_active_download_flag: 1,
        // dir_active_download: 'C:\\downloads',

        /*
        * Автоматический запуск скачивания торентов при появлении в указанной папке торрент файлов.
        * */
        // dir_autoload_flag: 1,
        // dir_autoload: 'C:\\downloads\\torrent_files',

        /*
        * Удалять торрент файлы (с расширением .torrent) после автоматического скачивания.
        * */
        dir_autoload_delete: 1,


        max_active_torrent: 1000,
        max_active_downloads: 1000,
        conns_globally: 1000000,
        conns_per_torrent: 100000,
        ul_slots_per_torrent: 1,
        max_dl_rate: 0, // лимит загрузки
        max_ul_rate: 0, // лимит отдачи
        max_ul_rate_seed_flag: 0, // включить альтернативную скорость отдачи если нет загрузок. Значения: 0, 1
        max_ul_rate_seed: 0, // альтернативная скорость

        // 'webui.enable': 1,
        // 'webui.enable_listen': 1,
        // 'webui.port': 50000,
        // 'webui.username': 'I\'mSuperAdmin!',
        // 'webui.password': 'I\'mSuperPassword!',
    }
}
