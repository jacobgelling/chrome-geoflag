//// Get all opened tabs
//chrome.windows.getAll({populate: true}, function (windows)
//{
//    for (var i = 0; i < windows.length; i++)
//        for (var j = 0; j < windows[i].tabs.length; j++) {
//            chrome.pageAction.show(windows[i].tabs[j].id);
//            chrome.tabs.reload(windows[i].tabs[j].id);
//        }
//});

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

var ip2long = function (ip) {
    var components;

    if (components = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/))
    {
        var iplong = 0;
        var power = 1;
        for (var i = 4; i >= 1; i -= 1)
        {
            iplong += power * parseInt(components[i]);
            power *= 256;
        }
        return iplong;
    }
    else
        return -1;
};

var inSubNet = function (ip, subnet)
{
    var mask, base_ip, long_ip = ip2long(ip);
    if ((mask = subnet.match(/^(.*?)\/(\d{1,2})$/)) && ((base_ip = ip2long(mask[1])) >= 0))
    {
        var freedom = Math.pow(2, 32 - parseInt(mask[2]));
        return (long_ip > base_ip) && (long_ip < base_ip + freedom - 1);
    }
    else
        return false;
};

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

// Get IP
chrome.webRequest.onResponseStarted.addListener(function (info) {

    var ip = info.ip;
    var host = getHost(info.url);

    // If IP is valid & not cached
    if (ipaddr.isValid(ip) && ip !== currentIPList[host]) {

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

                        var results2 = Papa.parse("../../geolite2/GeoLite2-Country-Locations-en.csv", {
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
                                        chrome.pageAction.setIcon({tabId: info.tabId, path: "../../flags/" + currentCodeList[host] + ".png"});
                                        chrome.pageAction.show(info.tabId);
                                        chrome.pageAction.setTitle({tabId: info.tabId, title: currentCountryList[host] + "\n\
" + host + "\n\
" + currentIPList[host]});
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
}, {urls: ["<all_urls>"], types: ["main_frame"]}, []);

// Listen for any changes to the URL of any tab
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (!chrome.runtime.lastError && typeof currentCodeList[getHost(tab.url)] !== "undefined")
    {
        chrome.pageAction.setIcon({tabId: tabId, path: "../../flags/" + currentCodeList[getHost(tab.url)] + ".png"});
        chrome.pageAction.show(tabId);
        chrome.pageAction.setTitle({tabId: tabId, title: currentCountryList[getHost(tab.url)] + "\n\
" + getHost(tab.url) + "\n\
" + currentIPList[getHost(tab.url)]});
    }
});
