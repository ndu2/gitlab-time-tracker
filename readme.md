![gtt](preview/icon.png)


## introduction

gtt is a fully featured command line interface for GitLab's time tracking feature. It monitors the time you spent on an issue or merge request locally and syncs it to GitLab. It also allows you to create reports in various formats from time tracking data stored on GitLab.

![gtt demo](preview/demo.gif)

## About this fork (ndu2)

Shout-out to kris for creating this handy tool. As we use gtt regularly and maintenance on the original repo stopped, I maintain the code base in the foreseeable future on this fork (versions 1.8.x).

Feel free to contact me or create a Pull Request if you have some patches or proposals.

### Where to get gtt v1.8

There are various options:

 ✅ download executables on [GitHub](https://github.com/ndu2/gitlab-time-tracker/releases)  
 ✅ download gtt.cjs (CommonJS) on [GitHub](https://github.com/ndu2/gitlab-time-tracker/releases)  
 ✅ download the source code, then `npm install && npm run-script buildAll`

By this time of writing:

 ❌ the package on [npm](https://www.npmjs.com/package/gitlab-time-tracker) is not maintained anymore  
 ❌ the docker image on [dockerhub](https://hub.docker.com/r/kriskbx/gitlab-time-tracker) is not maintained anymore  


## documentation

How to install and use gtt? You can find the documentation [here](documentation.md).


## license

gtt is open-source software licensed under the [GPL V2 license](LICENSE).
