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

chrome.tabs.query({active: true}, function (tabs) {
    url = tabs[0].url;
    chrome.extension.sendMessage({type: "getIP", url: url}, function (response) {
        ip = response.domainToIP;
        if (ip !== "Unknown") {
            host = getHost(url);

            // Show domain
            if (host === ip) {
                document.getElementById("domain").className = "hidden";
            } else {
                document.getElementById("desc-domain").innerHTML = chrome.i18n.getMessage("domain");
                document.getElementById("value-domain").innerHTML = host;
            }

            // Show IP address
            document.getElementById("desc-ip").innerHTML = chrome.i18n.getMessage("ip");
            document.getElementById("value-ip").innerHTML = ip;

            // Show country
            document.getElementById("desc-country").innerHTML = chrome.i18n.getMessage("country");
            document.getElementById("value-country").innerHTML = response.domainToCountry;

            // Create tool links
            document.getElementById("geotool").href = "http://geoip.flagfox.net/?ip=" + ip + "&host=" + host;
            document.getElementById("whois").href = "https://whois.domaintools.com/" + host;
            document.getElementById("wot").href = "https://www.mywot.com/scorecard/" + host;
            document.getElementById("ssltest").href = "https://www.ssllabs.com/ssltest/analyze.html?d=" + host + "&s=" + ip;
        }
    });
});
