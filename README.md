# GeoFlag for Chrome

GeoFlag is a open source [Google Chrome](https://www.google.com/chrome/browser/desktop/) extension which shows a flag in the address bar based on the current website's server location. It has a number of features which help it stand out from all the other flag extensions.

 - IPv6 compatible
 - Lookups done locally
 - Quick access to range of tools
 - Hides on local sites
 - No tracking

### Version

1.0.3

### Installation

[![Available in the Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png)](https://chrome.google.com/webstore/detail/geoflag/jidjgfepnmonpcmaihbifgjkbilkipoh)

Alternatively you can download the GeoFlag extension from https://github.com/jacobg830/chrome-geoflag/releases and install it manually.

### Contributing
GeoFlag is using yeoman scaffolding , bower & grunt as task runners. Starting you need to get the required packages for node & bower.

```bash
$ npm install && bower install 
# Run grunt debug - this runs a reload task 
$ grunt debug # note that the loaded extension path should be /chrome-geoflag/app/
# Happy with the changes ? Now to build the extension for release
$ grunt build
```

### License

Original work Copyright (c) 2015 by Jacob Gelling  
Modified work Copyright (c) 2015 by Lee Mc Kay  
Modified work Copyright (c) 2016 by Gabriel Cavallo

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see http://www.gnu.org/licenses/.

This product includes GeoLite2 data created by MaxMind, available from http://www.maxmind.com/.
