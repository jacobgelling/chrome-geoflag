// Open database
var request = indexedDB.open("GeoFlag", 201504);

// Set supported database languages
const languages = ["de", "en", "es", "fr", "ja", "pt_BR", "ru", "zh_CN"];

// If error with database
request.onerror = function (event) {
    if (event.target.errorCode) {
        alert("GeoFlag database error code " + event.target.errorCode + ".");
    } else {
        alert("GeoFlag database error.");
    }
};

// If update to database is required
request.onupgradeneeded = function (event) {
    var db = event.target.result;

    // If no database installed
	if (event.oldVersion === 0) {

        // Create tables
        var IPv4 = db.createObjectStore("IPv4", { keyPath: "min_ip" });
        var IPv6 = db.createObjectStore("IPv6", { keyPath: "ip" });
        var de = db.createObjectStore('de', { keyPath: "geoname_id" });
        var en = db.createObjectStore('en', { keyPath: "geoname_id" });
        var es = db.createObjectStore('es', { keyPath: "geoname_id" });
        var fr = db.createObjectStore('fr', { keyPath: "geoname_id" });
        var ja = db.createObjectStore('ja', { keyPath: "geoname_id" });
        var pt_BR = db.createObjectStore('pt_BR', { keyPath: "geoname_id" });
        var ru = db.createObjectStore('ru', { keyPath: "geoname_id" });
        var zh_CN = db.createObjectStore('zh_CN', { keyPath: "geoname_id" });

        // Add records
        request.onsuccess = function (event) {

            for (var i in languages) {
                inputDatabase(db, "language", languages[i]);
            }

            var addresses = ["IPv6"];
            for (var i in addresses) {
                inputDatabase(db, "addresses", addresses[i]);
            }
            inputDatabase(db, "ipv4", "IPv4");
        }

    }
};

function inputDatabase(db, type, table) {

    // Get location of CSV
    if (type === "language") {
        var location = "Country-Locations-" + table.replace("_", "-");
    } else {
        var location = "Country-Blocks-" + table;
    }

    // Parse CSV
    Papa.parse("../../geolite2/GeoLite2-" + location + ".csv", {
        header: true,
        download: true,
        worker: true,
        skipEmptyLines: true,
        fastMode: true,
        complete: function(results) {

            // Create transaction
            var transaction = db.transaction([table], "readwrite").objectStore(table);

            // Insert each row from CSV to database
            for (var i in results.data) {
                var record = results.data[i];
                if (type === "language") {
                    var objectStoreData = {
                        geoname_id: record["geoname_id"],
                        continent_code: record["continent_code"],
                        continent_name: record["continent_name"],
                        country_iso_code: record["country_iso_code"],
                        country_name: record["country_name"],
                    };

                } else if (type === "ipv4") {
                    var subnet = record["network"].split("/");
                    var prefix = subnet[1];
                    var ip = subnet[0];
                    var info = IpSubnetCalculator.calculateSubnetMask( ip, prefix );

                    var objectStoreData = {
                        min_ip: info["ipLow"],
                        max_ip: info["ipHigh"],
                        geoname_id: record["geoname_id"]
                    };

                } else {
                    network = record["network"].split("/")
                    var objectStoreData = {
                        ip: network[0],
                        prefix: network[1],
                        geoname_id: record["geoname_id"]
                    };
                }
                var objectStoreRequest = transaction.add(objectStoreData);
            }
        }
    });
}

// Get host from url
function getHost(url) {
    var host;
    if (url.indexOf("://") > -1) {
        host = url.split('/')[2];
    }
    else {
        host = url.split('/')[0];
    }
    host = host.split(':')[0];
    return host;
}

// Display country information in address bar
function showFlag(tabId, host) {
    chrome.pageAction.setIcon({tabId: tabId, path: "../../img/flags/" + currentCodeList[host] + ".png"});
    chrome.pageAction.show(tabId);
    var title = currentCountryList[host] + "\n\
";
    if (currentIPList[host] !== host) {
        title += host + "\n\
";
    }
    title += currentIPList[host];
    chrome.pageAction.setTitle({tabId: tabId, title: title});
}

