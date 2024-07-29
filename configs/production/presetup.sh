#!/bin/bash

APP=bilingual
PYTHON_VERSION=3.8.13
BRANCH=production

cd /home/$APP

if [ ! -e .gitconfig ]; then
    echo "Setting up git config"
    git config --global user.email "$APP@$(hostname)"
    git config --global user.name "$(hostname)"    
fi

if [ ! -e workspace/ ]; then
    echo "Creating workspace"
    git clone ~/local.git --branch $BRANCH workspace/
fi

cd /home/$APP/workspace 
git pull ~/local.git $BRANCH


cd /home/$APP

if [ ! -e .pyenv ]; then
    echo "Installing pyenv"
    git clone https://github.com/pyenv/pyenv.git .pyenv
    cd .pyenv && src/configure && make -C src
    cd /home/$APP
fi

if [ ! -e .pyenv/versions/$PYTHON_VERSION/bin/python ]; then
    echo "Installing python $PYTHON_VERSION"
    .pyenv/bin/pyenv install --verbose $PYTHON_VERSION
    cd /home/$APP
fi

if [ ! -e .env ]; then
    echo "Creating virtual environment for workspace"
    .pyenv/versions/$PYTHON_VERSION/bin/python -m venv .env
    .env/bin/pip install --upgrade pip
    .env/bin/pip install wheel setuptools
fi 

cd /opt/$APP

if [ ! -e app ]; then
    echo "Git clone to opt directory"
    git clone ~/local.git --branch $BRANCH app/
fi

if [ ! -e .env ]; then
    echo "Creating virtual environment for opt"
    ~/.pyenv/versions/$PYTHON_VERSION/bin/python -m venv .env
    .env/bin/pip install --upgrade pip
    .env/bin/pip install wheel setuptools
fi 

if [ ! -e run ]; then
    echo "Creating run folder"
    mkdir -p run
fi 

if [ ! -e log ]; then
    echo "Creating log folder"
    mkdir -p log
fi 
