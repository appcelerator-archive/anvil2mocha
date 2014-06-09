# Anvil2Mocha 

A utility to convert a set of [Anvil](http://github.com/appcelerator/anvil) test cases to [Ti-Mocha](http://tonylukasavage.com/ti-mocha/) test cases for use with [Tio2](http://github.com/appcelerator/tio2).

## Install

#### from npm 

```
[sudo] npm install -g anvil2mocha
```

#### from github (cutting edge)

```bash
[sudo] npm install -g git://github.com/appcelerator/anvil2mocha.git
```

#### clone and install local

```bash
git clone https://github.com/appcelerator/anvil2mocha.git
cd anvil2mocha
npm install
sudo npm link
```

## Quick Start

```bash
anvil2mocha ./anvil ./output
```

## Credits

Some great Titanium based utilities are leveraged to make this all work:

- [ti-mocha](http://tonylukasavage.com/ti-mocha/)

Among other great open source libraries like [mocha](https://github.com/visionmedia/mocha), [should](https://github.com/visionmedia/should.js/), etc.


## Reporting Bugs or submitting fixes

If you run into problems, and trust us, there are likely plenty of them at this point -- please create an [Issue](https://github.com/appcelerator/anvil2mocha/issues) or, even better, send us a pull request. 

## Contributing

anvil2mocha is an open source project.  anvil2mocha wouldn't be where it is now without contributions by the community. Please consider forking anvil2mocha to improve, enhance or fix issues. If you feel like the community will benefit from your fork, please open a pull request.

To protect the interests of the anvil2mocha contributors, Appcelerator, customers and end users we require contributors to sign a Contributors License Agreement (CLA) before we pull the changes into the main repository. Our CLA is simple and straightforward - it requires that the contributions you make to any Appcelerator open source project are properly licensed and that you have the legal authority to make those changes. This helps us significantly reduce future legal risk for everyone involved. It is easy, helps everyone, takes only a few minutes, and only needs to be completed once.

[You can digitally sign the CLA](http://bit.ly/app_cla) online. Please indicate your email address in your first pull request so that we can make sure that will locate your CLA.  Once you've submitted it, you no longer need to send one for subsequent submissions.

## Contributors

The original source and design for this project was developed by [Jeff Haynie](http://github.com/jhaynie) ([@jhaynie](http://twitter.com/jhaynie)).


## Legal

Copyright (c) 2014 by [Appcelerator, Inc](http://www.appcelerator.com). All Rights Reserved.
This project is licensed under the Apache Public License, version 2.  Please see details in the LICENSE file.
