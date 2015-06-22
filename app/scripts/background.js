"use strict";

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
    chrome.pageAction.setIcon({tabId: tabId, path: "img/flags/" + currentCodeList[host] + ".png"});
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

// Check if file exists
function loadJson(url, success, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function (e) {
			if( typeof success === "function" ){
				success( e.target.response );
			} else {
        return true;
			}
    };
    xhr.onerror = function (e) {
			if( typeof fail === "function" ){
				fail();
			} else {
				return fail;
			}
    };
    xhr.send();
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
                var database = "GeoLite2-Country-Blocks-IPv4.json";
            } else {
                var database = "GeoLite2-Country-Blocks-IPv6.json";
            }

				/* geolite2/GeoLite2-Country-Blocks-IPv4.csv | json */
				/* load the JSON # note - TODO : check object before un-needed load of json : */

				loadJson("geolite2/" + database, function success(response){
					var jsonData;
					try{
						jsonData = JSON.parse(response);
						console.log(jsonData);
					} catch ( e ){
						/* TODO - error handler & logger */
						console.log("error #nsyur5");
					}
				} , function fail(){
					/* TODO - error handler & logger */
					console.log("error #jjus456");
				});

				// /*********Papa**********/ Papa.parse("geolite2/" + database, { /* http://papaparse.com/docs#config */
        //         header: true,
        //         download: true,
        //         worker: true,
				// 				encoding: "utf8",
        //         fastMode: false,
        //         complete: function (results) {
				// 					console.log( results );
        //             var addr = ipaddr.parse(ip);
        //             var geoname_id;
				//
        //             results.data.forEach(function (country) {
				//
        //                 // If row contains ip
        //                 var split = country["network"].split('/');
        //                 var range = ipaddr.parse(split[0]);
        //                 if (addr.match(range, split[1])) {
				//
        //                     // Get geoname_id from row
        //                     geoname_id = country["geoname_id"];
				//
        //                 }
				//
        //             });
				//
        //             var ui_locale = chrome.i18n.getUILanguage().replace("_", "-");
				//
        //             // Get correct country database locale
        //             if (fileExists("geolite2/GeoLite2-Country-Locations-" + ui_locale + ".csv")) {
        //                 var locale = ui_locale;
        //             } else {
        //                 var locale = "en";
        //             }
				//
				// 						/*********Papa**********/ Papa.parse("geolite2/GeoLite2-Country-Locations-" + locale + ".csv", {
        //                 header: true,
        //                 download: true,
        //                 worker: true,
        //                 skipEmptyLines: true,
        //                 fastMode: true,
        //                 complete: function (results) {
				//
        //                     results.data.forEach(function (country) {
				//
        //                         // If row contains geoname_id
        //                         if (country["geoname_id"] === geoname_id) {
				//
        //                             // Store information
        //                             if (country["country_iso_code"]) {
        //                                 currentCodeList[host] = country["country_iso_code"].toLowerCase();
        //                                 currentCountryList[host] = country["country_name"].replace(/"/g, "");
        //                             } else {
        //                                 currentCodeList[host] = country["continent_code"].toLowerCase();
        //                                 currentCountryList[host] = country["continent_name"].replace(/"/g, "");
        //                             }
				//
        //                             // Display country information in address bar
        //                             showFlag(info.tabId, host);
        //                         }
        //                     });
				//
        //                 }
				//
        //             }); /*********Papa**********/
        //         }
        //     }); /*********Papa**********/

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
