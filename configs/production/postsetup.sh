#!/bin/bash


APP=bilingual
PYTHON_VERSION=3.8.13
BRANCH=production

CONFIG=/opt/$APP/app/configs/$BRANCH

cd $CONFIG


if [ ! -f /etc/logrotate.d/$APP.conf ]; then
    echo "Installing logrotate configuration"
        cp -f logrotate.conf /etc/logrotate.d/$APP.conf || exit 1;
fi

if [ ! -f /etc/supervisor/conf.d/$APP.conf ]; then
    echo "Installing supervisor configurations"
        ln -s $CONFIG/supervisor.conf /etc/supervisor/conf.d/$APP.conf || exit 1;
        service supervisor reload || exit 1;
fi

if [ ! -f /opt/$APP/.postsetup-sudoers ]; then
    echo "Installing sudoers configurations"
    cp -f sudoer.conf /etc/sudoers.d/$APP || exit 1;
    chmod 0440 /etc/sudoers.d/$APP || exit 1;
    touch /opt/$APP/.postsetup-sudoers
fi

touch /opt/$APP/.postsetup-success
chown $APP:$APP /opt/$APP/.postsetup-success
