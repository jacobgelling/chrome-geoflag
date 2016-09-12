'use strict';

var ipaddr = require('ipaddr.js');
var md5 = require('md5');
var simpleStorage = require('simplestorage.js');

// Declare arrays to store IPs
var currentIPList = {};
var currentCodeList = {};
var currentCountryList = {};

// Get host from url
function getHost(url) {
  var host;
  if (url.indexOf('://') > -1) {
    host = url.split('/')[2];
  } else {
    host = url.split('/')[0];
  }
  host = host.split(':')[0];
  return host;
}

// Get country from localStorage
function getStorage(host, hash) {
  if (simpleStorage.canUse()) {
    var precache = simpleStorage.get(hash);
    if (precache) {
      currentCodeList[host] = precache.code;
      currentCountryList[host] = precache.country;
    }
    return true;
  } else {
    console.error('localStorage cannot be used!');
    return false;
  }
}

// Cache country in localStorage
function setStorage(host, hash) {
  if (simpleStorage.canUse()) {
    var result = {};
    result.code = currentCodeList[host];
    result.country = currentCountryList[host];
    if (result.code && result.country) {
      simpleStorage.set(hash, result, {TTL: 24*60*60*1000});
      return true;
    } else {
      console.error('Cannot cache result: ' + result);
      return false;
    }
  } else {
    console.error('localStorage cannot be used!');
    return false;
  }
}

// Display country information in address bar
function showFlag(tabId, host) {
  // Stop if tab is killed
  function callback() {
    if (chrome.runtime.lastError) {
      // Tab doesn't exist
      console.warn(chrome.runtime.lastError.message);
      return false;
    } else {
      // Tab exists, show icon
      chrome.pageAction.show(tabId);
      var title = currentCountryList[host] + '\n';
      if (currentIPList[host] !== host) {
        title += host + '\n';
      }
      title += currentIPList[host];
      chrome.pageAction.setTitle({tabId: tabId, title: title});
      return true;
    }
  }
  // Update icon
  chrome.pageAction.setIcon({tabId: tabId, path: 'img/flags/' + currentCodeList[host] + '.png'}, callback);
}

// Check if file exists
function loadJson(url, success, fail) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      if(typeof fail === 'function') {
        success(xhr.responseText);
      } else {
        return true;
      }
    }
  };
  xhr.onerror = function () {
    if(typeof fail === 'function') {
      fail();
    } else {
      return false;
    }
  };
  xhr.send();
}

// Parse IP database
function parseIpv(host, json) {
  var addr = ipaddr.parse(currentIPList[host]);
  var geonameId;

  // Loop countries from JSON
  json.forEach(function (country) {
    var split = country.ip.split('/');
    var range = ipaddr.parse(split[0]);
    // If row contains ip
    if (addr.match(range, split[1])) {
      // Get geoname_id from row
      geonameId = country.id;
    }
  });

  if (geonameId) {
    return geonameId;
  } else {
    console.warn('No ID for address: ' + currentIPList[host]);
    return false;
  }
}

// Parse locale database
function parseLocale(geonameId, host, json) {
  // Loop locales from JSON
  json.forEach(function (locale) {
    // If row contains geoname_id
    if (locale.id === geonameId) {
      // Store information
      if (locale.country.code) {
        currentCodeList[host] = locale.country.code.toLowerCase();
        currentCountryList[host] = locale.country.name.replace(/'/g, '');
      } else {
        currentCodeList[host] = locale.continent.code.toLowerCase();
        currentCountryList[host] = locale.continent.name.replace(/'/g, '');
      }
    }
  });
  if (currentCodeList[host] && currentCountryList[host]) {
    return true;
  } else {
    console.warn('No locale for ID: ' + geonameId);
    return false;
  }
}

// Popup requests
chrome.extension.onMessage.addListener(function (request, sender, response) {
  switch (request.type) {
    case 'getIP':
      var currentURL = request.url;
      if (currentIPList[getHost(currentURL)] !== undefined) {
        response({
          domainToIP: currentIPList[getHost(currentURL)],
          domainToCountry: currentCountryList[getHost(currentURL)]
        });
      } else {
        response({
          domainToIP: 'Unknown',
          domainToCountry: 'Unknown'
        });
      }

    break;

    default:
      response({});
  }
});

// Get IP
chrome.webRequest.onResponseStarted.addListener(function (info) {
  var ip = info.ip;
  var host = getHost(info.url);

  // If IP is valid
  if (ipaddr.isValid(ip)) {
    // Hash IP for localStorage pre-cache key
    var hash = md5(ip);

    // If IP is not the same as cached
    if (ip !== currentIPList[host]) {
      // Add IP to array
      currentIPList[host] = ip;
      getStorage(host, hash);
    }

    if (currentCountryList[host] && currentCodeList[host]) {
      showFlag(info.tabId, host);
    } else {
      var IPV = (ipaddr.IPv4.isValid(ip))?4:6;
      var uiLocale = chrome.i18n.getUILanguage().slice(0,2);

      // Load IP database
      loadJson('geolite2/GeoLite2-Country-Blocks-IPv'+IPV+'.json',
        function success(response) {
          var geonameId = parseIpv(host, JSON.parse(response));
          // Load locale database
          loadJson('geolite2/GeoLite2-Country-Locations-'+uiLocale+'.json',
            function success(response) {
              if (parseLocale(geonameId, host, JSON.parse(response))) {
                showFlag(info.tabId, host);
                setStorage(host, hash);
              }
            },
            function fail() {
              loadJson('geolite2/GeoLite2-Country-Locations-en.json',
                function success(response) {
                  if (parseLocale(geonameId, host, JSON.parse(response))) {
                    showFlag(info.tabId, host);
                    setStorage(host, hash);
                  }
                },
                function fail() {
                  console.error('Error loading locale database.');
                }
              );
            }
          );
        },
        function fail() {
          console.error('Error loading IP database');
        }
      );
    }
  }
  return;
}, {
  urls: ['<all_urls>'],
  types: ['main_frame']
}, []);

// Listen for any changes to the URL of any tab
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (!chrome.runtime.lastError && typeof currentCodeList[getHost(tab.url)] !== 'undefined') {
    // Display country information in address bar
    showFlag(tabId, getHost(tab.url));
  }
});
