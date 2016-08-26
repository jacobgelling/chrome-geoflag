'use strict';

var ipaddr = require('ipaddr.js');

// Declare arrays to store IPs
var currentIPList = {};
var currentCountryList = {};
var currentCodeList = {};

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

// Display country information in address bar
function showFlag(tabId, host) {
  chrome.pageAction.setIcon({tabId: tabId, path: 'img/flags/' + currentCodeList[host] + '.png'});
  chrome.pageAction.show(tabId);
  var title = currentCountryList[host] + '\n';
  if (currentIPList[host] !== host) {
    title += host + '\n';
  }
  title += currentIPList[host];
  chrome.pageAction.setTitle({tabId: tabId, title: title});
}

// Check if file exists
function loadJson(url, success, fail) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function (e) {
    if(typeof success === 'function') {
      success(e.target.response);
    } else {
      return true;
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
      var IPV = (ipaddr.IPv4.isValid(ip))?4:6;
      var database = 'GeoLite2-Country-Blocks-IPv'+IPV+'.json';

      /* geolite2/GeoLite2-Country-Blocks-IPv4.csv | json */
      /* load the JSON # note - TODO : check object before un-needed load of json : */
      var geonameId;
      var JsonDataParse = {
        ParseIpv : function(json, callback) {
          var addr = ipaddr.parse(ip);

          json.forEach(function (country) {
            // If row contains ip
            var split = country.ip.split('/');
            var range = ipaddr.parse(split[0]);
            if (addr.match(range, split[1])) {
              // Get geoname_id from row
              geonameId = country.id;
            }
          });
          var uiLocale = chrome.i18n.getUILanguage().replace('_', '-');

          // Get correct country database locale
          loadJson('geolite2/GeoLite2-Country-Locations-' + uiLocale + '.json', callback, function() {
            loadJson('geolite2/GeoLite2-Country-Locations-en.json', callback, function() {
              /* TODO - error handler & logger */
              console.log('error #majoq458');
            });
          });
        },
        ParseLoc : function(json) {
          json.forEach(function (country) {
            // If row contains geoname_id
            if (country.id === geonameId) {
              // Store information
              if (country.country.code) {
                currentCodeList[host] = country.country.code.toLowerCase();
                currentCountryList[host] = country.country.name.replace(/'/g, '');
              } else {
                currentCodeList[host] = country.continent.code.toLowerCase();
                currentCountryList[host] = country.continent.name.replace(/'/g, '');
              }

              // Display country information in address bar
              return showFlag(info.tabId, host);
            }
          });
        }
      };
      /* TODO - Needs to check a pre-cache storage because most people will use the same websites */
      /* ie. { hostname : {image,whois etc}} } */
      loadJson('geolite2/' + database, function success(response) {
        var jsonData = null;
        try{
          jsonData = JSON.parse(response);
          JsonDataParse.ParseIpv(jsonData, function(ParseIpvResult) {
            var jsonIpv = null;
            try {
              jsonIpv = JSON.parse(ParseIpvResult);
            } catch (e) {
              /* TODO - error handler & logger */
              console.log('error #hya59q');
            }
            JsonDataParse.ParseLoc(jsonIpv);
          });
        } catch (e) {
          /* TODO - error handler & logger */
          console.log('error #nsyur5');
        }
      } , function fail() {
        /* TODO - error handler & logger */
        console.log('error #jjus456');
      });
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
