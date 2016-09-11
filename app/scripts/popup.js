'use strict';

// Get host from url
function getHost(url) {
  var host;
  if (url.indexOf('://') > -1) {
    host = url.split('/')[2];
  }
  else {
    host = url.split('/')[0];
  }
  host = host.split(':')[0];
  return host;
}

// Hide a element by ID
function hideElement(id) {
  document.getElementById(id).className = 'hidden';
}

// Change a element's text by ID (and class)
function changeElementText(content, id, _class) {
  var el = document.getElementById(id);
  if (_class) {
    el = el.getElementsByClassName(_class)[0];
  }
  el.innerText = content;
}

// Get active tab information
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  var url = tabs[0].url;
  chrome.extension.sendMessage({type: 'getIP', url: url}, function (response) {

    var ip = response.domainToIP;

    // If IP is not unknown
    if (ip !== 'Unknown') {

      var host = getHost(url);
      var country = response.domainToCountry;

      // Show domain
      if (host === ip) {
        hideElement('info-domain');
      } else {
        changeElementText(chrome.i18n.getMessage('domain'), 'info-domain', 'description');
        changeElementText(host, 'info-domain', 'value');
      }

      // Show IP address
      changeElementText(chrome.i18n.getMessage('ip'), 'info-ip', 'description');
      changeElementText(ip, 'info-ip', 'value');

      // Show country
      if (!country) {
        hideElement('info-country');
      } else {
        changeElementText(chrome.i18n.getMessage('country'), 'info-country', 'description');
        changeElementText(country, 'info-country', 'value');
      }

      // Create tool links
      document.getElementById('geotool').href = 'https://iplookup.flagfox.net/?ip=' + ip + '&host=' + host;
      document.getElementById('whois').href = 'https://whois.domaintools.com/' + host;
      document.getElementById('wot').href = 'https://www.mywot.com/scorecard/' + host;
      document.getElementById('ssltest').href = 'https://www.ssllabs.com/ssltest/analyze.html?d=' + host + '&s=' + ip;
    }
  });
});
