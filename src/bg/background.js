// Get domain from url
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

// Set the item in the localstorage
function setItem(key, value) {
    window.localStorage.removeItem(key);
    window.localStorage.setItem(key, value);
}

// Get the item from local storage with the specified key
function getItem(key) {
    var value;
    try {
        value = window.localStorage.getItem(key);
    } catch (e) {
        value = "null";
    }
    return value;
}

// Display country information in address bar
function showFlag(tabId, host) {
    chrome.pageAction.setIcon({tabId: tabId, path: "../../img/flags/" + currentCodeList[host] + ".png"});
    chrome.pageAction.show(tabId);
    chrome.pageAction.setTitle({tabId: tabId, title: currentCountryList[host] + "\n\
" + host + "\n\
" + currentIPList[host]});
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
                            domainToCountry: currentCountryList[getHost(currentURL)],
                            domainToCode: currentCodeList[getHost(currentURL)]
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
    try
    {
        var http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send();
        return true;
    } catch (err) {
        return false;
    }
}

// Get IP
chrome.webRequest.onResponseStarted.addListener(function (info) {

    var ip = info.ip;
    var host = getHost(info.url);

    // If IP is valid & not cached
    if (ipaddr.isValid(ip) && ip !== currentIPList[host] && !currentCountryList[host]) {

        // Add IP to array
        currentIPList[host] = ip;

        // Select correct database
        if (ipaddr.IPv4.isValid(ip)) {
            var database = "GeoLite2-Country-Blocks-IPv4.csv";

        } else {
            var database = "GeoLite2-Country-Blocks-IPv6.csv";
        }

        var results1 = Papa.parse("../../geolite2/" + database, {
            header: true,
            download: true,
            worker: true,
            skipEmptyLines: true,
            complete: function (results) {

                var addr = ipaddr.parse(ip);

                results.data.forEach(function (country) {

                    // If row contains ip
                    var split = country["network"].split('/');
                    var range = ipaddr.parse(split[0]);
                    if (addr.match(range, split[1])) {

                        // Get geoname_id from row
                        var geoname_id = country["geoname_id"];

                        var ui_locale = chrome.i18n.getUILanguage().replace("_", "-");

                        // Get correct country database locale
                        if (fileExists("../../geolite2/GeoLite2-Country-Locations-" + ui_locale + ".csv")) {
                            var locale = ui_locale;
                        } else {
                            var locale = "en";
                        }

                        var results2 = Papa.parse("../../geolite2/GeoLite2-Country-Locations-" + locale + ".csv", {
                            header: true,
                            download: true,
                            worker: true,
                            skipEmptyLines: true,
                            complete: function (results) {

                                results.data.forEach(function (country) {

                                    // If row contains geoname_id
                                    if (country["geoname_id"] === geoname_id) {

                                        // Store information
                                        if (country["country_iso_code"]) {
                                            currentCodeList[host] = country["country_iso_code"].toLowerCase();
                                            currentCountryList[host] = country["country_name"];
                                        } else {
                                            currentCodeList[host] = country["continent_code"].toLowerCase();
                                            currentCountryList[host] = country["continent_name"];
                                        }

                                        // Display country information in address bar
                                        showFlag(info.tabId, host);
                                    }
                                });

                            }
                        });

                    }

                });
            }
        });

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
