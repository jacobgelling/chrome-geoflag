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
            document.getElementById("domain").innerHTML = host;
            document.getElementById("server-ip").innerHTML = ip;
            document.getElementById("country").innerHTML = response.domainToCountry;
            document.getElementById("geotool").href = "http://geoip.flagfox.net/?ip=" + ip + "&host=" + host;
            document.getElementById("whois").href = "https://whois.domaintools.com/" + host;
            document.getElementById("wot").href = "https://www.mywot.com/scorecard/" + host;
            document.getElementById("ssltest").href = "https://www.ssllabs.com/ssltest/analyze.html?d=" + host + "&s=" + ip;
        }
    });
});