// Declare arrays to store IPs
var currentIPList = {};
var currentCountryList = {};
var currentCodeList = {};

// Popup requests
chrome.extension.onMessage.addListener(
        function (request, sender, response)
        {
            switch (request.type)
            {

                case "getIP":
                    var currentURL = request.url;
                    if (currentIPList[getHost(currentURL)] !== undefined) {
                        response({
                            domainToIP: currentIPList[getHost(currentURL)],
                            domainToCountry: currentCountryList[getHost(currentURL)]
                        });
                    } else {
                        response({
                            domainToIP: "Unknown",
                            domainToCountry: "Unknown"
                        });
                    }

                    break;

                default:
                    response({});
            }
        }
);

// Check if file exists
function fileExists(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', url, true);
    xhr.onload = function (e) {
        return true;
    };
    xhr.onerror = function (e) {
        return false;
    };
    xhr.send();
}

// Convert IP into number
function ipv4ToNumber(ip) {
    var d = ip.split('.');
    return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
}

// Get IP
chrome.webRequest.onResponseStarted.addListener(function (info) {

    var ip = info.ip;
    var host = getHost(info.url);

    // If IP is valid
    if (ipaddr.isValid(ip)) {

        // If IP is not the same as cached
        if (ip !== currentIPList[host]) {

            // Add IP to array
            currentIPList[host] = ip;

            // Set country to undefined
            currentCountryList[host] = undefined;

        }

        // If no country cached
        if (!currentCountryList[host]) {

            // Select correct database
            if (ipaddr.IPv4.isValid(ip)) {
                var databaseN = "IPv4";
                var int_ip = ipv4ToNumber(ip);

            } else {
                var databaseN = "IPv6";
                var int_ip = ipv6ToNumber(ip);
            }

            var database2 = indexedDB.open("GeoFlag", 201504);
            database2.onsuccess = function (event) {
                var db = event.target.result;
                var store = db.transaction([databaseN], "readonly").objectStore(databaseN);

                store.openCursor().onsuccess = function(evt) {
                    var cursor = evt.target.result;
                    if (cursor) {

                        if (int_ip >= cursor.value["min_ip"] & int_ip <= cursor.value["max_ip"]) {
                            geoname_id = cursor.value["geoname_id"];
                            // Get correct country database locale
                            var ui_locale = chrome.i18n.getUILanguage();
                            if (languages[ui_locale]) {
                                var locale = ui_locale;
                            } else {
                                var locale = "en";
                            }

                            var database = indexedDB.open("GeoFlag", 201504);
                            database.onsuccess = function (event) {
                                var db = event.target.result;
                                var store = db.transaction([locale], "readonly").objectStore(locale);
                                store.get(geoname_id).onsuccess = function(event) {
                                    var employee = event.target.result;
                                    if (employee !== null) {

                                        // Store information
                                        if (employee["country_iso_code"]) {
                                            currentCodeList[host] = employee["country_iso_code"].toLowerCase();
                                            currentCountryList[host] = employee["country_name"].replace(/"/g, "");
                                        } else {
                                            currentCodeList[host] = employee["continent_code"].toLowerCase();
                                            currentCountryList[host] = employee["continent_name"].replace(/"/g, "");
                                        }

                                        // Display country information in address bar
                                        showFlag(info.tabId, host);
                                    }
                                };

                            }
                        } else {
                            cursor.continue();
                        }
                    }
                };
            }


        }
    }
    return;
}, {
    urls: ["<all_urls>"],
    types: ["main_frame"]
}, []);

// Listen for any changes to the URL of any tab
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (!chrome.runtime.lastError && typeof currentCodeList[getHost(tab.url)] !== "undefined")
    {
        // Display country information in address bar
        showFlag(tabId, getHost(tab.url));
    }
});
